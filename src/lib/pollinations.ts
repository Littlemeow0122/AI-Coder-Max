// Pollinations AI client - OpenAI-compatible streaming with tool calling
// Public token: pk_hGZnR8vxGwI9IX46

const POLLINATIONS_TOKEN = "pk_hGZnR8vxGwI9IX46";
const ENDPOINT = "https://text.pollinations.ai/openai";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: ChatRole;
  content: string | ChatPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "tool_call_start"; id: string; name: string }
  | { type: "tool_call_args"; id: string; argsDelta: string }
  | { type: "tool_call_done"; id: string; name: string; args: string }
  | { type: "done" }
  | { type: "error"; message: string };

export async function streamChat(opts: {
  model?: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  signal?: AbortSignal;
  onEvent: (e: StreamEvent) => void;
}): Promise<void> {
  const body: Record<string, unknown> = {
    model: opts.model ?? "openai",
    messages: opts.messages,
    stream: true,
  };
  if (opts.tools && opts.tools.length) {
    body.tools = opts.tools;
    body.tool_choice = "auto";
  }

  let resp: Response;
  try {
    resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POLLINATIONS_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (e instanceof DOMException && e.name === "AbortError") {
      opts.onEvent({ type: "error", message: "已停止" });
    } else {
      opts.onEvent({ type: "error", message: /pollinations/i.test(m) ? "Load Failed" : "Load Failed" });
    }
    return;
  }

  if (!resp.ok || !resp.body) {
    const txt = await resp.text().catch(() => "");
    const isPoll =
      /pollinations|legacy api|deprecation|model not found|enter\.pollinations|openai-large/i.test(txt);
    const msg = isPoll || resp.status === 404 ? "Load Failed" : `Load Failed (${resp.status})`;
    opts.onEvent({ type: "error", message: msg });
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // Track partial tool calls by index
  const toolAcc: Record<number, { id: string; name: string; args: string; started: boolean }> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        // emit any pending tool_call_done
        for (const k of Object.keys(toolAcc)) {
          const t = toolAcc[+k];
          opts.onEvent({ type: "tool_call_done", id: t.id, name: t.name, args: t.args });
        }
        opts.onEvent({ type: "done" });
        return;
      }
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        if (typeof delta.content === "string" && delta.content) {
          opts.onEvent({ type: "text", delta: delta.content });
        }
        const r =
          (typeof delta.reasoning === "string" && delta.reasoning) ||
          (typeof delta.reasoning_content === "string" && delta.reasoning_content) ||
          (typeof (delta as { thinking?: string }).thinking === "string" &&
            (delta as { thinking?: string }).thinking) ||
          "";
        if (r) opts.onEvent({ type: "reasoning", delta: r });
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolAcc[idx]) {
              toolAcc[idx] = { id: "", name: "", args: "", started: false };
            }
            const acc = toolAcc[idx];
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name) acc.name += tc.function.name;
            if (tc.function?.arguments) acc.args += tc.function.arguments;
            if (!acc.started && acc.name && acc.id) {
              acc.started = true;
              opts.onEvent({ type: "tool_call_start", id: acc.id, name: acc.name });
            }
            if (tc.function?.arguments && acc.started) {
              opts.onEvent({
                type: "tool_call_args",
                id: acc.id,
                argsDelta: tc.function.arguments,
              });
            }
          }
        }
        const finish = json.choices?.[0]?.finish_reason;
        if (finish === "tool_calls") {
          for (const k of Object.keys(toolAcc)) {
            const t = toolAcc[+k];
            opts.onEvent({ type: "tool_call_done", id: t.id, name: t.name, args: t.args });
          }
        }
      } catch {
        // partial JSON; put back and wait
        buffer = "data: " + data + "\n" + buffer;
        break;
      }
    }
  }
  opts.onEvent({ type: "done" });
}
