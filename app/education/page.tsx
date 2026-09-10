import type { Metadata } from "next";
import { EducationPage } from "@/features/landing/pages/EducationPage";

export const metadata: Metadata = {
  title: "CTRL for education — teach coding and computational thinking",
  description:
    "A hands-on way to teach programming and computational thinking. Students build the decision logic that runs real systems and watch it think — from visual blocks to real code, including AI agents and decision-making.",
};

/** The education pitch, served at `/education`. */
export default function EducationRoute() {
  return <EducationPage />;
}
