import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { CELL, pixelScale } from "./simulation/animation";
import { CatPainter } from "./render/catPainter";
import { cosmeticById, equipCosmetic, unequipCosmetic } from "./simulation/cosmetics";
import { CatEngine, INTERACTIONS } from "./simulation/catEngine";
import type { Interaction } from "./simulation/catEngine";
import { collectionView, defaultSave, serializeSave } from "./simulation/saveData";
import type { SaveData, SaveSettings } from "./simulation/saveData";
import { DEFAULT_CAT_SHEET, isCatSheet } from "./simulation/catSheets";
import { perchZone } from "./simulation/platform";
import type { PlatformInfo } from "./simulation/platform";
import { pushActivity } from "./simulation/activity";
import type { ActivityEntry } from "./simulation/activity";
import { createSoundPlayer } from "./services/sound";
import { AWAY_ROLL_MS, collectDrop, dropExpired, rollAway, startDrop, tryDiscover } from "./simulation/treasureSystem";
import { DROP_W, dropPosition, hitsDrop } from "./simulation/drops";
import { COLLECTIONS, TREASURE_BY_ID, rarityTier } from "./simulation/treasures";
import { WriteScheduler, loadOrCreate, tauriStore } from "./services/persistence";

interface Settings {
  visible: boolean;
  paused: boolean;
  click_through: boolean;
  auto_hidden: boolean; // stepped aside because a fullscreen app is in front
  hide_in_fullscreen: boolean;
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
const REVEAL_MS = 2600;
const HEART_MS = 1400;
const SIT_DONE_FRAME = 5; // the question mark appears once the cat has finished sitting down
const AWAY_GAP_MS = 5 * 60_000; // a gap this long while running (e.g. sleep) counts as time away
const PERIODIC_SAVE_MS = 5 * 60_000;

const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
let img = new Image();
let sheetId = DEFAULT_CAT_SHEET;
const engine = new CatEngine({
  random: Math.random,
  hour: () => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  },
});
let dpr = window.devicePixelRatio || 1;
let S = pixelScale(dpr); // whole physical pixels per sprite pixel
let settings: Settings = { visible: true, paused: false, click_through: false, auto_hidden: false, hide_in_fullscreen: true };
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
let reveal: { text: string; x: number; tier: number; start: number } | null = null;
let activity: ActivityEntry[] = [];
const painter = new CatPainter();
const sound = createSoundPlayer(() => save?.settings.soundEnabled ?? false);

const scheduler = new WriteScheduler(tauriStore, snapshot, () => writable && save !== null);

function snapshot(): string {
  const now = Date.now();
  const s = save as SaveData;
  return serializeSave({ ...s, savedAt: now, cat: { ...s.cat, lastActiveAt: now, traits: engine.status.traits } });
}

const catName = (): string => save?.cat.name ?? "The cat";

function log(icon: string, text: string): void {
  activity = pushActivity(activity, { at: Date.now(), icon, text });
  emit("cat-activity", activity).catch((e) => console.error(e));
}

function loadSheet(id: string): Promise<void> {
  return new Promise((resolve) => {
    const next = new Image();
    next.onload = () => {
      img = next;
      sheetId = id;
      resolve();
    };
    next.onerror = () => resolve(); // keep whatever is showing
    next.src = `/cats/${id}.png`;
  });
}

function applyPrefs(): void {
  if (!save) return;
  engine.setIntensity(save.settings.animationIntensity);
  invoke("set_hide_in_fullscreen", { enabled: save.settings.hideInFullscreen }).catch((e) => console.error(e));
  if (save.settings.catColor !== sheetId) {
    void loadSheet(save.settings.catColor).then(() => {
      if (settings.visible) draw();
    });
  }
}

function emitPrefs(): void {
  if (save) emit("cat-prefs", save.settings).catch((e) => console.error(e));
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

// Reveals what was picked up, right where the gem was.
function drawReveal(now: number): void {
  if (!reveal) return;
  const age = now - reveal.start;
  if (age >= REVEAL_MS) {
    reveal = null;
    return;
  }
  ctx.globalAlpha = age > REVEAL_MS - 500 ? (REVEAL_MS - age) / 500 : 1;
  ctx.font = `${Math.round(3.6 * S)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  const w = ctx.measureText(reveal.text).width;
  const pad = 2 * S;
  const h = 6 * S;
  const x = Math.max(S, Math.min(canvas.width - w - pad * 2 - S, (reveal.x + DROP_W / 2) * S - w / 2 - pad));
  const y = canvas.height - S - (GEM_H + 3) * S - h;
  ctx.fillStyle = "rgba(43, 38, 34, 0.88)";
  ctx.fillRect(x, y, w + pad * 2, h);
  ctx.fillStyle = STAR_COLORS[reveal.tier];
  ctx.fillRect(x, y, S, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(reveal.text, x + pad, y + h / 2);
  ctx.globalAlpha = 1;
}

function draw(): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = engine.state;
  const now = performance.now();
  drawDrop(now);
  painter.paint(ctx, img, s.anim, s.dir, s.frame, Math.round(s.x * S), top(), S, save?.equippedCosmetics ?? []);
  drawHeart(now);
  drawQuestion(now);
  drawSparkle(now);
  drawBurst(now);
  drawReveal(now);
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
    sound.play("pet");
    log("💗", `You petted ${catName()}`);
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
    sound.play("discover");
    log("✨", `${catName()} found something shiny`);
    scheduler.schedule();
    emitCollection();
    emitStatus(true);
    break;
  }
}

// Picking the find up (by click, or automatically after a while) adds it to the collection.
function collect(byUser: boolean): void {
  if (!save) return;
  const treasure = save.pendingDrop ? TREASURE_BY_ID.get(save.pendingDrop.itemId) : undefined;
  const r = collectDrop(save, Date.now());
  if (!r) return;
  save = r.save;
  if (drop) burst = { x: drop.x, tier: drop.tier, start: performance.now() };
  if (byUser && drop && treasure) reveal = { text: `${treasure.icon} ${treasure.name}`, x: drop.x, tier: drop.tier, start: performance.now() };
  if (byUser) sound.play("collect");
  if (treasure) log(treasure.icon, `Added ${treasure.name} to the collection`);
  for (const id of r.newCollections) {
    const c = COLLECTIONS.find((x) => x.id === id);
    if (c) log("🎁", `Completed ${c.name}: unlocked ${c.rewardName}`);
  }
  drop = null;
  scheduler.schedule();
  emitCollection();
  if (settings.visible && !settings.paused) wake();
}

// Puts a find that was waiting when the app last closed back on the ground (or collects it if it waited long enough).
function restoreDrop(): void {
  if (!save || !save.pendingDrop) return;
  if (dropExpired(save, Date.now())) {
    collect(false);
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
  const n = result.found.length;
  log("🌙", `${catName()} found ${n} thing${n === 1 ? "" : "s"} while you were away`);
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
  const fx = performance.now() - heartStart < HEART_MS || burst !== null || reveal !== null;
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
  if (!settings.visible || settings.paused || settings.auto_hidden) return;
  engine.interact(a);
  if (a === "play") log("🏃", `${catName()} went for a run`);
  else if (a === "inspect") log("🔍", `${catName()} went to investigate`);
  syncEffects();
  wake();
  emitStatus(true);
  scheduler.schedule(); // traits change a little with interactions
}

function apply(s: Settings): void {
  settings = s;
  const running = s.visible && !s.paused && !s.auto_hidden;
  if (running && kind === "") {
    last = performance.now();
    lastWall = Date.now(); // paused or hidden time is not "time away"
    schedule();
  } else if (!running) {
    stop();
  }
  if (!s.visible || s.auto_hidden) ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  applyPrefs();
  await loadSheet(save.settings.catColor); // wait, so the cat never flashes the wrong colour
  if (save.settings.clickThrough && !settings.click_through) {
    invoke("apply_saved_settings", { clickThrough: true }).catch((e) => console.error(e));
  }
  if (outcome.status === "loaded") applyAway(now - save.cat.lastActiveAt);
  restoreDrop();
  scheduler.schedule();
  emitCollection();
  emitPrefs();
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
  const keep: SaveSettings = { ...(save ? save.settings : defaultSave(0, "x").settings), clickThrough: settings.click_through }; // preferences survive a reset
  save = { ...defaultSave(Date.now(), crypto.randomUUID()), settings: keep };
  activity = [];
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
      collect(true);
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
  emitPrefs();
  emit("cat-activity", activity).catch((e) => console.error(e));
});
void listen<{ id: string; equipped: boolean }>("cat-equip", (e) => {
  if (!save || typeof e.payload.id !== "string" || typeof e.payload.equipped !== "boolean") return;
  const c = cosmeticById(e.payload.id);
  if (!c) return;
  const before = save.equippedCosmetics;
  const after = e.payload.equipped ? equipCosmetic(before, c.id, save.unlockedCosmetics) : unequipCosmetic(before, c.id);
  if (after.join() === before.join()) return;
  save = { ...save, equippedCosmetics: after };
  if (e.payload.equipped) log(c.icon, `${catName()} put on the ${c.name}`);
  scheduler.schedule();
  emitCollection();
  if (settings.visible) draw();
});
void listen<{ key: string; value: unknown }>("cat-pref", (e) => {
  if (!save) return;
  const { key, value } = e.payload;
  const s = save.settings;
  let next: SaveSettings | null = null;
  if (key === "soundEnabled" && typeof value === "boolean") next = { ...s, soundEnabled: value };
  else if (key === "animationIntensity" && (value === "low" || value === "normal")) next = { ...s, animationIntensity: value };
  else if (key === "catColor" && isCatSheet(value)) next = { ...s, catColor: value };
  else if (key === "hideInFullscreen" && typeof value === "boolean") next = { ...s, hideInFullscreen: value };
  if (!next) return;
  save = { ...save, settings: next };
  applyPrefs();
  scheduler.schedule();
  emitPrefs();
});
void listen<{ confirm: string }>("cat-reset", (e) => {
  if (e.payload.confirm === "RESET") void resetAll();
});
void listen("cat-before-quit", () => void scheduler.flush());

// Pointer position (read-only) from Rust while the pointer is near the strip.
void listen<CursorEvent>("cat-cursor", (e) => {
  if (!settings.visible || settings.paused || settings.auto_hidden) return;
  engine.setCursor(e.payload.near ? (e.payload.x * dpr) / S : null);
  if (kind === "timer") wake();
});

// Report the cat's rectangle (CSS px, window-relative) so Rust can toggle click-through. Only on change.
setInterval(() => {
  if (!settings.visible || settings.click_through || settings.auto_hidden) return;
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
  if (save && dropExpired(save, Date.now())) collect(false);
}, 1000);

// Keeps "last active" fresh so time away is measured from the last moment the cat was running.
setInterval(() => scheduler.schedule(), PERIODIC_SAVE_MS);

// Aim the "ponder over the icons" spot at wherever the taskbar icons really are.
function applyPlatform(info: PlatformInfo): void {
  const [lo, hi] = perchZone(info);
  engine.setPerch(lo, hi);
}

resize();
void listen<PlatformInfo>("platform-changed", (e) => applyPlatform(e.payload));
void invoke<PlatformInfo>("get_platform_info").then(applyPlatform).catch((e) => console.error(e));
void listen<Settings>("settings-changed", (e) => apply(e.payload));
void (async () => {
  try {
    await boot();
  } catch (e) {
    console.error(e);
    await loadSheet(DEFAULT_CAT_SHEET);
  }
  apply(await invoke<Settings>("get_settings"));
})();
