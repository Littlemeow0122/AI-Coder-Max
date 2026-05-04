// 模型/思考模式 偏好設定（含側邊欄折疊狀態）
import { useEffect, useState } from "react";

export type ModelId = "coder-max-1.0" | "coder-max-2.0";
export type ThinkMode = "flash" | "pro";

export type AppSettings = {
  model: ModelId;
  think: ThinkMode;
  sidebarCollapsed: boolean;
};

const KEY = "coder-ai:settings:v1";

const DEFAULT: AppSettings = {
  model: "coder-max-2.0",
  think: "flash",
  sidebarCollapsed: false,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

let state: AppSettings = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function getSettings(): AppSettings {
  return state;
}

export function setSettings(patch: Partial<AppSettings>) {
  state = { ...state, ...patch };
  persist();
}

export function useSettings(): AppSettings {
  const [, setT] = useState(0);
  useEffect(() => {
    const fn = () => setT((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}

export const MODEL_LABEL: Record<ModelId, string> = {
  "coder-max-1.0": "Coder Max 1.0",
  "coder-max-2.0": "Coder Max 2.0",
};

export const MODEL_DESC: Record<ModelId, string> = {
  "coder-max-1.0": "適合處理小事物",
  "coder-max-2.0": "擅長於思考",
};

export const THINK_LABEL: Record<ThinkMode, string> = {
  flash: "Flash",
  pro: "Pro",
};

export const THINK_DESC: Record<ThinkMode, string> = {
  flash: "適合日常事務",
  pro: "擅長難題",
};
