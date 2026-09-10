import Link from "next/link";
import { Eyebrow, Reveal, Section } from "./primitives";

/** Slim pointer from the individuals home to the companies page. */
export function CompaniesTeaser() {
  return (
    <Section id="companies">
      <Reveal>
        <div className="flex flex-col items-start gap-6 rounded-card border border-ink/15 bg-white p-8 shadow-[0_1px_2px_rgba(10,10,11,0.04),0_18px_50px_-30px_rgba(10,10,11,0.4)] sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <Eyebrow>For companies</Eyebrow>
              <span className="rounded-full bg-volt px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink uppercase">
                Hiring
              </span>
            </div>
            <p className="mt-4 text-xl leading-snug font-medium tracking-[-0.01em]">
              Hiring engineers? Assess candidates on real work.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-60">
              Send a problem shaped like your actual work and see how someone thinks before you
              interview.
            </p>
          </div>
          <Link
            href="/companies"
            className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85"
          >
            CTRL for companies →
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}
