import { Eyebrow, Reveal, Section } from "./primitives";

const SIMS = [
  {
    name: "Banking & payments",
    teaches: "Reliability · cost · recovery",
    body: "Ask candidates to route payments across different providers, respond when a channel fails, and balance speed, cost, and reliability.",
    status: "Example",
  },
  {
    name: "Warehouse operations",
    teaches: "Priorities · workload · resources",
    body: "Ask candidates to assign incoming orders, manage limited resources, and keep work moving as demand and availability change.",
    status: "Example",
  },
  {
    name: "Customer support",
    teaches: "Queues · urgency · fairness",
    body: "Ask candidates to organise incoming requests, identify what needs attention first, and prevent important cases from being overlooked.",
    status: "Example",
  },
  {
    name: "Delivery operations",
    teaches: "Assignment · timing · change",
    body: "Ask candidates to match drivers with orders while customer promises, traffic, availability, and priorities keep changing.",
    status: "Example",
  },
  {
    name: "Shared software problems",
    teaches: "Queues · priorities · capacity",
    body: "Assess the everyday thinking behind software systems, even when the scenario is not tied to one industry or department.",
    status: "Example",
  },
  {
    name: "Your company's scenario",
    teaches: "Your work · your priorities",
    body: "Shape an assessment around a problem your team understands and give applicants a realistic view of the work they are joining.",
    status: "Custom",
  },
];

export function Simulations() {
  return (
    <Section id="simulations">
      <Reveal>
        <Eyebrow>Assessment scenarios</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] sm:text-[44px]">
          Start with a common problem.
          <br />
          <span className="text-ink-40">Make it relevant to your company.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-base text-ink-60">
          Some challenges appear everywhere: deciding what comes first, managing a queue, or
          working with limited time and resources. CTRL can also turn a process from your own
          industry into an assessment candidates can understand and solve.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
        {SIMS.map((s, i) => (
          <Reveal key={s.name} delay={i * 50} className="h-full">
            <div className="flex h-full flex-col bg-paper p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-medium">{s.name}</h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase ${
                    s.status === "Example"
                      ? "bg-volt text-ink"
                      : "border border-line text-ink-40"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-ink-40">{s.teaches}</p>
              <p className="mt-5 text-sm leading-relaxed text-ink-60">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
