// Theme: 預設跟隨系統，亦可手動覆寫
const KEY = "coder-ai:theme";
export type Theme = "system" | "light" | "dark";

const listeners = new Set<() => void>();

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && systemDark());
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  listeners.forEach((l) => l());
}

export function getTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) || "system";
}

export function setTheme(theme: Theme) {
  if (theme === "system") localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, theme);
  apply(theme);
}

export function isDark() {
  return document.documentElement.classList.contains("dark");
}

export function subscribeTheme(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let inited = false;
export function initTheme() {
  if (inited) return;
  inited = true;
  apply(getTheme());
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getTheme() === "system") apply("system");
  };
  if (mq.addEventListener) mq.addEventListener("change", handler);
  else mq.addListener(handler);
}
