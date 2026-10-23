"use client";

import { useEffect, useState } from "react";
import { Eyebrow, TryItNow } from "./primitives";
import { WaitlistForm } from "./WaitlistForm";

const DOMAINS = [
  "route failed payments",
  "prioritise urgent orders",
  "dispatch a delivery fleet",
  "manage limited capacity",
  "keep operations moving",
];

const STRIP = [
  "Banking & payments",
  "Logistics",
  "Retail operations",
  "Customer support",
  "Everyday software systems",
];

export function Hero() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % DOMAINS.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div id="top" className="px-5 pb-6 sm:px-10 lg:px-16 2xl:px-22">
      <div className="mesh grain relative overflow-hidden rounded-[28px]">
        <div className="relative z-10 flex flex-col items-center px-5 py-20 text-center sm:px-10 md:py-28">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/12 px-4 py-1.5 text-sm text-white/85 ring-1 ring-white/20 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-volt" />
            Technical assessments built around real work
          </div>

          <h1 className="mt-8 max-w-[22ch] text-[34px] leading-[1.08] font-medium tracking-[-0.03em] text-white sm:max-w-[24ch] sm:text-5xl lg:text-[58px]">
            <span className="block">See how candidates would</span>
            <span key={i} className="animate-rise inline-block font-serif italic whitespace-nowrap text-white/90">
              {DOMAINS[i]}.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base text-white/70 sm:text-lg">
            CTRL is a technical assessment platform where applicants solve realistic scenarios
            based on your company&apos;s work. See how they think, what they prioritise, and how their
            solution performs before you commit to another interview.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <TryItNow tone="light" />
            <span className="font-mono text-xs text-white/50">or request early access for your team</span>
          </div>

          <div className="mt-4 flex w-full justify-center">
            <WaitlistForm tone="light" />
          </div>

          <div className="mt-16 w-full">
            <Eyebrow tone="light">Assessments for real-world work</Eyebrow>
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
