import { useState } from "react";
import { useCanvas, closeCanvas, langToExt, isPreviewable } from "@/lib/canvas";
import { CopyIcon, CheckIcon, DownloadIcon } from "@/lib/icons";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function CodeCanvas() {
  const item = useCanvas();
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [copied, setCopied] = useState(false);

  if (!item) return null;
  const previewable = isPreviewable(item.language);
  const ext = langToExt(item.language);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([item.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const showPreview = previewable && tab === "preview";

  return (
    <aside className="flex w-full max-w-[640px] flex-col border-l border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{item.title}</div>
          <div className="text-[11px] text-muted-foreground">{item.language}</div>
        </div>
        {previewable && (
          <div className="flex rounded-lg border bg-background p-0.5">
            <button
              onClick={() => setTab("code")}
              className={cn(
                "rounded-md px-2 py-1 text-[12px]",
                tab === "code" ? "bg-muted font-medium" : "text-muted-foreground"
              )}
            >
              代碼
            </button>
            <button
              onClick={() => setTab("preview")}
              className={cn(
                "rounded-md px-2 py-1 text-[12px]",
                tab === "preview" ? "bg-muted font-medium" : "text-muted-foreground"
              )}
            >
              預覽
            </button>
          </div>
        )}
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
          title="複製"
        >
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={download}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
          title="下載"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={closeCanvas}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="關閉"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {showPreview ? (
          item.language.toLowerCase().startsWith("htm") ? (
            <iframe
              title="預覽"
              srcDoc={item.code}
              sandbox="allow-scripts allow-forms allow-modals"
              className="h-full w-full bg-white"
            />
          ) : (
            <iframe
              title="預覽"
              srcDoc={`<!doctype html><meta charset="utf-8"><style>body{font:15px -apple-system,system-ui,sans-serif;padding:24px;color:#111;background:#fff;line-height:1.6;max-width:780px;margin:0 auto}pre{background:#f5f5f5;padding:12px;border-radius:8px;overflow:auto}code{font-family:ui-monospace,monospace}</style><div id="md"></div><script type="module">import{marked}from"https://cdn.jsdelivr.net/npm/marked/+esm";document.getElementById("md").innerHTML=marked.parse(${JSON.stringify(item.code)});</script>`}
              sandbox="allow-scripts"
              className="h-full w-full bg-white"
            />
          )
        ) : (
          <pre className="h-full overflow-auto px-4 py-4 font-mono text-[13px] leading-relaxed scrollbar-thin">
            <code>{item.code}</code>
          </pre>
        )}
      </div>
    </aside>
  );
}
