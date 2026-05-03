import JSZip from "jszip";
import type { Conversation, ExportPayload, Memory } from "./types";

export async function exportConversationsZip(
  conversations: Conversation[],
  memories: Memory[] = []
) {
  const payload: ExportPayload = {
    app: "AI Coder Max",
    version: 1,
    exportedAt: Date.now(),
    conversations,
    memories,
  };
  const zip = new JSZip();
  zip.file("conversations.json", JSON.stringify(payload, null, 2));
  for (const c of conversations) {
    zip.file(`conversations/${safeName(c.title || c.id)}.md`, conversationToMarkdown(c));
  }
  if (memories.length) {
    zip.file(
      "memories.md",
      "# 使用者記憶\n\n" + memories.map((m) => `- ${m.text}`).join("\n")
    );
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.download = `coder-ai-export-${stamp}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importConversationsZip(
  file: File
): Promise<{ conversations: Conversation[]; memories: Memory[] }> {
  const zip = await JSZip.loadAsync(file);
  const f = zip.file("conversations.json");
  if (!f) throw new Error("ZIP 內找不到 conversations.json");
  const data = JSON.parse(await f.async("string")) as ExportPayload;
  if (!Array.isArray(data.conversations)) throw new Error("檔案格式不正確");
  return { conversations: data.conversations, memories: data.memories ?? [] };
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60);
}

function conversationToMarkdown(c: Conversation): string {
  const lines: string[] = [];
  lines.push(`# ${c.title}`);
  lines.push(`建立：${new Date(c.createdAt).toISOString()}`);
  lines.push("");
  for (const m of c.messages) {
    lines.push(`## [${new Date(m.createdAt).toISOString()}] ${m.role}`);
    if (m.attachments?.length) {
      lines.push(`附件：${m.attachments.map((a) => a.name).join(", ")}`);
    }
    lines.push("");
    lines.push(m.content);
    lines.push("");
  }
  return lines.join("\n");
}
