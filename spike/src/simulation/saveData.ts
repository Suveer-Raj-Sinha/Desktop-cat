import { DEFAULT_TRAITS } from "./catEngine";
import type { Traits } from "./catEngine";
import { DEFAULT_CAT_SHEET, isCatSheet } from "./catSheets";
import { sanitizeEquipped } from "./cosmetics";
import { COLLECTIONS, KNOWN_COSMETICS, TREASURE_BY_ID } from "./treasures";

export const SAVE_VERSION = 1;
export const HISTORY_MAX = 200;
export const MAX_COUNT = 9999;

export interface SaveSettings {
  clickThrough: boolean;
  soundEnabled: boolean;
  animationIntensity: "low" | "normal";
  catColor: string; // id of a sheet in catSheets.ts
  hideInFullscreen: boolean; // step aside while a fullscreen app (video, game) is in front
}

export interface HistoryEntry {
  itemId: string;
  at: number;
  away: boolean;
}

// A find the cat has left on the desktop, waiting to be picked up.
export interface PendingDrop {
  itemId: string;
  at: number;
}

export interface SaveData {
  version: number;
  savedAt: number;
  cat: { id: string; name: string; createdAt: number; lastActiveAt: number; traits: Traits };
  inventory: Record<string, number>;
  history: HistoryEntry[];
  totalDiscoveries: number;
  lastDiscoveryAt: number | null;
  pendingDrop: PendingDrop | null;
  unlockedCosmetics: string[];
  equippedCosmetics: string[]; // worn right now; always a subset of unlockedCosmetics, one per slot
  completedCollections: string[];
  settings: SaveSettings;
}

// What the control window needs to draw the collection; derived from the save, never saved itself.
export interface CollectionView {
  inventory: Record<string, number>;
  history: HistoryEntry[];
  completed: string[];
  unlocked: string[];
  equipped: string[];
  discoveries: number;
  pending: boolean; // something is waiting to be picked up
  note?: string;
}

export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
// Maps "from version" to a function producing the next version. Empty until the format changes.
export const MIGRATIONS: Record<number, Migration> = {};

export type ParseResult =
  | { ok: true; save: SaveData; migrated: boolean }
  | { ok: false; reason: string };

export interface ParseOptions {
  migrations?: Record<number, Migration>;
  target?: number;
}

export function defaultSave(now: number, id: string): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: now,
    cat: { id, name: "Mochi", createdAt: now, lastActiveAt: now, traits: { ...DEFAULT_TRAITS } },
    inventory: {},
    history: [],
    totalDiscoveries: 0,
    lastDiscoveryAt: null,
    pendingDrop: null,
    unlockedCosmetics: [],
    equippedCosmetics: [],
    completedCollections: [],
    settings: { clickThrough: false, soundEnabled: true, animationIntensity: "normal", catColor: DEFAULT_CAT_SHEET, hideInFullscreen: true },
  };
}

export function completedCollections(inventory: Record<string, number>): string[] {
  return COLLECTIONS.filter((c) => c.itemIds.every((id) => (inventory[id] ?? 0) > 0)).map((c) => c.id);
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}

export function collectionView(save: SaveData, note?: string): CollectionView {
  return {
    inventory: save.inventory,
    history: save.history.slice(-12),
    completed: save.completedCollections,
    unlocked: save.unlockedCosmetics,
    equipped: save.equippedCosmetics,
    discoveries: save.totalDiscoveries,
    pending: save.pendingDrop !== null,
    note,
  };
}

export function parseSave(text: string, now: number, opts: ParseOptions = {}): ParseResult {
  const migrations = opts.migrations ?? MIGRATIONS;
  const target = opts.target ?? SAVE_VERSION;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "The save file is not valid JSON." };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "The save file has an unexpected shape." };
  const startVersion = parsed.version;
  if (typeof startVersion !== "number" || !Number.isInteger(startVersion) || startVersion < 0) {
    return { ok: false, reason: "The save file has no valid version." };
  }
  if (startVersion > target) {
    return { ok: false, reason: "The save file comes from a newer version of Desktop Cat." };
  }
  let raw: Record<string, unknown> = parsed;
  let version = startVersion;
  while (version < target) {
    const step = migrations[version];
    if (!step) return { ok: false, reason: `No migration from save version ${version}.` };
    raw = { ...step(raw), version: version + 1 };
    version++;
  }
  return { ok: true, save: sanitize(raw, now, target), migrated: startVersion < target };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback: number, lo: number, hi: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

// Repairs what it can and drops what it can't, so one bad field never costs the player their collection.
function sanitize(raw: Record<string, unknown>, now: number, version: number): SaveData {
  const d = defaultSave(now, "cat");
  const catRaw = isRecord(raw.cat) ? raw.cat : {};
  const traitsRaw = isRecord(catRaw.traits) ? catRaw.traits : {};
  const traits = { ...DEFAULT_TRAITS };
  for (const k of Object.keys(traits) as (keyof Traits)[]) traits[k] = num(traitsRaw[k], traits[k], 0, 100);

  const name = typeof catRaw.name === "string" ? catRaw.name.trim().slice(0, 24) : "";
  const id = typeof catRaw.id === "string" && catRaw.id.length > 0 ? catRaw.id.slice(0, 64) : d.cat.id;

  const inventory: Record<string, number> = {};
  if (isRecord(raw.inventory)) {
    for (const [k, v] of Object.entries(raw.inventory)) {
      if (TREASURE_BY_ID.has(k) && typeof v === "number" && Number.isFinite(v) && v >= 1) {
        inventory[k] = Math.min(MAX_COUNT, Math.floor(v));
      }
    }
  }

  const history: HistoryEntry[] = [];
  if (Array.isArray(raw.history)) {
    for (const e of raw.history) {
      if (isRecord(e) && typeof e.itemId === "string" && TREASURE_BY_ID.has(e.itemId) && typeof e.at === "number" && Number.isFinite(e.at)) {
        history.push({ itemId: e.itemId, at: e.at, away: bool(e.away, false) });
      }
    }
  }

  const completed = completedCollections(inventory);
  const cosmetics = new Set<string>();
  if (Array.isArray(raw.unlockedCosmetics)) {
    for (const c of raw.unlockedCosmetics) if (typeof c === "string" && KNOWN_COSMETICS.has(c)) cosmetics.add(c);
  }
  for (const c of COLLECTIONS) if (completed.includes(c.id)) cosmetics.add(c.rewardCosmetic);

  const dropRaw = raw.pendingDrop;
  const pendingDrop =
    isRecord(dropRaw) && typeof dropRaw.itemId === "string" && TREASURE_BY_ID.has(dropRaw.itemId) && typeof dropRaw.at === "number" && Number.isFinite(dropRaw.at)
      ? { itemId: dropRaw.itemId, at: Math.min(dropRaw.at, now) }
      : null;
  const sum = Object.values(inventory).reduce((a, b) => a + b, 0);
  const settingsRaw = isRecord(raw.settings) ? raw.settings : {};

  return {
    version,
    savedAt: num(raw.savedAt, now, 0, now),
    cat: {
      id,
      name: name.length > 0 ? name : d.cat.name,
      createdAt: num(catRaw.createdAt, now, 0, now),
      lastActiveAt: num(catRaw.lastActiveAt, now, 0, now), // a clock set backwards must not create "time away"
      traits,
    },
    inventory,
    history: history.slice(-HISTORY_MAX),
    totalDiscoveries: Math.max(Math.floor(num(raw.totalDiscoveries, 0, 0, 1e9)), sum),
    lastDiscoveryAt: typeof raw.lastDiscoveryAt === "number" && Number.isFinite(raw.lastDiscoveryAt) ? Math.min(raw.lastDiscoveryAt, now) : null,
    pendingDrop,
    unlockedCosmetics: [...cosmetics],
    equippedCosmetics: sanitizeEquipped(raw.equippedCosmetics, [...cosmetics]),
    completedCollections: completed,
    settings: {
      clickThrough: bool(settingsRaw.clickThrough, false),
      soundEnabled: bool(settingsRaw.soundEnabled, true),
      animationIntensity: settingsRaw.animationIntensity === "low" ? "low" : "normal",
      catColor: isCatSheet(settingsRaw.catColor) ? settingsRaw.catColor : DEFAULT_CAT_SHEET,
      hideInFullscreen: bool(settingsRaw.hideInFullscreen, true),
    },
  };
}
