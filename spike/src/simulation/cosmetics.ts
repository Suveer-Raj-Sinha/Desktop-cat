import type { AnimName, Dir } from "./animation";
import { anchorFor } from "./anchors";

// Logical pixels around the 32x32 frame that accessories may use (a bow above the head, a bell below the neck).
export const OUTFIT_MARGIN = 8;

export type Slot = "head" | "neck";

export interface Cosmetic {
  id: string;
  name: string;
  icon: string;
  slot: Slot;
}

// One item per slot can be worn at a time. Ids match the rewards in treasures.ts.
export const COSMETICS: readonly Cosmetic[] = [
  { id: "red-ribbon", name: "Red Ribbon", icon: "🎀", slot: "head" },
  { id: "leaf-crown", name: "Leaf Crown", icon: "🌿", slot: "head" },
  { id: "bell-collar", name: "Bell Collar", icon: "🔔", slot: "neck" },
];

const BY_ID: ReadonlyMap<string, Cosmetic> = new Map(COSMETICS.map((c) => [c.id, c]));

export function cosmeticById(id: string): Cosmetic | undefined {
  return BY_ID.get(id);
}

// Puts an unlocked cosmetic on, taking off whatever was in the same slot.
export function equipCosmetic(equipped: readonly string[], id: string, unlocked: readonly string[]): string[] {
  const c = BY_ID.get(id);
  if (!c || !unlocked.includes(id)) return [...equipped];
  const kept = equipped.filter((e) => BY_ID.get(e)?.slot !== c.slot);
  return [...kept, id];
}

export function unequipCosmetic(equipped: readonly string[], id: string): string[] {
  return equipped.filter((e) => e !== id);
}

// Keeps only known, unlocked cosmetics, at most one per slot (the first listed wins).
export function sanitizeEquipped(raw: unknown, unlocked: readonly string[]): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const slots = new Set<Slot>();
  for (const id of raw) {
    if (typeof id !== "string") continue;
    const c = BY_ID.get(id);
    if (!c || !unlocked.includes(id) || slots.has(c.slot) || out.includes(id)) continue;
    slots.add(c.slot);
    out.push(id);
  }
  return out;
}

// A single pixel to paint, in logical pixels relative to the 32x32 frame. `masked` pixels only
// recolour the cat itself (a collar sits on the fur); the others may stick out (a bow, a bell).
export interface PixelOp {
  x: number;
  y: number;
  color: string;
  masked: boolean;
}

function bitmap(rows: string[], x0: number, y0: number, palette: Record<string, string>, masked: boolean): PixelOp[] {
  const ops: PixelOp[] = [];
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const color = palette[row[rx]];
      if (color) ops.push({ x: x0 + rx, y: y0 + ry, color, masked });
    }
  });
  return ops;
}

const RIBBON = ["RR.RR", "RRKRR", "RR.RR"];
const CROWN = [".L.L.L.", "LGLGLGL"];

export function cosmeticPixels(id: string, headCx: number, headTop: number, neckTop: number, dir: Dir): PixelOp[] {
  const hx = Math.round(headCx);
  switch (id) {
    case "red-ribbon":
      return bitmap(RIBBON, hx - 2, headTop - 1, { R: "#e04a4a", K: "#8f1f1f" }, false);
    case "leaf-crown":
      return bitmap(CROWN, hx - 3, headTop - 1, { L: "#86d46f", G: "#3f8f3f" }, false);
    case "bell-collar": {
      const nx = Math.round(headCx - dir * 5.5);
      const cols = dir > 0 ? [nx - 1, nx] : [nx, nx + 1];
      const ops: PixelOp[] = [];
      for (const x of cols) for (let y = neckTop; y < neckTop + 5; y++) ops.push({ x, y, color: "#c0392b", masked: true });
      const bx = dir > 0 ? nx : nx - 1;
      ops.push(...bitmap(["BB", "BD"], bx, neckTop + 5, { B: "#ffd23f", D: "#c9a227" }, false));
      return ops;
    }
    default:
      return [];
  }
}

// Everything the cat is wearing, for one frame of one animation.
export function outfitPixels(equipped: readonly string[], anim: AnimName, dir: Dir, frame: number): PixelOp[] {
  const a = anchorFor(anim, dir, frame);
  if (!a || equipped.length === 0) return [];
  const [headCx, headTop, neckTop] = a;
  return equipped.flatMap((id) => cosmeticPixels(id, headCx, headTop, neckTop, dir));
}
