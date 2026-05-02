import { useEffect, useState } from "react";
import {
  BrainIcon,
  SearchIcon,
  GlobeIcon,
  BookIcon,
  TextCursorIcon,
  ImageIcon,
  ImagePlusIcon,
  ChevronDownIcon,
} from "@/lib/icons";
import type { StatusStep } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

function useTick(active: boolean) {
  const [, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setT((n) => n + 1), 250);
    return () => clearInterval(i);
  }, [active]);
}

function pickIcon(kind: StatusStep["kind"]) {
  switch (kind) {
    case "thinking": return BrainIcon;
    case "searching": return SearchIcon;
    case "reading": return GlobeIcon;
    case "read_image": return ImageIcon;
    case "generate_image": return ImagePlusIcon;
    case "memory": return BookIcon;
    case "rename": return TextCursorIcon;
  }
}

export function StatusChip({ step }: { step: StatusStep }) {
  const active = !step.endedAt;
  useTick(active);

  // 思考時：active 預設展開；結束後預設折疊。其他 kind 預設折疊。
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const expandable =
    (step.kind === "thinking" && !!step.body) ||
    ((step.kind === "searching" || step.kind === "memory" || step.kind === "generate_image") && !!step.body) ||
    (step.kind === "generate_image" && !!step.imageUrl) ||
    (step.kind === "read_image" && !!step.body) ||
    (step.kind === "reading" && !!step.detail) ||
    (step.kind === "rename" && !!step.detail);

  const defaultOpen =
    step.kind === "thinking" ? active : false;
  const open = openOverride ?? defaultOpen;

  const elapsed = (step.endedAt ?? Date.now()) - step.startedAt;
  const Icon = pickIcon(step.kind);

  // 標籤
  let main = step.label;
  let suffix: React.ReactNode = null;
  if (step.kind === "reading" && step.detail) {
    main = "讀取";
    suffix = <span className="ml-1 font-normal text-muted-foreground">({truncateUrl(step.detail)})</span>;
  } else if (step.kind === "memory" && step.detail) {
    main = "已新增記憶";
    suffix = <span className="ml-1 font-normal text-muted-foreground">：「{truncate(step.detail, 30)}」</span>;
  } else if (step.kind === "rename" && step.detail) {
    main = "已改名";
    suffix = <span className="ml-1 font-normal text-muted-foreground">：「{truncate(step.detail, 30)}」</span>;
  } else if (step.kind === "generate_image") {
    main = "生成圖片";
  } else if (step.kind === "read_image") {
    main = "讀取圖片";
  } else if (step.kind === "searching") {
    main = "搜尋中";
  } else if (step.kind === "thinking") {
    main = active ? "思考中" : "已思考";
  }

  return (
    <div className="animate-fade-up">
      <button
        type="button"
        onClick={() => expandable && setOpenOverride(!open)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
          "border-[hsl(var(--status-border))] bg-[hsl(var(--status-bg))]",
          expandable ? "cursor-pointer hover:bg-muted" : "cursor-default",
          active && "ring-1 ring-accent/30"
        )}
      >
        <span
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center text-muted-foreground",
            active && "text-accent"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-medium">
          {main}
          {suffix}
        </span>
        <span className="tabular-nums text-muted-foreground">{formatDuration(elapsed)}</span>
        {active && (
          <span className="ml-0.5 inline-flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-current animate-pulse-dot" />
            <span className="h-1 w-1 rounded-full bg-current animate-pulse-dot [animation-delay:0.2s]" />
            <span className="h-1 w-1 rounded-full bg-current animate-pulse-dot [animation-delay:0.4s]" />
          </span>
        )}
        {expandable && (
          <ChevronDownIcon
            className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        )}
      </button>
      {open && expandable && (
        <div className="mt-1.5 ml-2 max-w-2xl rounded-xl border bg-card px-3 py-2 text-[13px] text-muted-foreground">
          {step.kind === "thinking" && step.body && (
            <pre className="whitespace-pre-wrap break-words font-sans text-foreground/85">
              {step.body}
            </pre>
          )}
          {step.kind === "searching" && (
            <>
              {step.detail && (
                <div className="mb-1">
                  搜尋查詢：<span className="text-foreground">{step.detail}</span>
                </div>
              )}
              {step.body && (
                <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-foreground/80">
                  {step.body}
                </pre>
              )}
            </>
          )}
          {step.kind === "reading" && step.detail && (
            <div className="break-all">
              網址：<span className="text-foreground">{step.detail}</span>
            </div>
          )}
          {step.kind === "memory" && step.body && (
            <div>
              記憶內容：<span className="text-foreground">{step.body}</span>
            </div>
          )}
          {step.kind === "rename" && step.detail && (
            <div>
              新標題：<span className="text-foreground">「{step.detail}」</span>
            </div>
          )}
          {step.kind === "read_image" && step.body && (
            <div>
              已讀取：<span className="text-foreground">{step.body}</span>
            </div>
          )}
          {step.kind === "generate_image" && (
            <div>
              {step.detail && (
                <div className="mb-2">
                  Prompt：<span className="text-foreground">{step.detail}</span>
                </div>
              )}
              {step.imageUrl && (
                <a href={step.imageUrl} target="_blank" rel="noreferrer">
                  <img
                    src={step.imageUrl}
                    alt={step.detail ?? "generated"}
                    className="max-h-64 rounded-lg border"
                  />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
function truncateUrl(u: string, max = 40) {
  return truncate(u, max);
}
