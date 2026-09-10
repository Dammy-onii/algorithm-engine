import Link from "next/link";

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
            For individuals
          </Link>
          <Link href="/companies" className="text-sm text-ink-60 transition hover:text-ink">
            For companies
          </Link>
          <Link href="/education" className="text-sm text-ink-60 transition hover:text-ink">
            For education
          </Link>
        </nav>

        <Link
          href="/app"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85"
        >
          Open app
        </Link>
      </div>
    </header>
  );
}
