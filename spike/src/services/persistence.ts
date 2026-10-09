import { invoke } from "@tauri-apps/api/core";
import { defaultSave, parseSave } from "../simulation/saveData";
import type { SaveData } from "../simulation/saveData";

// Rust owns the file; this is the only place the page talks to it.
export interface SaveStore {
  load(): Promise<string | null>;
  save(data: string): Promise<void>;
  reset(): Promise<void>;
  quarantine(): Promise<void>;
}

export const tauriStore: SaveStore = {
  load: () => invoke<string | null>("load_game"),
  save: (data) => invoke<void>("save_game", { data }),
  reset: () => invoke<void>("reset_game"),
  quarantine: () => invoke<void>("quarantine_save"),
};

export interface LoadOutcome {
  save: SaveData;
  status: "loaded" | "created" | "recovered";
  migrated: boolean;
  writable: boolean; // false when the file exists but could not be read: don't overwrite it
  note?: string;
}

export async function loadOrCreate(store: SaveStore, now: number, newId: () => string): Promise<LoadOutcome> {
  let text: string | null;
  try {
    text = await store.load();
  } catch (e) {
    return { save: defaultSave(now, newId()), status: "created", migrated: false, writable: false, note: `Could not read the save file: ${String(e)}` };
  }
  if (text === null) return { save: defaultSave(now, newId()), status: "created", migrated: false, writable: true };
  const parsed = parseSave(text, now);
  if (parsed.ok) return { save: parsed.save, status: "loaded", migrated: parsed.migrated, writable: true };
  let writable = true;
  try {
    await store.quarantine(); // keep the unreadable file aside instead of overwriting it
  } catch {
    writable = false;
  }
  return { save: defaultSave(now, newId()), status: "recovered", migrated: false, writable, note: parsed.reason };
}

// Coalesces changes into at most one write per delay. Never called per frame.
export class WriteScheduler {
  private store: SaveStore;
  private snapshot: () => string;
  private canWrite: () => boolean;
  private delay: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor(store: SaveStore, snapshot: () => string, canWrite: () => boolean, delayMs = 2000) {
    this.store = store;
    this.snapshot = snapshot;
    this.canWrite = canWrite;
    this.delay = delayMs;
  }

  schedule(): void {
    this.dirty = true;
    if (this.timer === null) this.timer = setTimeout(() => void this.flush(), this.delay);
  }

  async flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty || !this.canWrite()) return;
    this.dirty = false;
    try {
      await this.store.save(this.snapshot());
    } catch (e) {
      console.error("save failed", e);
      this.schedule(); // try again later
    }
  }
}
