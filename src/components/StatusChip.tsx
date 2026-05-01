import { useEffect, useState } from "react";
import { BrainIcon, SearchIcon, GlobeIcon } from "@/lib/icons";
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

export function StatusChip({ step }: { step: StatusStep }) {
  const active = !step.endedAt;
  useTick(active);
  const [open, setOpen] = useState(false);

  const elapsed = (step.endedAt ?? Date.now()) - step.startedAt;
  const Icon = step.kind === "thinking" ? BrainIcon : step.kind === "searching" ? SearchIcon : GlobeIcon;

  const hasDetail = !!step.detail;
  const labelMain =
    step.kind === "reading" && step.detail
      ? `讀取`
      : step.kind === "searching"
      ? "搜尋中"
      : step.label;

  return (
    <div className="animate-fade-up">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px]",
          "border transition-colors",
          "border-[hsl(var(--status-border))] bg-[hsl(var(--status-bg))]",
          hasDetail ? "cursor-pointer hover:bg-muted" : "cursor-default",
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
          {labelMain}
          {step.kind === "reading" && step.detail ? (
            <span className="ml-1 font-normal text-muted-foreground">
              ({truncateUrl(step.detail)})
            </span>
          ) : null}
        </span>
        <span className="tabular-nums text-muted-foreground">{formatDuration(elapsed)}</span>
        {active && (
          <span className="ml-0.5 inline-flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-current animate-pulse-dot" />
            <span className="h-1 w-1 rounded-full bg-current animate-pulse-dot [animation-delay:0.2s]" />
            <span className="h-1 w-1 rounded-full bg-current animate-pulse-dot [animation-delay:0.4s]" />
          </span>
        )}
      </button>
      {open && hasDetail && (
        <div className="mt-1.5 ml-2 max-w-full rounded-lg border bg-card px-3 py-2 text-[13px] text-muted-foreground break-all">
          {step.kind === "searching" ? "搜尋查詢：" : "網址："}
          <span className="text-foreground">{step.detail}</span>
        </div>
      )}
    </div>
  );
}

function truncateUrl(u: string, max = 40) {
  if (u.length <= max) return u;
  return u.slice(0, max - 1) + "…";
}
