import { useEffect, useRef, useState } from "react";
import { Menu, Code2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useChat } from "@/lib/useChat";
import { Sidebar } from "@/components/Sidebar";
import { Composer } from "@/components/Composer";
import { MessageBubble } from "@/components/MessageBubble";
import { CodeCanvas } from "@/components/CodeCanvas";
import { useCanvas } from "@/lib/canvas";
import { cn } from "@/lib/utils";

const Index = () => {
  const { conversations, activeId } = useStore();
  const conv = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const { send, stop, retry, busy } = useChat(conv);
  const canvas = useCanvas();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [conv?.messages]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

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
        <header className="flex items-center gap-2 border-b border-border glass px-4 py-3">
          <button
            className="rounded-lg p-1.5 hover:bg-muted md:hidden"
            onClick={() => setMobileSidebar(true)}
            aria-label="選單"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Code2 className="h-4 w-4 text-muted-foreground md:hidden" />
          <h1 className="flex-1 truncate text-sm font-medium">{conv?.title ?? "AI Coder Max"}</h1>
          <span className="hidden rounded-full border bg-card px-2.5 py-0.5 text-[11px] text-muted-foreground sm:inline-block">
            Pollinations · OpenAI
          </span>
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
            <EmptyState />
          )}
        </div>

        <Composer onSend={send} onStop={stop} busy={busy} />
      </main>

      {canvas && <CodeCanvas />}
    </div>
  );
};

function EmptyState() {
  const examples = [
    "用 TypeScript 寫一個 LRU Cache",
    "解釋 React Server Components",
    "讀取 https://react.dev/ 並摘要重點",
    "搜尋最新的 Bun 1.3 新功能",
  ];
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-[var(--shadow-soft)]">
        <Code2 className="h-7 w-7" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">AI Coder</h2>
      <p className="mb-8 text-sm text-muted-foreground">
        專注於程式設計的 AI 助理 · 上網搜尋、讀取網頁、生成圖片、長期記憶
      </p>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {examples.map((e) => (
          <div
            key={e}
            className="rounded-xl border bg-card px-4 py-3 text-left text-sm text-muted-foreground"
          >
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Index;
