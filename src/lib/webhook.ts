export interface WebhookPayload {
  firebase_uid: string;
  chat_uuid: string;
  message: string;
  chatInput: string;
  sessionId: string;
  history?: { role: string; content: string }[];
  image_url?: string;
}

export interface StreamOptions {
  signal?: AbortSignal;
  onToken: (chunk: string) => void;
}

/**
 * POSTs to VITE_WEBHOOK_URL and streams the response body as text chunks.
 * Supports plain streamed text or a JSON `{ reply: string }` fallback.
 */
const REQUEST_TIMEOUT_MS = 45_000;

export async function streamAiReply(payload: WebhookPayload, opts: StreamOptions): Promise<string> {
  const url = (import.meta.env.VITE_WEBHOOK_URL as string) || "https://vmi3182726.contaboserver.net/webhook/4f4322b3-30eb-4d63-b7ea-d9d18558772c";

  // Combine the caller's abort signal (Stop button) with an internal timeout, so a
  // webhook/n8n workflow that never responds doesn't leave the UI stuck "generating"
  // forever with no feedback.
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), REQUEST_TIMEOUT_MS);
  const onCallerAbort = () => timeoutCtrl.abort();
  opts.signal?.addEventListener("abort", onCallerAbort);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: timeoutCtrl.signal,
    });
  } catch (e) {
    if (opts.signal?.aborted) {
      const abortErr = new Error("Aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    if (timeoutCtrl.signal.aborted) {
      throw new Error(`No response from the AI after ${REQUEST_TIMEOUT_MS / 1000}s. Please try again.`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
    opts.signal?.removeEventListener("abort", onCallerAbort);
  }

  if (!res.ok) throw new Error(`Webhook error ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  const isSse = contentType.includes("text/event-stream");

  if (!isSse) {
    const rawText = await res.text();
    let text = rawText;

    // Check if the response is JSON (even if the content-type header is text/html or similar)
    try {
      const trimmed = rawText.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        const data = JSON.parse(trimmed);
        if (Array.isArray(data)) {
          if (data.length > 0) {
            const first = data[0];
            text = first.reply ?? first.message ?? first.output ?? first.text ?? JSON.stringify(first);
          } else {
            text = "No content generated.";
          }
        } else {
          text = data.reply ?? data.message ?? data.output ?? data.text ?? text;
        }
      }
    } catch {
      // Keep rawText as is
    }


    if (!text || (typeof text === "string" && !text.trim())) {
      text = "I'm here and ready to help! What would you like to discuss?";
    }

    return simulateStreamText(typeof text === "string" ? text : JSON.stringify(text), opts);
  }


  if (!res.body) {
    const text = await res.text();
    return simulateStreamText(text, opts);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Handle SSE-style lines
      const cleaned = chunk
        .split("\n")
        .map((line) => (line.startsWith("data:") ? line.slice(5).trim() : line))
        .filter((line) => line && line !== "[DONE]")
        .join("");
      if (cleaned) {
        full += cleaned;
        opts.onToken(cleaned);
      }
    }
  } catch (err) {
    if (opts.signal?.aborted) {
      const abortErr = new Error("Aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    throw err;
  }
  return full || "No content generated.";
}

async function simulateStreamText(rawText: string, opts: StreamOptions): Promise<string> {
  const text = String(rawText ?? "").trim() || "No response received from assistant.";
  const CHUNK_SIZE = 30;
  const words = text.split(/([\s]+)/);
  let full = "";
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    if (opts.signal?.aborted) break;
    const chunk = words.slice(i, i + CHUNK_SIZE).join("");
    full += chunk;
    opts.onToken(chunk);
    await new Promise((r) => setTimeout(r, 10));
  }
  return full || text;
}

