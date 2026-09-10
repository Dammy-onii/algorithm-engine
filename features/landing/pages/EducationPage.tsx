import Link from "next/link";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { EducationHero } from "../components/EducationHero";
import { LiveSim } from "../components/LiveSim";
import { WaitlistForm } from "../components/WaitlistForm";
import { Eyebrow, Reveal, Section } from "../components/primitives";

const TEACHING = [
  {
    t: "No syntax wall",
    d: "Students start with visual blocks and build working logic on day one — no installs, no cryptic errors, no blank editor.",
  },
  {
    t: "See every decision",
    d: "They watch the agent observe, decide, and act, step by step. Debugging becomes watching behaviour, not reading logs.",
  },
  {
    t: "Blocks → code, gradually",
    d: "The same solution opens as plain steps, then as real TypeScript — so learners graduate into syntax exactly when they're ready.",
  },
  {
    t: "Think in agents",
    d: "Students learn the mental model behind modern AI: something that senses, decides, and adapts. Foundational for coding and for AI.",
  },
];

const OFFERINGS = [
  {
    t: "Curriculum-ready progression",
    d: "Each challenge introduces exactly one idea, in order — from sequencing to state machines to decision logic. Drop it into a course, or run it as one.",
  },
  {
    t: "Beginner to real code",
    d: "One platform takes a first-timer from visual blocks to writing JavaScript — so a single tool covers the whole journey.",
  },
  {
    t: "AI-era thinking",
    d: "Agents, decision-making, and adapting to change are the skills employers now ask for. CTRL teaches them from the first lesson.",
  },
  {
    t: "Zero setup, any device",
    d: "It runs in the browser. No environments to configure — it works in a lab, on a laptop, or on a phone.",
  },
  {
    t: "Engagement that sticks",
    d: "Students see the consequences of their logic in a live world. That feedback loop keeps cohorts motivated and moving.",
  },
  {
    t: "Skills you can see",
    d: "Because every decision is visible, you can see how a student thinks and where they're stuck — far richer than a pass/fail.",
  },
];

const LADDER = [
  "Sequencing",
  "Conditions",
  "Priority",
  "Reusable functions",
  "State machines",
  "Memory",
  "Optimisation",
  "Agents & decision logic",
];

const AUDIENCE = [
  {
    who: "Coding bootcamps & schools",
    body: "Give beginners a confidence-building on-ramp to real programming, and a shared project every cohort can rally around.",
  },
  {
    who: "Universities & CS courses",
    body: "Make algorithms, state machines, and agents tangible in lectures and labs instead of chalkboard pseudocode.",
  },
  {
    who: "Secondary & K-12 CS",
    body: "Introduce computational thinking without the syntax barrier — students build real logic before they type a semicolon.",
  },
  {
    who: "Online & cohort programs",
    body: "Browser-based and self-paced, with visible progress for every learner and problems that feel like real work.",
  },
];

/** The education pitch at `/education` — for schools, bootcamps, and programs. */
export function EducationPage() {
  return (
    <>
      <Nav />
      <main>
        <EducationHero />

        {/* How it teaches — with the live demo */}
        <Section id="how-it-teaches" className="blueprint">
          <Reveal>
            <Eyebrow>How it teaches</Eyebrow>
            <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
              Concepts they can see,
              <br />
              <span className="text-ink-40">not just memorise.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base text-ink-60 sm:text-lg">
              Beginners don&apos;t struggle with programming because it&apos;s hard — they struggle
              because it&apos;s invisible. CTRL makes it visible: students build the logic and watch
              every decision it makes, so cause and effect are obvious. Try the demo — move one rule
              and the solution stops working.
            </p>
          </Reveal>

          <Reveal delay={80} className="mt-14">
            <LiveSim />
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {TEACHING.map((p, i) => (
              <Reveal key={p.t} delay={i * 60} className="h-full">
                <div className="h-full bg-paper p-6">
                  <p className="font-mono text-[11px] text-ink-40">0{i + 1}</p>
                  <h3 className="mt-3 text-lg font-medium">{p.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-60">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* The learning path */}
        <Section id="path">
          <Reveal>
            <Eyebrow>The learning path</Eyebrow>
            <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
              One idea at a time —
              <br />
              <span className="text-ink-40">from first steps to real programs.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base text-ink-60">
              Concepts unlock in order, each one building on the last. A learner is never shown an
              idea before they have the pieces to understand it.
            </p>
          </Reveal>
          <Reveal delay={80} className="mt-12">
            <ol className="flex flex-wrap items-center gap-x-3 gap-y-3">
              {LADDER.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium">
                    <span className="font-mono text-[11px] text-ink-40">{i + 1}</span>
                    {step}
                  </span>
                  {i < LADDER.length - 1 && <span className="text-ink-40">→</span>}
                </li>
              ))}
            </ol>
          </Reveal>
        </Section>

        {/* What programs get */}
        <Section id="offerings" className="blueprint">
          <Reveal>
            <Eyebrow>What your program gets</Eyebrow>
            <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
              Everything you need to teach
              <br />
              <span className="text-ink-40">how to code, and how to think.</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
            {OFFERINGS.map((o, i) => (
              <Reveal key={o.t} delay={i * 50} className="h-full">
                <div className="flex h-full flex-col bg-paper p-7">
                  <h3 className="text-lg font-medium tracking-[-0.01em]">{o.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-60">{o.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Who it's for */}
        <Section id="who-its-for">
          <Reveal>
            <Eyebrow>Who it&apos;s for</Eyebrow>
            <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
              Built for programs teaching
              <br />
              <span className="text-ink-40">the next generation of builders.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base text-ink-60">
              Whether you run a bootcamp, a university course, a secondary CS class, or an online
              cohort, CTRL fits the way modern programs teach — hands-on projects, real skills, and
              progress you can see.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
            {AUDIENCE.map((a, i) => (
              <Reveal key={a.who} delay={i * 60} className="h-full">
                <div className="flex h-full flex-col bg-paper p-7">
                  <Eyebrow>{a.who}</Eyebrow>
                  <p className="mt-4 text-sm leading-relaxed text-ink-60">{a.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Contact / early access */}
        <section id="contact" className="border-t border-line">
          <div className="px-5 py-16 sm:px-10 lg:px-16 2xl:px-22">
            <div className="mesh grain relative overflow-hidden rounded-[28px]">
              <div className="relative z-10 flex flex-col items-center px-6 py-20 text-center sm:px-10">
                <Eyebrow tone="light">For education — early access</Eyebrow>
                <h2 className="mt-6 max-w-3xl text-3xl leading-[1.08] font-medium tracking-[-0.03em] text-white sm:text-[52px]">
                  Bring CTRL to your
                  <br />
                  <span className="font-serif italic text-white/80">classroom or cohort.</span>
                </h2>
                <p className="mt-6 max-w-xl text-base text-white/70">
                  Tell us about your program and the learners you teach, and we&apos;ll help you
                  build a track that fits your curriculum. Want to see it first?{" "}
                  <Link href="/app" className="text-white underline underline-offset-4 hover:text-volt">
                    Open the app.
                  </Link>
                </p>
                <div className="mt-9 flex w-full justify-center">
                  <WaitlistForm
                    tone="light"
                    source="education"
                    companyPlaceholder="School or program"
                    rolePlaceholder="What you teach"
                    submitLabel="Request access"
                    note="Tell us about your learners. No spam, ever."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
