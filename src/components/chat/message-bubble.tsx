import { memo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { MessageContent } from "./message-content";
import { formatTime, type ChatMessage } from "@/lib/chat-types";
import mascot from "@/assets/louis-mascot.png";

function Attachments({ message }: { message: ChatMessage }) {
  if (!message.attachments?.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {message.attachments.map((a) => (
        <img
          key={a.url}
          src={a.url}
          alt={a.name}
          loading="lazy"
          className="h-20 w-20 rounded-xl border border-border object-cover"
        />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function MessageBubbleBase({
  message,
  streaming = false,
}: {
  message: ChatMessage;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-3xl bg-gradient-primary px-5 py-3 text-[0.95rem] leading-relaxed text-primary-foreground shadow-soft sm:max-w-[75%]">
          <Attachments message={message} />
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className="pr-2 text-[11px] text-muted-foreground">
          {formatTime(message.createdAt)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <img
        src={mascot}
        alt=""
        width={768}
        height={1024}
        loading="lazy"
        className="mt-1 size-8 shrink-0 rounded-full bg-lavender/40 object-contain"
      />
      <div className="min-w-0 flex-1">
        <div className="max-w-full rounded-3xl border border-border/70 bg-bubble px-5 py-4 text-bubble-foreground shadow-soft">
          {streaming ? (
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">
              {message.content}
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary/70 align-middle" />
            </p>
          ) : (
            <MessageContent content={message.content} />
          )}
        </div>
        {!streaming && (
          <div className="mt-1 flex items-center gap-2 pl-2">
            <span className="text-[11px] text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <img
        src={mascot}
        alt=""
        width={768}
        height={1024}
        loading="lazy"
        className="mt-1 size-8 shrink-0 rounded-full bg-lavender/40 object-contain"
      />
      <div className="flex items-center gap-1.5 rounded-3xl border border-border/70 bg-bubble px-5 py-4 shadow-soft">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-primary/50"
            style={{ animationDelay: `${i * 140}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}
