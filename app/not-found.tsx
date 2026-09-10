import type { Metadata } from "next";
import { NotFoundPage } from "@/features/landing/pages/NotFoundPage";

export const metadata: Metadata = {
  title: "Page not found — CTRL",
};

/** Custom 404 for unmatched routes and notFound() calls. */
export default function NotFound() {
  return <NotFoundPage />;
}
