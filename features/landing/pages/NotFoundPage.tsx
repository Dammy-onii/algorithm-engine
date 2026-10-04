import Link from "next/link";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { LiveSim } from "../components/LiveSim";
import { Eyebrow } from "../components/primitives";

/** Custom 404 — a wrong turn, with the engine finding its own way. */
export function NotFoundPage() {
  return (
    <div className="site-light min-h-screen">
      <Nav />
      <main>
        <section className="px-5 pt-16 pb-6 text-center sm:px-10 lg:px-16">
          <Eyebrow>Error 404 · dead end</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            This page took a wrong turn.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink-60 sm:text-lg">
            The page you&apos;re after isn&apos;t here. A good algorithm doesn&apos;t give up at a
            dead end, though — it observes, decides, and finds another way. Here&apos;s the CTRL
            engine doing exactly that while you pick where to go next.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85"
            >
              Back to home
            </Link>
            <Link
              href="/app"
              className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink/40"
            >
              Open a problem
            </Link>
            <Link
              href="/education"
              className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink/40"
            >
              For education
            </Link>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-[1180px]">
            <LiveSim />
          </div>
        </section>

        <section className="border-t border-line px-5 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-[1180px] gap-8 sm:grid-cols-[0.8fr_1.2fr] sm:items-start">
            <div>
              <Eyebrow>What is CTRL?</Eyebrow>
              <h2 className="mt-4 text-2xl font-medium tracking-[-0.02em]">
                Build the intelligence, not just the answer.
              </h2>
            </div>
            <p className="text-base leading-relaxed text-ink-60">
              CTRL turns real operational problems — routing payments, running a parking
              facility, flying a search drone — into challenges you solve by designing the decision logic that
              runs them, then watching it perform. Practise the problems yourself, or use them to
              see how candidates actually think. The demo above is a small version of the same loop:
              observe, decide, act, repeat — move one rule and the solution stops working.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
