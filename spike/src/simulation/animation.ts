export type Dir = 1 | -1;
export type AnimName = "sit" | "look" | "lay" | "walk" | "run" | "run2";

export interface AnimDef {
  block: number; // which 4-column block on the sheet
  frames: number;
  loop: boolean;
  ms: number; // per frame
}

export const CELL = 32;
export const ROW_LEFT = 4; // direction pair 2 (rows 4-5)
export const ROW_RIGHT = 12; // direction pair 6 (rows 12-13)

export const ANIMS: Record<AnimName, AnimDef> = {
  sit: { block: 0, frames: 6, loop: false, ms: 170 },
  look: { block: 1, frames: 5, loop: true, ms: 230 },
  lay: { block: 2, frames: 8, loop: false, ms: 200 },
  walk: { block: 3, frames: 4, loop: true, ms: 150 },
  run: { block: 4, frames: 5, loop: true, ms: 90 },
  run2: { block: 5, frames: 8, loop: true, ms: 90 },
};

// Source rectangle of a frame in the cropped sheet (frames 5+ live on the pair's second row).
export function cell(anim: AnimName, dir: Dir, frame: number): { sx: number; sy: number } {
  const col = ANIMS[anim].block * 4 + (frame % 4);
  const row = (dir < 0 ? ROW_LEFT : ROW_RIGHT) + (frame < 4 ? 0 : 1);
  return { sx: col * CELL, sy: row * CELL };
}

// Whole physical pixels per sprite pixel, so pixel art stays crisp at any display scaling.
export function pixelScale(dpr: number, target = 4): number {
  return Math.max(1, Math.round(target * dpr));
}
