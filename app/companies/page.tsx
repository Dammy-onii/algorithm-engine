import type { Metadata } from "next";
import { CompaniesPage } from "@/features/landing/pages/CompaniesPage";

export const metadata: Metadata = {
  title: "CTRL for companies — hire on real work",
  description:
    "Send candidates a realistic problem shaped like your actual work, and see how they think, prioritise, and perform before you commit to another interview.",
};

/** The detailed hiring pitch, served at `/companies`. */
export default function CompaniesRoute() {
  return <CompaniesPage />;
}
