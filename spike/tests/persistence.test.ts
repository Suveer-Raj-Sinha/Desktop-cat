import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WriteScheduler, loadOrCreate } from "../src/services/persistence";
import type { SaveStore } from "../src/services/persistence";
import { defaultSave, serializeSave } from "../src/simulation/saveData";

const NOW = 1_800_000_000_000;

function fakeStore(over: Partial<SaveStore> = {}): SaveStore & { saved: string[]; quarantined: number } {
  const store = {
    saved: [] as string[],
    quarantined: 0,
    load: async (): Promise<string | null> => null,
    save: async (d: string): Promise<void> => { store.saved.push(d); },
    reset: async (): Promise<void> => {},
    quarantine: async (): Promise<void> => { store.quarantined++; },
    ...over,
  };
  return store;
}

describe("loading", () => {
  it("creates a fresh save on first launch", async () => {
    const r = await loadOrCreate(fakeStore(), NOW, () => "id1");
    expect(r.status).toBe("created");
    expect(r.writable).toBe(true);
    expect(r.save.cat.id).toBe("id1");
  });

  it("loads a valid save", async () => {
    const s = { ...defaultSave(NOW - 1000, "old"), inventory: { coin: 2 }, totalDiscoveries: 2 };
    const r = await loadOrCreate(fakeStore({ load: async () => serializeSave(s) }), NOW, () => "new");
    expect(r.status).toBe("loaded");
    expect(r.save.cat.id).toBe("old");
    expect(r.save.inventory.coin).toBe(2);
  });

  it("sets an unusable save aside and starts fresh", async () => {
    const store = fakeStore({ load: async () => "{broken" });
    const r = await loadOrCreate(store, NOW, () => "fresh");
    expect(r.status).toBe("recovered");
    expect(r.writable).toBe(true);
    expect(r.note).toBeTruthy();
    expect(store.quarantined).toBe(1);
  });

  it("does not overwrite a save it could not read or set aside", async () => {
    const unreadable = await loadOrCreate(fakeStore({ load: async () => { throw new Error("denied"); } }), NOW, () => "x");
    expect(unreadable.writable).toBe(false);
    const stuck = await loadOrCreate(fakeStore({ load: async () => "nope", quarantine: async () => { throw new Error("locked"); } }), NOW, () => "x");
    expect(stuck.writable).toBe(false);
  });
});

describe("write scheduler", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("coalesces many changes into one write", async () => {
    const store = fakeStore();
    let n = 0;
    const sch = new WriteScheduler(store, () => `{"n":${++n}}`, () => true, 2000);
    for (let i = 0; i < 50; i++) sch.schedule();
    expect(store.saved.length).toBe(0);
    await vi.advanceTimersByTimeAsync(1999);
    expect(store.saved.length).toBe(0);
    await vi.advanceTimersByTimeAsync(2);
    expect(store.saved).toEqual(['{"n":1}']);
    await vi.advanceTimersByTimeAsync(10000);
    expect(store.saved.length).toBe(1); // nothing new to write
  });

  it("writes immediately on flush and does not write twice", async () => {
    const store = fakeStore();
    const sch = new WriteScheduler(store, () => "{}", () => true, 2000);
    sch.schedule();
    await sch.flush();
    expect(store.saved.length).toBe(1);
    await sch.flush();
    await vi.advanceTimersByTimeAsync(5000);
    expect(store.saved.length).toBe(1);
  });

  it("never writes while writing is disallowed", async () => {
    const store = fakeStore();
    const sch = new WriteScheduler(store, () => "{}", () => false, 1000);
    sch.schedule();
    await vi.advanceTimersByTimeAsync(5000);
    await sch.flush();
    expect(store.saved.length).toBe(0);
  });

  it("tries again after a failed write", async () => {
    let fail = true;
    const store = fakeStore({ save: async (d) => { if (fail) throw new Error("disk full"); store2.push(d); } });
    const store2: string[] = [];
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const sch = new WriteScheduler(store, () => "{}", () => true, 1000);
    sch.schedule();
    await vi.advanceTimersByTimeAsync(1100);
    expect(store2.length).toBe(0);
    fail = false;
    await vi.advanceTimersByTimeAsync(1100);
    expect(store2).toEqual(["{}"]);
    err.mockRestore();
  });
});
