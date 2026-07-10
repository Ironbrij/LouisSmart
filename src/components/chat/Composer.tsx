import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Send, Square, X } from "lucide-react";

interface Props {
  onSend: (text: string, image: File | null) => void;
  onStop: () => void;
  generating: boolean;
  disabled?: boolean;
  seed?: string;
}

export function Composer({ onSend, onStop, generating, disabled, seed }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (seed) {
      setText(seed);
      ref.current?.focus();
    }
  }, [seed]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [text]);

  function handleSubmit() {
    if (generating) return onStop();
    if (!text.trim() && !image) return;
    onSend(text, image);
    setText("");
    setImage(null);
    setPreview(null);
  }

  function handleImage(file: File) {
    setImage(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-2 pb-3 md:px-4 md:pb-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(15,23,42,0.15)] p-2"
      >
        {preview && (
          <div className="flex items-center gap-2 p-2">
            <div className="relative">
              <img src={preview} className="w-16 h-16 rounded-lg object-cover border border-border" alt="attachment" />
              <button
                onClick={() => {
                  setImage(null);
                  setPreview(null);
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled || generating}
            className="shrink-0 w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            title="Attach image"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
          />

          <textarea
            ref={ref}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Message Louis Smart..."
            disabled={disabled}
            className="flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground max-h-[220px] scrollbar-thin"
          />

          <button
            onClick={handleSubmit}
            disabled={disabled || (!generating && !text.trim() && !image)}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
            style={{ background: "var(--gradient-primary)" }}
            title={generating ? "Stop" : "Send"}
          >
            {generating ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        If Louis Smart makes mistakes, that's on you!
      </p>
    </div>
  );
}