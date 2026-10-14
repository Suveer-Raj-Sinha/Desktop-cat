import { describe, it, expect } from "vitest";
import { perchZone } from "../src/simulation/platform";
import type { PlatformInfo } from "../src/simulation/platform";
import { CatEngine, PERCH_HI, PERCH_LO } from "../src/simulation/catEngine";
import { defaultSave, parseSave, serializeSave } from "../src/simulation/saveData";

const NOW = 1_800_000_000_000;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const info = (over: Partial<PlatformInfo> = {}): PlatformInfo => ({ edge: "bottom", auto_hide: false, icons_left: false, ...over });

describe("where the cat ponders", () => {
  it("uses the middle for centred icons or when nothing is known", () => {
    expect(perchZone(null)).toEqual([0.3, 0.7]);
    expect(perchZone(info())).toEqual([0.3, 0.7]);
    expect(perchZone(info({ edge: "unknown" }))).toEqual([0.3, 0.7]);
  });

  it("moves to the left for left-aligned icons on a bottom taskbar", () => {
    expect(perchZone(info({ icons_left: true }))).toEqual([0.05, 0.3]);
  });

  it("ignores icon alignment when the taskbar is not at the bottom", () => {
    for (const edge of ["top", "left", "right"] as const) expect(perchZone(info({ edge, icons_left: true }))).toEqual([0.3, 0.7]);
  });

  it("returns a fresh array each time", () => {
    const a = perchZone(null);
    a[0] = 0.9;
    expect(perchZone(null)[0]).toBe(0.3);
  });
});

describe("the cat follows the chosen perch zone", () => {
  function pondersWithin(lo: number, hi: number): number {
    let seen = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const e = new CatEngine({ random: rng(seed), hour: () => 14 });
      e.setBounds(500);
      e.setPerch(lo, hi);
      for (let i = 0; i < 80000; i++) {
        e.step(100);
        if (e.state.behavior === "ponder") {
          seen++;
          expect(e.state.x).toBeGreaterThanOrEqual(500 * lo - 0.5);
          expect(e.state.x).toBeLessThanOrEqual(500 * hi + 0.5);
        }
      }
    }
    return seen;
  }

  it("ponders on the left when told to", () => {
    expect(pondersWithin(0.05, 0.3)).toBeGreaterThan(0);
  });

  it("still ponders in the middle by default values", () => {
    expect(pondersWithin(PERCH_LO, PERCH_HI)).toBeGreaterThan(0);
  });

  it("ignores nonsense zones", () => {
    const e = new CatEngine({ random: rng(1), hour: () => 14 });
    e.setBounds(500);
    for (const [lo, hi] of [[0.8, 0.2], [-1, 0.5], [0.2, 2], [Number.NaN, 0.5], [0.4, 0.4]]) e.setPerch(lo, hi);
    for (let i = 0; i < 60000; i++) {
      e.step(100);
      if (e.state.behavior === "ponder") {
        expect(e.state.x).toBeGreaterThanOrEqual(500 * PERCH_LO - 0.5);
        expect(e.state.x).toBeLessThanOrEqual(500 * PERCH_HI + 0.5);
      }
    }
  });
});

describe("fullscreen preference", () => {
  it("is on by default and survives a save and load", () => {
    const d = defaultSave(NOW, "x");
    expect(d.settings.hideInFullscreen).toBe(true);
    const off = { ...d, settings: { ...d.settings, hideInFullscreen: false } };
    const r = parseSave(serializeSave(off), NOW);
    expect(r.ok && r.save.settings.hideInFullscreen).toBe(false);
  });

  it("falls back to on for old or invalid saves", () => {
    for (const settings of [{}, { hideInFullscreen: "no" }, { hideInFullscreen: null }]) {
      const r = parseSave(JSON.stringify({ version: 1, settings }), NOW);
      expect(r.ok && r.save.settings.hideInFullscreen).toBe(true);
    }
  });
});
