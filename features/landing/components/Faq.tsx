import { Eyebrow, Reveal, Section } from "./primitives";

const FAQS = [
  {
    q: "What is CTRL?",
    a: "CTRL is a technical assessment platform. Instead of giving applicants a generic coding question, you place them in a realistic scenario and ask them to build the decision-making logic that keeps it working. You can then review both their result and how they approached the problem.",
  },
  {
    q: "Why not use a standard coding test?",
    a: "Standard tests are useful for checking whether someone can produce a correct answer. CTRL adds context: candidates must understand a changing situation, decide what matters, and build a solution that continues to work. That gives you evidence about judgement and problem-solving as well as technical ability.",
  },
  {
    q: "Can the assessment reflect our company?",
    a: "Yes. A financial company might use payment routing, while a logistics company might use delivery assignment. Assessments can also cover common problems such as queues, priorities, capacity, and changing requirements. The goal is to test familiar skills in a context that matters to your team.",
  },
  {
    q: "What does the hiring team get to review?",
    a: "You see whether the solution worked, how efficiently it performed, and the decisions that produced the outcome. That record helps reviewers compare candidates consistently and gives interviewers specific choices and trade-offs to discuss.",
  },
  {
    q: "Where does CTRL fit in our hiring process?",
    a: "It can be an early screen, a practical skills stage, or a final exercise before an interview. Use it early to reduce the number of applications your team reviews manually, or later when you need more confidence before making a decision.",
  },
  {
    q: "Does it replace interviews?",
    a: "No. It makes them more useful. CTRL gives your team evidence before the conversation, so interviewers can spend less time confirming basic ability and more time understanding the candidate's reasoning, experience, and fit for the role.",
  },
  {
    q: "How does another assessment save us time and cost?",
    a: "The assessment adds a step for candidates, but reduces repeated work for your hiring team. A consistent first-stage screen can narrow a large applicant pool before interviews begin. Used later, it can prevent extra interview rounds by giving the team clearer evidence sooner.",
  },
  {
    q: "When does access open?",
    a: "CTRL is opening to companies in small private-beta cohorts. Join the waitlist and tell us about the roles you hire for and the kind of scenario you would want applicants to solve.",
  },
];

export function Faq() {
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
                <p className="mt-3 max-w-2xl pr-10 text-sm leading-relaxed text-ink-60">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
