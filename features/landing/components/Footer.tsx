import Link from "next/link";
import type { NavLink } from "./Nav";

const DEFAULT_LINKS: NavLink[] = [
  { label: "For individuals", href: "/" },
  { label: "For companies", href: "/companies" },
  { label: "For education", href: "/education" },
  { label: "Open app", href: "/app" },
];

interface FooterProps {
  links?: NavLink[];
  tagline?: string;
}

export function Footer({
  links = DEFAULT_LINKS,
  tagline = "One engine for practising, assessing, and understanding how people solve real problems.",
}: FooterProps) {
  return (
    <footer className="border-t border-line">
      <div className="flex flex-col gap-8 px-5 py-12 sm:px-10 md:flex-row md:items-end md:justify-between lg:px-16 2xl:px-22">
        <div>
          <Link
            href="/"
            className="font-mono text-[24px] leading-none font-medium tracking-[-0.06em]"
            aria-label="CTRL home"
          >
            ctrl
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-60">{tagline}</p>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-ink-60 transition hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="font-mono text-[11px] tracking-wide text-ink-40">
            © {new Date().getFullYear()} CTRL — build the intelligence behind real systems.
          </p>
        </div>
      </div>
    </footer>
  );
}
