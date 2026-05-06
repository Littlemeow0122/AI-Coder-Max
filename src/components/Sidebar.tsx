import { useRef, useState } from "react";
import { Plus, MessageSquare, Trash2, Download, Upload, Code2, Settings, Pencil, Check } from "lucide-react";
import { useStore, storeActions } from "@/lib/store";
import { exportConversationsZip, importConversationsZip } from "@/lib/zipio";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SettingsDialog } from "./SettingsDialog";
import { importMemories, getMemories } from "@/lib/memory";
import { SelectDialog, type SelectGroup } from "./SelectDialog";
import type { Conversation, Memory } from "@/lib/types";

export function Sidebar({ onSelect }: { onSelect?: () => void }) {
  const { conversations, activeId } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 匯出選擇
  const [exportOpen, setExportOpen] = useState(false);
  // 匯入選擇
  const [importOpen, setImportOpen] = useState(false);
  const [importPayload, setImportPayload] = useState<{
    conversations: Conversation[];
    memories: Memory[];
  } | null>(null);

  const onExportClick = () => setExportOpen(true);

  const handleExportConfirm = async (sel: Record<string, string[]>) => {
    setExportOpen(false);
    try {
      const allMems = getMemories();
      const chosenConvs = conversations.filter((c) => sel.chats?.includes(c.id));
      const chosenMems = allMems.filter((m) => sel.memories?.includes(m.id));
      if (chosenConvs.length === 0 && chosenMems.length === 0) {
        toast.error("請至少選擇一項");
        return;
      }
      await exportConversationsZip(chosenConvs, chosenMems);
      toast.success(`已匯出 ${chosenConvs.length} 筆對話、${chosenMems.length} 則記憶`);
    } catch (e) {
      toast.error("匯出失敗：" + (e instanceof Error ? e.message : ""));
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const data = await importConversationsZip(file);
      setImportPayload(data);
      setImportOpen(true);
    } catch (e) {
      toast.error("匯入失敗：" + (e instanceof Error ? e.message : ""));
    }
  };

  const handleImportConfirm = (sel: Record<string, string[]>) => {
    if (!importPayload) return;
    setImportOpen(false);
    const convs = importPayload.conversations.filter((c) => sel.chats?.includes(c.id));
    const mems = importPayload.memories.filter((m) => sel.memories?.includes(m.id));
    if (convs.length) storeActions.importConversations(convs);
    if (mems.length) importMemories(mems);
    toast.success(`已匯入 ${convs.length} 筆對話、${mems.length} 則記憶`);
    setImportPayload(null);
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

  const exportGroups: SelectGroup<Conversation | Memory>[] = [
    {
      key: "chats",
      title: "聊天",
      items: conversations,
      render: (c) => (c as Conversation).title || "新對話",
      idOf: (c) => (c as Conversation).id,
    },
    {
      key: "memories",
      title: "記憶",
      items: getMemories(),
      render: (m) => (m as Memory).text,
      idOf: (m) => (m as Memory).id,
    },
  ];

  const importGroups: SelectGroup<Conversation | Memory>[] = importPayload
    ? [
        {
          key: "chats",
          title: "聊天",
          items: importPayload.conversations,
          render: (c) => (c as Conversation).title || "新對話",
          idOf: (c) => (c as Conversation).id,
        },
        {
          key: "memories",
          title: "記憶",
          items: importPayload.memories,
          render: (m) => (m as Memory).text,
          idOf: (m) => (m as Memory).id,
        },
      ]
    : [];

  return (
    <>
      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Code2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold leading-tight">AI Coder Max</div>
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

        <div className="border-t border-border p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border bg-card px-2 py-2 text-xs transition-colors hover:bg-muted"
          >
            <Settings className="h-3.5 w-3.5" /> 設定
          </button>
          <div className="flex gap-2">
            <button
              onClick={onExportClick}
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
                if (f) handleImportFile(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
          </div>
        </div>
      </aside>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <SelectDialog
        open={exportOpen}
        title="匯出"
        description="勾選想匯出的聊天與記憶（預設全選）。"
        groups={exportGroups}
        confirmText="匯出"
        onClose={() => setExportOpen(false)}
        onConfirm={handleExportConfirm}
      />

      <SelectDialog
        open={importOpen}
        title="匯入"
        description="你確定要匯入這些項目嗎？預設全選，可取消。"
        groups={importGroups}
        confirmText="匯入"
        onClose={() => { setImportOpen(false); setImportPayload(null); }}
        onConfirm={handleImportConfirm}
      />
    </>
  );
}
