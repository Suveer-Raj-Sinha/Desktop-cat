import { describe, it, expect } from "vitest";
import { COLLECTIONS, KNOWN_COSMETICS, MILESTONE, RARITY_WEIGHT, TREASURES, TREASURE_BY_ID, rarityTier } from "../src/simulation/treasures";

describe("treasure catalogue", () => {
  it("has the planned mix of 16 unique treasures", () => {
    const count = (r: string): number => TREASURES.filter((t) => t.rarity === r).length;
    expect(TREASURES.length).toBe(16);
    expect(count("common")).toBe(8);
    expect(count("uncommon")).toBe(4);
    expect(count("rare")).toBe(2);
    expect(count("legendary")).toBe(1);
    expect(count("special")).toBe(1);
    expect(new Set(TREASURES.map((t) => t.id)).size).toBe(16);
  });

  it("has complete entries", () => {
    for (const t of TREASURES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it("only has collections made of real, non-overlapping items", () => {
    const seen = new Set<string>();
    for (const c of COLLECTIONS) {
      for (const id of c.itemIds) {
        expect(TREASURE_BY_ID.has(id)).toBe(true);
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
      expect(KNOWN_COSMETICS.has(c.rewardCosmetic)).toBe(true);
    }
    expect(new Set(COLLECTIONS.map((c) => c.rewardCosmetic)).size).toBe(COLLECTIONS.length);
  });

  it("keeps the special item out of random rolls", () => {
    expect(TREASURE_BY_ID.get(MILESTONE.itemId)?.rarity).toBe("special");
    expect(Object.keys(RARITY_WEIGHT)).not.toContain("special");
  });

  it("maps rarity to sparkle tiers", () => {
    expect(rarityTier("common")).toBe(1);
    expect(rarityTier("rare")).toBe(2);
    expect(rarityTier("legendary")).toBe(3);
    expect(rarityTier("special")).toBe(3);
  });
});
