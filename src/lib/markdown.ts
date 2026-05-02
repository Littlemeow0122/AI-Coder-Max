// 將 markdown 拆成段：純文字（給 ReactMarkdown）/ 三反引號程式碼（canvas 卡）/ 四反引號程式碼（inline）
export type MdSegment =
  | { type: "text"; text: string }
  | { type: "canvas"; lang: string; code: string; index: number }
  | { type: "inline-code"; lang: string; code: string; index: number };

// 從文字頭部嘗試匹配一個 fenced block; 回傳長度與資訊。串流安全：若 fence 未閉合則保留全部為 fenced（active）。
function tryMatchFence(s: string, pos: number): { len: number; seg: MdSegment } | null {
  // 行首條件：pos===0 或前一個字元是 \n
  if (pos > 0 && s[pos - 1] !== "\n") return null;
  // 計算反引號數量
  let i = pos;
  while (s[i] === "`") i++;
  const ticks = i - pos;
  if (ticks < 3) return null;
  // 抓語言
  let j = i;
  while (j < s.length && s[j] !== "\n") j++;
  const lang = s.slice(i, j).trim();
  const codeStart = j + 1;
  // 找對應結束：行首正好 ticks 個反引號
  const fence = "`".repeat(ticks);
  let k = codeStart;
  while (k < s.length) {
    // 找下一行行首
    if ((k === codeStart || s[k - 1] === "\n") && s.slice(k, k + ticks) === fence) {
      // 確保結束 fence 後緊接著的不是更多反引號
      if (s[k + ticks] !== "`") {
        const code = s.slice(codeStart, k - 1 < codeStart ? codeStart : k).replace(/\n$/, "");
        // include trailing newline after fence if present
        let endPos = k + ticks;
        if (s[endPos] === "\n") endPos++;
        const seg: MdSegment =
          ticks >= 4
            ? { type: "inline-code", lang, code, index: 0 }
            : { type: "canvas", lang, code, index: 0 };
        return { len: endPos - pos, seg };
      }
    }
    k++;
  }
  // 未閉合 → 把剩下全部當成程式碼（串流中）
  const code = s.slice(codeStart);
  const seg: MdSegment =
    ticks >= 4
      ? { type: "inline-code", lang, code, index: 0 }
      : { type: "canvas", lang, code, index: 0 };
  return { len: s.length - pos, seg };
}

export function parseMarkdownSegments(input: string): MdSegment[] {
  const out: MdSegment[] = [];
  let buf = "";
  let i = 0;
  let canvasIdx = 0;
  let inlineIdx = 0;
  while (i < input.length) {
    if (input[i] === "`" && (i === 0 || input[i - 1] === "\n")) {
      const m = tryMatchFence(input, i);
      if (m) {
        if (buf) {
          out.push({ type: "text", text: buf });
          buf = "";
        }
        const seg = m.seg;
        if (seg.type === "canvas") seg.index = canvasIdx++;
        if (seg.type === "inline-code") seg.index = inlineIdx++;
        out.push(seg);
        i += m.len;
        continue;
      }
    }
    buf += input[i];
    i++;
  }
  if (buf) out.push({ type: "text", text: buf });
  return out;
}
