import Link from "next/link";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { LoginForm } from "../components/LoginForm";
import { sampleProblems, PACK_LABELS } from "../components/SampleProblems";
import { Eyebrow } from "../components/primitives";

/** `/login`: sign-in on the left, open sample problems on the right, full height. */
export function LoginPage({ defaultTab = "individual" }: { defaultTab?: "individual" | "company" }) {
  const samples = sampleProblems();

  return (
    <div className="site-light min-h-screen">
      <Nav />
      <main>
        <section className="grid min-h-[calc(100svh-3.75rem)] gap-px border-t border-line bg-line lg:grid-cols-2">
          {/* Left — sign in */}
          <div className="flex flex-col justify-center bg-paper px-5 py-14 sm:px-10 lg:px-16">
            <div className="mx-auto w-full max-w-md">
              <Eyebrow>Welcome to CTRL</Eyebrow>
              <h1 className="mt-4 text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
                Log in or get started.
              </h1>
              <p className="mt-4 text-base text-ink-60">
                Individuals practise for free; companies run assessments. Not ready? Try a problem
                on the right — no account needed.
              </p>
              <div className="mt-8">
                <LoginForm defaultTab={defaultTab} />
              </div>
            </div>
          </div>

          {/* Right — open sample problems */}
          <div className="flex flex-col justify-center bg-paper px-5 py-14 sm:px-10 lg:px-16">
            <div className="mx-auto w-full max-w-md">
              <Eyebrow>See a few problems</Eyebrow>
              <h2 className="mt-4 text-2xl font-medium tracking-[-0.02em]">
                Try one — no account needed.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-60">
                Each is a small operational world with a clear goal. Read the brief, build the
                logic, and press run.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                {samples.map((s) => (
                  <Link
                    key={`${s.pack}-${s.id}`}
                    href={`/${s.pack}/${s.id}`}
                    className="group rounded-2xl border border-line bg-paper p-4 transition hover:border-ink/30 hover:bg-line-soft"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-ink-40">
                        {PACK_LABELS[s.pack] ?? s.pack}
                      </span>
                      <span
                        className="text-ink-40 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </div>
                    <p className="mt-1.5 font-medium">{s.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-60">{s.tagline}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
