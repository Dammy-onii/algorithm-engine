import Link from "next/link";
import { Eyebrow, Reveal, Section } from "./primitives";

const POINTS = [
  {
    t: "Pick a problem",
    d: "Choose from a growing set of real operational challenges — routing, dispatch, navigation, capacity.",
  },
  {
    t: "Build the logic",
    d: "Design the decision-making with visual blocks, plain steps, or real code — whichever suits you.",
  },
  {
    t: "Watch it run",
    d: "Press run and see every decision your logic makes, tick by tick. Fix what breaks and improve your score.",
  },
  {
    t: "Keep your record",
    d: "Run it, improve it, and try it again. Saved progress and history arrive with accounts soon.",
  },
];

/** Clear explanation of the individual experience. */
export function Individuals() {
  return (
    <Section id="individuals" className="blueprint">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <Reveal>
          <Eyebrow>How it works for you</Eyebrow>
          <h2 className="mt-5 text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
            From a problem
            <br />
            <span className="text-ink-40">to a running solution.</span>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-60">
            Every challenge is a small world with a clear goal. You build the decision logic, press
            run, and watch every choice it makes — then improve it. Practising is free; when
            you&apos;re ready, you take a company&apos;s assessment with the exact same tools.
          </p>
          <div className="mt-8">
            <Link
              href="/app"
              className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85"
            >
              Try a problem
            </Link>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
            {POINTS.map((p, i) => (
              <div key={p.t} className="bg-paper p-6">
                <p className="font-mono text-[11px] text-ink-40">0{i + 1}</p>
                <h3 className="mt-3 text-base font-medium">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-60">{p.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
