import { notFound } from "next/navigation";

import { StudioPage } from "@/features/studio/pages/StudioPage";
import { findPack, getChallenge } from "@/lib/content/registry";

interface Props {
  params: Promise<{ pack: string; challenge: string }>;
}

/** A shareable studio route for one challenge in one validated pack. */
export default async function ChallengePage({ params }: Props) {
  const { pack, challenge: challengeId } = await params;
  const challenge = getChallenge(challengeId);

  if (!findPack(pack) || !challenge || challenge.pack !== pack) notFound();

  return (
    <StudioPage
      key={`challenge-${pack}-${challenge.id}`}
      packId={pack}
      challengeId={challenge.id}
    />
  );
}
