export interface WebhookPayload {
  message: string;
  sessionId: string;
  node?: string;
  persona?: string;
  niche?: string;
  offer?: string;
  psychographics?: string;
  tone?: string;
  command?: string;
  conversationHistory?: Array<{ role: string; message: string }>;
  image?: string;
  styleImage?: string;
}

export interface WebhookResponse {
  output: string;
  isImage?: boolean;
  isPrompt?: boolean;
  isVideo?: boolean;
  isTable?: boolean;
}

export async function sendWebhookMessage(payload: WebhookPayload): Promise<WebhookResponse> {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("VITE_N8N_WEBHOOK_URL is not defined in environment variables.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: payload.message,
      sessionId: payload.sessionId || `session_${Date.now()}`,
      node: payload.node || "persona",
      persona: payload.persona || "",
      niche: payload.niche || "",
      offer: payload.offer || "",
      psychographics: payload.psychographics || "",
      tone: payload.tone || "",
      command: payload.command || "",
      conversationHistory: payload.conversationHistory || [],
      image: payload.image || "",
      styleImage: payload.styleImage || "",
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook error! Status: ${response.status}`);
  }

  const text = await response.text();

  // Parse raw response whether n8n returns a string, an array, or an object
  try {
    const data = JSON.parse(text);

    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      return {
        output: typeof item === "string" ? item : item.output || item.ai_answer || "",
        isImage: item.isImage || false,
        isPrompt: item.isPrompt || item.generatePrompt || false,
        isVideo: item.isVideo || false,
        isTable: item.isTable || false,
      };
    }

    if (typeof data === "object" && data !== null) {
      return {
        output: data.output || data.ai_answer || (typeof data === "string" ? data : ""),
        isImage: data.isImage || false,
        isPrompt: data.isPrompt || data.generatePrompt || false,
        isVideo: data.isVideo || false,
        isTable: data.isTable || false,
      };
    }

    return { output: String(data) };
  } catch (e) {
    // Fallback if n8n returned plain text body
    return { output: text };
  }
}
