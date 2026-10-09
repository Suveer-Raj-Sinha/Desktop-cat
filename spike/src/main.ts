import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { CELL, cell, pixelScale } from "./simulation/animation";
import { CatEngine, INTERACTIONS } from "./simulation/catEngine";
import type { Interaction } from "./simulation/catEngine";
import { collectionView, defaultSave, serializeSave } from "./simulation/saveData";
import type { SaveData } from "./simulation/saveData";
import { AWAY_ROLL_MS, collectDrop, dropExpired, rollAway, startDrop, tryDiscover } from "./simulation/treasureSystem";
import { DROP_W, dropPosition, hitsDrop } from "./simulation/drops";
import { TREASURE_BY_ID, rarityTier } from "./simulation/treasures";
import { WriteScheduler, loadOrCreate, tauriStore } from "./services/persistence";

interface Settings {
  visible: boolean;
  paused: boolean;
  click_through: boolean;
}

interface CursorEvent {
  near: boolean;
  x: number; // CSS px, relative to the overlay window
  y: number;
}

const BASE = 23; // lowest opaque pixel row inside a 32x32 cell (measured from the art)
const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
const QMARK = [".XXX.", "X...X", "....X", "...X.", "..X..", ".....", "..X.."];
const STAR = ["..X..", ".XXX.", "XXXXX", ".XXX.", "..X.."];
const STAR_COLORS = ["", "#ffd54a", "#7fd6ff", "#e0a8ff"]; // by sparkle tier
const GEM = ["..XXX..", ".XXXXX.", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
const GEM_H = 6;
const BURST_MS = 700;
const HEART_MS = 1400;
const SIT_DONE_FRAME = 5; // the question mark appears once the cat has finished sitting down
const AWAY_GAP_MS = 5 * 60_000; // a gap this long while running (e.g. sleep) counts as time away
const PERIODIC_SAVE_MS = 5 * 60_000;

const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const img = new Image();
const engine = new CatEngine({
  random: Math.random,
  hour: () => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  },
});
let dpr = window.devicePixelRatio || 1;
let S = pixelScale(dpr); // whole physical pixels per sprite pixel
let settings: Settings = { visible: true, paused: false, click_through: false };
let last = performance.now();
let lastWall = Date.now();
let handle = 0;
let kind: "raf" | "timer" | "" = "";
let lastSent = "";
let seenHearts = 0;
let heartStart = -Infinity;
let statusKey = "";
let statusAt = 0;
let save: SaveData | null = null;
let writable = true;
let note: string | undefined;
let maxLogical = 0;
let drop: { itemId: string; x: number; tier: number } | null = null;
let burst: { x: number; tier: number; start: number } | null = null;

const scheduler = new WriteScheduler(tauriStore, snapshot, () => writable && save !== null);

function snapshot(): string {
  const now = Date.now();
  const s = save as SaveData;
  return serializeSave({ ...s, savedAt: now, cat: { ...s.cat, lastActiveAt: now, traits: engine.status.traits } });
}

function resize(): void {
  dpr = window.devicePixelRatio || 1;
  S = pixelScale(dpr);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.imageSmoothingEnabled = false;
  maxLogical = canvas.width / S - CELL;
  engine.setBounds(maxLogical);
  if (drop) drop.x = Math.min(drop.x, maxLogical + CELL - DROP_W);
  if (settings.visible) draw();
}

function top(): number {
  return canvas.height - S - (BASE + 1) * S;
}

function paint(rows: string[], x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === "X") ctx.fillRect(x + rx * S, y + ry * S, S, S);
    }
  });
}

function drawHeart(now: number): void {
  const age = now - heartStart;
  if (age < 0 || age >= HEART_MS) return;
  const rise = (age / HEART_MS) * 10;
  ctx.globalAlpha = 1 - age / HEART_MS;
  paint(HEART, Math.round((engine.state.x + 12) * S), Math.round(top() + S - rise * S), "#ff5d8f");
  ctx.globalAlpha = 1;
}

// A thinking "?" above the head while the cat ponders, with a dark outline so it shows on any wallpaper.
function drawQuestion(now: number): void {
  const s = engine.state;
  if (s.behavior !== "ponder" || s.frame < SIT_DONE_FRAME) return;
  const bob = Math.floor(now / 450) % 2; // hops one sprite pixel, slowly
  const qx = Math.round((s.x + CELL / 2 + s.dir * 6 - 2.5) * S);
  const qy = Math.round(top() + (-2 + bob) * S);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) paint(QMARK, qx + dx * S, qy + dy * S, "#2b2622");
  paint(QMARK, qx, qy, "#ffffff");
}

// Sparkles over the head when the cat finds something; brighter and busier for rarer finds.
function drawSparkle(now: number): void {
  const s = engine.state;
  if (s.behavior !== "discover" || s.discoverTier === 0) return;
  const tier = Math.min(3, s.discoverTier);
  const flick = Math.floor(now / 250) % 2;
  const cx = (s.x + CELL / 2 + s.dir * 5) * S;
  const spots: [number, number][] = [[-2.5, -4 - flick]];
  if (tier >= 2) spots.push([-8, -1 + flick], [3, -2 - flick]);
  if (tier >= 3) spots.push([-12, -6], [8, -7 + flick]);
  for (const [dx, dy] of spots) {
    const x = Math.round(cx + dx * S);
    const y = Math.round(top() + dy * S);
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) paint(STAR, x + ox * S, y + oy * S, "#2b2622");
    paint(STAR, x, y, STAR_COLORS[tier]);
  }
}

// The find waiting on the ground: a twinkling gem in the rarity colour (what it is gets revealed on pickup).
function drawDrop(now: number): void {
  if (!drop) return;
  const hop = Math.floor(now / 600) % 2;
  const x = Math.round(drop.x * S);
  const y = canvas.height - S - GEM_H * S - hop * S;
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) paint(GEM, x + ox * S, y + oy * S, "#2b2622");
  paint(GEM, x, y, STAR_COLORS[drop.tier]);
  if (Math.floor(now / 300) % 2 === 0) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 2 * S, y + S, S, S);
  }
}

function drawBurst(now: number): void {
  if (!burst) return;
  const age = now - burst.start;
  if (age >= BURST_MS) {
    burst = null;
    return;
  }
  const rise = (age / BURST_MS) * 14;
  ctx.globalAlpha = 1 - age / BURST_MS;
  for (const [dx, dy] of [[-6, 0], [0, -3], [6, 0]]) {
    paint(STAR, Math.round((burst.x + DROP_W / 2 - 2.5 + dx) * S), Math.round(canvas.height - S - (GEM_H + rise + dy) * S), STAR_COLORS[burst.tier]);
  }
  ctx.globalAlpha = 1;
}

function draw(): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = engine.state;
  const { sx, sy } = cell(s.anim, s.dir, s.frame);
  const now = performance.now();
  drawDrop(now);
  ctx.drawImage(img, sx, sy, CELL, CELL, Math.round(s.x * S), top(), CELL * S, CELL * S);
  drawHeart(now);
  drawQuestion(now);
  drawSparkle(now);
  drawBurst(now);
}

function emitStatus(force: boolean): void {
  const st = engine.status;
  const key = `${st.mood}|${st.behavior}|${Object.values(st.traits).map(Math.round).join(",")}`;
  const now = performance.now();
  if (!force && (key === statusKey || now - statusAt < 1000)) return;
  statusKey = key;
  statusAt = now;
  emit("cat-status", st).catch((e) => console.error(e));
}

function emitCollection(): void {
  if (!save) return;
  emit("cat-collection", collectionView(save, note)).catch((e) => console.error(e));
}

function syncEffects(): void {
  if (engine.state.hearts !== seenHearts) {
    seenHearts = engine.state.hearts;
    heartStart = performance.now();
  }
}

// Turns the engine's "the cat could find something now" moments into actual finds.
function handleEvents(): void {
  const events = engine.takeEvents();
  if (!save || save.pendingDrop) return; // one find waits at a time
  for (const ev of events) {
    const current = save;
    const id = tryDiscover(
      {
        source: ev.source,
        curiosity: engine.status.traits.curiosity,
        mood: engine.state.mood,
        now: Date.now(),
        lastDiscoveryAt: current.lastDiscoveryAt,
        totalDiscoveries: current.totalDiscoveries,
        hasItem: (i) => (current.inventory[i] ?? 0) > 0,
      },
      Math.random,
    );
    const treasure = id === null ? undefined : TREASURE_BY_ID.get(id);
    if (id === null || !treasure) continue;
    const tier = rarityTier(treasure.rarity);
    save = startDrop(current, id, Date.now());
    drop = { itemId: id, x: dropPosition(engine.state.x, engine.state.dir, maxLogical), tier };
    engine.startDiscovery(tier);
    scheduler.schedule();
    emitCollection();
    emitStatus(true);
    break;
  }
}

// Picking the find up (by click, or automatically after a while) adds it to the collection.
function collect(): void {
  if (!save) return;
  const r = collectDrop(save, Date.now());
  if (!r) return;
  save = r.save;
  if (drop) burst = { x: drop.x, tier: drop.tier, start: performance.now() };
  drop = null;
  scheduler.schedule();
  emitCollection();
  if (settings.visible && !settings.paused) wake();
}

// Puts a find that was waiting when the app last closed back on the ground (or collects it if it waited long enough).
function restoreDrop(): void {
  if (!save || !save.pendingDrop) return;
  if (dropExpired(save, Date.now())) {
    collect();
    return;
  }
  const t = TREASURE_BY_ID.get(save.pendingDrop.itemId);
  if (t) drop = { itemId: t.id, x: Math.random() * Math.max(0, maxLogical), tier: rarityTier(t.rarity) };
}

// Finds made while the app wasn't running (or the PC was asleep) go straight into the collection.
function applyAway(elapsedMs: number): void {
  if (!save || elapsedMs < AWAY_ROLL_MS) return;
  const result = rollAway(save, elapsedMs, Date.now(), Math.random);
  if (result.found.length === 0) return;
  save = result.save;
  scheduler.schedule();
  emitCollection();
}

function stop(): void {
  if (kind === "raf") cancelAnimationFrame(handle);
  else if (kind === "timer") clearTimeout(handle);
  kind = "";
  handle = 0;
}

function schedule(): void {
  const fx = performance.now() - heartStart < HEART_MS || burst !== null;
  if (engine.settled && !fx) {
    kind = "timer"; // nothing is changing: wake only a few times a second
    handle = window.setTimeout(() => tick(performance.now()), 250);
  } else {
    kind = "raf";
    handle = requestAnimationFrame(tick);
  }
}

function tick(ts: number): void {
  const wall = Date.now();
  if (wall - lastWall > AWAY_GAP_MS) applyAway(wall - lastWall); // e.g. the PC slept while we were "running"
  lastWall = wall;
  engine.step(ts - last);
  last = ts;
  syncEffects();
  handleEvents();
  draw();
  emitStatus(false);
  schedule();
}

function wake(): void {
  if (kind === "") return; // not running (hidden or paused)
  stop();
  last = performance.now();
  draw();
  schedule();
}

function act(a: Interaction): void {
  if (!settings.visible || settings.paused) return;
  engine.interact(a);
  syncEffects();
  wake();
  emitStatus(true);
  scheduler.schedule(); // traits change a little with interactions
}

function apply(s: Settings): void {
  settings = s;
  const running = s.visible && !s.paused;
  if (running && kind === "") {
    last = performance.now();
    lastWall = Date.now(); // paused or hidden time is not "time away"
    schedule();
  } else if (!running) {
    stop();
  }
  if (!s.visible) ctx.clearRect(0, 0, canvas.width, canvas.height);
  else if (!running) draw();
  if (save && save.settings.clickThrough !== s.click_through) {
    save = { ...save, settings: { ...save.settings, clickThrough: s.click_through } };
    scheduler.schedule();
  }
}

async function boot(): Promise<void> {
  const now = Date.now();
  const outcome = await loadOrCreate(tauriStore, now, () => crypto.randomUUID());
  save = outcome.save;
  writable = outcome.writable;
  note = outcome.note;
  engine.setTraits(save.cat.traits);
  if (save.settings.clickThrough && !settings.click_through) {
    invoke("apply_saved_settings", { clickThrough: true }).catch((e) => console.error(e));
  }
  if (outcome.status === "loaded") applyAway(now - save.cat.lastActiveAt);
  restoreDrop();
  scheduler.schedule();
  emitCollection();
}

async function resetAll(): Promise<void> {
  try {
    await tauriStore.reset();
  } catch (e) {
    note = `Could not reset the save file: ${String(e)}`;
    emitCollection();
    return;
  }
  drop = null;
  burst = null;
  save = defaultSave(Date.now(), crypto.randomUUID());
  save = { ...save, settings: { ...save.settings, clickThrough: settings.click_through } };
  writable = true;
  note = undefined;
  engine.setTraits(save.cat.traits);
  scheduler.schedule();
  emitCollection();
  emitStatus(true);
}

canvas.addEventListener("click", (e) => {
  if (drop) {
    const lx = (e.offsetX * dpr) / S;
    const up = (canvas.height - S - e.offsetY * dpr) / S;
    if (hitsDrop(drop.x, lx, up)) {
      collect();
      return;
    }
  }
  act("pet");
});
window.addEventListener("resize", resize);

// Commands from the control window are validated against fixed lists.
void listen<{ action: string }>("cat-action", (e) => {
  const a = INTERACTIONS.find((i) => i === e.payload.action);
  if (a) act(a);
});
void listen("cat-status-request", () => {
  emitStatus(true);
  emitCollection();
});
void listen<{ confirm: string }>("cat-reset", (e) => {
  if (e.payload.confirm === "RESET") void resetAll();
});
void listen("cat-before-quit", () => void scheduler.flush());

// Pointer position (read-only) from Rust while the pointer is near the strip.
void listen<CursorEvent>("cat-cursor", (e) => {
  if (!settings.visible || settings.paused) return;
  engine.setCursor(e.payload.near ? (e.payload.x * dpr) / S : null);
  if (kind === "timer") wake();
});

// Report the cat's rectangle (CSS px, window-relative) so Rust can toggle click-through. Only on change.
setInterval(() => {
  if (!settings.visible || settings.click_through) return;
  const rects = [{ x: (engine.state.x * S) / dpr, y: top() / dpr, w: (CELL * S) / dpr, h: (CELL * S) / dpr }];
  if (drop) {
    const hx = (drop.x - 4) * S;
    rects.push({ x: hx / dpr, y: (canvas.height - S - 14 * S) / dpr, w: ((DROP_W + 8) * S) / dpr, h: (16 * S) / dpr });
  }
  const key = rects.map((r) => `${Math.round(r.x)}|${Math.round(r.y)}|${Math.round(r.w)}`).join(";");
  if (key === lastSent) return;
  lastSent = key;
  invoke("set_hit_rects", { rects }).catch((e) => console.error(e));
}, 50);

// An unclaimed find is added to the collection after a couple of minutes, so nothing is ever lost.
setInterval(() => {
  if (save && dropExpired(save, Date.now())) collect();
}, 1000);

// Keeps "last active" fresh so time away is measured from the last moment the cat was running.
setInterval(() => scheduler.schedule(), PERIODIC_SAVE_MS);

resize();
void listen<Settings>("settings-changed", (e) => apply(e.payload));
img.onload = () => {
  void boot();
  void invoke<Settings>("get_settings").then(apply);
};
img.src = "/cat.png";
