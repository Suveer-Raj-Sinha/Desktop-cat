import { describe, it, expect } from "vitest";
import { CatEngine } from "../src/simulation/catEngine";
import { cell, pixelScale } from "../src/simulation/animation";

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(maxX = 400, seed = 1): CatEngine {
  const e = new CatEngine({ random: rng(seed) });
  e.setBounds(maxX);
  return e;
}

function runUntil(e: CatEngine, pred: () => boolean, maxSteps = 200000): boolean {
  for (let i = 0; i < maxSteps; i++) {
    if (pred()) return true;
    e.step(16);
  }
  return pred();
}

describe("sprite math", () => {
  it("maps frames to sheet cells", () => {
    expect(cell("walk", 1, 0)).toEqual({ sx: 12 * 32, sy: 12 * 32 });
    expect(cell("sit", -1, 5)).toEqual({ sx: 1 * 32, sy: 5 * 32 });
    expect(cell("lay", 1, 7)).toEqual({ sx: 11 * 32, sy: 13 * 32 });
  });

  it("picks whole physical pixel scales", () => {
    expect(pixelScale(1)).toBe(4);
    expect(pixelScale(1.25)).toBe(5);
    expect(pixelScale(1.5)).toBe(6);
    expect(pixelScale(2)).toBe(8);
    expect(pixelScale(0)).toBe(1);
  });
});

describe("CatEngine", () => {
  it("starts sitting and holds the last sit frame", () => {
    const e = make();
    e.step(500);
    e.step(500);
    expect(e.state.mode).toBe("idle");
    expect(e.state.frame).toBe(5);
    expect(e.settled).toBe(true);
  });

  it("walks to a target and returns to idle", () => {
    const e = make();
    expect(runUntil(e, () => e.state.mode === "walk")).toBe(true);
    expect(e.state.anim).toBe("walk");
    expect(runUntil(e, () => e.state.mode === "idle")).toBe(true);
    expect(e.state.anim).toBe("sit");
  });

  it("stays inside bounds for many seeds", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const e = make(300, seed);
      for (let i = 0; i < 20000; i++) {
        e.step(16);
        expect(e.state.x).toBeGreaterThanOrEqual(0);
        expect(e.state.x).toBeLessThanOrEqual(300);
      }
    }
  });

  it("clamps the cat when bounds shrink", () => {
    const e = make(400, 3);
    expect(runUntil(e, () => e.state.x > 150)).toBe(true);
    e.setBounds(100);
    expect(e.state.x).toBeLessThanOrEqual(100);
    for (let i = 0; i < 5000; i++) {
      e.step(16);
      expect(e.state.x).toBeLessThanOrEqual(100);
    }
  });

  it("caps catch-up after a long pause", () => {
    const e = make();
    runUntil(e, () => e.state.mode === "walk");
    const before = e.state.x;
    e.step(10 * 60 * 1000);
    expect(Math.abs(e.state.x - before)).toBeLessThanOrEqual(15.01);
  });

  it("interaction makes a walking cat sit", () => {
    const e = make();
    runUntil(e, () => e.state.mode === "walk");
    e.interact();
    expect(e.state.mode).toBe("idle");
    expect(e.state.anim).toBe("sit");
  });

  it("does not walk when there is no room", () => {
    const e = make(10);
    for (let i = 0; i < 20000; i++) e.step(16);
    expect(e.state.mode).toBe("idle");
    expect(e.state.x).toBeLessThanOrEqual(10);
  });
});
