import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border/60 bg-[#0b1020] text-zinc-100">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-black/30 border-b border-white/5">
        <span className="uppercase tracking-wide text-zinc-400">{language || "code"}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 text-zinc-400 hover:text-white transition"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-[13px] leading-relaxed overflow-x-auto scrollbar-thin whitespace-pre-wrap break-all"><code>{value}</code></pre>
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-7 text-foreground overflow-hidden break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="text-2xl font-semibold mt-4 mb-2" {...p} />,
          h2: (p) => <h2 className="text-xl font-semibold mt-4 mb-2" {...p} />,
          h3: (p) => <h3 className="text-lg font-semibold mt-3 mb-1.5" {...p} />,
          p: (p) => <p className="my-2" {...p} />,
          a: (p) => <a className="text-primary underline underline-offset-2 hover:opacity-80" target="_blank" rel="noreferrer" {...p} />,
          ul: (p) => <ul className="list-disc pl-6 my-2 space-y-1" {...p} />,
          ol: (p) => <ol className="list-decimal pl-6 my-2 space-y-1" {...p} />,
          li: (p) => <li className="marker:text-muted-foreground" {...p} />,
          blockquote: (p) => (
            <blockquote className="my-3 border-l-2 border-primary/60 pl-4 italic text-muted-foreground" {...p} />
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: (p) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border scrollbar-thin">
              <table className="w-full text-sm" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-muted/60 sticky top-0" {...p} />,
          th: (p) => <th className="text-left font-semibold px-3 py-2 border-b border-border" {...p} />,
          td: (p) => <td className="px-3 py-2 border-b border-border/60" {...p} />,
          tr: (p) => <tr className="even:bg-muted/30" {...p} />,
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            if (!inline && match) {
              return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />;
            }
            if (!inline && String(children).includes("\n")) {
              return <CodeBlock language="" value={String(children).replace(/\n$/, "")} />;
            }
            return (
              <code className="rounded-md bg-muted px-1.5 py-0.5 text-[13px] font-mono" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}