export type Role = "user" | "assistant";

export interface ChatAttachment {
  url: string;
  type: string;
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  attachments?: ChatAttachment[];
  timestamp: number;
  streaming?: boolean;
}

export interface ChatSummary {
  id: string;
  title: string;
  lastMessage?: string;
  createdAt: number;
  updatedAt: number;
}