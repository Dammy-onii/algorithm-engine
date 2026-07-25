import { notFound } from "next/navigation";

import { AppShell } from "@/app/components/AppShell";
import { findPack } from "@/lib/content/registry";

interface Props {
  params: Promise<{ pack: string }>;
}

/** A world-level directory grouped by difficulty. */
export default async function PackPage({ params }: Props) {
  const { pack } = await params;
  if (!findPack(pack)) notFound();

  return <AppShell key={`pack-${pack}`} view="levels" packId={pack} />;
}
