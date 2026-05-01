// useChat: 管理單一對話的訊息串流、tool calling、狀態步驟
import { useCallback, useRef, useState } from "react";
import { storeActions } from "./store";
import type { Attachment, Message, StatusStep, Conversation } from "./types";
import { uid } from "./format";
import { streamChat, type ChatMessage, type ChatPart } from "./pollinations";
import { TOOLS, runTool } from "./tools";

const SYSTEM_PROMPT = `你是 Coder AI，一位專注於程式設計與技術問題解答的 AI。
回答時請使用 Markdown 格式，程式碼請用對應語言的 fenced code block。
若需要最新資訊或不確定的事實，請呼叫 web_search 工具。
若使用者提供網址或你需要某網頁的內容，請呼叫 fetch_url 工具。
請以使用者使用的語言回應（預設繁體中文）。`;

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

function messagesForApi(conv: Conversation): ChatMessage[] {
  const out: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const m of conv.messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: attToParts(m.attachments, m.content) });
    } else if (m.role === "assistant") {
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
      const aiMsg: Message = {
        id: aiId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        steps: [],
      };

      // append both, set title if first
      update((c) => {
        const isFirst = c.messages.length === 0;
        return {
          ...c,
          title: isFirst && trimmed ? trimmed.slice(0, 40) : c.title,
          messages: [...c.messages, userMsg, aiMsg],
          updatedAt: Date.now(),
        };
      });

      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;

      // Helper to mutate the AI message
      const patchAi = (patch: (m: Message) => Message) => {
        update((c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === aiId ? patch(m) : m)),
        }));
      };

      // Add an initial "thinking" step
      const thinkStep: StatusStep = {
        id: uid(),
        kind: "thinking",
        label: "思考中",
        startedAt: Date.now(),
      };
      patchAi((m) => ({ ...m, steps: [...(m.steps ?? []), thinkStep] }));

      // Build conversation msgs (use latest store)
      // We'll re-read by closure: capture messages array
      let apiMessages: ChatMessage[] = messagesForApi({
        ...conv,
        messages: [...conv.messages, userMsg],
      });

      const finalize = (errorMsg?: string) => {
        patchAi((m) => ({
          ...m,
          finishedAt: Date.now(),
          steps: (m.steps ?? []).map((s) => (s.endedAt ? s : { ...s, endedAt: Date.now() })),
          content: errorMsg
            ? (m.content ? m.content + "\n\n" : "") + `⚠️ ${errorMsg}`
            : m.content,
        }));
        setBusy(false);
        abortRef.current = null;
      };

      try {
        // Loop: model may call tools; we resolve and re-call
        for (let turn = 0; turn < 5; turn++) {
          // Pending tool calls assembled this turn
          const pending: Record<string, { name: string; args: string }> = {};
          let endedThink = false;
          let assistantText = "";
          let assistantToolCalls: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }> = [];

          await streamChat({
            messages: apiMessages,
            tools: TOOLS,
            signal: controller.signal,
            onEvent: (e) => {
              if (e.type === "text") {
                if (!endedThink) {
                  endedThink = true;
                  patchAi((m) => ({
                    ...m,
                    steps: (m.steps ?? []).map((s) =>
                      s.endedAt ? s : { ...s, endedAt: Date.now() }
                    ),
                  }));
                }
                assistantText += e.delta;
                patchAi((m) => ({ ...m, content: m.content + e.delta }));
              } else if (e.type === "tool_call_start") {
                pending[e.id] = { name: e.name, args: "" };
                if (!endedThink) {
                  endedThink = true;
                  patchAi((m) => ({
                    ...m,
                    steps: (m.steps ?? []).map((s) =>
                      s.endedAt ? s : { ...s, endedAt: Date.now() }
                    ),
                  }));
                }
                // Add a step placeholder
                const kind: StatusStep["kind"] =
                  e.name === "fetch_url" ? "reading" : "searching";
                const label = e.name === "fetch_url" ? "讀取" : "搜尋中";
                const stepId = "tool-" + e.id;
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
                // update step detail
                let detail: string | undefined;
                try {
                  const parsed = JSON.parse(pending[e.id].args || "{}");
                  detail = parsed.query || parsed.url;
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

          // If no tool calls, we're done.
          if (assistantToolCalls.length === 0) {
            finalize();
            return;
          }

          // Append assistant tool-call message + tool results, then re-call
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
            // mark step ended
            const stepId = "tool-" + tc.id;
            patchAi((m) => ({
              ...m,
              steps: (m.steps ?? []).map((s) =>
                s.id === stepId ? { ...s, endedAt: Date.now() } : s
              ),
            }));
            apiMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result,
            });
          }
          // Add another thinking step before next round
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
        finalize(err instanceof Error ? err.message : "發生錯誤");
      }
    },
    [busy, conv, update]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, stop, busy };
}
