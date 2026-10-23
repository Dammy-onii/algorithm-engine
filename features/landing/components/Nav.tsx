import Link from "next/link";

import { TryItNow } from "./primitives";

export type NavLink = { label: string; href: string };

/**
 * Landing navigation — identical on every page. The wordmark returns to the home
 * (individuals) page. Login is hidden for now; visitors open the app directly.
 */
export function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-paper/80 backdrop-blur-md">
      <div className="flex items-center justify-between gap-6 px-5 py-4 sm:px-10 lg:px-16 2xl:px-22">
        <Link
          href="/"
          className="font-mono text-[24px] leading-none font-medium tracking-[-0.06em]"
          aria-label="CTRL home"
        >
          ctrl
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/" className="text-sm text-ink-60 transition hover:text-ink">
            For companies
          </Link>
          <Link href="/education" className="text-sm text-ink-60 transition hover:text-ink">
            For education
          </Link>
        </nav>

        <TryItNow />
      </div>
    </header>
  );
}
