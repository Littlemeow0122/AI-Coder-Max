// 簡易事件匯流排：useChat 失敗時通知伺服器健康度圖表下跌
type Listener = (kind: "fail" | "ok") => void;
const listeners = new Set<Listener>();

export function emitServerHealth(kind: "fail" | "ok") {
  listeners.forEach((l) => l(kind));
}
export function onServerHealth(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
