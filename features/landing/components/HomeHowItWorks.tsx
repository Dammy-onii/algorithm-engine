import { Eyebrow, Reveal, Section } from "./primitives";
import { LiveSim } from "./LiveSim";

const LOOP = [
  { step: "Observe", body: "The engine shows the agent only what it can currently see about the world." },
  { step: "Decide", body: "Your logic reads that and chooses a single next action." },
  { step: "Act", body: "The engine carries the action out and the world responds." },
  { step: "Repeat", body: "State changes, new information arrives, and the loop runs again until the goal is met." },
];

/** Engine-neutral explanation of the core loop, with the live demo. */
export function HomeHowItWorks() {
  return (
    <Section id="how-it-works" className="blueprint">
      <Reveal>
        <Eyebrow>How the engine works</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          You design the logic.
          <br />
          <span className="text-ink-40">The engine runs it.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-base text-ink-60 sm:text-lg">
          Every problem is a live world that keeps changing. You don&apos;t write one answer — you
          build the decision-making that keeps making good calls as conditions shift, and you watch
          every decision happen. The demo below is deliberately simple: move one rule and the same
          solution stops working.
        </p>
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
