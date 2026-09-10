import { Eyebrow, Reveal, Section } from "./primitives";

const AUDIENCES = [
  {
    who: "First stage",
    line: "Give every applicant a fair first chance.",
    body: "Add a practical screen before interviews. See who can understand the problem, make sensible choices, and produce a working result before your team reviews a long list of CVs.",
  },
  {
    who: "Skills stage",
    line: "Replace the generic take-home task.",
    body: "Use a guided, consistent scenario that is closer to the role. Candidates know what is being assessed, and reviewers get comparable evidence from every submission.",
  },
  {
    who: "Final stage",
    line: "Go into the interview with better questions.",
    body: "Review a candidate's decisions beforehand, then use the interview to explore their trade-offs, assumptions, and improvements instead of starting from scratch.",
  },
  {
    who: "High-volume hiring",
    line: "Create more signal without creating more interviews.",
    body: "Run the same relevant assessment across a large applicant pool and compare results consistently. Your hiring team can focus its effort where it is most useful.",
  },
];

export function WhoItsFor() {
  return (
    <Section id="who-its-for" className="blueprint">
      <Reveal>
        <Eyebrow>Where CTRL fits</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          Add useful evidence
          <br />
          <span className="text-ink-40">at any stage of hiring.</span>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.who} delay={i * 60} className="h-full">
            <div className="flex h-full flex-col bg-paper p-7">
              <Eyebrow>{a.who}</Eyebrow>
              <p className="mt-5 text-xl leading-snug font-medium tracking-[-0.01em]">
                {a.line}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-60">{a.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
