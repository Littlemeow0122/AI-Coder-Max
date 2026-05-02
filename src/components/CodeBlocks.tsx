import { useState } from "react";
import { CopyIcon, CheckIcon, DownloadIcon } from "@/lib/icons";
import { langToExt } from "@/lib/canvas";
import { cn } from "@/lib/utils";

// 4反引號用：直接顯示在訊息中，只有複製
export function InlineCodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="my-3 overflow-hidden rounded-xl border bg-[hsl(var(--secondary))]">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {language || "code"}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
          {copied ? "已複製" : "複製"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// 3反引號用：訊息中顯示一張卡片，點開預覽到右側
export function CanvasCodeCard({
  language,
  code,
  onOpen,
  active,
}: {
  language: string;
  code: string;
  onOpen: () => void;
  active?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };
  const download = (e: React.MouseEvent) => {
    e.stopPropagation();
    const ext = langToExt(language);
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const lines = code.split("\n").length;
  const preview = code.split("\n").slice(0, 3).join("\n");
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "my-3 flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-all hover:bg-muted",
        active && "ring-2 ring-accent/40"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background font-mono text-[10px] uppercase">
        {(langToExt(language) || "txt").slice(0, 4)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">
          {language || "code"} · {lines} 行
        </div>
        <pre className="truncate font-mono text-[11px] text-muted-foreground">
          {preview.replace(/\n/g, " · ")}
        </pre>
      </div>
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
          title="複製"
        >
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={download}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
          title="下載"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </button>
  );
}
