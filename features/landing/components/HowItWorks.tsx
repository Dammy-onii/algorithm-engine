import { Eyebrow, Reveal, Section, TryItNow } from "./primitives";
import { LiveSim } from "./LiveSim";

const LOOP = [
  { step: "Set the scenario", body: "Choose a familiar business problem or shape one around your own work." },
  { step: "Invite candidates", body: "Applicants build a solution instead of answering another abstract question." },
  { step: "Run the solution", body: "The scenario changes and reveals how each candidate's decisions hold up." },
  { step: "Review the evidence", body: "Compare their approach, priorities, results, and ability to adapt." },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" className="blueprint">
      <Reveal>
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          Give candidates a problem
          <br />
          <span className="text-ink-40">that feels like the job.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-base text-ink-60 sm:text-lg">
          Candidates create the rules that guide a changing scenario. CTRL runs those rules and
          shows you the outcome, decision by decision. The example below is deliberately simple:
          move one rule and the same solution stops working.
        </p>
        <TryItNow label="Try a problem statement" className="mt-8" />
      </Reveal>

      <Reveal delay={80} className="mt-14">
        <LiveSim />
      </Reveal>

      <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {LOOP.map((l, i) => (
          <Reveal key={l.step} delay={i * 60} className="h-full">
            <div className="h-full bg-paper p-6">
              <p className="font-mono text-[11px] text-ink-40">0{i + 1}</p>
              <h3 className="mt-3 text-lg font-medium">{l.step}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-60">{l.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
