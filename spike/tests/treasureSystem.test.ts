import { describe, it, expect } from "vitest";
import { AWAY_CAP_MS, AWAY_MAX_FINDS, AWAY_ROLL_MS, applyDiscovery, discoveryChance, rollAway, rollItem, tryDiscover } from "../src/simulation/treasureSystem";
import type { DiscoveryContext } from "../src/simulation/treasureSystem";
import { defaultSave } from "../src/simulation/saveData";
import { MILESTONE, TREASURES, TREASURE_BY_ID } from "../src/simulation/treasures";

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

function ctx(over: Partial<DiscoveryContext> = {}): DiscoveryContext {
  return { source: "walk", curiosity: 60, mood: "happy", now: NOW, lastDiscoveryAt: null, totalDiscoveries: 0, hasItem: () => false, ...over };
}

describe("rolling items", () => {
  it("follows the rarity weights and never rolls the special item", () => {
    const r = rng(42);
    const counts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0, special: 0 };
    const N = 200000;
    for (let i = 0; i < N; i++) counts[TREASURE_BY_ID.get(rollItem(r))!.rarity]++;
    expect(counts.special).toBe(0);
    expect(counts.common / N).toBeGreaterThan(0.68);
    expect(counts.common / N).toBeLessThan(0.72);
    expect(counts.uncommon / N).toBeGreaterThan(0.2);
    expect(counts.uncommon / N).toBeLessThan(0.24);
    expect(counts.rare / N).toBeGreaterThan(0.06);
    expect(counts.rare / N).toBeLessThan(0.08);
    expect(counts.legendary / N).toBeGreaterThan(0.005);
    expect(counts.legendary / N).toBeLessThan(0.015);
  });

  it("can reach every random item", () => {
    const r = rng(3);
    const seen = new Set<string>();
    for (let i = 0; i < 100000; i++) seen.add(rollItem(r));
    expect(seen.size).toBe(TREASURES.length - 1);
  });

  it("stays valid at the extremes of the random range", () => {
    expect(TREASURE_BY_ID.has(rollItem(() => 0))).toBe(true);
    expect(TREASURE_BY_ID.has(rollItem(() => 0.999999999))).toBe(true);
  });
});

describe("discovery chance", () => {
  it("is zero right after a find, then returns", () => {
    expect(discoveryChance(ctx({ lastDiscoveryAt: NOW - 60_000 }))).toBe(0);
    expect(discoveryChance(ctx({ lastDiscoveryAt: NOW - 121_000 }))).toBeGreaterThan(0);
    expect(discoveryChance(ctx({ source: "inspect", lastDiscoveryAt: NOW - 31_000 }))).toBeGreaterThan(0);
  });

  it("rewards curiosity and a curious mood, and dips when sleepy", () => {
    const base = discoveryChance(ctx());
    expect(discoveryChance(ctx({ curiosity: 100 }))).toBeGreaterThan(base);
    expect(discoveryChance(ctx({ curiosity: 0 }))).toBeLessThan(base);
    expect(discoveryChance(ctx({ mood: "curious" }))).toBeGreaterThan(base);
    expect(discoveryChance(ctx({ mood: "sleepy" }))).toBeLessThan(base);
  });

  it("makes inspecting the best way to find things and never exceeds 1", () => {
    expect(discoveryChance(ctx({ source: "inspect" }))).toBeGreaterThan(discoveryChance(ctx({ source: "ponder" })));
    expect(discoveryChance(ctx({ source: "inspect", curiosity: 100, mood: "curious" }))).toBeLessThanOrEqual(1);
  });

  it("finds something at the expected overall rate", () => {
    const r = rng(9);
    let finds = 0;
    for (let i = 0; i < 100000; i++) if (tryDiscover(ctx(), r)) finds++;
    const p = discoveryChance(ctx());
    expect(finds / 100000).toBeGreaterThan(p * 0.85);
    expect(finds / 100000).toBeLessThan(p * 1.15);
  });
});

describe("milestones", () => {
  it("awards the special item once enough finds are made, then not again", () => {
    expect(tryDiscover(ctx({ totalDiscoveries: MILESTONE.at }), () => 0)).toBe(MILESTONE.itemId);
    expect(tryDiscover(ctx({ totalDiscoveries: MILESTONE.at - 1 }), () => 0)).not.toBe(MILESTONE.itemId);
    expect(tryDiscover(ctx({ totalDiscoveries: MILESTONE.at + 10, hasItem: (id) => id === MILESTONE.itemId }), () => 0)).not.toBe(MILESTONE.itemId);
  });
});

describe("applying a discovery", () => {
  it("adds new items and counts duplicates", () => {
    const s0 = defaultSave(NOW, "x");
    const a = applyDiscovery(s0, "coin", NOW);
    expect(a.isNew).toBe(true);
    expect(a.count).toBe(1);
    const b = applyDiscovery(a.save, "coin", NOW + 1);
    expect(b.isNew).toBe(false);
    expect(b.count).toBe(2);
    expect(b.save.inventory.coin).toBe(2);
    expect(b.save.totalDiscoveries).toBe(2);
    expect(b.save.lastDiscoveryAt).toBe(NOW + 1);
    expect(b.save.history.map((h) => h.itemId)).toEqual(["coin", "coin"]);
    expect(s0.inventory).toEqual({}); // the original is untouched
  });

  it("completes a collection once and never duplicates its reward", () => {
    let s = defaultSave(NOW, "x");
    const items = ["button", "paper-clip", "cork", "bottle-cap"];
    for (const id of items) {
      const r = applyDiscovery(s, id, NOW);
      expect(r.newCollections).toEqual([]);
      s = r.save;
    }
    const last = applyDiscovery(s, "yarn", NOW);
    expect(last.newCollections).toEqual(["desk-drawer"]);
    expect(last.save.unlockedCosmetics).toEqual(["red-ribbon"]);
    const again = applyDiscovery(last.save, "yarn", NOW);
    expect(again.newCollections).toEqual([]);
    expect(again.save.unlockedCosmetics).toEqual(["red-ribbon"]);
    expect(again.save.completedCollections).toEqual(["desk-drawer"]);
  });

  it("caps counts and history", () => {
    let s = { ...defaultSave(NOW, "x"), inventory: { coin: 9999 } };
    s = applyDiscovery(s, "coin", NOW).save;
    expect(s.inventory.coin).toBe(9999);
    for (let i = 0; i < 250; i++) s = applyDiscovery(s, "bell", NOW + i).save;
    expect(s.history.length).toBe(200);
  });
});

describe("while you were away", () => {
  const save = defaultSave(NOW, "x");

  it("finds nothing for short absences", () => {
    const r = rollAway(save, AWAY_ROLL_MS - 1, NOW, () => 0);
    expect(r.found).toEqual([]);
    expect(r.save).toEqual(save);
  });

  it("finds a few things, flagged as found while away", () => {
    const r = rollAway(save, 3 * AWAY_ROLL_MS, NOW, () => 0);
    expect(r.found.length).toBe(3);
    expect(r.save.history.every((h) => h.away)).toBe(true);
    expect(r.save.totalDiscoveries).toBe(3);
  });

  it("is capped no matter how long the absence", () => {
    const r = rollAway(save, 365 * 24 * 3_600_000, NOW, () => 0);
    expect(r.found.length).toBe(AWAY_MAX_FINDS);
    const capped = rollAway(save, AWAY_CAP_MS * 100, NOW, () => 0.0001);
    expect(capped.found.length).toBeLessThanOrEqual(AWAY_MAX_FINDS);
  });

  it("averages a handful of finds for a long absence", () => {
    let total = 0;
    for (let seed = 1; seed <= 200; seed++) total += rollAway(save, AWAY_CAP_MS, NOW, rng(seed)).found.length;
    const avg = total / 200;
    expect(avg).toBeGreaterThan(2);
    expect(avg).toBeLessThanOrEqual(AWAY_MAX_FINDS);
  });

  it("ignores negative or nonsense elapsed time", () => {
    expect(rollAway(save, -5000, NOW, () => 0).found).toEqual([]);
    expect(rollAway(save, Number.NaN, NOW, () => 0).found).toEqual([]);
  });
});

import { DROP_AUTO_MS, collectDrop, dropExpired, startDrop } from "../src/simulation/treasureSystem";
import { DROP_W, dropPosition, hitsDrop } from "../src/simulation/drops";
import { parseSave, serializeSave } from "../src/simulation/saveData";

describe("dropped finds", () => {
  it("waits on the ground without touching the collection", () => {
    const s0 = defaultSave(NOW, "x");
    const s1 = startDrop(s0, "bell", NOW);
    expect(s1.pendingDrop).toEqual({ itemId: "bell", at: NOW });
    expect(s1.inventory).toEqual({});
    expect(s1.totalDiscoveries).toBe(0);
    expect(s1.lastDiscoveryAt).toBe(NOW); // the cooldown starts when it is dropped
  });

  it("joins the collection exactly once when collected", () => {
    const s1 = startDrop(defaultSave(NOW, "x"), "bell", NOW);
    const r = collectDrop(s1, NOW + 5000);
    expect(r).not.toBeNull();
    expect(r!.save.inventory.bell).toBe(1);
    expect(r!.save.pendingDrop).toBeNull();
    expect(r!.isNew).toBe(true);
    expect(r!.save.history.map((h) => h.itemId)).toEqual(["bell"]);
    expect(collectDrop(r!.save, NOW + 6000)).toBeNull(); // nothing left to collect
  });

  it("can complete a collection when picked up", () => {
    let s = defaultSave(NOW, "x");
    for (const id of ["button", "paper-clip", "cork", "bottle-cap"]) s = applyDiscovery(s, id, NOW).save;
    const r = collectDrop(startDrop(s, "yarn", NOW), NOW + 1)!;
    expect(r.newCollections).toEqual(["desk-drawer"]);
    expect(r.save.unlockedCosmetics).toEqual(["red-ribbon"]);
  });

  it("is collected automatically after the waiting time", () => {
    const s = startDrop(defaultSave(NOW, "x"), "coin", NOW);
    expect(dropExpired(s, NOW + DROP_AUTO_MS - 1)).toBe(false);
    expect(dropExpired(s, NOW + DROP_AUTO_MS)).toBe(true);
    expect(dropExpired(defaultSave(NOW, "x"), NOW + DROP_AUTO_MS * 10)).toBe(false);
  });

  it("survives a save and load, and bad data is dropped", () => {
    const s = startDrop(defaultSave(NOW - 1000, "x"), "marble", NOW - 500);
    const r = parseSave(serializeSave(s), NOW);
    expect(r.ok && r.save.pendingDrop).toEqual({ itemId: "marble", at: NOW - 500 });
    for (const bad of [{ itemId: "ghost", at: 1 }, { itemId: "coin" }, "str", 5, { itemId: "coin", at: "x" }]) {
      const rr = parseSave(JSON.stringify({ version: 1, pendingDrop: bad }), NOW);
      expect(rr.ok && rr.save.pendingDrop).toBeNull();
    }
    const old = parseSave(JSON.stringify({ version: 1 }), NOW); // saves from Phase 4A have no pendingDrop
    expect(old.ok && old.save.pendingDrop).toBeNull();
  });
});

describe("drop geometry", () => {
  it("lands in front of the cat", () => {
    expect(dropPosition(100, 1, 400)).toBeGreaterThan(100 + 16);
    expect(dropPosition(100, -1, 400)).toBeLessThan(100 + 16);
  });

  it("always stays inside the strip", () => {
    for (let x = 0; x <= 400; x += 7) {
      for (const d of [1, -1] as const) {
        const p = dropPosition(x, d, 400);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p + DROP_W).toBeLessThanOrEqual(400 + 32);
      }
    }
  });

  it("has a forgiving but bounded click area", () => {
    expect(hitsDrop(100, 104, 4)).toBe(true);
    expect(hitsDrop(100, 97, 4)).toBe(true);
    expect(hitsDrop(100, 80, 4)).toBe(false);
    expect(hitsDrop(100, 104, 40)).toBe(false);
    expect(hitsDrop(100, 104, -20)).toBe(false);
  });
});
