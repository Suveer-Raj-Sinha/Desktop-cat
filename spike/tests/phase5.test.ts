import { describe, it, expect, vi } from "vitest";
import { CAT_SHEETS, DEFAULT_CAT_SHEET, isCatSheet } from "../src/simulation/catSheets";
import { ACTIVITY_MAX, pushActivity } from "../src/simulation/activity";
import type { ActivityEntry } from "../src/simulation/activity";
import { createSoundPlayer } from "../src/services/sound";
import type { AudioCtx } from "../src/services/sound";
import { CatEngine } from "../src/simulation/catEngine";
import { COLLECTIONS } from "../src/simulation/treasures";

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("colour sheets", () => {
  it("lists every colour from the pack exactly once", () => {
    expect(CAT_SHEETS.length).toBe(50);
    expect(new Set(CAT_SHEETS.map((s) => s.id)).size).toBe(50);
    expect(new Set(CAT_SHEETS.map((s) => s.label)).size).toBe(50);
    expect(isCatSheet(DEFAULT_CAT_SHEET)).toBe(true);
  });

  it("only accepts listed ids (so a saved value can never point at another file)", () => {
    for (const bad of ["../x", "black_0.png", "BLACK_0", "", undefined, 3, {}]) expect(isCatSheet(bad)).toBe(false);
    expect(isCatSheet("cotton_candy_pink_0")).toBe(true);
  });
});

describe("activity log", () => {
  it("keeps the newest entries and never grows without bound", () => {
    let list: ActivityEntry[] = [];
    for (let i = 0; i < 100; i++) list = pushActivity(list, { at: i, icon: "x", text: `e${i}` });
    expect(list.length).toBe(ACTIVITY_MAX);
    expect(list[list.length - 1].text).toBe("e99");
    expect(list[0].text).toBe(`e${100 - ACTIVITY_MAX}`);
  });

  it("does not modify the list it was given", () => {
    const a: ActivityEntry[] = [{ at: 1, icon: "x", text: "a" }];
    pushActivity(a, { at: 2, icon: "y", text: "b" });
    expect(a.length).toBe(1);
  });
});

function fakeAudio(state = "running"): { ctx: AudioCtx; started: number[]; resumed: () => number } {
  const started: number[] = [];
  let resumed = 0;
  const ctx: AudioCtx = {
    currentTime: 1,
    destination: {},
    state,
    resume: () => { resumed++; },
    createOscillator: () => ({ type: "", frequency: { value: 0 }, connect: () => undefined, start: (t: number) => { started.push(t); }, stop: () => undefined }),
    createGain: () => ({ gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined }, connect: () => undefined }),
  };
  return { ctx, started, resumed: () => resumed };
}

describe("sound effects", () => {
  it("plays notes when enabled and nothing when disabled", () => {
    const f = fakeAudio();
    let on = true;
    const p = createSoundPlayer(() => on, () => f.ctx);
    p.play("discover");
    expect(f.started.length).toBe(3);
    on = false;
    p.play("pet");
    expect(f.started.length).toBe(3);
  });

  it("reuses one audio context and wakes it if suspended", () => {
    const f = fakeAudio("suspended");
    const make = vi.fn(() => f.ctx);
    const p = createSoundPlayer(() => true, make);
    p.play("pet");
    p.play("collect");
    expect(make).toHaveBeenCalledTimes(1);
    expect(f.resumed()).toBe(2);
  });

  it("never throws, even without audio support or on errors", () => {
    expect(() => createSoundPlayer(() => true, () => null).play("pet")).not.toThrow();
    const broken = createSoundPlayer(() => true, () => { throw new Error("no audio device"); });
    expect(() => broken.play("collect")).not.toThrow();
  });
});

describe("animation intensity", () => {
  function engine(i: "low" | "normal", seed: number, maxX = 2000): CatEngine {
    const e = new CatEngine({ random: rng(seed), hour: () => 14 });
    e.setBounds(maxX);
    e.setIntensity(i);
    return e;
  }
  function countPlays(e: CatEngine): number {
    let n = 0;
    let prev = e.state.behavior;
    for (let i = 0; i < 216000; i++) {
      e.step(100);
      if (e.state.behavior !== prev) {
        prev = e.state.behavior;
        if (prev === "play") n++;
      }
    }
    return n;
  }

  it("runs much less when calm", () => {
    let low = 0;
    let normal = 0;
    for (let seed = 1; seed <= 3; seed++) {
      low += countPlays(engine("low", seed, 450));
      normal += countPlays(engine("normal", seed, 450));
    }
    expect(low).toBeLessThan(normal * 0.6);
  });

  it("walks slower when calm", () => {
    const distance = (i: "low" | "normal"): number => {
      const e = engine(i, 8);
      for (let n = 0; n < 200000 && e.state.behavior !== "walk"; n++) e.step(16);
      const x0 = e.state.x;
      for (let n = 0; n < 10; n++) e.step(100);
      return Math.abs(e.state.x - x0);
    };
    const normal = distance("normal");
    const low = distance("low");
    expect(normal).toBeGreaterThan(20);
    expect(low / normal).toBeGreaterThan(0.6);
    expect(low / normal).toBeLessThan(0.8);
  });
});

describe("collections", () => {
  it("have an icon and name for their reward", () => {
    for (const c of COLLECTIONS) {
      expect(c.rewardIcon.length).toBeGreaterThan(0);
      expect(c.rewardName.length).toBeGreaterThan(0);
    }
  });
});
