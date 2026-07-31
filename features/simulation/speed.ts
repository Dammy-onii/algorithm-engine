export interface SimulationSpeedProfile {
  initial: number;
  maximum: number;
}

/** Shared playback policy for Studio and Lab. */
export function simulationSpeedForWorld(
  worldKind: string | undefined,
): SimulationSpeedProfile {
  if (worldKind === "finance") return { initial: 10, maximum: 20 };
  if (worldKind === "parking") return { initial: 5, maximum: 15 };
  return { initial: 1, maximum: 3 };
}
