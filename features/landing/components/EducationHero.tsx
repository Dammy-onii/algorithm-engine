import Link from "next/link";
import { Eyebrow } from "./primitives";

const STRIP = [
  "Sequencing",
  "Conditions",
  "Loops",
  "State machines",
  "Memory",
  "AI agents",
  "Decision logic",
];

/** Hero for the /education page — speaks to schools, bootcamps, and programs. */
export function EducationHero() {
  return (
    <div id="top" className="px-5 pb-6 sm:px-10 lg:px-16 2xl:px-22">
      <div className="mesh grain relative overflow-hidden rounded-[28px]">
        <div className="relative z-10 flex flex-col items-center px-5 py-20 text-center sm:px-10 md:py-28">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/12 px-4 py-1.5 text-sm text-white/85 ring-1 ring-white/20 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-volt" />
            For education · schools, bootcamps &amp; programs
          </div>

          <h1 className="mt-8 max-w-[16ch] text-[34px] leading-[1.08] font-medium tracking-[-0.03em] text-white sm:max-w-[18ch] sm:text-5xl lg:text-[58px]">
            Teach them to code —{" "}
            <span className="font-serif italic text-white/90">and to think.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-base text-white/70 sm:text-lg">
            CTRL is a hands-on way to teach programming and computational thinking. Students solve
            real problems by building the decision logic that runs them, then watch it think — so
            abstract ideas like loops, state, and AI agents become something they can see, build,
            and improve.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/app"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-volt"
            >
              Try a lesson
            </Link>
            <a
              href="#contact"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Bring it to your class →
            </a>
          </div>

          <div className="mt-16 w-full">
            <Eyebrow tone="light">Concepts students build, in order</Eyebrow>
            <div className="mt-5 flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
                {[...STRIP, ...STRIP].map((s, n) => (
                  <span
                    key={`${s}-${n}`}
                    className="font-mono text-sm whitespace-nowrap text-white/55"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
