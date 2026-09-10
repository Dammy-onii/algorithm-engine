import { Eyebrow, Reveal, Section } from "./primitives";

const BLOCKS = [
  {
    tag: "Hiring time",
    stat: "Less",
    statNote: "time spent interviewing candidates without enough evidence",
    body: "Use CTRL before interviews to narrow a large applicant pool, or later in the process when you need stronger proof. Your team spends its time with candidates who have already shown how they approach relevant work.",
  },
  {
    tag: "Relevance",
    stat: "Real",
    statNote: "workplace scenarios instead of generic coding puzzles",
    body: "A bank can assess payment routing. A delivery company can assess dispatch decisions. You can also test common skills such as managing queues, priorities, limited resources, and changing requirements.",
  },
  {
    tag: "Evidence",
    stat: "Clear",
    statNote: "insight into how each candidate reached their result",
    body: "Two candidates can reach the same answer in very different ways. CTRL shows the decisions behind the result, giving your team a more useful basis for shortlisting, interviewing, and comparing applicants.",
  },
];

export function Why() {
  return (
    <Section>
      <Reveal>
        <Eyebrow>Why use CTRL</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          Make better shortlists
          <br />
          <span className="text-ink-40">with less interview work.</span>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-3">
        {BLOCKS.map((b, i) => (
          <Reveal key={b.tag} delay={i * 70} className="h-full">
            <div className="flex h-full flex-col bg-paper p-7">
              <Eyebrow>{b.tag}</Eyebrow>
              <p className="mt-8 text-6xl font-medium tracking-[-0.04em]">{b.stat}</p>
              <p className="mt-3 max-w-[20rem] text-sm text-ink-40">{b.statNote}</p>
              <p className="mt-8 border-t border-line pt-6 text-sm leading-relaxed text-ink-60">
                {b.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
