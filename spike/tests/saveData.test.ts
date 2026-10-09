import { describe, it, expect } from "vitest";
import { SAVE_VERSION, collectionView, defaultSave, parseSave, serializeSave } from "../src/simulation/saveData";
import type { Migration, SaveData } from "../src/simulation/saveData";

const NOW = 1_800_000_000_000;

function ok(text: string, now = NOW): SaveData {
  const r = parseSave(text, now);
  if (!r.ok) throw new Error(r.reason);
  return r.save;
}

describe("save validation", () => {
  it("round-trips a default save", () => {
    const s = defaultSave(NOW, "abc");
    const back = ok(serializeSave(s));
    expect(back).toEqual(s);
    expect(back.version).toBe(SAVE_VERSION);
  });

  it("rejects things that are not saves", () => {
    for (const bad of ["not json", "[]", "42", "null", "{}", '{"version":"1"}', '{"version":-1}', '{"version":1.5}']) {
      expect(parseSave(bad, NOW).ok).toBe(false);
    }
  });

  it("refuses saves from a newer version instead of damaging them", () => {
    const r = parseSave(JSON.stringify({ version: SAVE_VERSION + 1 }), NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/newer/);
  });

  it("repairs bad fields and keeps the good ones", () => {
    const messy = {
      version: 1,
      savedAt: "yesterday",
      cat: { id: 7, name: "   ", createdAt: NOW + 999999, lastActiveAt: NOW + 5000, traits: { curiosity: 500, playfulness: -3, affection: "x" } },
      inventory: { coin: 3.7, bell: 0, ghost: 5, cork: -2, button: 100000, marble: "2" },
      history: [{ itemId: "coin", at: 5, away: "yes" }, { itemId: "nope", at: 6 }, "junk", { itemId: "bell" }],
      totalDiscoveries: -4,
      lastDiscoveryAt: NOW + 10,
      unlockedCosmetics: ["red-ribbon", "made-up", 3],
      settings: { clickThrough: "true", soundEnabled: false, animationIntensity: "low" },
    };
    const s = ok(JSON.stringify(messy));
    expect(s.cat.name).toBe("Mochi");
    expect(s.cat.id).toBe("cat");
    expect(s.cat.traits.curiosity).toBe(100);
    expect(s.cat.traits.playfulness).toBe(0);
    expect(s.cat.traits.affection).toBe(60);
    expect(s.cat.createdAt).toBe(NOW);
    expect(s.cat.lastActiveAt).toBe(NOW); // no fake time away from a clock set backwards
    expect(s.savedAt).toBe(NOW);
    expect(s.inventory).toEqual({ coin: 3, button: 9999 });
    expect(s.history).toEqual([{ itemId: "coin", at: 5, away: false }]);
    expect(s.totalDiscoveries).toBe(3 + 9999);
    expect(s.lastDiscoveryAt).toBe(NOW);
    expect(s.unlockedCosmetics).toEqual(["red-ribbon"]);
    expect(s.settings).toEqual({ clickThrough: false, soundEnabled: false, animationIntensity: "low" });
  });

  it("derives completed collections and their rewards from the inventory", () => {
    const base = { version: 1, inventory: { button: 1, "paper-clip": 2, cork: 1, "bottle-cap": 1, yarn: 1, coin: 1 } };
    const s = ok(JSON.stringify({ ...base, completedCollections: ["shiny-things"] }));
    expect(s.completedCollections).toEqual(["desk-drawer"]);
    expect(s.unlockedCosmetics).toEqual(["red-ribbon"]);
  });

  it("keeps at most 200 history entries", () => {
    const history = Array.from({ length: 300 }, (_, i) => ({ itemId: "coin", at: i, away: false }));
    const s = ok(JSON.stringify({ version: 1, inventory: { coin: 300 }, history }));
    expect(s.history.length).toBe(200);
    expect(s.history[199].at).toBe(299);
  });

  it("builds a compact view for the control window", () => {
    const s = defaultSave(NOW, "x");
    const history = Array.from({ length: 30 }, (_, i) => ({ itemId: "coin", at: i, away: false }));
    const v = collectionView({ ...s, history }, "hello");
    expect(v.history.length).toBe(12);
    expect(v.note).toBe("hello");
    expect(v.pending).toBe(false);
    expect(collectionView({ ...s, pendingDrop: { itemId: "coin", at: 1 } }).pending).toBe(true);
  });
});

describe("save migrations", () => {
  const v0to1: Migration = (raw) => ({ ...raw, cat: { name: raw.name } });
  const v1to2: Migration = (raw) => ({ ...raw, extra: true });

  it("runs migrations in order up to the target", () => {
    const r = parseSave(JSON.stringify({ version: 0, name: "Old Cat" }), NOW, { migrations: { 0: v0to1 }, target: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.migrated).toBe(true);
      expect(r.save.cat.name).toBe("Old Cat");
      expect(r.save.version).toBe(1);
    }
  });

  it("chains several steps", () => {
    const seen: number[] = [];
    const a: Migration = (raw) => { seen.push(0); return v0to1(raw); };
    const b: Migration = (raw) => { seen.push(1); return v1to2(raw); };
    const r = parseSave(JSON.stringify({ version: 0, name: "Cat" }), NOW, { migrations: { 0: a, 1: b }, target: 2 });
    expect(r.ok).toBe(true);
    expect(seen).toEqual([0, 1]);
    if (r.ok) expect(r.save.version).toBe(2);
  });

  it("fails clearly when a migration is missing", () => {
    const r = parseSave(JSON.stringify({ version: 0 }), NOW, { migrations: {}, target: 1 });
    expect(r.ok).toBe(false);
  });

  it("does not report current-version saves as migrated", () => {
    const r = parseSave(serializeSave(defaultSave(NOW, "x")), NOW);
    expect(r.ok && r.migrated).toBe(false);
  });
});
