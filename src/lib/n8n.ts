import type { Attachment, ChatMessage } from "./chat-types";

const FALLBACK_WEBHOOK_URL =
  "https://vmi3182726.contaboserver.net/webhook/4f4322b3-30eb-4d63-b7ea-d9d18558772c";

const WEBHOOK_URL =
  ((import.meta.env as Record<string, string | undefined>)["VITE_N8N_WEBHOOK_URL"] ??
    (import.meta.env as Record<string, string | undefined>)["VITE_WEBHOOK_URL"] ??
    FALLBACK_WEBHOOK_URL);

export const webhookConfigured = Boolean(WEBHOOK_URL);

export type SendPayload = {
  threadId: string;
  userId: string;
  message: string;
  attachments?: Attachment[];
  history: Pick<ChatMessage, "role" | "content">[];
};

function extractText(data: unknown): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(extractText).filter(Boolean).join("\n\n");
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["output", "reply", "text", "message", "answer", "content", "data"]) {
      if (key in o) {
        const value = extractText(o[key]);
        if (value) return value;
      }
    }
  }
  return "";
}

/**
 * Sends the message to the existing remote n8n webhook and yields text chunks.
 * Streams incrementally when the webhook responds with a text stream, and
 * falls back to a single chunk for JSON responses.
 */
export async function* sendToAssistant(
  payload: SendPayload,
  signal: AbortSignal,
): AsyncGenerator<string> {
  if (!WEBHOOK_URL) {
    throw new Error(
      "The assistant webhook is not configured yet. Set VITE_N8N_WEBHOOK_URL to your n8n production webhook URL.",
    );
  }

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Assistant request failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isStream =
    response.body != null &&
    (contentType.includes("text/event-stream") || contentType.includes("text/plain"));

  if (!isStream) {
    const raw = await response.text();
    let text = raw;
    try {
      text = extractText(JSON.parse(raw)) || raw;
    } catch {
      /* plain text body */
    }
    yield text;
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) yield chunk;
  }
}
