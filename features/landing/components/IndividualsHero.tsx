import Link from "next/link";
import { Eyebrow } from "./primitives";

const STRIP = [
  "Warehouse robots",
  "Payment routing",
  "Delivery dispatch",
  "Smart parking",
  "Customer support",
  "Retail restocking",
];

/** Hero for the dedicated /individuals page. Clear description, parallel to companies. */
export function IndividualsHero() {
  return (
    <div id="top" className="px-5 pb-6 sm:px-10 lg:px-16 2xl:px-22">
      <div className="mesh grain relative overflow-hidden rounded-[28px]">
        <div className="relative z-10 flex flex-col items-center px-5 py-20 text-center sm:px-10 md:py-28">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/12 px-4 py-1.5 text-sm text-white/85 ring-1 ring-white/20 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-volt" />
            For individuals · free to start
          </div>

          <h1 className="mt-8 max-w-[16ch] text-[34px] leading-[1.08] font-medium tracking-[-0.03em] text-white sm:max-w-[18ch] sm:text-5xl lg:text-[58px]">
            Practise the work,{" "}
            <span className="font-serif italic text-white/90">not trick questions.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-base text-white/70 sm:text-lg">
            CTRL is a technical practice platform where you solve realistic scenarios by building
            the decision logic that runs them. Design your solution, watch it run, and sharpen how
            you think — on the same kind of problems companies use to hire.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/app"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-volt"
            >
              Try a problem
            </Link>
            <Link
              href="/companies"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              For hiring →
            </Link>
          </div>

          <div className="mt-16 w-full">
            <Eyebrow tone="light">Problems drawn from real operations</Eyebrow>
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
