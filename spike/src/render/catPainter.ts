import { CELL, cell } from "../simulation/animation";
import type { AnimName, Dir } from "../simulation/animation";
import { OUTFIT_MARGIN, outfitPixels } from "../simulation/cosmetics";

// Draws one frame of the cat, wearing whatever is equipped. Accessories are painted on a small
// scratch canvas first so a collar can recolour the fur without touching anything else on screen.
export class CatPainter {
  private scratch: HTMLCanvasElement | null = null;

  paint(
    ctx: CanvasRenderingContext2D,
    sheet: CanvasImageSource,
    anim: AnimName,
    dir: Dir,
    frame: number,
    x: number,
    y: number,
    scale: number,
    equipped: readonly string[],
  ): void {
    const { sx, sy } = cell(anim, dir, frame);
    const ops = outfitPixels(equipped, anim, dir, frame);
    if (ops.length === 0) {
      ctx.drawImage(sheet, sx, sy, CELL, CELL, x, y, CELL * scale, CELL * scale);
      return;
    }
    const size = (CELL + 2 * OUTFIT_MARGIN) * scale;
    if (this.scratch === null) this.scratch = document.createElement("canvas");
    if (this.scratch.width !== size) {
      this.scratch.width = size; // resizing also clears it
      this.scratch.height = size;
    }
    const o = this.scratch.getContext("2d") as CanvasRenderingContext2D;
    o.globalCompositeOperation = "source-over";
    o.imageSmoothingEnabled = false;
    o.clearRect(0, 0, size, size);
    o.drawImage(sheet, sx, sy, CELL, CELL, OUTFIT_MARGIN * scale, OUTFIT_MARGIN * scale, CELL * scale, CELL * scale);
    o.globalCompositeOperation = "source-atop"; // only recolours pixels that already belong to the cat
    for (const p of ops) {
      if (!p.masked) continue;
      o.fillStyle = p.color;
      o.fillRect((OUTFIT_MARGIN + p.x) * scale, (OUTFIT_MARGIN + p.y) * scale, scale, scale);
    }
    o.globalCompositeOperation = "source-over";
    for (const p of ops) {
      if (p.masked) continue;
      o.fillStyle = p.color;
      o.fillRect((OUTFIT_MARGIN + p.x) * scale, (OUTFIT_MARGIN + p.y) * scale, scale, scale);
    }
    ctx.drawImage(this.scratch, x - OUTFIT_MARGIN * scale, y - OUTFIT_MARGIN * scale);
  }
}
