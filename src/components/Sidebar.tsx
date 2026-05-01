import { useRef } from "react";
import { Plus, MessageSquare, Trash2, Download, Upload, Code2 } from "lucide-react";
import { useStore, storeActions } from "@/lib/store";
import { exportConversationsZip, importConversationsZip } from "@/lib/zipio";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function Sidebar({ onSelect }: { onSelect?: () => void }) {
  const { conversations, activeId } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      await exportConversationsZip(conversations);
      toast.success("已匯出 ZIP 檔案");
    } catch (e) {
      toast.error("匯出失敗：" + (e instanceof Error ? e.message : ""));
    }
  };

  const handleImport = async (file: File) => {
    try {
      const convs = await importConversationsZip(file);
      storeActions.importConversations(convs);
      toast.success(`已匯入 ${convs.length} 筆對話`);
    } catch (e) {
      toast.error("匯入失敗：" + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
          <Code2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[15px] font-semibold leading-tight">Coder AI</div>
          <div className="text-[11px] text-muted-foreground">Pollinations</div>
        </div>
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
              storeActions.selectConversation(c.id);
              onSelect?.();
            }}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{c.title || "新對話"}</span>
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
  );
}
