import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useEffect, useState } from "react";
import type { Message } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { StatusChip } from "./StatusChip";
import { CanvasCodeCard, InlineCodeBlock } from "./CodeBlocks";
import { cn } from "@/lib/utils";
import { parseMarkdownSegments } from "@/lib/markdown";
import { openCanvas, useCanvas, getCanvas } from "@/lib/canvas";
import { RetryIcon } from "@/lib/icons";

export function MessageBubble({
  message,
  onRetry,
}: {
  message: Message;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const canvas = useCanvas();

  const [, setT] = useState(0);
  useEffect(() => {
    if (isAssistant && !message.finishedAt) {
      const i = setInterval(() => setT((n) => n + 1), 250);
      return () => clearInterval(i);
    }
  }, [isAssistant, message.finishedAt]);

  const totalMs = isAssistant
    ? (message.finishedAt ?? Date.now()) - message.createdAt
    : 0;

  // 過濾 Pollinations 廣告片段（出現「🌸 Ad 🌸」或 "Support Pollinations" 之後的全部內容）
  const cleanContent = (() => {
    if (!isAssistant) return message.content;
    let s = message.content;
    const markers = [
      /\n*-{2,}\s*\n*\s*\*?\*?Support Pollinations[\s\S]*$/i,
      /\n*Support Pollinations[\s\S]*$/i,
      /\n*🌸\s*Ad\s*🌸[\s\S]*$/i,
      /\n*Powered by Pollinations[\s\S]*$/i,
    ];
    for (const re of markers) s = s.replace(re, "");
    return s;
  })();
  const segments = isAssistant ? parseMarkdownSegments(cleanContent) : [];

  return (
    <div className={cn("flex w-full animate-fade-up", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[88%] flex-col gap-1.5", isUser ? "items-end" : "items-start w-full")}>
        <div className="px-1 text-[11px] tabular-nums text-muted-foreground">
          {formatDateTime(message.createdAt)}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", isUser ? "justify-end" : "justify-start")}>
            {message.attachments.map((a) =>
              a.kind === "image" && a.dataUrl ? (
                <img
                  key={a.id}
                  src={a.dataUrl}
                  alt={a.name}
                  className="max-h-48 max-w-[240px] rounded-xl border object-cover shadow-[var(--shadow-bubble)]"
                />
              ) : (
                <div
                  key={a.id}
                  className="rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground"
                >
                  📎 {a.name}
                </div>
              )
            )}
          </div>
        )}

        {isAssistant && message.steps && message.steps.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            {message.steps.map((s) => (
              <StatusChip key={s.id} step={s} />
            ))}
          </div>
        )}

        {isUser ? (
          message.content && (
            <div className="rounded-[var(--radius-bubble)] bg-[hsl(var(--bubble-user))] px-4 py-2.5 text-[hsl(var(--bubble-user-foreground))] shadow-[var(--shadow-bubble)]">
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {message.content}
              </div>
            </div>
          )
        ) : segments.length > 0 ? (
          <div className="w-full max-w-full overflow-hidden rounded-[var(--radius-bubble)] bg-[hsl(var(--bubble-ai))] px-4 py-2.5 text-[hsl(var(--bubble-ai-foreground))] shadow-[var(--shadow-bubble)]">
            <div className="prose-chat">
              {segments.map((seg, i) => {
                if (seg.type === "text") {
                  return (
                    <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {seg.text}
                    </ReactMarkdown>
                  );
                }
                if (seg.type === "inline-code") {
                  return <InlineCodeBlock key={i} language={seg.lang} code={seg.code} />;
                }
                const cid = `${message.id}-c${seg.index}`;
                const active = getCanvas()?.id === cid;
                return (
                  <CanvasCodeCard
                    key={i}
                    language={seg.lang}
                    code={seg.code}
                    active={active}
                    onOpen={() =>
                      openCanvas({
                        id: cid,
                        title: `${seg.lang || "code"} (${seg.code.split("\n").length} 行)`,
                        language: seg.lang,
                        code: seg.code,
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 錯誤 + 重試 */}
        {isAssistant && message.error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
            <span>⚠️ {message.error}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-0.5 text-[12px] hover:bg-destructive/10"
              >
                <RetryIcon className="h-3.5 w-3.5" /> 重試
              </button>
            )}
          </div>
        )}

        {isAssistant && message.finishedAt && !message.error && (
          <div className="px-1 text-[11px] tabular-nums text-muted-foreground">
            完成於 {formatDateTime(message.finishedAt)} · 用時 {formatDuration(totalMs)}
          </div>
        )}
        {isAssistant && !message.finishedAt && totalMs > 0 && (
          <div className="px-1 text-[11px] tabular-nums text-muted-foreground">
            {formatDuration(totalMs)}
          </div>
        )}
      </div>
    </div>
  );
}
