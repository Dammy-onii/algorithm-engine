import { Eyebrow, Reveal, Section } from "./primitives";

const OFFERINGS = [
  {
    title: "Assessments from your own work",
    body: "Start from a common operational problem or shape one around your stack, tickets, and domain. Candidates work on something that looks like the job — not a sorting puzzle.",
  },
  {
    title: "Process signal, not just output",
    body: "Every run records the decisions behind the result: what the candidate observed, which rule fired, and how they adapted when conditions changed. You see how they think, not only whether the tests went green.",
  },
  {
    title: "Configurable scoring",
    body: "A deterministic harness checks correctness for the specific scenario, and configurable graders evaluate qualitative dimensions like efficiency, simplicity, and robustness — every judgement tied to the decision that earned it.",
  },
  {
    title: "Shareable candidate reports",
    body: "Each submission compiles into a report your team can compare consistently and reviewers can open in seconds — with a replay of the run and the reasoning behind it.",
  },
  {
    title: "Fits the pipeline you already run",
    body: "Use it as an early screen to narrow a large applicant pool, a skills stage in place of a take-home, or a final exercise before an interview. Nothing about your process has to change.",
  },
  {
    title: "Custom scenarios for your domain",
    body: "A bank can assess payment routing; a logistics team, dispatch. We work with you to turn a problem your team understands into an assessment candidates can pick up and solve.",
  },
];

const STEPS = [
  { n: "01", t: "Tell us the role", d: "Share the role and the kind of work it involves." },
  { n: "02", t: "We shape the assessment", d: "We turn a relevant problem into a scored scenario." },
  { n: "03", t: "Send it to candidates", d: "They solve it in blocks, plain steps, or code." },
  { n: "04", t: "Review the evidence", d: "Compare reports and decisions, then interview with focus." },
];

/** Detailed "what companies get" section for the companies page. */
export function CompanyOfferings() {
  return (
    <Section id="offerings">
      <Reveal>
        <Eyebrow>What we offer companies</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          Everything you need to assess
          <br />
          <span className="text-ink-40">real ability, before the interview.</span>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
        {OFFERINGS.map((o, i) => (
          <Reveal key={o.title} delay={i * 50} className="h-full">
            <div className="flex h-full flex-col bg-paper p-7">
              <h3 className="text-lg font-medium tracking-[-0.01em]">{o.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-60">{o.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={80} className="mt-14">
        <div className="rounded-card border border-line bg-white p-7 sm:p-9">
          <Eyebrow>How teams roll it out</Eyebrow>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n}>
                <p className="font-mono text-[11px] text-ink-40">{s.n}</p>
                <h4 className="mt-2 text-base font-medium">{s.t}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
