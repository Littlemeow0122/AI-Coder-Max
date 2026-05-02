// 全域使用者記憶（跨對話）
import { useEffect, useState } from "react";
import type { Memory } from "./types";
import { uid } from "./format";

const KEY = "coder-ai:memories:v1";

let memories: Memory[] = load();
const listeners = new Set<() => void>();

function load(): Memory[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memories));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function getMemories(): Memory[] {
  return memories;
}

export function addMemory(text: string, source: "ai" | "user" = "user"): Memory {
  const trimmed = text.trim();
  // 去重（簡易）
  const dup = memories.find((m) => m.text.toLowerCase() === trimmed.toLowerCase());
  if (dup) return dup;
  const m: Memory = { id: uid(), text: trimmed, createdAt: Date.now(), source };
  memories = [m, ...memories];
  persist();
  return m;
}

export function deleteMemory(id: string) {
  memories = memories.filter((m) => m.id !== id);
  persist();
}

export function clearMemories() {
  memories = [];
  persist();
}

export function importMemories(items: Memory[]) {
  const map = new Map(memories.map((m) => [m.text.toLowerCase(), m]));
  for (const m of items) {
    if (!map.has(m.text.toLowerCase())) map.set(m.text.toLowerCase(), m);
  }
  memories = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  persist();
}

export function useMemories() {
  const [, setT] = useState(0);
  useEffect(() => {
    const fn = () => setT((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return memories;
}

export function memoriesAsSystemText(): string {
  if (memories.length === 0) return "";
  const lines = memories.map((m, i) => `${i + 1}. ${m.text}`);
  return `以下是關於使用者的長期記憶（請自然地納入回應，不要每次重述）：\n${lines.join("\n")}`;
}
