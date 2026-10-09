import { describe, it, expect } from "vitest";
import { CatEngine, NEXT, pickWeighted, INTERACTIONS, PERCH_LO, PERCH_HI } from "../src/simulation/catEngine";
import type { Behavior, Mood, Traits } from "../src/simulation/catEngine";
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

interface Opts {
  hour?: number;
  traits?: Partial<Traits>;
}

function make(maxX = 400, seed = 1, o: Opts = {}): CatEngine {
  const e = new CatEngine({ random: rng(seed), hour: () => o.hour ?? 14 }, o.traits);
  e.setBounds(maxX);
  return e;
}

function runUntil(e: CatEngine, pred: () => boolean, maxSteps = 200000, dt = 16): boolean {
  for (let i = 0; i < maxSteps; i++) {
    if (pred()) return true;
    e.step(dt);
  }
  return pred();
}

function countStarts(e: CatEngine, b: Behavior, steps: number, dt = 100): number {
  let n = 0;
  let prev = e.state.behavior;
  for (let i = 0; i < steps; i++) {
    e.step(dt);
    if (e.state.behavior !== prev) {
      prev = e.state.behavior;
      if (prev === b) n++;
    }
  }
  return n;
}

const SIX_HOURS = 216000; // steps of 100 ms

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

describe("behavior table", () => {
  it("never repeats the same action and has positive weights", () => {
    for (const b of Object.keys(NEXT) as Behavior[]) {
      expect(Object.keys(NEXT[b])).not.toContain(b);
      for (const w of Object.values(NEXT[b])) expect(w).toBeGreaterThan(0);
    }
  });

  it("picks according to weights", () => {
    const r = rng(7);
    let a = 0;
    for (let i = 0; i < 10000; i++) if (pickWeighted(r, [["a", 90], ["b", 10]]) === "a") a++;
    expect(a).toBeGreaterThan(8700);
    expect(a).toBeLessThan(9300);
  });
});

describe("basics", () => {
  it("starts idle and holds the last sit frame", () => {
    const e = make();
    e.step(500);
    e.step(500);
    expect(e.state.behavior).toBe("idle");
    expect(e.state.frame).toBe(5);
    expect(e.settled).toBe(true);
  });

  it("uses every animation over time", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 6; seed++) {
      const e = make(500, seed);
      for (let i = 0; i < 60000; i++) {
        e.step(16);
        seen.add(e.state.anim);
      }
    }
    for (const a of ["sit", "look", "lay", "walk", "run", "run2"]) expect(seen.has(a)).toBe(true);
  });

  it("only moves while walking or playing", () => {
    const e = make(500, 4);
    const still = (b: Behavior): boolean => b === "idle" || b === "look" || b === "nap" || b === "celebrate" || b === "ponder" || b === "discover";
    for (let i = 0; i < 30000; i++) {
      const before = e.state.behavior;
      const x = e.state.x;
      e.step(16);
      if (still(before) && still(e.state.behavior)) expect(e.state.x).toBe(x);
    }
  });

  it("stays inside bounds for many seeds", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const e = make(300, seed, { traits: { mischief: 100 } });
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
    runUntil(e, () => e.state.behavior === "walk");
    const before = e.state.x;
    e.step(10 * 60 * 1000);
    expect(Math.abs(e.state.x - before)).toBeLessThanOrEqual(15.01);
  });

  it("does not walk or play when there is no room", () => {
    const e = make(60);
    for (let i = 0; i < 40000; i++) {
      e.step(16);
      expect(e.state.behavior === "walk" || e.state.behavior === "play").toBe(false);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = make(400, 9);
    const b = make(400, 9);
    for (let i = 0; i < 5000; i++) {
      a.step(16);
      b.step(16);
    }
    expect(a.state).toEqual(b.state);
  });
});

describe("personality", () => {
  it("is sleepier at night than during the day", () => {
    const sleepyShare = (hour: number): number => {
      let sleepy = 0;
      let samples = 0;
      for (let seed = 1; seed <= 4; seed++) {
        const e = make(450, seed, { hour });
        for (let i = 0; i < SIX_HOURS; i++) {
          e.step(100);
          if (i % 100 === 0) {
            samples++;
            if (e.state.mood === "sleepy") sleepy++;
          }
        }
      }
      return sleepy / samples;
    };
    expect(sleepyShare(2)).toBeGreaterThan(sleepyShare(14) * 2);
  });

  it("lazy cats nap more", () => {
    let lazy = 0;
    let busy = 0;
    for (let seed = 1; seed <= 3; seed++) {
      lazy += countStarts(make(450, seed, { traits: { laziness: 95 } }), "nap", SIX_HOURS);
      busy += countStarts(make(450, seed, { traits: { laziness: 5 } }), "nap", SIX_HOURS);
    }
    expect(lazy).toBeGreaterThan(busy * 1.5);
  });

  it("playful cats play more", () => {
    let hi = 0;
    let lo = 0;
    for (let seed = 1; seed <= 3; seed++) {
      hi += countStarts(make(450, seed, { traits: { playfulness: 95 } }), "play", SIX_HOURS);
      lo += countStarts(make(450, seed, { traits: { playfulness: 5 } }), "play", SIX_HOURS);
    }
    expect(hi).toBeGreaterThan(lo * 1.5);
  });

  it("curious cats walk more", () => {
    let hi = 0;
    let lo = 0;
    for (let seed = 1; seed <= 3; seed++) {
      hi += countStarts(make(450, seed, { traits: { curiosity: 95 } }), "walk", SIX_HOURS);
      lo += countStarts(make(450, seed, { traits: { curiosity: 5 } }), "walk", SIX_HOURS);
    }
    expect(hi).toBeGreaterThan(lo * 1.2);
  });

  it("waits at least 30 seconds before napping again", () => {
    for (let seed = 1; seed <= 4; seed++) {
      const e = make(450, seed, { traits: { laziness: 100 } });
      let prev: Behavior = e.state.behavior;
      let ended = -Infinity;
      let clock = 0;
      for (let i = 0; i < SIX_HOURS; i++) {
        e.step(100);
        clock += 100;
        if (e.state.behavior !== prev) {
          if (prev === "nap") ended = clock;
          if (e.state.behavior === "nap") expect(clock - ended).toBeGreaterThanOrEqual(30000);
          prev = e.state.behavior;
        }
      }
    }
  });
});

describe("interactions", () => {
  it("lists exactly the supported interactions", () => {
    expect([...INTERACTIONS]).toEqual(["pet", "play", "inspect"]);
  });

  it("petting makes the cat happy, raises affection and shows a heart", () => {
    const e = make(400, 2, { traits: { affection: 50 } });
    runUntil(e, () => e.state.mood !== "grumpy");
    e.interact("pet");
    expect(e.state.hearts).toBe(1);
    expect(e.status.traits.affection).toBe(51);
    expect(e.state.mood).toBe("happy");
    expect(e.state.behavior).toBe("celebrate");
  });

  it("keeps traits within 0-100", () => {
    const e = make(400, 2, { traits: { affection: 99.5, playfulness: 100, curiosity: 100 } });
    e.interact("pet");
    e.interact("play");
    e.interact("inspect");
    const t = e.status.traits;
    expect(t.affection).toBe(100);
    expect(t.playfulness).toBe(100);
    expect(t.curiosity).toBe(100);
  });

  it("too much petting makes it grumpy but never harms anything", () => {
    const e = make(400, 5, { traits: { affection: 50 } });
    for (let i = 0; i < 10; i++) e.interact("pet");
    expect(e.state.mood).toBe("grumpy");
    expect(e.status.traits.affection).toBeLessThanOrEqual(57);
    for (let i = 0; i < 4000; i++) e.step(16); // it just carries on afterwards
    expect(["idle", "walk", "look", "nap", "play", "celebrate", "ponder", "discover"]).toContain(e.state.behavior);
  });

  it("play starts a run and returns to normal afterwards", () => {
    const e = make(400, 6);
    e.interact("play");
    expect(e.state.behavior).toBe("play");
    expect(e.state.mood).toBe("playful");
    expect(runUntil(e, () => e.state.behavior !== "play")).toBe(true);
  });

  it("inspect walks somewhere then looks around", () => {
    const e = make(400, 6);
    e.interact("inspect");
    expect(e.state.behavior).toBe("walk");
    expect(e.state.mood).toBe("curious");
    expect(runUntil(e, () => e.state.behavior === "look")).toBe(true);
  });

  it("still reacts when there is no room to move", () => {
    const e = make(30, 6);
    e.interact("play");
    expect(e.state.behavior).toBe("celebrate");
    e.interact("inspect");
    expect(e.state.behavior).toBe("look");
  });
});

describe("cursor curiosity", () => {
  it("faces the pointer without moving it or the cat", () => {
    const e = make(400, 1);
    e.setCursor(-50);
    e.step(16);
    expect(e.state.dir).toBe(-1);
    e.setCursor(200);
    e.step(16);
    expect(e.state.dir).toBe(1);
  });

  it("curious cats sometimes wander over and watch", () => {
    let approached = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const e = make(500, seed, { traits: { curiosity: 100 } });
      e.step(50);
      e.setCursor(400);
      if (e.state.behavior !== "walk") continue;
      approached++;
      expect(runUntil(e, () => e.state.behavior === "idle", 5000)).toBe(true);
      expect(Math.abs(e.state.x - (400 - 16 - 28))).toBeLessThan(2);
    }
    expect(approached).toBeGreaterThanOrEqual(8);
  });

  it("loses interest when the pointer leaves", () => {
    const e = make(400, 1);
    e.setCursor(300);
    e.setCursor(null);
    for (let i = 0; i < 500; i++) e.step(16);
    expect(e.state.x).toBeGreaterThanOrEqual(0);
  });
});

describe("mood values", () => {
  it("only produces known moods", () => {
    const moods: Mood[] = ["happy", "curious", "sleepy", "playful", "grumpy"];
    const e = make(450, 2);
    for (let i = 0; i < 50000; i++) {
      e.step(100);
      expect(moods).toContain(e.state.mood);
    }
  });
});

describe("pondering over the taskbar icons", () => {
  it("happens over time", () => {
    let total = 0;
    for (let seed = 1; seed <= 3; seed++) total += countStarts(make(450, seed), "ponder", SIX_HOURS);
    expect(total).toBeGreaterThan(20);
  });

  it("always happens in the middle of the strip, sitting still", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const e = make(450, seed);
      let seen = 0;
      for (let i = 0; i < 100000; i++) {
        e.step(100);
        if (e.state.behavior === "ponder") {
          seen++;
          expect(e.state.anim).toBe("sit");
          expect(e.state.x).toBeGreaterThanOrEqual(450 * PERCH_LO - 0.5);
          expect(e.state.x).toBeLessThanOrEqual(450 * PERCH_HI + 0.5);
        }
      }
      expect(seen).toBeGreaterThan(0);
    }
  });

  it("waits at least 45 seconds before pondering again", () => {
    for (let seed = 1; seed <= 4; seed++) {
      const e = make(450, seed, { traits: { curiosity: 100 } });
      let prev: Behavior = e.state.behavior;
      let ended = -Infinity;
      let clock = 0;
      for (let i = 0; i < SIX_HOURS; i++) {
        e.step(100);
        clock += 100;
        if (e.state.behavior !== prev) {
          if (prev === "ponder") ended = clock;
          if (e.state.behavior === "ponder") expect(clock - ended).toBeGreaterThanOrEqual(45000);
          prev = e.state.behavior;
        }
      }
    }
  });

  it("curious cats ponder more", () => {
    let hi = 0;
    let lo = 0;
    for (let seed = 1; seed <= 3; seed++) {
      hi += countStarts(make(450, seed, { traits: { curiosity: 95 } }), "ponder", SIX_HOURS);
      lo += countStarts(make(450, seed, { traits: { curiosity: 5 } }), "ponder", SIX_HOURS);
    }
    expect(hi).toBeGreaterThan(lo * 1.3);
  });

  it("never ponders when the strip is too short", () => {
    const e = make(100, 2);
    for (let i = 0; i < 40000; i++) {
      e.step(16);
      expect(e.state.behavior).not.toBe("ponder");
    }
  });
});

describe("discovery hooks", () => {
  it("reports opportunities as the cat finishes things, and drains them", () => {
    const e = make(450, 3);
    const sources = new Set<string>();
    for (let i = 0; i < 60000; i++) {
      e.step(100);
      for (const ev of e.takeEvents()) {
        expect(ev.type).toBe("opportunity");
        sources.add(ev.source);
      }
    }
    for (const src of ["walk", "look", "ponder", "play"]) expect(sources.has(src)).toBe(true);
    expect(e.takeEvents()).toEqual([]);
  });

  it("reports an inspect opportunity once the inspection walk ends", () => {
    const e = make(450, 4);
    e.takeEvents();
    e.interact("inspect");
    expect(e.takeEvents().length).toBe(0);
    expect(runUntil(e, () => e.state.behavior === "look")).toBe(true);
    expect(e.takeEvents().map((x) => x.source)).toContain("inspect");
  });

  it("caps queued events when nobody is listening", () => {
    const e = make(450, 5);
    for (let i = 0; i < 100000; i++) e.step(100);
    expect(e.takeEvents().length).toBeLessThanOrEqual(8);
  });

  it("celebrates a find with a sparkle and then carries on", () => {
    for (const tier of [1, 2, 3] as const) {
      const e = make(450, 6);
      e.startDiscovery(tier);
      expect(e.state.behavior).toBe("discover");
      expect(e.state.discoverTier).toBe(tier);
      expect(runUntil(e, () => e.state.behavior !== "discover", 2000, 100)).toBe(true);
      expect(e.state.discoverTier).toBe(0);
    }
  });

  it("rarer finds are celebrated for longer", () => {
    const secs = (tier: 1 | 3): number => {
      const e = make(450, 6);
      e.startDiscovery(tier);
      let t = 0;
      while (e.state.behavior === "discover") {
        e.step(100);
        t += 100;
      }
      return t;
    };
    expect(secs(3)).toBeGreaterThan(secs(1));
  });

  it("loads and clamps traits", () => {
    const e = make();
    e.setTraits({ curiosity: 150, playfulness: -5, affection: 33, laziness: 12, mischief: 99 });
    const t = e.status.traits;
    expect(t.curiosity).toBe(100);
    expect(t.playfulness).toBe(0);
    expect(t.affection).toBe(33);
  });
});
