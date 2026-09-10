import { Eyebrow, Reveal, Section } from "./primitives";

const FAQS = [
  {
    q: "What is CTRL?",
    a: "CTRL is a simulation engine for solving real operational problems. Instead of writing one answer to a fixed question, you design the decision-making logic that runs a changing system — a warehouse, a payment router, a delivery network — and watch it perform. The same engine powers self-guided practice and company hiring assessments.",
  },
  {
    q: "Can I use it on my own?",
    a: "Yes — and right now you don't even need an account. Open the app, choose a problem, and build a solution with visual blocks, plain steps, or code. Run it, improve it, and try again. Accounts to save your progress are coming soon.",
  },
  {
    q: "How do companies use it?",
    a: "Companies send candidates a realistic problem shaped like their actual work, then review how each person thinks, prioritises, and performs before an interview. That's our main focus right now — see the companies page for detail on assessments, reports, and what we offer teams.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. You can author working logic by arranging blocks — no syntax required — and the same solution opens as plain steps and then real code as you get more confident. It's built to meet you where you are.",
  },
  {
    q: "When does access open?",
    a: "We're opening in small private-beta cohorts, companies first. Request access and tell us how you'd want to use CTRL, and we'll be in touch when your seat is ready.",
  },
];

export function HomeFaq() {
  return (
    <Section id="faq">
      <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
        <Reveal>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-5 text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[40px]">
            Questions,
            <br />
            <span className="text-ink-40">answered.</span>
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div className="divide-y divide-line border-y border-line">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-base font-medium marker:content-none">
                  {f.q}
                  <span className="mt-1 shrink-0 text-ink-40 transition-transform duration-200 group-open:rotate-45">
                    <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden="true">
                      <path
                        d="M7 1v12M1 7h12"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl pr-10 text-sm leading-relaxed text-ink-60">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
