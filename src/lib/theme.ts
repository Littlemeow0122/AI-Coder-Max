// Theme: follow system, allow manual override
const KEY = "coder-ai:theme";
export type Theme = "system" | "light" | "dark";

function apply(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function getTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) || "system";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  apply(theme);
}

export function initTheme() {
  apply(getTheme());
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", () => {
    if (getTheme() === "system") apply("system");
  });
}
