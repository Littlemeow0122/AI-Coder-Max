// Tool implementations executed in the browser
import type { ToolDef } from "./pollinations";
import { addMemory } from "./memory";

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "在網路上搜尋資訊。當你需要最新事實、新聞、不確定的資料時使用。回傳前幾個搜尋結果的標題與摘要。",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "搜尋關鍵字" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "讀取指定網頁的純文字內容。當使用者提供網址、或需要從某個網頁取得詳細資訊時使用。",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "完整 http(s) 網址" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description:
        "生成一張圖片。當你的回答需要插圖、示意圖、或使用者要求一張圖時使用。回傳一個可直接 <img> 顯示的網址。",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "英文圖片描述（精簡且具體）" },
          width: { type: "number", description: "寬，預設 1024" },
          height: { type: "number", description: "高，預設 1024" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description:
        "把關於使用者的長期事實或偏好存入永久記憶（跨對話）。例如使用者姓名、技術棧、語言偏好、慣用工具。請只存高價值、跨對話有用的資訊；同類型只存一次；不要存敏感資料；用簡短中文一句話描述。",
      parameters: {
        type: "object",
        properties: { fact: { type: "string", description: "一句話的記憶內容" } },
        required: ["fact"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename_chat",
      description:
        "為當前對話設定一個簡短（≤20 字）、有意義的中文標題。請在你已了解使用者的主要意圖之後呼叫一次。",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "新標題" } },
        required: ["title"],
      },
    },
  },
];

export type ToolResult = {
  text: string;            // 給模型看的結果
  detail?: string;         // chip 的 detail（簡短）
  body?: string;           // chip 展開的完整內容
  imageUrl?: string;       // 生成圖片
  rename?: string;         // 對話新標題
  memoryAdded?: string;    // 已新增的記憶
};

export async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (name === "web_search") {
    const q = String(args.query ?? "").trim();
    if (!q) return { text: "錯誤：缺少 query" };
    const r = await webSearch(q);
    return { text: r, detail: q, body: r };
  }
  if (name === "fetch_url") {
    const url = String(args.url ?? "").trim();
    if (!url) return { text: "錯誤：缺少 url" };
    const r = await fetchUrl(url);
    return { text: r, detail: url };
  }
  if (name === "generate_image") {
    const prompt = String(args.prompt ?? "").trim();
    const w = Math.min(2048, Math.max(256, Number(args.width) || 1024));
    const h = Math.min(2048, Math.max(256, Number(args.height) || 1024));
    if (!prompt) return { text: "錯誤：缺少 prompt" };
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?width=${w}&height=${h}&nologo=true&seed=${Math.floor(Math.random() * 1e9)}`;
    return {
      text: `已生成圖片：${url}\n請在回應中以 Markdown 顯示：![](${url})`,
      detail: prompt,
      body: prompt,
      imageUrl: url,
    };
  }
  if (name === "save_memory") {
    const fact = String(args.fact ?? "").trim();
    if (!fact) return { text: "錯誤：缺少 fact" };
    const m = addMemory(fact, "ai");
    return { text: `已記住：${fact}`, detail: fact, body: fact, memoryAdded: m.text };
  }
  if (name === "rename_chat") {
    const title = String(args.title ?? "").trim().slice(0, 40);
    if (!title) return { text: "錯誤：缺少 title" };
    return { text: `已改名：${title}`, detail: title, rename: title };
  }
  return { text: `未知工具：${name}` };
}

async function webSearch(query: string): Promise<string> {
  // Pollinations searchgpt
  try {
    const r = await fetch(
      `https://text.pollinations.ai/${encodeURIComponent(
        "請搜尋並回答：" + query + "\n以條列方式列出 3-5 個重點，附上來源網址。"
      )}?model=searchgpt`
    );
    if (r.ok) {
      const t = await r.text();
      if (t.trim()) return t.slice(0, 4000);
    }
  } catch {
    /* ignore */
  }
  // Fallback DuckDuckGo
  try {
    const r = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    if (r.ok) {
      const j = await r.json();
      const parts: string[] = [];
      if (j.AbstractText) parts.push(`摘要：${j.AbstractText}\n來源：${j.AbstractURL ?? ""}`);
      if (Array.isArray(j.RelatedTopics)) {
        const items = j.RelatedTopics.slice(0, 8)
          .map((t: { Text?: string; FirstURL?: string }) =>
            t.Text ? `- ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ""}` : null
          )
          .filter(Boolean);
        if (items.length) parts.push("相關結果：\n" + items.join("\n"));
      }
      if (parts.length) return parts.join("\n\n");
    }
  } catch {
    /* ignore */
  }
  return `（搜尋失敗）查詢：${query}`;
}

async function fetchUrl(url: string): Promise<string> {
  try {
    const proxied = `https://r.jina.ai/${url}`;
    const r = await fetch(proxied);
    if (r.ok) return (await r.text()).slice(0, 8000);
  } catch {
    /* fall back */
  }
  try {
    const r = await fetch(url);
    if (r.ok) {
      const t = await r.text();
      return t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
    }
    return `讀取失敗：HTTP ${r.status}`;
  } catch (e) {
    return `讀取失敗：${e instanceof Error ? e.message : "未知錯誤"}`;
  }
}
