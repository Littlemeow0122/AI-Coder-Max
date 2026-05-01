// Tool implementations executed in the browser
import type { ToolDef } from "./pollinations";

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "在網路上搜尋資訊。當你需要最新事實、新聞、或不確定的資料時使用。回傳前幾個搜尋結果的標題與摘要。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜尋關鍵字" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "讀取指定網頁的純文字內容。當使用者提供網址、或你需要從某個網頁取得詳細資訊時使用。",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "完整 http(s) 網址" },
        },
        required: ["url"],
      },
    },
  },
];

export async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  if (name === "web_search") {
    const q = String(args.query ?? "").trim();
    if (!q) return "錯誤：缺少 query";
    return await webSearch(q);
  }
  if (name === "fetch_url") {
    const url = String(args.url ?? "").trim();
    if (!url) return "錯誤：缺少 url";
    return await fetchUrl(url);
  }
  return `未知工具：${name}`;
}

async function webSearch(query: string): Promise<string> {
  // Use DuckDuckGo HTML via a public CORS proxy fallback chain.
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
    /* fall through */
  }
  // Fallback: use Pollinations search-aware model via simple GET
  try {
    const r = await fetch(
      `https://text.pollinations.ai/${encodeURIComponent(
        "請搜尋並回答：" + query + "\n以條列方式列出 3-5 個重點，附上來源網址。"
      )}?model=searchgpt`
    );
    if (r.ok) return (await r.text()).slice(0, 4000);
  } catch {
    /* ignore */
  }
  return `（搜尋失敗，請稍後再試）查詢：${query}`;
}

async function fetchUrl(url: string): Promise<string> {
  try {
    const proxied = `https://r.jina.ai/${url}`;
    const r = await fetch(proxied);
    if (r.ok) {
      const text = await r.text();
      return text.slice(0, 8000);
    }
  } catch {
    /* fall back */
  }
  try {
    const r = await fetch(url);
    if (r.ok) {
      const text = await r.text();
      return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
    }
    return `讀取失敗：HTTP ${r.status}`;
  } catch (e) {
    return `讀取失敗：${e instanceof Error ? e.message : "未知錯誤"}`;
  }
}
