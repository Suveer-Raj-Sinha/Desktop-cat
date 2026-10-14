import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import type { CatStatus, Mood, Behavior } from "./simulation/catEngine";
import type { ActivityEntry } from "./simulation/activity";
import type { CollectionView, SaveSettings } from "./simulation/saveData";
import { CAT_SHEETS } from "./simulation/catSheets";
import { COLLECTIONS, TREASURES, TREASURE_BY_ID } from "./simulation/treasures";
import { COSMETICS, OUTFIT_MARGIN } from "./simulation/cosmetics";
import { CatPainter } from "./render/catPainter";
import { CELL, pixelScale } from "./simulation/animation";

interface Settings {
  visible: boolean;
  paused: boolean;
  click_through: boolean;
  auto_hidden: boolean;
  hide_in_fullscreen: boolean;
}

type Page = "home" | "collection" | "appearance" | "settings";
const PAGES: Page[] = ["home", "collection", "appearance", "settings"];

const MOOD_EMOJI: Record<Mood, string> = { happy: "😊", curious: "🧐", sleepy: "😴", playful: "😸", grumpy: "😾" };
const DOING: Record<Behavior, string> = {
  idle: "relaxing",
  walk: "wandering around",
  look: "looking around",
  nap: "having a nap",
  play: "zooming about",
  celebrate: "feeling loved",
  ponder: "pondering something",
  discover: "found something!",
};
const TRAITS: [keyof CatStatus["traits"], string][] = [
  ["curiosity", "Curiosity"],
  ["playfulness", "Playfulness"],
  ["affection", "Affection"],
  ["laziness", "Laziness"],
  ["mischief", "Mischief"],
];

const el = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const input = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement;

function make(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function ago(at: number): string {
  const m = Math.round((Date.now() - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

// ---------- pages, toast, connection ----------
let connected = false;
let equipped: string[] = [];
let colorId = "black_0";
let sheetImg: HTMLImageElement | null = null;
const painter = new CatPainter();
let seenLatest: number | null = null;
let seenCompleted: string[] | null = null;
let toastTimer = 0;

function showPage(p: Page): void {
  for (const name of PAGES) {
    el(`page-${name}`).classList.toggle("active", name === p);
  }
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) => t.classList.toggle("active", t.dataset.page === p));
  el("page-" + p).scrollIntoView({ block: "start" });
}

function toast(text: string): void {
  const t = el("toast");
  t.textContent = text;
  t.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove("show"), 3500);
}

function setConnected(): void {
  connected = true;
  el("banner").hidden = true;
  el("conn").textContent = "● Connected";
}

function showDisconnected(): void {
  if (connected) return;
  const b = el("banner");
  b.hidden = false;
  b.className = "error";
  b.textContent = "Can't reach the cat. If Desktop Cat is running, close this window and open the control panel again from the tray icon.";
  el("conn").textContent = "○ Not connected";
}

// ---------- rendering ----------
function renderSettings(s: Settings): void {
  input("sVisible").checked = s.visible;
  input("sPaused").checked = s.paused;
  input("sCt").checked = s.click_through;
  const idle = !s.visible || s.paused || s.auto_hidden;
  for (const id of ["pet", "play", "inspect"]) (el(id) as HTMLButtonElement).disabled = idle;
  el("idleHint").hidden = !idle;
  el("idleHint").textContent = s.auto_hidden ? "The cat is out of the way while a fullscreen app is in front." : "The cat is hidden or paused, so it can't play right now.";
}

// A small portrait of the cat as it looks right now (fur colour and what it's wearing).
function drawPreview(): void {
  const canvas = el("preview") as HTMLCanvasElement;
  const dpr = window.devicePixelRatio || 1;
  const S = pixelScale(dpr, 4);
  const size = (CELL + 2 * OUTFIT_MARGIN) * S;
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size / dpr}px`;
  canvas.style.height = `${size / dpr}px`;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  if (sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0) {
    painter.paint(ctx, sheetImg, "sit", 1, 5, OUTFIT_MARGIN * S, OUTFIT_MARGIN * S, S, equipped);
  }
}

function loadPreviewSheet(id: string): void {
  const next = new Image();
  next.onload = () => {
    sheetImg = next;
    drawPreview();
  };
  next.src = `/cats/${id}.png`;
}

function renderPrefs(p: SaveSettings): void {
  if (p.catColor !== colorId || sheetImg === null) {
    colorId = p.catColor;
    loadPreviewSheet(p.catColor);
  }
  input("sSound").checked = p.soundEnabled;
  input("sFs").checked = p.hideInFullscreen;
  document.querySelectorAll<HTMLButtonElement>("#sIntensity button").forEach((b) => b.classList.toggle("on", b.dataset.v === p.animationIntensity));
  document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((b) => {
    const on = b.dataset.id === p.catColor;
    b.classList.toggle("sel", on);
    b.setAttribute("aria-pressed", String(on));
  });
}

function renderStatus(st: CatStatus): void {
  setConnected();
  el("moodEmoji").textContent = MOOD_EMOJI[st.mood];
  el("catDoing").textContent = `Feeling ${st.mood}, ${DOING[st.behavior]}`;
  const box = el("traits");
  box.replaceChildren();
  for (const [key, label] of TRAITS) {
    const v = Math.round(st.traits[key]);
    const row = make("div", "trait");
    row.appendChild(make("span", undefined, label));
    const bar = make("div", "bar");
    const fill = make("i");
    fill.style.width = `${v}%`;
    bar.appendChild(fill);
    row.appendChild(bar);
    row.appendChild(make("span", "muted", String(v)));
    box.appendChild(row);
  }
}

function renderActivity(list: ActivityEntry[]): void {
  const box = el("activity");
  box.replaceChildren();
  if (list.length === 0) {
    box.appendChild(make("div", "empty", "Nothing yet. Say hello!"));
    return;
  }
  for (const a of [...list].reverse().slice(0, 8)) {
    const row = make("div", "line");
    row.appendChild(make("span", undefined, `${a.icon} ${a.text}`));
    row.appendChild(make("span", undefined, ago(a.at)));
    box.appendChild(row);
  }
}

function renderCollection(v: CollectionView): void {
  el("pending").hidden = !v.pending;
  el("note").textContent = v.note ?? "";
  const found = TREASURES.filter((t) => (v.inventory[t.id] ?? 0) > 0).length;
  el("progressText").textContent = `${found} of ${TREASURES.length} treasures found  ·  ${v.discoveries} finds in total`;
  (el("progressBar") as HTMLElement).style.width = `${Math.round((found / TREASURES.length) * 100)}%`;

  const grid = el("grid");
  grid.replaceChildren();
  for (const t of TREASURES) {
    const count = v.inventory[t.id] ?? 0;
    if (count > 0) {
      const c = make("div", `cell r-${t.rarity}`, t.icon);
      c.title = `${t.name} (${t.rarity}): ${t.description}`;
      if (count > 1) c.appendChild(make("span", "n", `×${count}`));
      grid.appendChild(c);
    } else {
      const c = make("div", `cell unknown r-${t.rarity}`, "❔");
      c.title = `Not found yet (${t.rarity})`;
      grid.appendChild(c);
    }
  }

  const cols = el("collections");
  cols.replaceChildren();
  equipped = [...v.equipped];
  drawPreview();
  for (const c of COLLECTIONS) {
    const have = c.itemIds.filter((id) => (v.inventory[id] ?? 0) > 0).length;
    const done = v.completed.includes(c.id);
    const set = make("div", "card set");
    const top = make("div", "top");
    top.appendChild(make("b", undefined, c.name));
    top.appendChild(make("span", "muted", done ? `${c.rewardIcon} ${c.rewardName} unlocked` : `${have}/${c.itemIds.length}`));
    set.appendChild(top);
    const bar = make("div", "bar");
    const fill = make("i");
    fill.style.width = `${Math.round((have / c.itemIds.length) * 100)}%`;
    bar.appendChild(fill);
    set.appendChild(bar);
    set.appendChild(make("div", "muted", c.itemIds.map((id) => ((v.inventory[id] ?? 0) > 0 ? TREASURE_BY_ID.get(id)?.icon ?? "" : "❔")).join(" ")));
    cols.appendChild(set);
  }

  const cosmetics = el("cosmetics");
  cosmetics.replaceChildren();
  for (const c of COSMETICS) {
    const owned = v.unlocked.includes(c.id);
    const worn = v.equipped.includes(c.id);
    const source = COLLECTIONS.find((x) => x.rewardCosmetic === c.id);
    const row = make("div", "cosrow");
    const label = make("div");
    label.appendChild(make("b", undefined, `${c.icon} ${c.name}`));
    label.appendChild(make("div", "muted", owned ? `Worn on the ${c.slot}` : `Complete ${source?.name ?? "a set"} to unlock`));
    row.appendChild(label);
    if (owned) {
      const b = make("button", "btn", worn ? "Remove" : "Wear") as HTMLButtonElement;
      b.addEventListener("click", () => emit("cat-equip", { id: c.id, equipped: !worn }).catch((e) => console.error(e)));
      row.appendChild(b);
    }
    cosmetics.appendChild(row);
  }

  const recent = el("recent");
  recent.replaceChildren();
  const items = [...v.history].reverse().slice(0, 8);
  if (items.length === 0) recent.appendChild(make("div", "empty", "Nothing yet. Your cat is looking."));
  for (const h of items) {
    const t = TREASURE_BY_ID.get(h.itemId);
    if (!t) continue;
    const row = make("div", "line");
    row.appendChild(make("span", undefined, `${t.icon} ${t.name} (${t.rarity})`));
    row.appendChild(make("span", undefined, `${h.away ? "while you were away · " : ""}${ago(h.at)}`));
    recent.appendChild(row);
  }

  // Gentle notifications for new finds and unlocked rewards (not on the first update).
  const latest = v.history.length > 0 ? v.history[v.history.length - 1] : null;
  if (seenLatest !== null && latest && latest.at > seenLatest && !latest.away) {
    const t = TREASURE_BY_ID.get(latest.itemId);
    if (t) toast(`${t.icon} ${t.name} added to your collection`);
  }
  seenLatest = latest ? latest.at : 0;
  if (seenCompleted !== null) {
    const fresh = v.completed.find((id) => !seenCompleted?.includes(id));
    const c = COLLECTIONS.find((x) => x.id === fresh);
    if (c) toast(`${c.rewardIcon} ${c.name} complete: ${c.rewardName} unlocked!`);
  }
  seenCompleted = [...v.completed];
}

function buildSwatches(): void {
  const box = el("swatches");
  for (const s of CAT_SHEETS) {
    const b = make("button", "swatch") as HTMLButtonElement;
    b.dataset.id = s.id;
    b.title = s.label;
    b.setAttribute("aria-label", s.label);
    const art = make("i");
    // The cat standing, facing right (frame at column 12, row 12 of the sheet), shown at 2x.
    art.style.background = `url(/cats/${s.id}.png) -768px -768px / 1536px 1024px`;
    b.appendChild(art);
    b.appendChild(make("span", undefined, s.label));
    b.addEventListener("click", () => pref("catColor", s.id));
    box.appendChild(b);
  }
}

// ---------- actions ----------
function toggle(what: "visible" | "paused" | "click_through"): void {
  invoke("toggle_setting", { what }).catch((e) => console.error(e));
}

function action(a: "pet" | "play" | "inspect"): void {
  emit("cat-action", { action: a }).catch((e) => console.error(e));
}

function pref(key: string, value: unknown): void {
  emit("cat-pref", { key, value }).catch((e) => console.error(e));
}

async function setAutostart(enabled: boolean): Promise<void> {
  el("autoNote").textContent = "";
  try {
    await invoke("set_autostart", { enabled });
  } catch (e) {
    input("sAuto").checked = !enabled;
    el("autoNote").textContent = `Couldn't change this: ${String(e)}`;
  }
}

// ---------- wiring ----------
document.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) => t.addEventListener("click", () => showPage(t.dataset.page as Page)));
for (const id of ["pet", "play", "inspect"]) el(id).addEventListener("click", () => action(id as "pet" | "play" | "inspect"));
input("sVisible").addEventListener("change", () => toggle("visible"));
input("sPaused").addEventListener("change", () => toggle("paused"));
input("sCt").addEventListener("change", () => toggle("click_through"));
input("sFs").addEventListener("change", (e) => pref("hideInFullscreen", (e.target as HTMLInputElement).checked));
input("sSound").addEventListener("change", (e) => pref("soundEnabled", (e.target as HTMLInputElement).checked));
input("sAuto").addEventListener("change", (e) => void setAutostart((e.target as HTMLInputElement).checked));
document.querySelectorAll<HTMLButtonElement>("#sIntensity button").forEach((b) => b.addEventListener("click", () => pref("animationIntensity", b.dataset.v)));

const resetText = input("resetText");
const resetBtn = el("reset") as HTMLButtonElement;
resetText.addEventListener("input", () => { resetBtn.disabled = resetText.value !== "RESET"; });
resetBtn.addEventListener("click", () => {
  if (resetText.value !== "RESET") return;
  emit("cat-reset", { confirm: "RESET" }).catch((e) => console.error(e));
  resetText.value = "";
  resetBtn.disabled = true;
  toast("Progress erased. A fresh start!");
});
el("quit").addEventListener("click", () => { invoke("quit_app").catch((e) => console.error(e)); });

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target as HTMLElement;
  if (t.tagName === "INPUT" && (t as HTMLInputElement).type === "text") return;
  const k = e.key.toLowerCase();
  const n = Number(k);
  if (n >= 1 && n <= PAGES.length) showPage(PAGES[n - 1]);
  else if (k === "p") action("pet");
  else if (k === "l") action("play");
  else if (k === "i") action("inspect");
  else if (k === "h") toggle("visible");
});

buildSwatches();
void listen<Settings>("settings-changed", (e) => renderSettings(e.payload));
void listen<CatStatus>("cat-status", (e) => renderStatus(e.payload));
void listen<CollectionView>("cat-collection", (e) => { setConnected(); renderCollection(e.payload); });
void listen<SaveSettings>("cat-prefs", (e) => renderPrefs(e.payload));
void listen<ActivityEntry[]>("cat-activity", (e) => renderActivity(e.payload));
void invoke<Settings>("get_settings").then(renderSettings);
void invoke<boolean>("get_autostart").then((v) => { input("sAuto").checked = v; }).catch(() => { el("autoNote").textContent = "Startup setting isn't available."; });
el("catName").textContent = "Mochi";

// Ask for the cat's state; retry a few times in case the overlay is still starting.
let tries = 0;
const ask = window.setInterval(() => {
  if (connected || tries++ >= 5) {
    window.clearInterval(ask);
    if (!connected) showDisconnected();
    return;
  }
  void emit("cat-status-request");
}, 1000);
void emit("cat-status-request");
