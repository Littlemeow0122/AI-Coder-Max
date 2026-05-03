// useChat: 管理單一對話的串流、tool calling、狀態步驟、記憶、命名、重試
import { useCallback, useRef, useState } from "react";
import { storeActions } from "./store";
import type { Attachment, Message, StatusStep, Conversation } from "./types";
import { uid } from "./format";
import { streamChat, type ChatMessage, type ChatPart } from "./pollinations";
import { TOOLS, runTool } from "./tools";
import { memoriesAsSystemText } from "./memory";

const SYSTEM_BASE = `你是 Coder AI，一位專注於程式設計與技術問題解答的 AI。

回應規則：
- 使用 Markdown。完整檔案/長程式碼用三反引號 \`\`\`語言 ... \`\`\`（一定要標明語言，例如 \`\`\`tsx、\`\`\`html、\`\`\`bash）。短的行內片段用單反引號。
- 簡潔自然。不要每次都用相同的開場白或客套話；如果先前已自我介紹過，後續直接進入正題。
- 預設使用繁體中文回答。

工具使用：
- 需要最新或不確定的資料 → web_search
- 需要某網頁內容 → fetch_url
- 需要插圖或使用者要求圖片 → generate_image，並在回應中以 ![](url) 顯示
- 學到關於使用者的長期事實/偏好（姓名、技術棧、語言喜好等）→ save_memory（每段對話最多 1-2 次，避免重複）
- 第一次了解使用者意圖時，呼叫一次 rename_chat 命名本對話`;

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
  const mem = memoriesAsSystemText();
  return mem ? `${SYSTEM_BASE}\n\n${mem}` : SYSTEM_BASE;
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

      // 一個正在進行的 thinking step
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

          await streamChat({
            messages: apiMessages,
            tools: TOOLS,
            signal: controller.signal,
            onEvent: (e) => {
              if (e.type === "reasoning") {
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
