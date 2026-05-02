// 右側預覽面板：簡單的全域 store
import { useEffect, useState } from "react";

export type CanvasItem = {
  id: string;        // 穩定 id，例如 messageId-blockIndex
  title: string;     // 顯示用：lang/檔名
  language: string;  // html / tsx / ...
  code: string;
};

let current: CanvasItem | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function openCanvas(item: CanvasItem) {
  current = item;
  emit();
}
export function updateCanvas(item: CanvasItem) {
  // 若同 id 開啟中則同步內容（串流時）
  if (current && current.id === item.id) {
    current = item;
    emit();
  }
}
export function closeCanvas() {
  current = null;
  emit();
}
export function getCanvas() {
  return current;
}

export function useCanvas() {
  const [, setT] = useState(0);
  useEffect(() => {
    const fn = () => setT((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return current;
}

export function extToLang(lang: string): string {
  return lang.toLowerCase().trim();
}

export function langToExt(lang: string): string {
  const map: Record<string, string> = {
    js: "js", javascript: "js", ts: "ts", typescript: "ts",
    tsx: "tsx", jsx: "jsx",
    py: "py", python: "py",
    html: "html", htm: "html",
    css: "css", scss: "scss",
    md: "md", markdown: "md",
    json: "json", yaml: "yml", yml: "yml",
    sh: "sh", bash: "sh", shell: "sh", zsh: "sh",
    go: "go", rust: "rs", rs: "rs",
    java: "java", c: "c", cpp: "cpp", "c++": "cpp",
    cs: "cs", "c#": "cs", csharp: "cs",
    rb: "rb", ruby: "rb", php: "php", swift: "swift", kt: "kt", kotlin: "kt",
    sql: "sql", xml: "xml", toml: "toml", ini: "ini",
  };
  return map[lang.toLowerCase()] || lang.toLowerCase() || "txt";
}

export function isPreviewable(lang: string) {
  const l = lang.toLowerCase();
  return l === "html" || l === "htm" || l === "md" || l === "markdown";
}
