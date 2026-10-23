/**
 * The warehouse yard as a Three.js scene.
 *
 * `WarehouseScene` owns the WebGL renderer, cameras, controls and the render
 * loop. `setWorld` lays out the yard for a world (racks from blocked tiles,
 * pallets from the domain, the truck in its bay, a road out to the store), and
 * `sync` is called after every simulation tick to retarget what moves: the
 * forklift glides to its new cell, its forks rise with a load, pallets ride
 * into the truck, and the truck drives to the store, U-turns, drives back and
 * reverses into the bay.
 *
 * Viewing: the default Track mode keeps the camera still. It sits on the yard
 * while the forklift works and glides once to the whole-route view only while
 * the forklift is idle and the truck is on the road. Whatever stands between
 * the camera and the forklift, its target pallet or the truck (racks, the hub,
 * trees, lamps, the store) fades to see-through. Track names what is acting
 * this tick. Fixed modes (yard, whole route, follow forklift, follow truck)
 * remain, plus a picture-in-picture truck cam while the truck is away and out
 * of frame.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { Direction, Vec2 } from "@/lib/engine/types";
import type { World } from "@/lib/engine/world/world";
import {
  warehouseDestination,
  warehouseDomain,
  warehousePath,
  type WarehouseDomain,
} from "@/lib/engine/worlds/warehouse";
import {
  CELL,
  COLORS,
  Kit,
  decal,
  decalTexture,
  drawCubeMark,
  font,
  makeForklift,
  makeMarker,
  makePallet,
  makeRack,
  makeStore,
  makeTree,
  makeTruck,
  mesh,
  ribTexture,
  type ForkliftModel,
  type TruckModel,
} from "./models";

export interface LabelAnchors {
  forklift: THREE.Vector3;
  truck: THREE.Vector3;
  store: THREE.Vector3;
}

export type ProjectedLabels = Record<keyof LabelAnchors, { x: number; y: number; visible: boolean }>;

export type ViewMode = "track" | "yard" | "route" | "forklift" | "truck";
/** What Track mode is framing. */
export type TrackSubject = "forklift" | "dock" | "truck" | "store" | "yard";

/** Base three-quarter camera direction shared by the presets. */
const VIEW_DIR = new THREE.Vector3(0.42, 0.66, 0.78).normalize();
/** A shot holds at least this long before Track cuts to another subject. */
const MIN_SHOT_MS = 1200;
/** Idle forklift ticks (truck on the road) before Track moves to the route view. */
const IDLE_TICKS_FOR_ROUTE = 2;
/** Opacity of scenery that blocks the view of something working. */
const SEE_THROUGH = 0.16;

/** Scenery that fades out when it blocks the view (see `updateOcclusion`). */
interface Occluder {
  materials: THREE.Material[];
  baseOpacity: number[];
  opacity: number;
}

/** Destination tag colours: this truck's store, then any other store. */
export const ROUTE_COLOR = COLORS.indigo;
export const OTHER_COLOR = COLORS.coral;

const HEADING: Record<Direction, number> = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };
const FORKS_DOWN = 0.12;
const FORKS_UP = 0.62;
/** Pallets ride slightly smaller inside the truck so a full load fits. */
const LOADED_SCALE = 0.82;
const PATH_DOTS = 48;

// Road layout, in lane coordinates: `a` metres along the lane from the dock
// edge, `s` metres to the right of the outbound lane.
/** Where the truck stops at the store (truck centre). */
const STORE_STOP = 46;
/** Lateral offset of the return lane. */
const RETURN_LANE = 3.6;
/** Where the return leg turns off to reverse into the bay. */
const TURN_POINT = 15;

interface PalletView {
  id: string;
  object: THREE.Group;
  marker: THREE.Group;
  home: THREE.Vector3;
  forRoute: boolean;
  held: boolean;
  /** Animation from the forks into the truck (truck-local coordinates). */
  slideFrom?: THREE.Vector3;
  slideTo?: THREE.Vector3;
  slideT0?: number;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}

export class WarehouseScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly pipCamera = new THREE.PerspectiveCamera(38, 16 / 10, 0.5, 300);
  private readonly controls: OrbitControls;
  private readonly sun = new THREE.DirectionalLight(0xffffff, 2.1);
  private readonly kit = new Kit();
  private readonly root = new THREE.Group();
  private readonly resizeObserver: ResizeObserver;
  private readonly visibility: IntersectionObserver;
  /** Rendering pauses while the viewport is scrolled out of view. */
  private onScreen = true;
  private frame = 0;
  private disposed = false;
  /** Forklift motion time per tick. */
  private duration = 400;
  /** Wall-clock time between ticks; the truck drives continuously across it. */
  private tickInterval = 1000;

  private world: World | null = null;
  private lastTick = -1;
  private width = 10;
  private height = 7;

  // Scene pieces.
  private forklift: ForkliftModel | null = null;
  private truck: TruckModel | null = null;
  private pallets: PalletView[] = [];
  private pathDots: THREE.Mesh[] = [];
  private targetRing: THREE.Group | null = null;
  private dockFill: THREE.MeshStandardMaterial | null = null;
  private storeRing: THREE.Mesh | null = null;
  private storeRingBase: THREE.Mesh | null = null;
  private storeDrop: THREE.Vector3[] = [];

  // Lane frame and the truck's route.
  private rear = new THREE.Vector3();
  private along = new THREE.Vector3(1, 0, 0);
  private right = new THREE.Vector3(0, 0, 1);
  private bayCentre = 3.9;
  private returnForward: THREE.CatmullRomCurve3 | null = null;
  private returnReverse: THREE.CatmullRomCurve3 | null = null;
  private reverseShare = 0.3;

  // Animation state.
  private posFrom = new THREE.Vector3();
  private posTo = new THREE.Vector3();
  private moveT0 = 0;
  private headingFrom = 0;
  private headingTo = 0;
  private forkFrom = FORKS_DOWN;
  private forkTo = FORKS_DOWN;
  /** Truck route parameter: 0 docked, 0→1 outbound, 1 at the store, 1→2 return. */
  private routeFrom = 0;
  private routeTo = 0;
  private routeNow = 0;
  private carriedId: string | null = null;
  private loadingNow = false;
  private truckAway = false;

  // Camera.
  private mode: ViewMode = "track";
  private subject: TrackSubject = "yard";
  private subjectSince = 0;
  /** Where Track parks the camera: the yard, or the whole route while only the truck is working. */
  private station: "yard" | "route" = "yard";
  private idleTicks = 0;
  /** The user moved the camera in Track mode: leave it alone until the station changes or ⌂. */
  private userMoved = false;
  private lastFrame = 0;
  private occluders: Occluder[] = [];
  private occluderMeshes: THREE.Object3D[] = [];
  private readonly raycaster = new THREE.Raycaster();
  onSubject: ((subject: TrackSubject) => void) | null = null;
  private readonly views: Record<"yard" | "route", { position: THREE.Vector3; target: THREE.Vector3; points: THREE.Vector3[] }> = {
    yard: { position: new THREE.Vector3(), target: new THREE.Vector3(), points: [] },
    route: { position: new THREE.Vector3(), target: new THREE.Vector3(), points: [] },
  };
  private readonly followOffset = new THREE.Vector3(12, 15, 17);
  /** Element whose on-screen rect the truck cam renders into (null = off). */
  pipElement: HTMLElement | null = null;
  pipEnabled = true;

  readonly anchors: LabelAnchors = {
    forklift: new THREE.Vector3(),
    truck: new THREE.Vector3(),
    store: new THREE.Vector3(),
  };
  onFrame: ((labels: ProjectedLabels, pipVisible: boolean) => void) | null = null;

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0xeeede8);
    this.scene.fog = new THREE.Fog(0xeeede8, 110, 260);
    this.scene.add(this.root);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 500);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = 1.25;
    this.controls.minPolarAngle = 0.35;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 180;
    // Wheel zoom is opt-in (pinch or ctrl/⌘ + wheel) so the page still scrolls.
    this.controls.enableZoom = false;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.renderer.domElement.addEventListener("wheel", this.onWheel, { passive: false });
    this.renderer.domElement.addEventListener("contextmenu", this.onContextMenu);
    this.controls.addEventListener("start", this.markUserMoved);

    this.addLights();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.visibility = new IntersectionObserver(([entry]) => {
      this.onScreen = entry?.isIntersecting ?? true;
    });
    this.visibility.observe(host);
    this.resize();
    this.loop();
  }

  // -------------------------------------------------------------------------
  // Coordinates
  // -------------------------------------------------------------------------

  private cellX(x: number): number {
    return (x + 0.5) * CELL - (this.width * CELL) / 2;
  }

  private cellZ(y: number): number {
    return (y + 0.5) * CELL - (this.height * CELL) / 2;
  }

  private cell(p: Vec2, y = 0): THREE.Vector3 {
    return new THREE.Vector3(this.cellX(p.x), y, this.cellZ(p.y));
  }

  /** A point in lane coordinates: `a` along the lane, `s` to its right. */
  private lane(a: number, s: number, y = 0.08): THREE.Vector3 {
    return this.rear.clone().addScaledVector(this.along, a).addScaledVector(this.right, s).setY(y);
  }

  /** A ground-aligned plane `l` long (along the lane) and `w` wide. */
  private lanePlane(l: number, w: number): THREE.BufferGeometry {
    return this.along.x !== 0 ? this.kit.plane(l, w) : this.kit.plane(w, l);
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xcfcdc4, 1.3));
    const sun = this.sun;
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 140 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    this.scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xe6e8ff, 0.5);
    fill.position.set(28, 18, 30);
    this.scene.add(fill);
  }

  /** Forklift motion time and the tick interval the truck drives across. */
  setTiming(motionMs: number, tickMs: number): void {
    this.duration = motionMs;
    this.tickInterval = tickMs;
  }

  /** Lay out the yard for a world. Rebuilds every scene object. */
  setWorld(world: World): void {
    this.clear();
    this.world = world;
    this.lastTick = -1;
    this.width = world.width;
    this.height = world.height;
    const domain = warehouseDomain(world);
    const kit = this.kit;
    const root = this.root;
    const halfW = (this.width * CELL) / 2;
    const halfH = (this.height * CELL) / 2;
    const north = -halfH;
    const south = halfH;
    const dock = domain.dock;

    // --- lane frame -----------------------------------------------------------
    const dir = this.truckDirection(world);
    this.along.set(dir.x, 0, dir.y);
    this.right.set(-dir.y, 0, dir.x);
    this.rear.copy(this.cell(dock, 0.08)).addScaledVector(this.along, CELL / 2 + 0.05);

    const truck = makeTruck(kit);
    this.truck = truck;
    this.bayCentre = -truck.rearZ;
    root.add(truck.group);
    this.buildRoute();

    // --- ground, yard, road ---------------------------------------------------
    root.add(decal(kit.plane(600, 600), kit.mat(COLORS.ground, { roughness: 1 }), 0, -0.02, 0));
    const yardMinX = -halfW - 3;
    const yardMaxX = Math.max(halfW + 2, this.rear.x + 1.5);
    const yardMinZ = north - 13;
    const yardMaxZ = south + 2.5;
    root.add(
      mesh(
        kit.box(yardMaxX - yardMinX, 0.1, yardMaxZ - yardMinZ),
        kit.mat(COLORS.yard, { roughness: 0.95 }),
        (yardMinX + yardMaxX) / 2, 0.03, (yardMinZ + yardMaxZ) / 2,
        { cast: false },
      ),
    );
    this.buildRoad();

    // Faint grid so the cells the policy reasons about are readable.
    const gridPts: number[] = [];
    for (let x = 0; x <= this.width; x++) gridPts.push(x * CELL - halfW, 0.086, north, x * CELL - halfW, 0.086, south);
    for (let y = 0; y <= this.height; y++) gridPts.push(-halfW, 0.086, y * CELL - halfH, halfW, 0.086, y * CELL - halfH);
    const gridGeo = kit.own(new THREE.BufferGeometry());
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
    root.add(new THREE.LineSegments(gridGeo, kit.own(new THREE.LineBasicMaterial({ color: 0xc9c8c1, transparent: true, opacity: 0.7 }))));

    // --- hub building ----------------------------------------------------------
    this.buildHub(north, halfW);

    // --- racks on blocked cells (except the truck's cells) ----------------------
    const truckCells = new Set<string>();
    for (let c = { x: dock.x + dir.x, y: dock.y + dir.y }; world.tiles[c.y]?.[c.x] === 1; c = { x: c.x + dir.x, y: c.y + dir.y }) {
      truckCells.add(`${c.x},${c.y}`);
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (world.tiles[y][x] !== 1 || truckCells.has(`${x},${y}`)) continue;
        const rack = makeRack(kit, x * 31 + y * 17 + 3);
        rack.position.copy(this.cell({ x, y }, 0.08));
        root.add(rack);
        this.addOccluder(rack);
      }
    }

    // --- dock pad + bay markings ------------------------------------------------
    const dockPos = this.cell(dock, 0.09);
    this.dockFill = kit.liveMat(COLORS.volt, { opacity: 0.01, emissive: COLORS.volt, emissiveIntensity: 0.4 });
    root.add(decal(kit.plane(CELL - 0.2, CELL - 0.2), this.dockFill, dockPos.x, 0.092, dockPos.z));
    this.outline(dockPos.x, dockPos.z, CELL - 0.2, CELL - 0.2, COLORS.indigo, 0.1);
    const bay = this.lane(truck.reach / 2, 0);
    const [bw, bd] = this.along.x !== 0 ? [truck.reach + 0.8, 3.0] : [3.0, truck.reach + 0.8];
    this.outline(bay.x, bay.z, bw, bd, COLORS.ink, 0.1);

    // --- the store at the end of the road --------------------------------------
    this.buildStore(domain);

    // --- pallets ----------------------------------------------------------------
    this.pallets = domain.pallets.map((p, i) => {
      const home = this.cell(p.pos, 0.08);
      const color = p.forRoute ? ROUTE_COLOR : OTHER_COLOR;
      this.outline(home.x, home.z, CELL - 0.3, CELL - 0.3, p.forRoute ? COLORS.indigoLight : COLORS.coral, 0.06);
      const object = makePallet(kit, color, i * 13 + 5);
      object.position.copy(home);
      root.add(object);
      const marker = makeMarker(kit, color);
      marker.position.set(home.x, 2.3, home.z);
      root.add(marker);
      return { id: p.id, object, marker, home, forRoute: p.forRoute, held: false };
    });

    // --- target ring + path dots -------------------------------------------------
    this.targetRing = new THREE.Group();
    this.targetRing.add(decal(kit.ring(0.84, 0.98), kit.mat(COLORS.ink), 0, 0.1, 0));
    this.targetRing.add(decal(kit.ring(0.98, 1.14), kit.mat(COLORS.volt, { emissive: COLORS.volt, emissiveIntensity: 0.5 }), 0, 0.1, 0));
    this.targetRing.visible = false;
    root.add(this.targetRing);
    const dotMat = kit.mat(COLORS.indigo, { emissive: COLORS.indigo, emissiveIntensity: 0.25 });
    this.pathDots = Array.from({ length: PATH_DOTS }, () => {
      const d = decal(kit.ring(0, 0.13, 16), dotMat, 0, 0.1, 0);
      d.visible = false;
      root.add(d);
      return d;
    });

    // --- forklift -----------------------------------------------------------------
    this.forklift = makeForklift(kit);
    this.forklift.group.scale.setScalar(0.92);
    root.add(this.forklift.group);

    // --- trees around the yard ----------------------------------------------------
    const trees: Array<[number, number, number]> = [
      [yardMinX - 2.5, north + 2, 1.1], [yardMinX - 3.5, south - 2, 0.95], [yardMinX - 2, south + 4, 1.05],
      [halfW - 2, south + 5.5, 1.0], [halfW + 6, north - 4, 1.1],
    ];
    trees.forEach(([x, z, s], i) => {
      const t = makeTree(kit, s, i + 1);
      t.position.set(x, 0, z);
      root.add(t);
      this.addOccluder(t);
    });

    // --- camera presets --------------------------------------------------------
    const yardPoints = [
      new THREE.Vector3(-halfW, 0, north - 1),
      new THREE.Vector3(halfW, 0, north - 1),
      new THREE.Vector3(-halfW, 0, south),
      new THREE.Vector3(halfW, 0, south),
      new THREE.Vector3(-halfW + 2, 6, north - 3),
      this.lane(TURN_POINT - 4, RETURN_LANE + 1),
      this.lane(truck.reach, -2),
    ];
    this.views.yard.points = yardPoints;
    this.views.route.points = [
      ...yardPoints,
      this.lane(STORE_STOP + 7, RETURN_LANE + 2),
      this.lane(STORE_STOP, -12, 5),
    ];
    this.fitViews();
    this.applyMode(true);

    this.sync(world, true);
  }

  /** The truck's return path: U-turn at the store, drive back, three-point turn, reverse in. */
  private buildRoute(): void {
    const L = (a: number, s: number) => this.lane(a, s);
    const E = STORE_STOP;
    const R = RETURN_LANE;
    this.returnForward = new THREE.CatmullRomCurve3([
      L(E, 0), L(E + 2.6, 0.3), L(E + 3.8, R / 2), L(E + 2.6, R - 0.3), L(E, R),
      L((E + TURN_POINT) / 2, R),
      L(TURN_POINT + 3, R), L(TURN_POINT, R - 0.6), L(TURN_POINT - 1.6, R - 2.6), L(TURN_POINT - 2.1, -2.4),
    ], false, "centripetal");
    const c = this.bayCentre;
    this.returnReverse = new THREE.CatmullRomCurve3([
      L(TURN_POINT - 2.1, -2.4), L(TURN_POINT - 2.6, -0.8), L(TURN_POINT - 4.6, 0), L(c + 3, 0), L(c, 0),
    ], false, "centripetal");
    const f = this.returnForward.getLength();
    const r = this.returnReverse.getLength();
    this.reverseShare = r / (f + r);
  }

  /** Truck pose at route parameter `u` (see `routeNow`). */
  private truckPose(u: number): { position: THREE.Vector3; heading: number } {
    const headingOf = (t: THREE.Vector3, reverse: boolean) => Math.atan2(t.x, t.z) + (reverse ? Math.PI : 0);
    const forward = Math.atan2(this.along.x, this.along.z);
    if (u <= 0 || !this.returnForward || !this.returnReverse) {
      return { position: this.lane(this.bayCentre, 0), heading: forward };
    }
    if (u <= 1) {
      return { position: this.lane(THREE.MathUtils.lerp(this.bayCentre, STORE_STOP, ease(u)), 0), heading: forward };
    }
    const q = clamp01(u - 1);
    const split = 1 - this.reverseShare;
    if (q < split) {
      const t = ease(q / split);
      return { position: this.returnForward.getPointAt(t), heading: headingOf(this.returnForward.getTangentAt(t), false) };
    }
    const t = ease((q - split) / this.reverseShare);
    return { position: this.returnReverse.getPointAt(t), heading: headingOf(this.returnReverse.getTangentAt(Math.min(t, 0.999)), true) };
  }

  private buildRoad(): void {
    const kit = this.kit;
    const root = this.root;
    const roadMat = kit.mat(COLORS.lane, { roughness: 0.95 });
    const roadLen = STORE_STOP + 4;
    const mid = this.lane(roadLen / 2, RETURN_LANE / 2, 0.085);
    root.add(decal(this.lanePlane(roadLen, RETURN_LANE + 3.4), roadMat, mid.x, 0.085, mid.z));
    // Turning apron where the truck swings round to reverse into the bay.
    const apron = this.lane(TURN_POINT - 3, -1.2, 0.083);
    root.add(decal(this.lanePlane(12, RETURN_LANE + 8), roadMat, apron.x, 0.083, apron.z));
    // Cul-de-sac at the store.
    const cul = this.lane(STORE_STOP + 2.2, RETURN_LANE / 2, 0.086);
    root.add(decal(kit.ring(0, 5, 40), roadMat, cul.x, 0.086, cul.z));
    root.add(decal(kit.ring(0, 1.6, 32), kit.mat(COLORS.leaf, { roughness: 1 }), cul.x, 0.1, cul.z));

    // Centre line and kerbs.
    const dash = kit.mat(0xffffff, { roughness: 0.6 });
    for (let a = TURN_POINT + 4; a < STORE_STOP - 1; a += 2.6) {
      const p = this.lane(a, RETURN_LANE / 2, 0.095);
      root.add(decal(this.lanePlane(1.3, 0.16), dash, p.x, 0.095, p.z));
    }
    const kerb = kit.mat(COLORS.wallShade, { roughness: 0.8 });
    for (const s of [-1.8, RETURN_LANE + 1.8]) {
      const from = s < 0 ? TURN_POINT + 3 : this.truck!.reach + 1;
      const len = STORE_STOP - 2 - from;
      const p = this.lane(from + len / 2, s, 0.1);
      const k = mesh(this.lanePlane(len, 0.25), kerb, p.x, 0.1, p.z, { cast: false });
      k.rotation.x = -Math.PI / 2;
      root.add(k);
    }

    // Street trees and lamps along the road, so the drive reads as distance.
    const lamp = kit.mat(COLORS.ink, { roughness: 0.5 });
    const glow = kit.mat(COLORS.volt, { emissive: COLORS.volt, emissiveIntensity: 0.6 });
    let i = 0;
    for (let a = TURN_POINT + 6; a < STORE_STOP - 3; a += 6, i++) {
      const north = this.lane(a, -3.6, 0);
      const t = makeTree(kit, 0.85 + (i % 3) * 0.12, 40 + i);
      t.position.copy(north);
      root.add(t);
      this.addOccluder(t);
      const south = this.lane(a + 3, RETURN_LANE + 3.2, 0);
      const post = new THREE.Group();
      post.add(mesh(kit.cyl(0.06, 0.08, 3.2, 8), lamp, south.x, 1.6, south.z));
      post.add(mesh(kit.rbox(0.5, 0.12, 0.25, 0.04), glow, south.x, 3.2, south.z, { cast: false }));
      root.add(post);
      this.addOccluder(post);
    }
  }

  private buildStore(domain: WarehouseDomain): void {
    const kit = this.kit;
    const root = this.root;
    const store = makeStore(kit, domain.store);
    const storePos = this.lane(STORE_STOP, -9.2, 0);
    store.position.copy(storePos);
    store.rotation.y = Math.atan2(this.right.x, this.right.z);
    root.add(store);
    this.addOccluder(store);
    const apron = this.lane(STORE_STOP, -6.4, 0.03);
    root.add(decal(this.lanePlane(14, 7.5), kit.mat(COLORS.yard, { roughness: 0.95 }), apron.x, 0.03, apron.z));
    this.storeDrop = domain.pallets.map((_, i) => this.lane(STORE_STOP - 4 + (i % 5) * 1.6, -3.4, 0.08 + Math.floor(i / 5) * 1.25));
    const ringAt = this.lane(STORE_STOP + 4.8, -3.4, 0);
    this.storeRingBase = decal(kit.ring(0.7, 0.95), kit.mat(COLORS.wallShade), ringAt.x, 0.11, ringAt.z);
    this.storeRing = decal(kit.own(new THREE.RingGeometry(0.7, 0.95, 48, 1, Math.PI / 2, 0.05)), kit.mat(COLORS.indigo, { emissive: COLORS.indigo, emissiveIntensity: 0.4 }), ringAt.x, 0.12, ringAt.z);
    root.add(this.storeRingBase, this.storeRing);
    this.anchors.store.copy(storePos).setY(5.2);
    for (const [a, s] of [[-7, -10], [7, -10], [-6, -14], [5, -14.5]] as const) {
      const t = makeTree(kit, 1.1, 70 + a);
      t.position.copy(this.lane(STORE_STOP + a, s, 0));
      root.add(t);
      this.addOccluder(t);
    }
  }

  private buildHub(north: number, halfW: number): void {
    const kit = this.kit;
    const root = new THREE.Group();
    this.root.add(root);
    const front = north - 1.0;
    const depth = 11;
    const height = 5.4;
    const minX = -halfW - 2;
    const maxX = halfW + 1;
    const width = maxX - minX;
    const cx = (minX + maxX) / 2;
    const cz = front - depth / 2;

    const cladding = ribTexture(kit, COLORS.wall, COLORS.wallShade, [width * 1.4, 1]);
    root.add(mesh(kit.box(width, height, depth), kit.mat(0xffffff, { map: cladding, roughness: 0.75 }), cx, height / 2, cz));
    root.add(mesh(kit.box(width + 0.06, 0.5, depth + 0.06), kit.mat(COLORS.ink), cx, 0.25, cz));
    // Flat roof: ink fascia, volt pinstripe, skylights and plant.
    root.add(mesh(kit.box(width + 0.3, 0.55, depth + 0.3), kit.mat(COLORS.ink, { roughness: 0.6 }), cx, height + 0.2, cz));
    root.add(mesh(kit.box(width + 0.32, 0.12, 0.05), kit.mat(COLORS.volt, { emissive: COLORS.volt, emissiveIntensity: 0.25 }), cx, height - 0.15, front + 0.17));
    root.add(mesh(kit.box(width, 0.06, depth), kit.mat(COLORS.roof, { roughness: 0.9 }), cx, height + 0.5, cz, { cast: false }));
    const skylight = kit.mat(0xb9c1ff, { roughness: 0.15, metalness: 0.2 });
    for (let i = 0; i < 5; i++) root.add(mesh(kit.rbox(1.4, 0.3, depth - 3, 0.1), skylight, minX + 3 + (i * (width - 6)) / 4, height + 0.65, cz));
    for (const x of [cx - 4, cx + 5]) {
      root.add(mesh(kit.rbox(2, 0.9, 1.6, 0.1), kit.mat(COLORS.wallShade), x, height + 0.95, cz + 3));
      root.add(mesh(kit.cyl(0.5, 0.5, 0.05, 20), kit.mat(COLORS.steel), x, height + 1.42, cz + 3, { cast: false }));
    }

    // Dock doors, one per three columns.
    const doorMat = kit.mat(0x2a2a30, { roughness: 0.9 });
    const frame = kit.mat(COLORS.ink, { roughness: 0.45 });
    let n = 1;
    for (let x = 1; x < this.width; x += 3) {
      const dx = this.cellX(x);
      root.add(mesh(kit.box(2.4, 3.0, 0.05), doorMat, dx, 1.55, front + 0.03, { cast: false }));
      root.add(mesh(kit.box(0.18, 3.2, 0.22), frame, dx - 1.29, 1.6, front + 0.1));
      root.add(mesh(kit.box(0.18, 3.2, 0.22), frame, dx + 1.29, 1.6, front + 0.1));
      root.add(mesh(kit.box(2.76, 0.2, 0.22), frame, dx, 3.15, front + 0.1));
      root.add(mesh(kit.box(2.4, 0.9, 0.08), kit.mat(COLORS.wallShade, { roughness: 0.6 }), dx, 2.6, front + 0.07));
      const doorNumber = n;
      const plate = decalTexture(kit, 128, 64, (g, w, h) => {
        g.fillStyle = "#c8ff3d";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#232327";
        g.font = font(36, 700);
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(`D${doorNumber}`, w / 2, h / 2 + 2);
      });
      const label = new THREE.Mesh(kit.plane(0.7, 0.35), kit.mat(0xffffff, { map: plate, roughness: 0.6 }));
      label.position.set(dx, 3.55, front + 0.04);
      root.add(label);
      n++;
    }

    const signTex = decalTexture(kit, 768, 192, (g, w, h) => {
      g.fillStyle = "#fbfbf9";
      g.fillRect(0, 0, w, h);
      drawCubeMark(g, 96, 96, 54);
      g.fillStyle = "#232327";
      g.font = font(64, 700);
      g.textBaseline = "middle";
      g.fillText("Riverside Hub", 176, 78);
      g.fillStyle = "#6f6f75";
      g.font = font(36, 500);
      g.fillText("Outbound yard", 178, 138);
    });
    const sign = new THREE.Mesh(kit.plane(4.4, 1.1), kit.mat(0xffffff, { map: signTex, roughness: 0.6 }));
    sign.position.set(maxX - 3.4, 4.2, front + 0.04);
    root.add(sign);
    this.addOccluder(root);
  }

  /**
   * Register scenery that may hide the work. Its meshes get their own copies of
   * the kit's shared materials so one rack can fade without fading the rest.
   */
  private addOccluder(object: THREE.Object3D): void {
    const occluder: Occluder = { materials: [], baseOpacity: [], opacity: 1 };
    object.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      const own = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => {
        const copy = mat.clone();
        occluder.materials.push(copy);
        occluder.baseOpacity.push(copy.opacity);
        return copy;
      });
      m.material = Array.isArray(m.material) ? own : own[0];
      m.userData.occluder = occluder;
      this.occluderMeshes.push(m);
    });
    this.occluders.push(occluder);
  }

  /** Fade scenery between the camera and anything working; restore it once clear. */
  private updateOcclusion(dt: number): void {
    const focus: THREE.Vector3[] = [];
    const f = this.forklift?.group.position;
    if (f) focus.push(f.clone().setY(0.6), f.clone().setY(2.4));
    const target = this.targetRing?.visible ? this.targetRing.position : null;
    if (target) focus.push(target.clone().setY(0.7));
    const t = this.truck?.group.position;
    if (t) focus.push(t.clone().setY(1.4), t.clone().setY(3.4));

    const blocking = new Set<Occluder>();
    const eye = this.camera.position;
    const dir = new THREE.Vector3();
    for (const p of focus) {
      dir.subVectors(p, eye);
      const distance = dir.length();
      this.raycaster.set(eye, dir.normalize());
      this.raycaster.far = distance - 0.4;
      for (const hit of this.raycaster.intersectObjects(this.occluderMeshes, false)) {
        blocking.add(hit.object.userData.occluder as Occluder);
      }
    }

    const k = dt > 0 ? 1 - Math.exp(-dt * 9) : 1;
    for (const occ of this.occluders) {
      const goal = blocking.has(occ) ? SEE_THROUGH : 1;
      if (Math.abs(occ.opacity - goal) < 0.002) continue;
      occ.opacity += (goal - occ.opacity) * k;
      if (Math.abs(occ.opacity - goal) < 0.01) occ.opacity = goal;
      const faded = occ.opacity < 0.999;
      occ.materials.forEach((mat, i) => {
        mat.opacity = occ.baseOpacity[i] * occ.opacity;
        if (mat.transparent !== faded && occ.baseOpacity[i] >= 1) {
          mat.transparent = faded;
          mat.depthWrite = !faded;
          mat.needsUpdate = true;
        }
      });
    }
  }

  /** Grid direction from the dock to the truck: toward its blocked cells, else off the nearest edge. */
  private truckDirection(world: World): Vec2 {
    const dock = warehouseDomain(world).dock;
    const dirs: Vec2[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
    const blocked = dirs.find((d) => world.tiles[dock.y + d.y]?.[dock.x + d.x] === 1);
    if (blocked) return blocked;
    return dirs.find((d) => world.tiles[dock.y + d.y]?.[dock.x + d.x] === undefined) ?? { x: 0, y: 1 };
  }

  /** A rectangular painted outline on the ground. */
  private outline(cx: number, cz: number, w: number, d: number, color: number, thickness: number): void {
    const m = this.kit.mat(color, { roughness: 0.7 });
    const parts: Array<[number, number, number, number]> = [
      [cx, cz - d / 2, w, thickness],
      [cx, cz + d / 2, w, thickness],
      [cx - w / 2, cz, thickness, d],
      [cx + w / 2, cz, thickness, d],
    ];
    for (const [x, z, pw, pd] of parts) this.root.add(decal(this.kit.plane(pw, pd), m, x, 0.09, z));
  }

  // -------------------------------------------------------------------------
  // Per-tick sync
  // -------------------------------------------------------------------------

  /** Route parameter for the domain's truck phase (see `routeNow`). */
  private routeTarget(domain: WarehouseDomain): number {
    const t = domain.truck;
    if (t.phase === "outbound") return 1 - t.timer / t.tripTicks;
    if (t.phase === "unloading") return 1;
    if (t.phase === "returning") return 1 + (1 - t.timer / t.tripTicks);
    // Docked: just back from a trip (route end) or never left (route start).
    return this.routeNow > 1.5 ? 2 : 0;
  }

  /**
   * Retarget animated pieces from the current world state. `action` is the
   * action applied this tick; Track mode uses it to decide what to frame.
   */
  sync(world: World, snap = false, action: string | null = null): void {
    if (world !== this.world) {
      this.setWorld(world);
      return;
    }
    const domain = warehouseDomain(world);
    const f = this.forklift;
    const truck = this.truck;
    if (!domain || !f || !truck) return;
    const now = performance.now();
    const instant = snap || world.tick < this.lastTick || this.lastTick < 0;
    this.lastTick = world.tick;

    // Forklift.
    const carried = domain.pallets.find((p) => p.state === "carried");
    this.carriedId = carried?.id ?? null;
    const target = this.cell(world.agent.position, 0.08);
    const heading = HEADING[world.agent.direction] ?? 0;
    this.posFrom.copy(instant ? target : f.group.position);
    this.posTo.copy(target);
    this.headingFrom = instant ? heading : f.group.rotation.y;
    this.headingTo = shortestAngle(this.headingFrom, heading);
    this.forkFrom = instant ? (carried ? FORKS_UP : FORKS_DOWN) : f.carriage.position.y;
    this.forkTo = carried ? FORKS_UP : FORKS_DOWN;
    f.light.color.setHex(carried ? (carried.forRoute ? COLORS.volt : COLORS.coral) : COLORS.indigoLight);
    f.light.emissive.copy(f.light.color);
    this.moveT0 = instant ? now - Math.max(this.duration, this.tickInterval) : now;

    // Truck: a new trip starts from the route origin.
    if (instant) this.routeNow = domain.truck.phase === "docked" ? 0 : this.routeNow;
    if (domain.truck.phase === "outbound" && this.routeNow > 1.5) this.routeNow = 0;
    this.routeFrom = instant ? this.routeTarget(domain) : this.routeNow;
    this.routeTo = this.routeTarget(domain);
    if (instant) this.routeNow = this.routeTo;
    this.truckAway = domain.truck.phase !== "docked";
    truck.beacon.emissiveIntensity = this.truckAway ? 1.4 : 0.15;
    this.updateStoreRing(domain.truck.phase === "unloading" ? 1 - domain.truck.timer / domain.truck.unloadTicks : -1);

    // Pallets.
    const atDock = world.agent.position.x === domain.dock.x && world.agent.position.y === domain.dock.y;
    this.loadingNow = atDock && carried !== undefined && domain.truck.phase === "docked";
    let delivered = 0;
    for (const view of this.pallets) {
      const p = domain.pallets.find((q) => q.id === view.id);
      if (!p) continue;
      const obj = view.object;
      if (p.state === "waiting") {
        this.reparent(obj, this.root);
        obj.position.copy(view.home);
        obj.rotation.set(0, 0, 0);
        obj.scale.setScalar(1);
        view.slideFrom = undefined;
      } else if (p.state === "onTruck") {
        const slot = this.truckSlot(p.loadSlot, domain.truck.capacity);
        if (obj.parent !== truck.group) {
          const fromWorld = obj.getWorldPosition(new THREE.Vector3());
          this.reparent(obj, truck.group);
          obj.rotation.set(0, 0, 0);
          obj.scale.setScalar(LOADED_SCALE);
          if (instant) {
            obj.position.copy(slot);
            view.slideFrom = undefined;
          } else {
            truck.group.updateMatrixWorld();
            view.slideFrom = truck.group.worldToLocal(fromWorld);
            view.slideTo = slot;
            view.slideT0 = now;
          }
        }
      } else if (p.state === "delivered") {
        this.reparent(obj, this.root);
        obj.position.copy(this.storeDrop[delivered] ?? this.storeDrop[0]);
        obj.rotation.set(0, Math.atan2(this.along.x, this.along.z), 0);
        obj.scale.setScalar(LOADED_SCALE);
        view.slideFrom = undefined;
        delivered++;
      }
      view.marker.visible = p.state === "waiting";
      if (view.held !== p.held) {
        view.held = p.held;
        const color = view.forRoute ? ROUTE_COLOR : OTHER_COLOR;
        (view.marker.children[0] as THREE.Mesh).material = p.held
          ? this.kit.mat(COLORS.wallShade, { roughness: 0.5 })
          : this.kit.mat(color, { roughness: 0.3, emissive: color, emissiveIntensity: 0.25 });
      }
    }

    // Target ring and the planned path.
    const targetPallet = domain.pallets.find((p) => p.id === domain.targetId && p.state === "waiting");
    if (this.targetRing) {
      this.targetRing.visible = targetPallet !== undefined;
      if (targetPallet) this.targetRing.position.copy(this.cell(targetPallet.pos, 0));
    }
    const dest = warehouseDestination(world);
    const path = dest ? warehousePath(world, world.agent.position, dest) ?? [] : [];
    this.pathDots.forEach((dot, i) => {
      // Two dots per step: halfway along it, and on the cell it reaches.
      const stepIndex = Math.floor(i / 2);
      const step = path[stepIndex];
      if (!step) {
        dot.visible = false;
        return;
      }
      const a = this.cell(stepIndex === 0 ? world.agent.position : path[stepIndex - 1]);
      const b = this.cell(step);
      const p = i % 2 === 0 ? a.lerp(b, 0.5) : b;
      dot.position.set(p.x, 0.1, p.z);
      dot.visible = true;
    });

    const next = this.chooseSubject(world, domain, action, atDock, carried !== undefined);
    this.setSubject(next, now, instant || action === "dispatchTruck" || next === "yard");

    // Track's camera station: the yard, unless the forklift is idle while the truck is on the road.
    const idle = action === null || action === "wait";
    this.idleTicks = instant ? 0 : idle && domain.truck.phase !== "docked" ? this.idleTicks + 1 : 0;
    const station = world.status !== "reached" && this.idleTicks >= IDLE_TICKS_FOR_ROUTE ? "route" : "yard";
    if (station !== this.station) {
      this.station = station;
      this.userMoved = false;
    }
  }

  /** What is doing the work this tick, for Track mode. */
  private chooseSubject(
    world: World,
    domain: WarehouseDomain,
    action: string | null,
    atDock: boolean,
    carrying: boolean,
  ): TrackSubject {
    // Before the first tick and after the order is done, show the whole yard.
    if (world.tick === 0 || world.status === "reached") return "yard";
    const truck = domain.truck;
    if (world.status === "stuck" || world.status === "out-of-energy") return atDock ? "dock" : "forklift";
    if (action === "dispatchTruck") return "truck";
    const idle = action === null || action === "wait";
    // The forklift is waiting on the truck: the truck is the one working.
    if (idle && truck.phase !== "docked") return truck.phase === "unloading" ? "store" : "truck";
    if (action === "loadTruck" || (atDock && carrying && truck.phase === "docked")) return "dock";
    if (idle) return this.subject === "yard" ? "forklift" : this.subject;
    return "forklift";
  }

  private setSubject(next: TrackSubject, now: number, force: boolean): void {
    if (next === this.subject) return;
    if (!force && now - this.subjectSince < MIN_SHOT_MS) return;
    this.subject = next;
    this.subjectSince = now;
    this.onSubject?.(next);
  }

  private reparent(obj: THREE.Object3D, parent: THREE.Object3D): void {
    if (obj.parent !== parent) parent.add(obj);
  }

  /** Local position of a load slot inside the truck: deepest first, two abreast. */
  private truckSlot(index: number, capacity: number): THREE.Vector3 {
    const t = this.truck!;
    const rows = Math.ceil(capacity / 2);
    const pitch = Math.min(1.5, (t.length - 0.4) / Math.max(1, rows));
    const row = Math.floor(index / 2);
    const side = capacity === 1 ? 0 : index % 2 === 0 ? -0.55 : 0.55;
    return new THREE.Vector3(side, t.floorY + 0.02, t.rearZ + t.length - 0.25 - pitch * (row + 0.5));
  }

  private updateStoreRing(progress: number): void {
    const ring = this.storeRing;
    if (!ring) return;
    ring.visible = progress >= 0;
    if (this.storeRingBase) this.storeRingBase.visible = progress >= 0;
    if (progress < 0) return;
    const old = ring.geometry;
    ring.geometry = new THREE.RingGeometry(0.7, 0.95, 48, 1, Math.PI / 2, Math.max(0.05, progress * Math.PI * 2));
    old.dispose();
  }

  // -------------------------------------------------------------------------
  // Camera
  // -------------------------------------------------------------------------

  /** Fit each preset's points by pulling back along a fixed three-quarter direction. */
  private fitViews(): void {
    const dirn = VIEW_DIR;
    const cam = this.camera.clone();
    for (const view of Object.values(this.views)) {
      if (view.points.length === 0) continue;
      const center = new THREE.Box3().setFromPoints(view.points).getCenter(new THREE.Vector3()).setY(0);
      let lo = 8;
      let hi = 300;
      for (let i = 0; i < 26; i++) {
        const mid = (lo + hi) / 2;
        cam.position.copy(center).addScaledVector(dirn, mid);
        cam.lookAt(center);
        cam.updateMatrixWorld();
        const fits = view.points.every((p) => {
          const s = p.clone().project(cam);
          return Math.abs(s.x) < 0.95 && Math.abs(s.y) < 0.84;
        });
        if (fits) hi = mid;
        else lo = mid;
      }
      view.target.copy(center);
      view.position.copy(center).addScaledVector(dirn, hi);
    }
  }

  setViewMode(mode: ViewMode): void {
    this.mode = mode;
    this.userMoved = false;
    this.applyMode(true);
  }

  get currentSubject(): TrackSubject {
    return this.subject;
  }

  private readonly markUserMoved = () => {
    if (this.mode === "track") this.userMoved = true;
  };

  /** Track: glide to the current station's fixed view, then hold still. */
  private trackCamera(dt: number, jump: boolean): void {
    const view = this.views[this.station];
    if (jump) {
      this.controls.target.copy(view.target);
      this.camera.position.copy(view.position);
      return;
    }
    if (this.userMoved) return;
    if (this.camera.position.distanceToSquared(view.position) < 1e-4 && this.controls.target.distanceToSquared(view.target) < 1e-4) return;
    const k = 1 - Math.exp(-dt * 2.2);
    this.controls.target.lerp(view.target, k);
    this.camera.position.lerp(view.position, k);
  }

  private applyMode(jump: boolean): void {
    if (this.mode === "track") {
      this.trackCamera(0, jump);
    } else if (this.mode === "yard" || this.mode === "route") {
      const v = this.views[this.mode];
      this.camera.position.copy(v.position);
      this.controls.target.copy(v.target);
    } else if (jump) {
      const target = this.followTarget();
      this.controls.target.copy(target);
      this.camera.position.copy(target).add(this.followOffset);
    }
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  private followTarget(): THREE.Vector3 {
    if (this.mode === "truck" && this.truck) return this.truck.group.position.clone().setY(0);
    if (this.forklift) return this.forklift.group.position.clone().setY(0);
    return new THREE.Vector3();
  }

  zoom(factor: number): void {
    this.markUserMoved();
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(offset);
  }

  rotate(radians: number): void {
    this.markUserMoved();
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  resetView(): void {
    this.userMoved = false;
    this.applyMode(true);
  }

  private readonly onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this.zoom(Math.exp(e.deltaY * 0.01));
  };

  private readonly onContextMenu = (e: Event) => e.preventDefault();

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.world) {
      this.fitViews();
      this.applyMode(true);
    }
  }

  // -------------------------------------------------------------------------
  // Loop
  // -------------------------------------------------------------------------

  private animate(now: number): void {
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;
    const f = this.forklift;
    if (f) {
      const t = ease(clamp01((now - this.moveT0) / this.duration));
      const turn = ease(clamp01((now - this.moveT0) / (this.duration * 0.45)));
      f.group.position.lerpVectors(this.posFrom, this.posTo, t);
      f.group.rotation.y = THREE.MathUtils.lerp(this.headingFrom, this.headingTo, turn);
      f.carriage.position.y = THREE.MathUtils.lerp(this.forkFrom, this.forkTo, t);
      f.lidar.rotation.y = now / 300;
      this.anchors.forklift.set(f.group.position.x, 3.0, f.group.position.z);

      const view = this.carriedId ? this.pallets.find((v) => v.id === this.carriedId) : undefined;
      if (view) {
        this.reparent(view.object, this.root);
        f.seat.getWorldPosition(view.object.position);
        view.object.rotation.set(0, f.group.rotation.y, 0);
        view.object.scale.setScalar(0.9);
      }
    }

    // The truck drives continuously: one tick's worth of route over one tick interval.
    const truck = this.truck;
    if (truck) {
      const k = clamp01((now - this.moveT0) / this.tickInterval);
      this.routeNow = THREE.MathUtils.lerp(this.routeFrom, this.routeTo, k);
      const pose = this.truckPose(this.routeNow);
      truck.group.position.copy(pose.position);
      truck.group.rotation.y = pose.heading;
      this.anchors.truck.copy(pose.position).setY(4.5);
    }

    for (const view of this.pallets) {
      if (view.slideFrom && view.slideTo && view.slideT0 !== undefined) {
        const k = ease(clamp01((now - view.slideT0) / this.duration));
        view.object.position.lerpVectors(view.slideFrom, view.slideTo, k);
        if (k >= 1) view.slideFrom = undefined;
      }
      if (view.marker.visible) {
        view.marker.position.y = view.held ? 1.95 : 2.3 + Math.sin(now / 420 + view.home.x) * 0.12;
        view.marker.rotation.y = now / (view.held ? 3000 : 900);
      }
    }

    if (this.targetRing?.visible) {
      const s = 1 + 0.06 * Math.sin(now / 160);
      this.targetRing.scale.set(s, 1, s);
    }
    if (this.dockFill) {
      this.dockFill.opacity = this.loadingNow ? 0.45 + 0.25 * Math.sin(now / 140) : 0.01;
    }

    // Track holds a fixed view per station; follow modes glide after one subject, keeping the user's angle.
    if (this.mode === "track") {
      this.trackCamera(dt, false);
    } else if (this.mode === "forklift" || this.mode === "truck") {
      const desired = this.followTarget();
      const delta = desired.sub(this.controls.target).multiplyScalar(0.12);
      this.controls.target.add(delta);
      this.camera.position.add(delta);
    }

    this.updateOcclusion(dt);

    // Keep crisp shadows wherever the camera looks.
    const focus = this.controls.target;
    this.sun.position.set(focus.x - 24, 42, focus.z + 20);
    this.sun.target.position.copy(focus);
  }

  private project(v: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const p = v.clone().project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * this.host.clientWidth,
      y: (-p.y * 0.5 + 0.5) * this.host.clientHeight,
      visible: p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1,
    };
  }

  /** Render the truck cam into the pip element's rect while the truck is away. */
  private renderPip(): boolean {
    const el = this.pipElement;
    const truck = this.truck;
    const truckInShot = this.mode === "track" && this.station === "route";
    if (!el || !truck || !this.pipEnabled || !this.truckAway || truckInShot || this.mode === "truck" || this.mode === "route") return false;
    const host = this.host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const x = r.left - host.left;
    const y = host.bottom - r.bottom;
    const p = truck.group.position;
    this.pipCamera.aspect = r.width / r.height;
    this.pipCamera.updateProjectionMatrix();
    this.pipCamera.position.set(p.x + 9, 11, p.z + 13);
    this.pipCamera.lookAt(p.x, 1, p.z);
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(x, y, r.width, r.height);
    this.renderer.setViewport(x, y, r.width, r.height);
    this.renderer.render(this.scene, this.pipCamera);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.host.clientWidth, this.host.clientHeight);
    return true;
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    if (!this.onScreen) return;
    this.animate(performance.now());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const pip = this.renderPip();
    this.onFrame?.(
      {
        forklift: this.project(this.anchors.forklift),
        truck: this.project(this.anchors.truck),
        store: this.project(this.anchors.store),
      },
      pip,
    );
  };

  private clear(): void {
    this.storeRing?.geometry.dispose();
    for (const occ of this.occluders) occ.materials.forEach((m) => m.dispose());
    this.occluders = [];
    this.occluderMeshes = [];
    this.root.clear();
    this.kit.dispose();
    this.pallets = [];
    this.pathDots = [];
    this.forklift = null;
    this.truck = null;
    this.targetRing = null;
    this.dockFill = null;
    this.storeRing = null;
    this.storeRingBase = null;
    this.returnForward = null;
    this.returnReverse = null;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.visibility.disconnect();
    this.renderer.domElement.removeEventListener("wheel", this.onWheel);
    this.renderer.domElement.removeEventListener("contextmenu", this.onContextMenu);
    this.controls.dispose();
    this.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
