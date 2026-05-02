import { useState } from "react";
import { Settings, BookMarked, Trash2, Plus, X } from "lucide-react";
import {
  useMemories,
  addMemory,
  deleteMemory,
  clearMemories,
} from "@/lib/memory";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const memories = useMemories();
  const [tab, setTab] = useState<"memory" | "appearance">("memory");
  const [newMem, setNewMem] = useState("");
  const [theme, setThemeState] = useState<Theme>(getTheme());

  useEffect(() => {
    const unsub = subscribeTheme(() => setThemeState(getTheme()));
    return () => { unsub; };
  }, []);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[70] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <h2 className="text-sm font-semibold">設定</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex border-b">
          <button
            onClick={() => setTab("memory")}
            className={cn(
              "flex-1 py-2 text-sm",
              tab === "memory" ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"
            )}
          >
            <BookMarked className="mr-1 inline h-3.5 w-3.5" /> 記憶
          </button>
          <button
            onClick={() => setTab("appearance")}
            className={cn(
              "flex-1 py-2 text-sm",
              tab === "appearance" ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"
            )}
          >
            外觀
          </button>
        </div>

        {tab === "memory" ? (
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin p-4">
            <div className="mb-3 flex gap-2">
              <input
                value={newMem}
                onChange={(e) => setNewMem(e.target.value)}
                placeholder="新增一則關於你的記憶（例：我習慣用 TypeScript）"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMem.trim()) {
                    addMemory(newMem.trim(), "user");
                    setNewMem("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newMem.trim()) {
                    addMemory(newMem.trim(), "user");
                    setNewMem("");
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-foreground px-3 py-2 text-sm text-background"
              >
                <Plus className="h-4 w-4" /> 新增
              </button>
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">
              這些記憶會自動帶入每段新對話。AI 也會自動為你新增。
            </p>
            <div className="space-y-1.5">
              {memories.length === 0 ? (
                <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                  目前沒有記憶
                </div>
              ) : (
                memories.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-start gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <span className={cn(
                      "mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                      m.source === "ai" ? "bg-accent" : "bg-muted-foreground"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="break-words">{m.text}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {m.source === "ai" ? "AI 自動" : "手動新增"}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMemory(m.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {memories.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("清除所有記憶？")) clearMemories();
                }}
                className="mt-3 text-[12px] text-destructive hover:underline"
              >
                清除全部記憶
              </button>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-2 text-sm font-medium">主題</div>
            <div className="flex gap-2">
              {(["system", "light", "dark"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-3 text-sm",
                    theme === t ? "border-foreground bg-muted font-medium" : "hover:bg-muted"
                  )}
                >
                  {t === "system" ? "跟隨系統" : t === "light" ? "淺色" : "深色"}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">
              預設跟隨系統設定。手動切換後會記住偏好；切回「跟隨系統」會即時跟隨裝置主題切換。
            </p>
          </div>
        )}
      </div>
    </>
  );
}
