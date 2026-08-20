import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Markdown } from "./Markdown";
import { WizardImage } from "@/components/brand/Logo";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden flex items-center justify-center">
          <WizardImage className="w-full h-full object-contain" />
        </div>
      )}

      <div className={`max-w-[90%] sm:max-w-[78%] min-w-0 ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {message.attachments.map((a, i) => (
              <img key={i} src={a.url} alt={a.name || "attachment"} className="max-h-52 rounded-xl border border-border" />
            ))}
          </div>
        )}

        {isUser ? (
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] leading-6 shadow-sm"
            style={{ background: "var(--gradient-user)", color: "white" }}
          >
            {message.content}
          </div>
        ) : (
          <div className="rounded-2xl rounded-tl-sm bg-muted/50 border border-border/60 px-4 py-3 overflow-hidden">
            {message.content ? (
              <Markdown>{message.content}</Markdown>
            ) : message.streaming ? (
              <TypingDots />
            ) : (
              <span className="text-sm text-muted-foreground italic">No response received.</span>
            )}
            {message.streaming && message.content && (
              <span className="inline-block w-1.5 h-4 align-middle bg-primary/70 ml-0.5 animate-pulse" />
            )}
          </div>
        )}

        <div className={`flex items-center gap-2 text-[11px] text-muted-foreground px-1 ${isUser ? "justify-end" : "justify-start"}`}>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {!isUser && message.content && !message.streaming && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 hover:text-foreground transition"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
