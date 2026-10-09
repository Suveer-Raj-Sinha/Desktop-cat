import type { Mood } from "./catEngine";
import { HISTORY_MAX, MAX_COUNT, completedCollections } from "./saveData";
import type { SaveData } from "./saveData";
import { COLLECTIONS, MILESTONE, RARITY_WEIGHT, TREASURES } from "./treasures";
import type { Rarity } from "./treasures";

export type DiscoverySource = "walk" | "look" | "ponder" | "play" | "inspect";

export interface DiscoveryContext {
  source: DiscoverySource;
  curiosity: number; // 0-100
  mood: Mood;
  now: number;
  lastDiscoveryAt: number | null;
  totalDiscoveries: number;
  hasItem: (id: string) => boolean;
}

export interface DiscoveryResult {
  save: SaveData;
  isNew: boolean;
  count: number;
  newCollections: string[];
}

export interface AwayResult {
  save: SaveData;
  found: string[];
}

// Chance per opportunity (a finished walk, look, ponder or play). Tuned for roughly one find per 8-10 minutes.
const BASE_CHANCE: Record<DiscoverySource, number> = { walk: 0.02, look: 0.015, ponder: 0.05, play: 0.03, inspect: 0.25 };
const MIN_GAP_MS = 120_000;
const INSPECT_GAP_MS = 30_000;

export const DROP_AUTO_MS = 120_000; // an unclaimed find is added to the collection after this long

export const AWAY_ROLL_MS = 20 * 60_000; // one roll per 20 minutes away
export const AWAY_CAP_MS = 8 * 3_600_000; // time away counts for at most 8 hours
export const AWAY_MAX_FINDS = 5;
const AWAY_CHANCE = 0.15;

export function discoveryChance(ctx: DiscoveryContext): number {
  const gap = ctx.source === "inspect" ? INSPECT_GAP_MS : MIN_GAP_MS;
  if (ctx.lastDiscoveryAt !== null && ctx.now - ctx.lastDiscoveryAt < gap) return 0;
  let p = BASE_CHANCE[ctx.source] * (0.6 + (0.8 * ctx.curiosity) / 100);
  if (ctx.mood === "curious") p *= 1.5;
  if (ctx.mood === "sleepy") p *= 0.5;
  return Math.min(1, p);
}

// Picks a rarity by weight, then an item of that rarity at random. Never returns the special item.
export function rollItem(random: () => number): string {
  const rarities = Object.keys(RARITY_WEIGHT) as Exclude<Rarity, "special">[];
  const total = rarities.reduce((s, r) => s + RARITY_WEIGHT[r], 0);
  let r = random() * total;
  let chosen = rarities[rarities.length - 1];
  for (const rar of rarities) {
    r -= RARITY_WEIGHT[rar];
    if (r < 0) {
      chosen = rar;
      break;
    }
  }
  const pool = TREASURES.filter((t) => t.rarity === chosen);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))].id;
}

function nextItem(totalDiscoveries: number, hasItem: (id: string) => boolean, random: () => number): string {
  if (totalDiscoveries >= MILESTONE.at && !hasItem(MILESTONE.itemId)) return MILESTONE.itemId;
  return rollItem(random);
}

export function tryDiscover(ctx: DiscoveryContext, random: () => number): string | null {
  if (random() >= discoveryChance(ctx)) return null;
  return nextItem(ctx.totalDiscoveries, ctx.hasItem, random);
}

export function applyDiscovery(save: SaveData, itemId: string, now: number, away = false): DiscoveryResult {
  const count = Math.min(MAX_COUNT, (save.inventory[itemId] ?? 0) + 1);
  const inventory = { ...save.inventory, [itemId]: count };
  const done = completedCollections(inventory);
  const newCollections = done.filter((id) => !save.completedCollections.includes(id));
  const cosmetics = new Set(save.unlockedCosmetics);
  for (const c of COLLECTIONS) if (newCollections.includes(c.id)) cosmetics.add(c.rewardCosmetic); // never duplicated
  return {
    isNew: (save.inventory[itemId] ?? 0) === 0,
    count,
    newCollections,
    save: {
      ...save,
      inventory,
      history: [...save.history, { itemId, at: now, away }].slice(-HISTORY_MAX),
      totalDiscoveries: save.totalDiscoveries + 1,
      lastDiscoveryAt: now,
      completedCollections: done,
      unlockedCosmetics: [...cosmetics],
    },
  };
}

// A find is first left on the desktop. It joins the collection when clicked, or by itself after DROP_AUTO_MS.
export function startDrop(save: SaveData, itemId: string, now: number): SaveData {
  return { ...save, pendingDrop: { itemId, at: now }, lastDiscoveryAt: now };
}

export function dropExpired(save: SaveData, now: number): boolean {
  return save.pendingDrop !== null && now - save.pendingDrop.at >= DROP_AUTO_MS;
}

export function collectDrop(save: SaveData, now: number): DiscoveryResult | null {
  if (save.pendingDrop === null) return null;
  const r = applyDiscovery(save, save.pendingDrop.itemId, now);
  return { ...r, save: { ...r.save, pendingDrop: null } };
}

// "While you were away": a few finds from the elapsed time, with a hard cap so a long absence can't flood the collection.
export function rollAway(save: SaveData, elapsedMs: number, now: number, random: () => number): AwayResult {
  const rolls = Math.floor(Math.min(Math.max(elapsedMs, 0), AWAY_CAP_MS) / AWAY_ROLL_MS);
  const chance = AWAY_CHANCE * (0.6 + (0.8 * save.cat.traits.curiosity) / 100);
  const found: string[] = [];
  let current = save;
  for (let i = 0; i < rolls && found.length < AWAY_MAX_FINDS; i++) {
    if (random() >= chance) continue;
    const id = nextItem(current.totalDiscoveries, (x) => (current.inventory[x] ?? 0) > 0, random);
    current = applyDiscovery(current, id, now, true).save;
    found.push(id);
  }
  return { save: current, found };
}
