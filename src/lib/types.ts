export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  text?: string;
  kind: "image" | "text" | "file";
};

export type StatusKind =
  | "thinking"
  | "searching"
  | "reading"
  | "read_image"
  | "generate_image"
  | "memory"
  | "rename";

export type StatusStep = {
  id: string;
  kind: StatusKind;
  label: string;
  detail?: string;       // search query / url / memory text / new title / image prompt
  body?: string;         // 完整可展開內容 (思考內容、搜尋結果、生成圖片 url 等)
  imageUrl?: string;     // 生成圖片
  startedAt: number;
  endedAt?: number;
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  createdAt: number;
  finishedAt?: number;
  attachments?: Attachment[];
  steps?: StatusStep[];
  error?: string;          // 若有錯誤、可重試
  retryPayload?: { text: string; attachments: Attachment[] };
};

export type Conversation = {
  id: string;
  title: string;
  titleAuto?: boolean;     // 是否曾被 AI 自動命名
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type Memory = {
  id: string;
  text: string;
  createdAt: number;
  source: "ai" | "user";
};

export type ExportPayload = {
  app: "Coder AI";
  version: 1;
  exportedAt: number;
  conversations: Conversation[];
  memories?: Memory[];
};
