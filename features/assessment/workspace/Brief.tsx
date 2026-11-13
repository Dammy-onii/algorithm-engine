import { parseBlocks, parseInline } from "./markdown";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((run, i) =>
        run.kind === "code" ? (
          <code key={i} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.88em] dark:bg-zinc-800">{run.text}</code>
        ) : run.kind === "bold" ? (
          <strong key={i}>{run.text}</strong>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}

/** Renders a scenario written in the Markdown subset from ./markdown. */
export function Brief({ source }: { source: string }) {
  return (
    <div className="space-y-3 text-[14.5px] leading-relaxed text-zinc-800 dark:text-zinc-200">
      {parseBlocks(source).map((block, i) => {
        switch (block.type) {
          case "heading":
            return block.level === 1 ? (
              <h2 key={i} className="pt-2 text-xl font-semibold tracking-tight"><Inline text={block.text} /></h2>
            ) : block.level === 2 ? (
              <h3 key={i} className="pt-2 text-base font-semibold"><Inline text={block.text} /></h3>
            ) : (
              <h4 key={i} className="pt-1 text-sm font-semibold"><Inline text={block.text} /></h4>
            );
          case "list":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {block.items.map((item, j) => <li key={j}><Inline text={item} /></li>)}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-zinc-300 bg-zinc-50 py-1.5 pl-3 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <Inline text={block.text} />
              </blockquote>
            );
          case "code":
            return <pre key={i} className="overflow-auto rounded-md bg-zinc-900 p-3 font-mono text-[12.5px] text-zinc-100">{block.text}</pre>;
          default:
            return <p key={i}><Inline text={block.text} /></p>;
        }
      })}
    </div>
  );
}
