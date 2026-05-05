import { useRef, useState } from "react";
import { Plus, MessageSquare, Trash2, Download, Upload, Code2, Settings, Pencil, Check } from "lucide-react";
import { useStore, storeActions } from "@/lib/store";
import { exportConversationsZip, importConversationsZip } from "@/lib/zipio";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SettingsDialog } from "./SettingsDialog";
import { importMemories, getMemories } from "@/lib/memory";
import { FpsBadge, ServerHealthChart } from "./StatusIndicators";

export function Sidebar({ onSelect }: { onSelect?: () => void }) {
  const { conversations, activeId } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleExport = async () => {
    try {
      const mems = getMemories();
      let include = false;
      if (mems.length > 0) {
        include = confirm(`是否將你的 ${mems.length} 則記憶一同匯出？\n\n按「確定」包含記憶，按「取消」只匯出對話。`);
      }
      await exportConversationsZip(conversations, include ? mems : []);
      toast.success("已匯出 ZIP 檔案");
    } catch (e) {
      toast.error("匯出失敗：" + (e instanceof Error ? e.message : ""));
    }
  };

  const handleImport = async (file: File) => {
    try {
      const { conversations: convs, memories } = await importConversationsZip(file);
      storeActions.importConversations(convs);
      let importedMem = 0;
      if (memories?.length) {
        const preview = memories.slice(0, 5).map((m) => `• ${m.text}`).join("\n");
        const more = memories.length > 5 ? `\n…還有 ${memories.length - 5} 則` : "";
        const ok = confirm(
          `你確定要匯入這些記憶嗎？（共 ${memories.length} 則）\n\n${preview}${more}`
        );
        if (ok) {
          importMemories(memories);
          importedMem = memories.length;
        }
      }
      toast.success(
        `已匯入 ${convs.length} 筆對話` + (importedMem ? `、${importedMem} 則記憶` : "")
      );
    } catch (e) {
      toast.error("匯入失敗：" + (e instanceof Error ? e.message : ""));
    }
  };

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingText(title);
  };
  const commitEdit = () => {
    if (editingId && editingText.trim()) {
      storeActions.renameConversation(editingId, editingText.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Code2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold leading-tight">AI Coder Max</div>
            <div className="mt-0.5 flex items-center gap-1">
              <FpsBadge />
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="設定"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={() => {
              storeActions.newConversation();
              onSelect?.();
            }}
            className="flex w-full items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> 新對話
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto scrollbar-thin px-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                c.id === activeId ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
              )}
              onClick={() => {
                if (editingId === c.id) return;
                storeActions.selectConversation(c.id);
                onSelect?.();
              }}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {editingId === c.id ? (
                <input
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 rounded border bg-background px-1.5 py-0.5 text-sm outline-none"
                />
              ) : (
                <span className="flex-1 truncate">{c.title || "新對話"}</span>
              )}
              {editingId === c.id ? (
                <button
                  onClick={(e) => { e.stopPropagation(); commitEdit(); }}
                  className="text-muted-foreground"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              ) : (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(c.id, c.title); }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    title="重新命名"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("刪除此對話？")) storeActions.deleteConversation(c.id);
                    }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="刪除"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-card px-2 py-2 text-xs transition-colors hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> 匯出
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-card px-2 py-2 text-xs transition-colors hover:bg-muted"
            >
              <Upload className="h-3.5 w-3.5" /> 匯入
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
          </div>
        </div>
      </aside>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
