// 通用「勾選清單」對話框：用於匯入/匯出時讓使用者挑要包含哪些項目
import { useEffect, useMemo, useState } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectGroup<T> = {
  key: string;
  title: string;        // 例如「聊天」「記憶」
  items: T[];
  render: (item: T) => string;
  idOf: (item: T) => string;
};

export function SelectDialog<T>({
  open,
  title,
  description,
  groups,
  confirmText = "確定",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  groups: SelectGroup<T>[];
  confirmText?: string;
  onClose: () => void;
  onConfirm: (selected: Record<string, string[]>) => void;
}) {
  const initial = useMemo<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {};
    for (const g of groups) out[g.key] = new Set(g.items.map(g.idOf));
    return out;
  }, [groups]);

  const [sel, setSel] = useState<Record<string, Set<string>>>(initial);
  useEffect(() => {
    if (open) setSel(initial);
  }, [open, initial]);

  if (!open) return null;

  const toggle = (gkey: string, id: string) => {
    setSel((prev) => {
      const next = { ...prev, [gkey]: new Set(prev[gkey]) };
      if (next[gkey].has(id)) next[gkey].delete(id);
      else next[gkey].add(id);
      return next;
    });
  };

  const setAll = (gkey: string, all: boolean, items: T[], idOf: (i: T) => string) => {
    setSel((prev) => ({
      ...prev,
      [gkey]: all ? new Set(items.map(idOf)) : new Set(),
    }));
  };

  const totalSelected = Object.values(sel).reduce((n, s) => n + s.size, 0);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[70] w-[min(560px,92vw)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {groups.map((g) => {
            const allChecked = g.items.length > 0 && sel[g.key]?.size === g.items.length;
            return (
              <div key={g.key}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {g.title}{" "}
                    <span className="text-xs text-muted-foreground">
                      （{sel[g.key]?.size ?? 0}/{g.items.length}）
                    </span>
                  </div>
                  <button
                    onClick={() => setAll(g.key, !allChecked, g.items, g.idOf)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {allChecked ? "取消全選" : "全選"}
                  </button>
                </div>
                {g.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
                    沒有項目
                  </div>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin rounded-lg border bg-background p-1">
                    {g.items.map((it) => {
                      const id = g.idOf(it);
                      const checked = sel[g.key]?.has(id) ?? false;
                      return (
                        <label
                          key={id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border",
                              checked
                                ? "bg-foreground text-background border-foreground"
                                : "border-muted-foreground/40"
                            )}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <span className="truncate flex-1">{g.render(it)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">已選 {totalSelected} 項</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border bg-card px-3 py-1.5 text-sm hover:bg-muted"
            >
              取消
            </button>
            <button
              onClick={() => {
                const out: Record<string, string[]> = {};
                for (const g of groups) out[g.key] = Array.from(sel[g.key] ?? []);
                onConfirm(out);
              }}
              className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
