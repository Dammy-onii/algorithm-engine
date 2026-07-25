import { notFound } from "next/navigation";

import { ChallengeDirectoryPage } from "@/features/catalogue/pages/ChallengeDirectoryPage";
import {
  challengesInPack,
  findPack,
} from "@/lib/content/registry";

interface Props {
  params: Promise<{ pack: string }>;
}

/** A world-level directory grouped by difficulty. */
export default async function PackPage({ params }: Props) {
  const { pack } = await params;
  const packDefinition = findPack(pack);
  if (!packDefinition) notFound();

  return (
    <ChallengeDirectoryPage
      pack={packDefinition}
      challenges={challengesInPack(pack)}
    />
  );
}
