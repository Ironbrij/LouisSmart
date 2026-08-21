export type Role = "user" | "assistant";

export type Attachment = {
  name: string;
  /** data URL or remote URL for preview */
  url: string;
  type: string;
};

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  attachments?: Attachment[];
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function titleFromText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 42 ? clean.slice(0, 42) + "…" : clean;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
