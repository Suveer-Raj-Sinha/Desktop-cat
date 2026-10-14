import { describe, it, expect } from "vitest";
import { COSMETICS, OUTFIT_MARGIN, cosmeticById, equipCosmetic, outfitPixels, sanitizeEquipped, unequipCosmetic } from "../src/simulation/cosmetics";
import { anchorFor } from "../src/simulation/anchors";
import { ANIMS } from "../src/simulation/animation";
import type { AnimName, Dir } from "../src/simulation/animation";
import { COLLECTIONS } from "../src/simulation/treasures";
import { collectionView, defaultSave, parseSave, serializeSave } from "../src/simulation/saveData";

const NOW = 1_800_000_000_000;
const ALL = COSMETICS.map((c) => c.id);
const ANIM_NAMES = Object.keys(ANIMS) as AnimName[];
const DIRS: Dir[] = [1, -1];

describe("cosmetic catalogue", () => {
  it("matches the set rewards one-to-one", () => {
    expect(new Set(ALL).size).toBe(ALL.length);
    expect(ALL.sort()).toEqual(COLLECTIONS.map((c) => c.rewardCosmetic).sort());
    for (const c of COSMETICS) expect(["head", "neck"]).toContain(c.slot);
  });

  it("can be looked up by id", () => {
    expect(cosmeticById("red-ribbon")?.name).toBe("Red Ribbon");
    expect(cosmeticById("nope")).toBeUndefined();
  });
});

describe("equipping", () => {
  const owned = ["red-ribbon", "leaf-crown", "bell-collar"];

  it("only allows unlocked, known cosmetics", () => {
    expect(equipCosmetic([], "red-ribbon", [])).toEqual([]);
    expect(equipCosmetic([], "made-up", owned)).toEqual([]);
    expect(equipCosmetic([], "red-ribbon", owned)).toEqual(["red-ribbon"]);
  });

  it("replaces whatever is in the same spot and keeps the other spot", () => {
    const a = equipCosmetic(["red-ribbon", "bell-collar"], "leaf-crown", owned);
    expect(a.sort()).toEqual(["bell-collar", "leaf-crown"]);
  });

  it("is idempotent and can remove", () => {
    const a = equipCosmetic(["red-ribbon"], "red-ribbon", owned);
    expect(a).toEqual(["red-ribbon"]);
    expect(unequipCosmetic(a, "red-ribbon")).toEqual([]);
    expect(unequipCosmetic(a, "bell-collar")).toEqual(["red-ribbon"]);
  });

  it("cleans up saved lists", () => {
    expect(sanitizeEquipped("nope", owned)).toEqual([]);
    expect(sanitizeEquipped([1, null, "ghost", "red-ribbon", "red-ribbon", "leaf-crown", "bell-collar"], owned)).toEqual(["red-ribbon", "bell-collar"]);
    expect(sanitizeEquipped(["bell-collar"], ["red-ribbon"])).toEqual([]); // not unlocked
  });
});

describe("where the head and neck are", () => {
  it("is known for every frame of every animation", () => {
    for (const anim of ANIM_NAMES) {
      for (const dir of DIRS) {
        for (let f = 0; f < ANIMS[anim].frames; f++) {
          const a = anchorFor(anim, dir, f);
          expect(a).not.toBeNull();
          const [cx, top, neck] = a!;
          expect(cx).toBeGreaterThanOrEqual(0);
          expect(cx).toBeLessThan(32);
          expect(top).toBeGreaterThanOrEqual(0);
          expect(top).toBeLessThan(32);
          expect(neck).toBeGreaterThanOrEqual(top + 2); // the neck is always below the top of the head
          expect(neck).toBeLessThan(32);
        }
      }
    }
    expect(anchorFor("walk", 1, 99)).toBeNull();
  });

  it("is roughly mirrored between left and right", () => {
    for (const anim of ANIM_NAMES) {
      for (let f = 0; f < ANIMS[anim].frames; f++) {
        const r = anchorFor(anim, 1, f)!;
        const l = anchorFor(anim, -1, f)!;
        expect(Math.abs(r[0] + l[0] - 31)).toBeLessThanOrEqual(2);
        expect(r[1]).toBe(l[1]);
        expect(r[2]).toBe(l[2]);
      }
    }
  });
});

describe("outfit pixels", () => {
  it("draws nothing when nothing is worn or the frame is unknown", () => {
    expect(outfitPixels([], "walk", 1, 0)).toEqual([]);
    expect(outfitPixels(["red-ribbon"], "walk", 1, 99)).toEqual([]);
    expect(outfitPixels(["made-up"], "walk", 1, 0)).toEqual([]);
  });

  it("stays inside the frame plus its margin, with valid colours", () => {
    for (const id of ALL) {
      for (const anim of ANIM_NAMES) {
        for (const dir of DIRS) {
          for (let f = 0; f < ANIMS[anim].frames; f++) {
            const ops = outfitPixels([id], anim, dir, f);
            expect(ops.length).toBeGreaterThan(0);
            for (const p of ops) {
              expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
              expect(p.x).toBeGreaterThanOrEqual(-OUTFIT_MARGIN);
              expect(p.x).toBeLessThan(32 + OUTFIT_MARGIN);
              expect(p.y).toBeGreaterThanOrEqual(-OUTFIT_MARGIN);
              expect(p.y).toBeLessThan(32 + OUTFIT_MARGIN);
              expect(p.color).toMatch(/^#[0-9a-f]{6}$/);
              if (p.masked) {
                expect(p.x).toBeGreaterThanOrEqual(0);
                expect(p.x).toBeLessThan(32);
                expect(p.y).toBeGreaterThanOrEqual(0);
                expect(p.y).toBeLessThan(32);
              }
            }
          }
        }
      }
    }
  });

  it("puts head items above the head and the collar below it", () => {
    for (const anim of ANIM_NAMES) {
      const [, headTop] = anchorFor(anim, 1, 0)!;
      for (const id of ["red-ribbon", "leaf-crown"]) {
        for (const p of outfitPixels([id], anim, 1, 0)) expect(p.y).toBeLessThanOrEqual(headTop + 2);
      }
      for (const p of outfitPixels(["bell-collar"], anim, 1, 0)) expect(p.y).toBeGreaterThan(headTop);
    }
  });

  it("combines several items", () => {
    const both = outfitPixels(["red-ribbon", "bell-collar"], "sit", 1, 5);
    const a = outfitPixels(["red-ribbon"], "sit", 1, 5).length;
    const b = outfitPixels(["bell-collar"], "sit", 1, 5).length;
    expect(both.length).toBe(a + b);
  });
});

describe("saving what the cat wears", () => {
  const unlockedAll = { ...defaultSave(NOW, "x"), unlockedCosmetics: ALL };

  it("round-trips", () => {
    const s = { ...unlockedAll, equippedCosmetics: ["leaf-crown", "bell-collar"] };
    const r = parseSave(serializeSave(s), NOW);
    expect(r.ok && r.save.equippedCosmetics).toEqual(["leaf-crown", "bell-collar"]);
    expect(collectionView(s).equipped).toEqual(["leaf-crown", "bell-collar"]);
  });

  it("drops anything that isn't unlocked or valid, and old saves have nothing worn", () => {
    const r = parseSave(JSON.stringify({ version: 1, unlockedCosmetics: ["red-ribbon"], equippedCosmetics: ["bell-collar", "red-ribbon", "ghost"] }), NOW);
    expect(r.ok && r.save.equippedCosmetics).toEqual(["red-ribbon"]);
    const old = parseSave(JSON.stringify({ version: 1 }), NOW);
    expect(old.ok && old.save.equippedCosmetics).toEqual([]);
  });

  it("unlocks come from completed sets, so worn items always exist", () => {
    const inv = { button: 1, "paper-clip": 1, cork: 1, "bottle-cap": 1, yarn: 1 };
    const r = parseSave(JSON.stringify({ version: 1, inventory: inv, equippedCosmetics: ["red-ribbon"] }), NOW);
    expect(r.ok && r.save.equippedCosmetics).toEqual(["red-ribbon"]);
  });
});
