import JSZip from "jszip";
import type { Conversation, ExportPayload } from "./types";

export async function exportConversationsZip(conversations: Conversation[]) {
  const payload: ExportPayload = {
    app: "Coder AI",
    version: 1,
    exportedAt: Date.now(),
    conversations,
  };
  const zip = new JSZip();
  zip.file("conversations.json", JSON.stringify(payload, null, 2));
  // also write per-conversation markdown for human readability
  for (const c of conversations) {
    const md = conversationToMarkdown(c);
    zip.file(`conversations/${safeName(c.title || c.id)}.md`, md);
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

export async function importConversationsZip(file: File): Promise<Conversation[]> {
  const zip = await JSZip.loadAsync(file);
  const f = zip.file("conversations.json");
  if (!f) throw new Error("ZIP 內找不到 conversations.json");
  const text = await f.async("string");
  const data = JSON.parse(text) as ExportPayload;
  if (!data.conversations || !Array.isArray(data.conversations)) {
    throw new Error("檔案格式不正確");
  }
  return data.conversations;
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
