import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { StatusChip } from "./StatusChip";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  // live timer for in-progress assistant
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

  return (
    <div className={cn("flex w-full animate-fade-up", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[85%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        <div className="px-1 text-[11px] tabular-nums text-muted-foreground">
          {formatDateTime(message.createdAt)}
        </div>

        {/* Attachments */}
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

        {/* Status steps (assistant) */}
        {isAssistant && message.steps && message.steps.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {message.steps.map((s) => (
              <StatusChip key={s.id} step={s} />
            ))}
          </div>
        )}

        {/* Content */}
        {message.content || isUser ? (
          <div
            className={cn(
              "rounded-[var(--radius-bubble)] px-4 py-2.5 shadow-[var(--shadow-bubble)]",
              isUser
                ? "bg-[hsl(var(--bubble-user))] text-[hsl(var(--bubble-user-foreground))]"
                : "bg-[hsl(var(--bubble-ai))] text-[hsl(var(--bubble-ai-foreground))]"
            )}
          >
            {isAssistant ? (
              <div className="prose-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</div>
            )}
          </div>
        ) : null}

        {/* Footer: total duration for assistant */}
        {isAssistant && message.finishedAt && (
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
