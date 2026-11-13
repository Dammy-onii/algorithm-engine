/**
 * Codebase assessments are hidden on production builds until
 * NEXT_PUBLIC_CODEBASE_ASSESSMENTS=true is set (they need a real database first).
 * They are always on in `next dev` so they can be built and tested locally.
 */
export function assessmentsEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_CODEBASE_ASSESSMENTS === "true" ||
    process.env.NODE_ENV !== "production"
  );
}
