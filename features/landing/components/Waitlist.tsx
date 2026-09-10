import { Eyebrow } from "./primitives";
import { WaitlistForm } from "./WaitlistForm";

export function Waitlist() {
  return (
    <section id="waitlist" className="border-t border-line">
      <div className="px-5 py-16 sm:px-10 lg:px-16 2xl:px-22">
        <div className="mesh grain relative overflow-hidden rounded-[28px]">
          <div className="relative z-10 flex flex-col items-center px-6 py-20 text-center sm:px-10">
            <Eyebrow tone="light">For hiring teams</Eyebrow>
            <h2 className="mt-6 max-w-3xl text-3xl leading-[1.08] font-medium tracking-[-0.03em] text-white sm:text-[52px]">
              Make your next technical assessment
              <br />
              <span className="font-serif italic text-white/80">feel like the work.</span>
            </h2>
            <p className="mt-6 max-w-xl text-base text-white/70">
              Join the private beta and tell us about the roles you hire for. We&apos;ll help you turn
              a relevant problem into an assessment with clearer hiring evidence.
            </p>
            <div className="mt-9 flex w-full justify-center">
              <WaitlistForm tone="light" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
