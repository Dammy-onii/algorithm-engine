import { notFound } from "next/navigation";

import { AppShell } from "@/app/components/AppShell";
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
    <AppShell
      key={`challenge-${pack}-${challenge.id}`}
      view="pack"
      packId={pack}
      initialChallengeId={challenge.id}
    />
  );
}
