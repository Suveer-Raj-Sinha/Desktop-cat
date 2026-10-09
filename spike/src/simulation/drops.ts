import { CELL } from "./animation";

export const DROP_W = 8; // logical px; the dropped object is drawn about this wide
const HIT_PAD_X = 4; // forgiving click area around it
const HIT_TOP = 14; // how far above the floor a click still counts

// Where a find lands: just in front of the cat, always inside the strip.
export function dropPosition(catX: number, dir: 1 | -1, maxX: number): number {
  const x = catX + CELL / 2 + dir * 18 - DROP_W / 2;
  return Math.min(maxX + CELL - DROP_W, Math.max(0, x));
}

// lx: click position in logical px from the left; up: logical px above the floor.
export function hitsDrop(dropX: number, lx: number, up: number): boolean {
  return lx >= dropX - HIT_PAD_X && lx <= dropX + DROP_W + HIT_PAD_X && up >= -2 && up <= HIT_TOP;
}
