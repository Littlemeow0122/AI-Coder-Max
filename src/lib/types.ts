export type Attachment = {
  id: string;
  name: string;
  type: string; // mime
  size: number;
  // For images: data URL. For text files: text content. For other: data URL.
  dataUrl?: string;
  text?: string;
  kind: "image" | "text" | "file";
};

export type StatusKind = "thinking" | "searching" | "reading";

export type StatusStep = {
  id: string;
  kind: StatusKind;
  label: string;          // short label e.g. "思考中" / "搜尋中" / "讀取"
  detail?: string;        // e.g. query string or url
  startedAt: number;
  endedAt?: number;       // ms timestamp
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;       // start time
  finishedAt?: number;     // for assistant: completion time
  attachments?: Attachment[];
  steps?: StatusStep[];    // for assistant
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type ExportPayload = {
  app: "Coder AI";
  version: 1;
  exportedAt: number;
  conversations: Conversation[];
};
