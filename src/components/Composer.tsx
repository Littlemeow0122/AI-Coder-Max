import { useRef, useState, KeyboardEvent, ChangeEvent } from "react";
import { Paperclip, ArrowUp, Square, X, ChevronDown, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/types";
import { uid } from "@/lib/format";
import {
  useSettings,
  setSettings,
  MODEL_LABEL,
  MODEL_DESC,
  THINK_LABEL,
  THINK_DESC,
  type ModelId,
  type ThinkMode,
} from "@/lib/settings";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const TEXT_EXT = /\.(txt|md|json|csv|tsv|log|xml|yaml|yml|html|htm|css|scss|less|js|jsx|ts|tsx|py|go|rs|java|c|h|cpp|hpp|cs|rb|php|sh|bash|zsh|sql|toml|ini|env|swift|kt|dart)$/i;

async function fileToAttachment(file: File): Promise<Attachment> {
  const id = uid();
  if (file.type.startsWith("image/")) {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    return { id, name: file.name, type: file.type, size: file.size, dataUrl, kind: "image" };
  }
  if (file.type.startsWith("text/") || TEXT_EXT.test(file.name)) {
    const text = await file.text();
    return { id, name: file.name, type: file.type || "text/plain", size: file.size, text, kind: "text" };
  }
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  return { id, name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl, kind: "file" };
}

export function Composer({
  onSend,
  onStop,
  busy,
}: {
  onSend: (text: string, atts: Attachment[]) => void;
  onStop: () => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (busy) return;
    if (!text.trim() && atts.length === 0) return;
    onSend(text, atts);
    setText("");
    setAtts([]);
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const next: Attachment[] = [];
    for (const f of files) {
      try {
        next.push(await fileToAttachment(f));
      } catch {
        /* ignore */
      }
    }
    setAtts((a) => [...a, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="border-t border-border glass">
      <div className="mx-auto w-full max-w-3xl px-4 py-3">
        {atts.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {atts.map((a) => (
              <div
                key={a.id}
                className="group relative flex items-center gap-2 rounded-xl border bg-card px-2.5 py-1.5 pr-7 text-xs"
              >
                {a.kind === "image" && a.dataUrl ? (
                  <img src={a.dataUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
                ) : (
                  <span className="text-base">📄</span>
                )}
                <span className="max-w-[180px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => setAtts((s) => s.filter((x) => x.id !== a.id))}
                  className="absolute right-1 top-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={cn(
          "flex items-end gap-2 rounded-[24px] border bg-card px-3 py-2 shadow-[var(--shadow-soft)]",
          "focus-within:ring-2 focus-within:ring-ring/40"
        )}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="附加檔案"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFiles}
            accept="image/*,text/*,.md,.json,.csv,.log,.xml,.yaml,.yml,.html,.css,.js,.jsx,.ts,.tsx,.py,.go,.rs,.java,.c,.h,.cpp,.cs,.rb,.php,.sh,.sql,.toml,.ini,.swift,.kt"
          />
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 240) + "px";
            }}
            onKeyDown={onKey}
            rows={1}
            placeholder="問我任何問題…"
            className="max-h-60 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <ModelPicker />
          <ThinkPicker />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-full bg-foreground p-2 text-background transition-transform hover:scale-105"
              aria-label="停止"
            >
              <Square className="h-4 w-4" fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() && atts.length === 0}
              className="rounded-full bg-foreground p-2 text-background transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
              aria-label="送出"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          按 Enter 送出 · Shift+Enter 換行 · 支援圖片與文字檔
        </p>
      </div>
    </div>
  );
}

function ModelPicker() {
  const s = useSettings();
  const ids: ModelId[] = ["coder-max-1.0", "coder-max-2.0"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
          title="選擇模型"
        >
          <span className="hidden sm:inline">{MODEL_LABEL[s.model]}</span>
          <span className="sm:hidden">{s.model === "coder-max-1.0" ? "1.0" : "2.0"}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>模型</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ids.map((id) => (
          <DropdownMenuItem
            key={id}
            onClick={() => setSettings({ model: id })}
            className="flex flex-col items-start gap-0.5"
          >
            <div className="flex w-full items-center gap-2">
              <span className="font-medium">{MODEL_LABEL[id]}</span>
              {s.model === id && <span className="ml-auto text-[11px] text-muted-foreground">使用中</span>}
            </div>
            <span className="text-[11px] text-muted-foreground">{MODEL_DESC[id]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThinkPicker() {
  const s = useSettings();
  const ids: ThinkMode[] = ["flash", "pro"];
  const Icon = s.think === "flash" ? Zap : Brain;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
          title="思考模式"
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{THINK_LABEL[s.think]}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>思考模式</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ids.map((id) => (
          <DropdownMenuItem
            key={id}
            onClick={() => setSettings({ think: id })}
            className="flex flex-col items-start gap-0.5"
          >
            <div className="flex w-full items-center gap-2">
              {id === "flash" ? <Zap className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
              <span className="font-medium">{THINK_LABEL[id]}</span>
              {s.think === id && <span className="ml-auto text-[11px] text-muted-foreground">使用中</span>}
            </div>
            <span className="pl-5 text-[11px] text-muted-foreground">{THINK_DESC[id]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
