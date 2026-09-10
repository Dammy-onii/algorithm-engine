"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Tiny uppercase mono label that opens most sections. */
export function Eyebrow({
  children,
  tone = "dark",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <p
      className={`font-mono text-[11px] tracking-[0.18em] uppercase ${
        tone === "dark" ? "text-ink-40" : "text-white/60"
      }`}
    >
      {children}
    </p>
  );
}

export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`border-t border-line ${className}`}>
      <div className="px-5 py-20 sm:px-10 md:py-28 lg:px-16 2xl:px-22">{children}</div>
    </section>
  );
}

/** Fades a block in the first time it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "-60px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${shown ? "animate-rise" : "opacity-0"}`}
      style={shown ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function PillLink({
  children,
  href,
  variant = "solid",
}: {
  children: ReactNode;
  href: string;
  variant?: "solid" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition";
  const styles =
    variant === "solid"
      ? "bg-ink text-white hover:bg-ink/85"
      : "border border-line text-ink hover:border-ink/40 hover:bg-white";
  return (
    <a href={href} className={`${base} ${styles}`}>
      {children}
    </a>
  );
}
