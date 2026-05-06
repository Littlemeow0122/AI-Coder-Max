import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Code2, Shuffle, PanelLeftClose, PanelLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useChat } from "@/lib/useChat";
import { Sidebar } from "@/components/Sidebar";
import { Composer } from "@/components/Composer";
import { MessageBubble } from "@/components/MessageBubble";
import { CodeCanvas } from "@/components/CodeCanvas";
import { useCanvas } from "@/lib/canvas";
import { useSettings, setSettings } from "@/lib/settings";
import { FpsBadge, ServerSignalBadge } from "@/components/StatusIndicators";
import { cn } from "@/lib/utils";

const Index = () => {
  const { conversations, activeId } = useStore();
  const conv = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const { send, stop, retry, busy } = useChat(conv);
  const canvas = useCanvas();
  const settings = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [conv?.messages]);

  const collapsed = settings.sidebarCollapsed;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {!collapsed && (
        <div className="hidden md:flex">
          <Sidebar />
        </div>
      )}

      {mobileSidebar && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileSidebar(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden animate-fade-up">
            <Sidebar onSelect={() => setMobileSidebar(false)} />
          </div>
        </>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b border-border glass px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            className="rounded-lg p-1.5 hover:bg-muted md:hidden"
            onClick={() => setMobileSidebar(true)}
            aria-label="選單"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
            onClick={() => setSettings({ sidebarCollapsed: !collapsed })}
            title={collapsed ? "顯示側邊欄" : "隱藏側邊欄"}
            aria-label="切換側邊欄"
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <Code2 className="h-4 w-4 text-muted-foreground md:hidden" />
          <h1 className="flex-1 truncate text-sm font-medium">{conv?.title ?? "AI Coder Max"}</h1>
          <div className="hidden items-center gap-1.5 sm:flex">
            <FpsBadge />
            <ServerSignalBadge />
          </div>
        </header>

        <div ref={scrollRef} className={cn("flex-1 overflow-y-auto scrollbar-thin")}>
          {conv?.messages.length ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
              {conv.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onRetry={m.error ? () => retry(m.id) : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState onPick={(q) => send(q, [])} />
          )}
        </div>

        <Composer onSend={send} onStop={stop} busy={busy} />
      </main>

      {canvas && <CodeCanvas />}
    </div>
  );
};

const ALL_EXAMPLES = [
  "用 TypeScript 寫一個 LRU Cache",
  "解釋 React Server Components 的原理",
  "讀取 https://react.dev/ 並摘要重點",
  "搜尋最新的 Bun 1.3 新功能",
  "用 Python 寫一個快速排序並解釋複雜度",
  "比較 Vite 與 Webpack 的差異",
  "如何在 Node.js 中處理大型檔案串流？",
  "畫一張未來感的 AI 機器人插圖",
  "用 Rust 寫一個簡單的 HTTP server",
  "解釋 JavaScript 的事件迴圈與微任務",
  "幫我設計一個 Postgres 多租戶資料表結構",
  "用 SwiftUI 做一個待辦清單範例",
  "什麼是 CRDT？舉一個實際應用",
  "用 Tailwind 做一個 Apple 風卡片",
  "搜尋 2025 年最熱門的 AI 框架",
  "如何用 Go 實作 worker pool？",
  "解釋 TCP 三次握手",
  "讀取 https://news.ycombinator.com/ 列出今天熱門",
  "用 React 寫一個無限滾動 Hook",
  "比較 GraphQL 與 tRPC",
  "解釋 Docker 與 Kubernetes 的關係",
  "用 Kotlin 寫一個 Android Compose 按鈕",
  "什麼是 Zero Trust 架構？",
  "幫我寫一個 Regex 解析 ISO 8601 日期",
  "用 Three.js 顯示一個旋轉立方體",
  "解釋 OAuth 2.0 PKCE 流程",
  "畫一張極簡風格的程式碼編輯器 icon",
  "用 SQL 找出每個用戶最近一筆訂單",
  "搜尋最新的 V8 引擎優化",
  "用 C++ 實作一個 thread-safe queue",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const [seed, setSeed] = useState(0);
  const examples = useMemo(() => shuffle(ALL_EXAMPLES).slice(0, 4), [seed]);
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-[var(--shadow-soft)]">
        <Code2 className="h-7 w-7" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">AI Coder Max</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        專注於程式設計的 AI 助理 · 上網搜尋、讀取網頁、生成圖片、長期記憶
      </p>
      <div className="mb-3 flex w-full items-center justify-between">
        <span className="text-[12px] text-muted-foreground">試試看</span>
        <button
          onClick={() => setSeed((n) => n + 1)}
          className="inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Shuffle className="h-3.5 w-3.5" /> 隨機
        </button>
      </div>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {examples.map((e) => (
          <button
            key={e}
            onClick={() => onPick(e)}
            className="rounded-xl border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-muted hover:text-foreground hover:shadow-[var(--shadow-soft)]"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Index;
