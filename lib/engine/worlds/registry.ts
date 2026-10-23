/**
 * World-module registry — resolves a WorldData `kind` to its WorldModule.
 *
 * This is the code-side registry of *known* world types. A content pack's
 * manifest references a module by id (e.g. "finance"); the app only ever
 * resolves ids it already ships. New world types register here.
 */

import type { DomainFlagSpec, WorldModule } from "./module";
import { mazeModule } from "./maze";
import { financeModule } from "./finance";
import { parkingModule } from "./parking";
import { droneModule } from "./drone";
import { cargoModule } from "./cargo";
import { sorterModule } from "./sorter";
import { warehouseModule } from "./warehouse";

const MODULES: Record<string, WorldModule> = {
  [mazeModule.id]: mazeModule,
  [financeModule.id]: financeModule,
  [parkingModule.id]: parkingModule,
  [droneModule.id]: droneModule,
  [cargoModule.id]: cargoModule,
  [sorterModule.id]: sorterModule,
  [warehouseModule.id]: warehouseModule,
};

/** Resolve a world module by kind, defaulting to the maze (base grid). */
export function resolveWorldModule(kind: string | undefined): WorldModule {
  return MODULES[kind ?? "maze"] ?? mazeModule;
}

/** Every module's domain-flag names, unioned — the known condition vocabulary. */
export function allDomainFlags(): string[] {
  return [...new Set(allDomainFlagSpecs().map((flag) => flag.id))];
}

/** Flag metadata for editors and other presentation layers. */
export function allDomainFlagSpecs(): DomainFlagSpec[] {
  return Object.values(MODULES).flatMap((module) => module.domainFlags);
}

/** Every action contributed by a shipped world module. */
export function allDomainActions(): string[] {
  return [...new Set(Object.values(MODULES).flatMap((module) => module.domainActions))];
}

export { mazeModule, financeModule, parkingModule, droneModule, cargoModule, sorterModule, warehouseModule };
