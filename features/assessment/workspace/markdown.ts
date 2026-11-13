/**
 * A deliberately tiny Markdown subset for scenarios: headings (#, ##, ###), bullet
 * lists (-, *), block quotes (>), fenced code (```), paragraphs, and inline `code`
 * and **bold**. Parsed to plain data and rendered as React elements (never as HTML),
 * so an author cannot inject markup into a candidate's page.
 */
export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string };

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  // A blank line ends a quote, so two quotes separated by one stay separate blocks.
  let quoteOpen = false;
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) code.push(lines[i]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      continue;
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(bullet[1]);
      else blocks.push({ type: "list", items: [bullet[1]] });
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      const last = blocks[blocks.length - 1];
      if (quoteOpen && last?.type === "quote") last.text += " " + quote[1];
      else blocks.push({ type: "quote", text: quote[1] });
      quoteOpen = true;
      continue;
    }
    quoteOpen = false;
    if (line.trim() === "") flush();
    else paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

export type Inline = { kind: "text" | "code" | "bold"; text: string };

/** Split a line into plain, `code` and **bold** runs. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { kind: "code", text: m[1] } : { kind: "bold", text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
