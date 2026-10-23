/**
 * Procedural low-poly models for the warehouse yard, in the CTRL palette.
 *
 * Everything is built from rounded boxes, cylinders and spheres with flat,
 * soft materials, so the scene needs no downloaded assets. Colour carries
 * meaning: indigo is CTRL / the agent, volt marks whatever is in progress, and
 * each destination store has its own tag colour. A `Kit` owns every geometry,
 * material and texture it hands out, so one `dispose()` frees the scene.
 *
 * Units: one grid cell is `CELL` world units. Every model is built facing +Z
 * with its origin on the ground at its centre.
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const CELL = 2;

export const COLORS = {
  // CTRL neutrals (warm paper + ink).
  ground: 0xe9e8e3,
  yard: 0xf7f6f2,
  lane: 0xd6d5cf,
  paper: 0xfbfbf9,
  wall: 0xf1f0ec,
  wallShade: 0xe0dfd9,
  roof: 0xd9d8d3,
  ink: 0x232327,
  inkSoft: 0x3a3a40,
  steel: 0x56565c,
  // CTRL accents, kept vivid.
  indigo: 0x4f46e5,
  indigoLight: 0x818cf8,
  indigoDeep: 0x3730a3,
  volt: 0xc8ff3d,
  coral: 0xff6b4a,
  // Materials.
  kraft: 0xd9b98c,
  kraftLight: 0xe8cfa6,
  wood: 0xdcc39b,
  woodDark: 0xbfa275,
  glass: 0x2d3350,
  rubber: 0x1c1c20,
  leaf: 0x7dd3a8,
  leafDark: 0x5fbf91,
  trunk: 0x9a7b5f,
};

interface MatOptions {
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissive?: number;
  emissiveIntensity?: number;
  map?: THREE.Texture;
  side?: THREE.Side;
}

/** Owns and caches every GPU resource the scene creates. */
export class Kit {
  private readonly mats = new Map<string, THREE.Material>();
  private readonly geos = new Map<string, THREE.BufferGeometry>();
  private readonly owned: Array<{ dispose(): void }> = [];

  mat(color: number, opts: MatOptions = {}): THREE.MeshStandardMaterial {
    const k = [color, opts.roughness, opts.metalness, opts.opacity, opts.emissive, opts.emissiveIntensity, opts.map?.uuid, opts.side].join("|");
    let m = this.mats.get(k) as THREE.MeshStandardMaterial | undefined;
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.85,
        metalness: opts.metalness ?? 0,
        transparent: (opts.opacity ?? 1) < 1,
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 1,
        map: opts.map ?? null,
        side: opts.side ?? THREE.FrontSide,
        depthWrite: (opts.opacity ?? 1) >= 1,
      });
      this.mats.set(k, m);
    }
    return m;
  }

  /** An uncached material the caller will mutate (colour/opacity animation). */
  liveMat(color: number, opts: MatOptions = {}): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.5,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      depthWrite: (opts.opacity ?? 1) >= 1,
      side: opts.side ?? THREE.FrontSide,
    });
    return this.own(m);
  }

  private geo<T extends THREE.BufferGeometry>(k: string, make: () => T): T {
    let g = this.geos.get(k) as T | undefined;
    if (!g) {
      g = make();
      this.geos.set(k, g);
    }
    return g;
  }

  rbox(w: number, h: number, d: number, r = 0.06): THREE.BufferGeometry {
    const radius = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    return this.geo(`rb${w}|${h}|${d}|${radius}`, () => new RoundedBoxGeometry(w, h, d, 2, radius));
  }

  box(w: number, h: number, d: number): THREE.BufferGeometry {
    return this.geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  }

  cyl(rTop: number, rBottom: number, h: number, seg = 18): THREE.BufferGeometry {
    return this.geo(`c${rTop}|${rBottom}|${h}|${seg}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, seg));
  }

  sphere(r: number, ws = 20, hs = 14): THREE.BufferGeometry {
    return this.geo(`s${r}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
  }

  plane(w: number, h: number): THREE.BufferGeometry {
    return this.geo(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
  }

  ring(inner: number, outer: number, seg = 48): THREE.BufferGeometry {
    return this.geo(`r${inner}|${outer}|${seg}`, () => new THREE.RingGeometry(inner, outer, seg));
  }

  octa(r: number): THREE.BufferGeometry {
    return this.geo(`o${r}`, () => new THREE.OctahedronGeometry(r, 0));
  }

  /** A one-off geometry, material or texture the kit should dispose with the scene. */
  own<T extends { dispose(): void }>(resource: T): T {
    this.owned.push(resource);
    return resource;
  }

  canvasTexture(canvas: HTMLCanvasElement, repeat?: [number, number]): THREE.CanvasTexture {
    const t = this.own(new THREE.CanvasTexture(canvas));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    return t;
  }

  dispose(): void {
    this.mats.forEach((m) => m.dispose());
    this.geos.forEach((g) => g.dispose());
    this.owned.forEach((o) => o.dispose());
    this.mats.clear();
    this.geos.clear();
    this.owned.length = 0;
  }
}

/** A mesh that casts and receives shadows, positioned in one call. */
export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  shadows: { cast?: boolean; receive?: boolean } = {},
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadows.cast ?? true;
  m.receiveShadow = shadows.receive ?? true;
  return m;
}

/** A flat mesh lying on the ground (rotated to face up). */
export function decal(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = mesh(geometry, material, x, y, z, { cast: false });
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** Small deterministic PRNG so decorative jitter is stable between rebuilds. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

export const css = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

/** Corrugated cladding: soft vertical ribs. */
export function ribTexture(kit: Kit, base: number, rib: number, repeat: [number, number]): THREE.Texture {
  const [c, g] = canvas(64, 8);
  g.fillStyle = css(base);
  g.fillRect(0, 0, 64, 8);
  g.fillStyle = css(rib);
  g.fillRect(0, 0, 8, 8);
  g.fillStyle = "rgba(255,255,255,0.4)";
  g.fillRect(8, 0, 3, 8);
  return kit.canvasTexture(c, repeat);
}

/** Text/branding decal. */
export function decalTexture(
  kit: Kit,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.Texture {
  const [c, g] = canvas(w, h);
  draw(g, w, h);
  return kit.canvasTexture(c);
}

export function font(size: number, weight = 600): string {
  return `${weight} ${size}px 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`;
}

/** The CTRL cube mark, drawn isometric. */
export function drawCubeMark(g: CanvasRenderingContext2D, x: number, y: number, s: number, color = css(COLORS.indigo)): void {
  const h = s * 0.5;
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, -s); g.lineTo(s * 0.87, -h); g.lineTo(0, 0); g.lineTo(-s * 0.87, -h); g.closePath();
  g.globalAlpha = 0.7; g.fill();
  g.beginPath();
  g.moveTo(-s * 0.87, -h); g.lineTo(0, 0); g.lineTo(0, s); g.lineTo(-s * 0.87, h); g.closePath();
  g.globalAlpha = 1; g.fill();
  g.beginPath();
  g.moveTo(s * 0.87, -h); g.lineTo(0, 0); g.lineTo(0, s); g.lineTo(s * 0.87, h); g.closePath();
  g.globalAlpha = 0.85; g.fill();
  g.restore();
}

// ---------------------------------------------------------------------------
// Pallets — shrink-wrapped loads with store-coloured corner boards
// ---------------------------------------------------------------------------

/** A wrapped pallet load. `tag` colours the corner boards and label. */
export function makePallet(kit: Kit, tag: number, seed = 1): THREE.Group {
  const g = new THREE.Group();
  const rand = seeded(seed);
  const wood = kit.mat(COLORS.wood);
  const woodDark = kit.mat(COLORS.woodDark);
  for (const x of [-0.6, 0, 0.6]) g.add(mesh(kit.box(0.2, 0.1, 1.44), woodDark, x, 0.05, 0));
  for (let i = 0; i < 5; i++) g.add(mesh(kit.box(1.44, 0.05, 0.24), wood, 0, 0.125, -0.6 + i * 0.3));

  // Cartons, slightly varied.
  const deck = 0.15;
  const layers = 2 + (rand() > 0.6 ? 1 : 0);
  const size = 0.62;
  for (let layer = 0; layer < layers; layer++) {
    for (const x of [-0.34, 0.34]) {
      for (const z of [-0.34, 0.34]) {
        const shade = rand() > 0.5 ? COLORS.kraft : COLORS.kraftLight;
        g.add(mesh(kit.rbox(size, size * 0.86, size, 0.04), kit.mat(shade), x, deck + size * 0.43 + layer * size * 0.88, z));
      }
    }
  }
  const h = layers * size * 0.88;

  // Stretch wrap.
  const wrap = mesh(kit.rbox(1.42, h + 0.04, 1.42, 0.08), kit.mat(0xffffff, { opacity: 0.32, roughness: 0.15 }), 0, deck + h / 2, 0, { cast: false, receive: false });
  g.add(wrap);

  // Store-coloured corner boards and a label on two faces.
  const tagMat = kit.mat(tag, { roughness: 0.45 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(mesh(kit.box(0.09, h + 0.06, 0.09), tagMat, sx * 0.69, deck + h / 2, sz * 0.69));
  }
  g.add(mesh(kit.rbox(0.62, 0.34, 0.03, 0.02), tagMat, 0, deck + h * 0.55, 0.72, { cast: false }));
  g.add(mesh(kit.rbox(0.03, 0.34, 0.62, 0.02), tagMat, 0.72, deck + h * 0.55, 0, { cast: false }));
  g.add(mesh(kit.box(1.44, 0.05, 0.12), tagMat, 0, deck + h + 0.03, 0, { cast: false }));
  g.userData.height = deck + h;
  return g;
}

// ---------------------------------------------------------------------------
// Autonomous forklift — driverless, with a status light band and lidar
// ---------------------------------------------------------------------------

export interface ForkliftModel {
  group: THREE.Group;
  /** Raised/lowered with the load. */
  carriage: THREE.Group;
  /** Where a carried pallet's base sits, in carriage space. */
  seat: THREE.Object3D;
  /** Status light material; recoloured by the scene. */
  light: THREE.MeshStandardMaterial;
  /** Lidar head, spun by the scene. */
  lidar: THREE.Object3D;
}

export function makeForklift(kit: Kit): ForkliftModel {
  const group = new THREE.Group();
  const body = kit.mat(COLORS.indigo, { roughness: 0.4 });
  const shell = kit.mat(COLORS.paper, { roughness: 0.45 });
  const ink = kit.mat(COLORS.ink, { roughness: 0.5, metalness: 0.2 });
  const rubber = kit.mat(COLORS.rubber, { roughness: 0.9 });
  const light = kit.liveMat(COLORS.volt, { emissive: COLORS.volt, emissiveIntensity: 0.9, roughness: 0.3 });

  // Low chassis with a white sensor shell on top.
  group.add(mesh(kit.rbox(1.18, 0.5, 1.5, 0.16), body, 0, 0.42, -0.15));
  group.add(mesh(kit.rbox(1.0, 0.36, 1.05, 0.16), shell, 0, 0.83, -0.32));
  // Status band wrapping the chassis.
  group.add(mesh(kit.rbox(1.21, 0.07, 1.53, 0.03), light, 0, 0.6, -0.15, { cast: false }));
  // Front sensor "eyes".
  for (const x of [-0.38, 0.38]) group.add(mesh(kit.rbox(0.2, 0.08, 0.03, 0.02), kit.mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.8 }), x, 0.42, 0.61, { cast: false }));

  // Lidar mast.
  group.add(mesh(kit.cyl(0.05, 0.05, 0.3, 10), ink, 0, 1.15, -0.45));
  const lidar = new THREE.Group();
  lidar.position.set(0, 1.35, -0.45);
  lidar.add(mesh(kit.cyl(0.17, 0.17, 0.16, 20), ink, 0, 0, 0));
  lidar.add(mesh(kit.box(0.12, 0.06, 0.03), kit.mat(COLORS.volt, { emissive: COLORS.volt }), 0, 0, 0.17, { cast: false }));
  group.add(lidar);

  // Wheels, mostly tucked under the chassis.
  for (const [x, z] of [[-0.5, 0.35], [0.5, 0.35], [-0.5, -0.65], [0.5, -0.65]] as const) {
    const w = mesh(kit.cyl(0.2, 0.2, 0.22, 18), rubber, x, 0.2, z);
    w.rotation.z = Math.PI / 2;
    group.add(w);
  }

  // Mast.
  for (const x of [-0.32, 0.32]) group.add(mesh(kit.rbox(0.09, 1.75, 0.12, 0.03), ink, x, 0.98, 0.66));
  group.add(mesh(kit.box(0.72, 0.08, 0.1), ink, 0, 1.84, 0.66));

  // Carriage: backrest + forks. Its y is animated.
  const carriage = new THREE.Group();
  carriage.position.set(0, 0.12, 0);
  carriage.add(mesh(kit.rbox(0.8, 0.5, 0.06, 0.02), body, 0, 0.4, 0.76));
  for (const x of [-0.28, 0.28]) {
    carriage.add(mesh(kit.box(0.12, 0.05, 1.1), ink, x, 0.025, 1.32));
    carriage.add(mesh(kit.box(0.12, 0.4, 0.05), ink, x, 0.2, 0.79));
  }
  const seat = new THREE.Object3D();
  seat.position.set(0, -0.08, 1.45);
  carriage.add(seat);
  group.add(carriage);

  return { group, carriage, seat, light, lidar };
}

// ---------------------------------------------------------------------------
// Box truck
// ---------------------------------------------------------------------------

export interface TruckModel {
  group: THREE.Group;
  /** Cargo floor height, rear edge (local z) and cargo length, for loading. */
  floorY: number;
  rearZ: number;
  length: number;
  /** Distance from the rear doors to the front bumper. */
  reach: number;
  /** Roof light, lit while the truck is working. */
  beacon: THREE.MeshStandardMaterial;
}

export function makeTruck(kit: Kit): TruckModel {
  const group = new THREE.Group();
  const body = kit.mat(COLORS.paper, { roughness: 0.55 });
  const cab = kit.mat(COLORS.indigo, { roughness: 0.4 });
  const ink = kit.mat(COLORS.ink, { roughness: 0.6 });
  const rubber = kit.mat(COLORS.rubber, { roughness: 0.9 });
  const hub = kit.mat(COLORS.steel, { roughness: 0.4, metalness: 0.4 });
  const glass = kit.mat(COLORS.glass, { roughness: 0.12, metalness: 0.3 });

  const W = 2.3;
  const H = 2.6;
  const L = 6.0;
  const floorY = 1.0;
  const rearZ = -L / 2 - 0.9;
  const midZ = rearZ + L / 2;

  // Cargo box as an open shell, so loaded pallets show through the rear.
  const t = 0.08;
  group.add(mesh(kit.box(W, 0.14, L), ink, 0, floorY - 0.07, midZ));
  group.add(mesh(kit.box(W - 0.12, 0.02, L - 0.1), kit.mat(COLORS.wallShade), 0, floorY + 0.01, midZ, { cast: false }));
  group.add(mesh(kit.rbox(W, t, L, 0.03), body, 0, floorY + H, midZ));
  for (const s of [-1, 1]) group.add(mesh(kit.rbox(t, H, L, 0.03), body, s * (W / 2 - t / 2), floorY + H / 2, midZ));
  group.add(mesh(kit.rbox(W, H, t, 0.03), body, 0, floorY + H / 2, rearZ + L - t / 2));
  // Rear portal in ink, roller door rolled up.
  for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) group.add(mesh(kit.box(0.12, H + 0.05, 0.12), ink, x, floorY + H / 2, rearZ));
  group.add(mesh(kit.box(W, 0.35, 0.14), ink, 0, floorY + H - 0.12, rearZ));

  // Side livery: volt stripe + brand.
  const livery = decalTexture(kit, 1024, 300, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = css(COLORS.volt);
    g.fillRect(0, h - 46, w, 30);
    g.fillStyle = css(COLORS.indigo);
    g.fillRect(0, h - 16, w, 16);
    drawCubeMark(g, 120, 118, 54);
    g.fillStyle = css(COLORS.ink);
    g.font = font(92, 700);
    g.textBaseline = "middle";
    g.fillText("CTRL Freight", 200, 108);
    g.fillStyle = "#6f6f75";
    g.font = font(30, 500);
    g.fillText("Riverside Hub → Northgate", 204, 176);
  });
  const liveryMat = kit.own(new THREE.MeshStandardMaterial({ map: livery, transparent: true, roughness: 0.55 }));
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(kit.plane(L - 0.3, H - 0.2), liveryMat);
    p.position.set(s * (W / 2 + 0.006), floorY + H / 2 - 0.05, midZ);
    p.rotation.y = (s * Math.PI) / 2;
    group.add(p);
  }

  // Chassis and cab-over cab.
  group.add(mesh(kit.box(1.1, 0.3, L + 1.9), ink, 0, 0.62, midZ + 0.95));
  const cabZ = rearZ + L + 1.0;
  group.add(mesh(kit.rbox(W, 2.2, 1.6, 0.28), cab, 0, 1.75, cabZ));
  group.add(mesh(kit.rbox(W - 0.24, 0.85, 0.06, 0.04), glass, 0, 2.25, cabZ + 0.79, { cast: false }));
  for (const s of [-1, 1]) group.add(mesh(kit.rbox(0.05, 0.7, 0.9, 0.04), glass, s * (W / 2 + 0.004), 2.25, cabZ + 0.2, { cast: false }));
  group.add(mesh(kit.rbox(1.4, 0.4, 0.06, 0.04), ink, 0, 1.25, cabZ + 0.8));
  group.add(mesh(kit.box(W - 0.2, 0.12, 0.05), kit.mat(COLORS.volt, { emissive: COLORS.volt, emissiveIntensity: 0.3 }), 0, 1.55, cabZ + 0.81, { cast: false }));
  for (const s of [-1, 1]) group.add(mesh(kit.rbox(0.3, 0.16, 0.06, 0.03), kit.mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), s * 0.85, 1.0, cabZ + 0.8, { cast: false }));
  group.add(mesh(kit.rbox(W + 0.06, 0.26, 0.24, 0.08), ink, 0, 0.62, cabZ + 0.84));
  const beacon = kit.liveMat(COLORS.volt, { emissive: COLORS.volt, emissiveIntensity: 0.2, roughness: 0.3 });
  group.add(mesh(kit.rbox(0.9, 0.12, 0.24, 0.05), beacon, 0, 2.9, cabZ - 0.2, { cast: false }));

  for (const z of [cabZ, rearZ + 1.2]) {
    for (const s of [-1, 1]) {
      const w = mesh(kit.cyl(0.42, 0.42, 0.36, 22), rubber, s * 0.95, 0.42, z);
      w.rotation.z = Math.PI / 2;
      group.add(w);
      const h = mesh(kit.cyl(0.22, 0.22, 0.37, 14), hub, s * 0.96, 0.42, z, { cast: false });
      h.rotation.z = Math.PI / 2;
      group.add(h);
    }
  }

  return { group, floorY, rearZ, length: L, reach: L + 1.95, beacon };
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

/** Pallet racking filling one cell, stocked with neutral wrapped loads. */
export function makeRack(kit: Kit, seed: number): THREE.Group {
  const g = new THREE.Group();
  const upright = kit.mat(COLORS.ink, { roughness: 0.5 });
  const beam = kit.mat(COLORS.indigo, { roughness: 0.45 });
  const half = CELL / 2 - 0.12;
  for (const x of [-half, half]) {
    for (const z of [-0.62, 0.62]) g.add(mesh(kit.box(0.08, 3.3, 0.08), upright, x, 1.65, z));
  }
  const levels = [0.95, 2.05, 3.15];
  for (const y of levels) {
    for (const z of [-0.62, 0.62]) g.add(mesh(kit.box(CELL - 0.16, 0.1, 0.07), beam, 0, y, z));
  }
  const rand = seeded(seed);
  [0, ...levels.slice(0, 2)].forEach((y, i) => {
    if (rand() < 0.2) return;
    const p = makePallet(kit, COLORS.steel, seed * 7 + i);
    p.scale.set(0.78, 0.7, 0.78);
    p.position.y = y + (i === 0 ? 0 : 0.05);
    g.add(p);
  });
  return g;
}

/** Northgate Market storefront, facing +Z. */
export function makeStore(kit: Kit, name: string): THREE.Group {
  const g = new THREE.Group();
  const W = 8;
  const H = 3.6;
  const D = 5;
  g.add(mesh(kit.box(W, H, D), kit.mat(COLORS.wall, { roughness: 0.8 }), 0, H / 2, 0));
  g.add(mesh(kit.box(W + 0.3, 0.35, D + 0.3), kit.mat(COLORS.ink), 0, H + 0.17, 0));
  g.add(mesh(kit.box(W + 0.02, 0.4, D + 0.02), kit.mat(COLORS.ink), 0, 0.2, 0));
  // Windows and door.
  const glass = kit.mat(COLORS.glass, { roughness: 0.1, metalness: 0.3 });
  for (const x of [-2.6, -1.1, 1.9]) g.add(mesh(kit.rbox(1.2, 1.5, 0.06, 0.03), glass, x, 1.4, D / 2 + 0.02, { cast: false }));
  g.add(mesh(kit.rbox(1.0, 2.1, 0.06, 0.03), kit.mat(COLORS.indigoDeep, { roughness: 0.3 }), 0.4, 1.05, D / 2 + 0.02, { cast: false }));

  // Striped awning.
  const stripes = decalTexture(kit, 256, 32, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? "#ffffff" : css(COLORS.indigo);
      c.fillRect((i * w) / 8, 0, w / 8, h);
    }
  });
  const awning = mesh(kit.box(W - 0.4, 0.08, 1.3), kit.mat(0xffffff, { map: stripes, roughness: 0.7 }), 0, 2.55, D / 2 + 0.6);
  awning.rotation.x = 0.35;
  g.add(awning);

  // Sign board.
  const sign = decalTexture(kit, 1024, 192, (c, w, h) => {
    c.fillStyle = css(COLORS.ink);
    c.fillRect(0, 0, w, h);
    drawCubeMark(c, 92, 96, 48, css(COLORS.volt));
    c.fillStyle = "#ffffff";
    c.font = font(84, 700);
    c.textBaseline = "middle";
    c.fillText(name, 170, 100);
  });
  const board = new THREE.Mesh(kit.plane(6, 1.1), kit.mat(0xffffff, { map: sign, roughness: 0.6 }));
  board.position.set(0, H - 0.5, D / 2 + 0.03);
  g.add(board);
  return g;
}

export function makeTree(kit: Kit, scale = 1, seed = 1): THREE.Group {
  const g = new THREE.Group();
  const rand = seeded(seed);
  g.add(mesh(kit.cyl(0.11, 0.15, 1.1, 10), kit.mat(COLORS.trunk), 0, 0.55, 0));
  const leaf = kit.mat(rand() > 0.5 ? COLORS.leaf : COLORS.leafDark, { roughness: 0.9 });
  const crown = mesh(kit.sphere(0.72, 20, 16), leaf, 0, 1.65, 0);
  crown.scale.set(1, 1.2, 1);
  g.add(crown);
  g.scale.setScalar(scale);
  return g;
}

/** A floating destination marker: a faceted gem in the store's colour. */
export function makeMarker(kit: Kit, color: number): THREE.Group {
  const g = new THREE.Group();
  const gem = mesh(kit.octa(0.32), kit.mat(color, { roughness: 0.3, emissive: color, emissiveIntensity: 0.25 }), 0, 0, 0, { receive: false });
  gem.scale.y = 1.4;
  g.add(gem);
  return g;
}
