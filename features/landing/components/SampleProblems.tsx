import Link from "next/link";
import { challengesInPack } from "@/lib/content/registry";
import { Eyebrow, Reveal, Section } from "./primitives";

const PACK_LABEL: Record<string, string> = {
  maze: "Navigation",
  finance: "Payments",
  parking: "Operations",
};

export type SampleProblem = { pack: string; id: string; name: string; tagline: string };

export const PACK_LABELS = PACK_LABEL;

/** A handful of real problem statements, openable without an account. */
export function sampleProblems(): SampleProblem[] {
  const picks: SampleProblem[] = [];
  const take = (pack: string, index: number) => {
    const c = challengesInPack(pack)[index];
    if (c) picks.push({ pack, id: c.id, name: c.name, tagline: c.tagline });
  };
  take("maze", 0);
  take("finance", 0);
  take("parking", 0);
  take("maze", 1);
  return picks;
}

export function SampleProblems({ id = "problems" }: { id?: string }) {
  const samples = sampleProblems();

  return (
    <Section id={id}>
      <Reveal>
        <Eyebrow>See a few problems</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          Open a problem and try it.
          <br />
          <span className="text-ink-40">No account needed.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-base text-ink-60">
          Each one is a small operational world with a clear goal. Read the brief, build the
          decision logic, and press run — this is exactly what you&apos;d do in a real assessment.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {samples.map((s, i) => (
          <Reveal key={`${s.pack}-${s.id}`} delay={i * 50} className="h-full">
            <Link
              href={`/${s.pack}/${s.id}`}
              className="group flex h-full flex-col bg-paper p-6 transition-colors hover:bg-line-soft"
            >
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-40">
                {PACK_LABEL[s.pack] ?? s.pack}
              </span>
              <span className="mt-2 text-lg font-medium">{s.name}</span>
              <span className="mt-2 text-sm leading-relaxed text-ink-60">{s.tagline}</span>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-ink transition-transform group-hover:translate-x-0.5">
                Open problem <span aria-hidden="true">→</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
