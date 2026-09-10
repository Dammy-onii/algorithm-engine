import type { Metadata } from "next";
import { LoginPage } from "@/features/landing/pages/LoginPage";

export const metadata: Metadata = {
  title: "Log in — CTRL",
  description:
    "Log in or get started with CTRL. Individuals practise real problems for free; companies run assessments. Try a few problems without an account.",
};

interface Props {
  searchParams: Promise<{ company?: string }>;
}

/** `/login` — individual and company sign-in. `?company=1` opens the company tab. */
export default async function LoginRoute({ searchParams }: Props) {
  const { company } = await searchParams;
  return <LoginPage defaultTab={company ? "company" : "individual"} />;
}
