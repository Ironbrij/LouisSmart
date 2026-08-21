import { memo, type ReactNode } from "react";

/**
 * Very small markdown-ish renderer (bold, inline code, bullets, numbered
 * lists, paragraphs). Intentionally dependency-free and memoized so completed
 * messages never re-render, and never used while a response is streaming.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={`${keyPrefix}-c${i}`}>{token.slice(1, -1)}</code>);
    }
    last = match.index + token.length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function numberedItems(lines: string[]) {
  return lines.map((line) => {
    const match = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
    return match ? { number: match[1], text: match[2] } : null;
  });
}

function isTableHeading(block: string) {
  return /^(?:#{1,6}\s+)?Top\s+\d+\b/i.test(block.trim());
}

function tableCategory(block: string) {
  return block
    .replace(/^#{1,6}\s+/, "")
    .replace(/^Top\s+\d+\s*/i, "")
    .trim();
}

function render(content: string): ReactNode[] {
  const normalizedContent = content
    .replace(/^[ \t]+$/gm, "")
    .replace(/(^|\n)(\s*#{1,6}\s+[^\n]*)(?=\n|$)/g, "$1\n$2\n\n")
    .replace(/(^|\n)(#{1,6}\s+Top\s+\d+\b[^\n]*)/gi, "$1\n$2")
    .replace(/(^|\n)(#{1,6}\s+Top\s+\d+\b[^\n]*)\n/gi, "$1$2\n\n")
    .replace(/^\s*(?:\*{3,}|-{3,})\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
  const blocks = normalizedContent.split(/\n{2,}/);
  const nodes: ReactNode[] = [];

  for (let bi = 0; bi < blocks.length; bi += 1) {
    const block = blocks[bi];
    const lines = block.split("\n");
    const isBullet = lines.every((l) => /^\s*[-*•]\s+/.test(l));
    const isNumbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
    const items = isNumbered ? numberedItems(lines) : [];

    if (isTableHeading(block) && items.length === 0) {
      const rows: { category: string; number: string; text: string }[] = [];
      let cursor = bi;
      while (isTableHeading(blocks[cursor]) && blocks[cursor + 1]) {
        const sectionItems = numberedItems(blocks[cursor + 1].split("\n"));
        const validItems = sectionItems.filter(
          (item): item is NonNullable<typeof item> => item !== null,
        );
        if (validItems.length !== sectionItems.length || validItems.length === 0) break;
        rows.push(
          ...validItems.map((item) => ({
            category: tableCategory(blocks[cursor]),
            number: item.number,
            text: item.text,
          })),
        );
        cursor += 2;
      }

      if (rows.length > 0) {
        nodes.push(
          <div
            key={`${bi}-table`}
            className="my-3 overflow-x-auto rounded-xl border border-border/70"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">#</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>{row.category}</td>
                    <td>{row.number}</td>
                    <td>{inline(row.text, `${bi}-${rowIndex}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        bi = cursor - 1;
        continue;
      }
    }

    const heading = block.trim().match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      nodes.push(<h3 key={bi}>{inline(heading[1], `${bi}-heading`)}</h3>);
      continue;
    }

    if (isBullet && lines.length > 0) {
      nodes.push(
        <ul key={bi}>
          {lines.map((l, li) => (
            <li key={li}>{inline(l.replace(/^\s*[-*•]\s+/, ""), `${bi}-${li}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (isNumbered && lines.length > 0) {
      nodes.push(
        <ol key={bi}>
          {lines.map((l, li) => (
            <li key={li}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""), `${bi}-${li}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    nodes.push(
      <p key={bi}>
        {lines.map((l, li) => (
          <span key={li}>
            {inline(l, `${bi}-${li}`)}
            {li < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>,
    );
  }

  return nodes;
}

export const MessageContent = memo(function MessageContent({ content }: { content: string }) {
  return <div className="prose-chat text-[0.95rem]">{render(content)}</div>;
});
