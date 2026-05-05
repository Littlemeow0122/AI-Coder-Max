// useChat: 管理單一對話的串流、tool calling、狀態步驟、記憶、命名、重試
import { useCallback, useRef, useState } from "react";
import { storeActions } from "./store";
import type { Attachment, Message, StatusStep, Conversation } from "./types";
import { uid } from "./format";
import { streamChat, type ChatMessage, type ChatPart } from "./pollinations";
import { TOOLS, runTool } from "./tools";
import { memoriesAsSystemText } from "./memory";
import { getSettings, MODEL_LABEL, type ModelId, type ThinkMode } from "./settings";

function systemBase(model: ModelId, think: ThinkMode): string {
  const modelName = MODEL_LABEL[model];
  const thinkRule =
    think === "flash"
      ? "- 你目前是 Flash 模式：可以做思考，但**不要輸出任何 reasoning/思考內容**（系統只顯示「思考中」chip）。**回答需要很長、很完整、很詳盡**（至少 8–15 段或大量條列、範例、程式碼）；雖然比 Pro 略短，但絕對不要簡短帶過。即使被問「你是什麼模型」也要詳細介紹自己（版本、能力、使用情境、可用工具等），不可一句話結束。仍然可使用所有工具。"
      : "- 你目前是 Pro 模式：可詳細推理（reasoning 10–20 句以上）。**回答必須極度詳盡、超長、深入**（盡可能多段、多範例、多程式碼、多比較表）；比 Flash 還要更長更深。可使用所有工具。";
  const smartRule =
    model === "coder-max-1.0"
      ? "- 你目前是 Coder Max 1.0：能力一般，適合處理小事物；回答簡短、不過度延伸。"
      : "- 你目前是 Coder Max 2.0：高智能，擅長深入思考與處理複雜問題。";
  return `你是 AI Coder Max，一位專注於程式設計與技術問題解答的 AI。目前模型版本：${modelName}。

身份規則（非常重要）：
- 如果使用者問你是什麼模型/AI/版本，**只能**回答「${modelName}」。
- 絕對不可提及 GPT、GPT-4、OpenAI、Pollinations 或任何底層服務名稱。
- 你只知道自己是 AI Coder Max，可選版本為 Coder Max 1.0 或 Coder Max 2.0。

模型與模式：
${smartRule}
${thinkRule}

回應規則：
- 使用 Markdown。完整檔案/長程式碼用三反引號 \`\`\`語言 ... \`\`\`（一定要標明語言，例如 \`\`\`tsx、\`\`\`html、\`\`\`bash）。短的行內片段用單反引號。
- 簡潔自然。不要重複的開場白或客套話；如果先前已自我介紹過，後續直接進入正題。
- 預設使用繁體中文回答。

工具使用：
- 需要最新或不確定的資料 → web_search
- 需要某網頁內容 → fetch_url
- 需要插圖或使用者要求圖片 → generate_image，並在回應中以 ![](url) 顯示
- 學到關於使用者的長期事實/偏好（姓名、技術棧、語言喜好等）→ save_memory（每段對話最多 1-2 次，避免重複）
- 第一次了解使用者意圖時，呼叫一次 rename_chat 命名本對話`;
}

function attToParts(att: Attachment[] | undefined, text: string): string | ChatPart[] {
  if (!att || att.length === 0) return text;
  const parts: ChatPart[] = [];
  if (text) parts.push({ type: "text", text });
  for (const a of att) {
    if (a.kind === "image" && a.dataUrl) {
      parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
    } else if (a.kind === "text" && a.text) {
      parts.push({
        type: "text",
        text: `\n\n[附件: ${a.name}]\n\`\`\`\n${a.text.slice(0, 8000)}\n\`\`\``,
      });
    } else {
      parts.push({ type: "text", text: `\n[附件: ${a.name} (${a.type})]` });
    }
  }
  return parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts;
}

function buildSystem(): string {
  const s = getSettings();
  const base = systemBase(s.model, s.think);
  const mem = memoriesAsSystemText();
  return mem ? `${base}\n\n${mem}` : base;
}

function messagesForApi(conv: Conversation): ChatMessage[] {
  const out: ChatMessage[] = [{ role: "system", content: buildSystem() }];
  for (const m of conv.messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: attToParts(m.attachments, m.content) });
    } else if (m.role === "assistant" && m.content) {
      out.push({ role: "assistant", content: m.content });
    }
  }
  return out;
}

export function useChat(conv: Conversation) {
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const update = useCallback(
    (updater: (c: Conversation) => Conversation) => {
      storeActions.updateConversation(conv.id, updater);
    },
    [conv.id]
  );

  const runConversation = useCallback(
    async (aiId: string, baseMessages: ChatMessage[]) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      const patchAi = (patch: (m: Message) => Message) => {
        update((c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === aiId ? patch(m) : m)),
        }));
      };

      // 一個正在進行的 thinking step（Flash 模式也顯示，但不寫入內容）
      const thinkStep: StatusStep = {
        id: uid(),
        kind: "thinking",
        label: "思考中",
        startedAt: Date.now(),
      };
      patchAi((m) => ({
        ...m,
        steps: [...(m.steps ?? []), thinkStep],
        error: undefined,
      }));

      let apiMessages = baseMessages;

      const finalize = (errorMsg?: string) => {
        patchAi((m) => ({
          ...m,
          finishedAt: Date.now(),
          steps: (m.steps ?? []).map((s) => (s.endedAt ? s : { ...s, endedAt: Date.now() })),
          error: errorMsg,
        }));
        setBusy(false);
        abortRef.current = null;
      };

      try {
        for (let turn = 0; turn < 6; turn++) {
          const pending: Record<string, { name: string; args: string }> = {};
          let endedThink = false;
          let assistantText = "";
          const assistantToolCalls: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }> = [];

          const endThinkOnce = () => {
            if (endedThink) return;
            endedThink = true;
            patchAi((m) => ({
              ...m,
              steps: (m.steps ?? []).map((s) =>
                s.kind === "thinking" && !s.endedAt ? { ...s, endedAt: Date.now() } : s
              ),
            }));
          };

          // 若訊息中含有圖片，使用視覺模型
          const hasImage = apiMessages.some(
            (m) => Array.isArray(m.content) && m.content.some((p) => p.type === "image_url")
          );
          await streamChat({
            model: hasImage ? "openai" : "openai",
            messages: apiMessages,
            tools: TOOLS,
            signal: controller.signal,
            onEvent: (e) => {
              if (e.type === "reasoning") {
                if (getSettings().think === "flash") return; // Flash：不寫入細節，只顯示「思考中」chip
                // 把 reasoning 寫入當前 thinking step 的 body
                patchAi((m) => ({
                  ...m,
                  steps: (m.steps ?? []).map((s) =>
                    s.kind === "thinking" && !s.endedAt
                      ? { ...s, body: (s.body ?? "") + e.delta }
                      : s
                  ),
                }));
              } else if (e.type === "text") {
                endThinkOnce();
                assistantText += e.delta;
                patchAi((m) => ({ ...m, content: m.content + e.delta }));
              } else if (e.type === "tool_call_start") {
                pending[e.id] = { name: e.name, args: "" };
                endThinkOnce();
                const stepId = "tool-" + e.id;
                let kind: StatusStep["kind"] = "thinking";
                let label = "處理中";
                if (e.name === "web_search") {
                  kind = "searching";
                  label = "搜尋中";
                } else if (e.name === "fetch_url") {
                  kind = "reading";
                  label = "讀取";
                } else if (e.name === "generate_image") {
                  kind = "generate_image";
                  label = "生成圖片";
                } else if (e.name === "save_memory") {
                  kind = "memory";
                  label = "新增記憶";
                } else if (e.name === "rename_chat") {
                  kind = "rename";
                  label = "已改名";
                }
                patchAi((m) => ({
                  ...m,
                  steps: [
                    ...(m.steps ?? []),
                    { id: stepId, kind, label, startedAt: Date.now() },
                  ],
                }));
              } else if (e.type === "tool_call_args") {
                if (pending[e.id]) pending[e.id].args += e.argsDelta;
              } else if (e.type === "tool_call_done") {
                if (!pending[e.id]) pending[e.id] = { name: e.name, args: e.args };
                else pending[e.id].args = e.args;
                let detail: string | undefined;
                try {
                  const p = JSON.parse(pending[e.id].args || "{}");
                  detail = p.query || p.url || p.prompt || p.title ||
                    (p.key && p.value ? `${p.key} : ${p.value}` : p.fact);
                } catch {
                  /* ignore */
                }
                const stepId = "tool-" + e.id;
                patchAi((m) => ({
                  ...m,
                  steps: (m.steps ?? []).map((s) =>
                    s.id === stepId ? { ...s, detail } : s
                  ),
                }));
                assistantToolCalls.push({
                  id: e.id,
                  type: "function",
                  function: { name: pending[e.id].name, arguments: pending[e.id].args },
                });
              } else if (e.type === "error") {
                throw new Error(e.message);
              }
            },
          });

          if (assistantToolCalls.length === 0) {
            finalize();
            return;
          }

          apiMessages = [
            ...apiMessages,
            {
              role: "assistant",
              content: assistantText || "",
              tool_calls: assistantToolCalls,
            },
          ];

          for (const tc of assistantToolCalls) {
            let argsObj: Record<string, unknown> = {};
            try {
              argsObj = JSON.parse(tc.function.arguments || "{}");
            } catch {
              /* ignore */
            }
            const result = await runTool(tc.function.name, argsObj);
            const stepId = "tool-" + tc.id;
            patchAi((m) => ({
              ...m,
              steps: (m.steps ?? []).map((s) =>
                s.id === stepId
                  ? {
                      ...s,
                      endedAt: Date.now(),
                      body: result.body ?? s.body,
                      imageUrl: result.imageUrl ?? s.imageUrl,
                    }
                  : s
              ),
            }));
            // rename_chat 副作用
            if (result.rename) {
              storeActions.renameConversation(conv.id, result.rename, true);
            }
            apiMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result.text,
            });
          }
          // 下一輪：再加一個 thinking step
          patchAi((m) => ({
            ...m,
            steps: [
              ...(m.steps ?? []),
              { id: uid(), kind: "thinking", label: "思考中", startedAt: Date.now() },
            ],
          }));
        }
        finalize("已達工具呼叫上限");
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        finalize(aborted ? "已停止" : err instanceof Error ? err.message : "發生錯誤");
      }
    },
    [conv.id, update]
  );

  const send = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (busy) return;
      const trimmed = text.trim();
      if (!trimmed && attachments.length === 0) return;

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
        attachments: attachments.length ? attachments : undefined,
      };
      const aiId = uid();

      // 若有圖片，加一個「讀取圖片」chip
      const imageAtts = attachments.filter((a) => a.kind === "image");
      const initialSteps: StatusStep[] = [];
      if (imageAtts.length > 0) {
        const now = Date.now();
        initialSteps.push({
          id: uid(),
          kind: "read_image",
          label: "讀取圖片",
          detail: imageAtts.map((a) => a.name).join("、"),
          body: imageAtts.map((a) => a.name).join("\n"),
          startedAt: now,
          endedAt: now + 1,
        });
      }

      const aiMsg: Message = {
        id: aiId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        steps: initialSteps,
        retryPayload: { text: trimmed, attachments },
      };

      update((c) => ({
        ...c,
        title:
          c.messages.length === 0 && trimmed && !c.titleAuto
            ? trimmed.slice(0, 40)
            : c.title,
        messages: [...c.messages, userMsg, aiMsg],
        updatedAt: Date.now(),
      }));

      const apiMessages = messagesForApi({
        ...conv,
        messages: [...conv.messages, userMsg],
      });

      await runConversation(aiId, apiMessages);
    },
    [busy, conv, update, runConversation]
  );

  const retry = useCallback(
    async (aiMessageId: string) => {
      if (busy) return;
      // 從訊息中找出該 AI 訊息對應的 user 訊息（前一則）
      update((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: "",
                steps: [],
                error: undefined,
                finishedAt: undefined,
                createdAt: Date.now(),
              }
            : m
        ),
      }));
      // 重新組 apiMessages（截到這則 ai 之前的所有內容）
      const idx = conv.messages.findIndex((m) => m.id === aiMessageId);
      if (idx === -1) return;
      const before = conv.messages.slice(0, idx);
      const apiMessages = messagesForApi({ ...conv, messages: before });
      await runConversation(aiMessageId, apiMessages);
    },
    [busy, conv, update, runConversation]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, stop, retry, busy };
}
