import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, Square, X } from "lucide-react";
import type { Attachment } from "@/lib/chat-types";

export function Composer({
  onSend,
  onStop,
  busy,
  autoFocusKey,
  draftKey,
}: {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  busy: boolean;
  autoFocusKey?: string;
  draftKey?: string | undefined;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedDraftKeyRef = useRef<string | undefined>(undefined);
  const restoringDraftRef = useRef(false);

  useEffect(() => {
    restoringDraftRef.current = true;
    if (!draftKey || typeof window === "undefined") {
      setText("");
      setAttachments([]);
      loadedDraftKeyRef.current = undefined;
      return;
    }

    try {
      const raw = window.localStorage.getItem(`ls.draft.${draftKey}`);
      const draft = raw ? (JSON.parse(raw) as { text?: string; attachments?: Attachment[] }) : null;
      setText(draft?.text ?? "");
      setAttachments(draft?.attachments ?? []);
    } catch {
      setText("");
      setAttachments([]);
    }
    loadedDraftKeyRef.current = draftKey;
    requestAnimationFrame(resize);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || loadedDraftKeyRef.current !== draftKey || typeof window === "undefined")
      return;
    if (restoringDraftRef.current) {
      restoringDraftRef.current = false;
      return;
    }
    try {
      if (!text.trim() && attachments.length === 0) {
        window.localStorage.removeItem(`ls.draft.${draftKey}`);
      } else {
        window.localStorage.setItem(`ls.draft.${draftKey}`, JSON.stringify({ text, attachments }));
      }
    } catch {
      // Draft persistence is best effort when browser storage is unavailable or full.
    }
  }, [attachments, draftKey, text]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [autoFocusKey]);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }

  function submit() {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value, attachments);
    setText("");
    setAttachments([]);
    if (draftKey && typeof window !== "undefined") {
      window.localStorage.removeItem(`ls.draft.${draftKey}`);
    }
    requestAnimationFrame(resize);
  }

  async function pickFiles(files: FileList | null) {
    if (!files?.length) return;
    const picked = await Promise.all(
      Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 4)
        .map(
          (file) =>
            new Promise<Attachment>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({ name: file.name, type: file.type, url: String(reader.result) });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }),
        ),
    );
    setAttachments((prev) => [...prev, ...picked].slice(0, 4));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4 sm:pb-5">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div key={a.url} className="relative">
              <img
                src={a.url}
                alt={a.name}
                className="size-16 rounded-xl border border-border object-cover"
              />
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => setAttachments((prev) => prev.filter((p) => p.url !== a.url))}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground/80 p-1 text-background"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-3xl border border-border/70 bg-card p-2 shadow-card">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label="Attach image"
          onClick={() => fileRef.current?.click()}
          className="grid size-10 shrink-0 place-items-center rounded-2xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ImagePlus className="size-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder="Message Louis Smart..."
          onChange={(e) => {
            setText(e.target.value);
            resize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-[0.95rem] leading-relaxed outline-none placeholder:text-muted-foreground"
        />

        {busy ? (
          <button
            type="button"
            aria-label="Stop generating"
            onClick={onStop}
            className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send message"
            disabled={!text.trim()}
            onClick={submit}
            className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft transition-opacity disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        If Louis Smart makes mistakes, that's on you!
      </p>
    </div>
  );
}
