import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import type { CatStatus } from "./simulation/catEngine";
import type { CollectionView } from "./simulation/saveData";
import { COLLECTIONS, TREASURES, TREASURE_BY_ID } from "./simulation/treasures";

interface Settings {
  visible: boolean;
  paused: boolean;
  click_through: boolean;
}

const el = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const buttons = ["pet", "play", "inspect"].map((id) => el(id) as HTMLButtonElement);

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

function renderSettings(s: Settings): void {
  el("vis").textContent = s.visible ? "Hide cat" : "Show cat";
  el("pause").textContent = s.paused ? "Resume" : "Pause";
  el("ct").textContent = s.click_through ? "Switch to interactive mode" : "Switch to click-through mode";
  el("st").textContent = `visible: ${s.visible}   paused: ${s.paused}   click-through: ${s.click_through}`;
  const idle = !s.visible || s.paused;
  buttons.forEach((b) => { b.disabled = idle; });
}

function renderStatus(st: CatStatus): void {
  el("cat").textContent = `Mood: ${st.mood}   ·   Doing: ${st.behavior}`;
  const t = st.traits;
  el("traits").textContent =
    `curiosity ${Math.round(t.curiosity)}  playfulness ${Math.round(t.playfulness)}  affection ${Math.round(t.affection)}\n` +
    `laziness ${Math.round(t.laziness)}  mischief ${Math.round(t.mischief)}`;
}

function renderCollection(v: CollectionView): void {
  const found = TREASURES.filter((t) => (v.inventory[t.id] ?? 0) > 0).length;
  el("coltitle").textContent = `Collection  ${found}/${TREASURES.length}   ·   ${v.discoveries} finds`;
  el("note").textContent = v.note ?? "";
  el("pending").hidden = !v.pending;

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
  for (const c of COLLECTIONS) {
    const have = c.itemIds.filter((id) => (v.inventory[id] ?? 0) > 0).length;
    const done = v.completed.includes(c.id);
    const row = make("div", "line");
    row.appendChild(make("span", undefined, `${c.name}  ${have}/${c.itemIds.length}`));
    row.appendChild(make("span", undefined, done ? `🎁 ${c.rewardName} unlocked` : `reward: ${c.rewardName}`));
    cols.appendChild(row);
  }

  const recent = el("recent");
  recent.replaceChildren();
  const items = [...v.history].reverse().slice(0, 6);
  if (items.length === 0) recent.appendChild(make("p", undefined, "Nothing yet. Your cat is looking."));
  for (const h of items) {
    const t = TREASURE_BY_ID.get(h.itemId);
    if (!t) continue;
    const row = make("div", "line");
    row.appendChild(make("span", undefined, `${t.icon} ${t.name} (${t.rarity})`));
    row.appendChild(make("span", undefined, `${h.away ? "while you were away · " : ""}${ago(h.at)}`));
    recent.appendChild(row);
  }
}

function toggle(what: "visible" | "paused" | "click_through"): void {
  invoke("toggle_setting", { what }).catch((e) => console.error(e));
}

function action(a: "pet" | "play" | "inspect"): void {
  emit("cat-action", { action: a }).catch((e) => console.error(e));
}

const resetText = el("resetText") as HTMLInputElement;
const resetBtn = el("reset") as HTMLButtonElement;
resetText.addEventListener("input", () => { resetBtn.disabled = resetText.value !== "RESET"; });
resetBtn.addEventListener("click", () => {
  if (resetText.value !== "RESET") return;
  emit("cat-reset", { confirm: "RESET" }).catch((e) => console.error(e));
  resetText.value = "";
  resetBtn.disabled = true;
});

el("vis").addEventListener("click", () => toggle("visible"));
el("pause").addEventListener("click", () => toggle("paused"));
el("ct").addEventListener("click", () => toggle("click_through"));
el("pet").addEventListener("click", () => action("pet"));
el("play").addEventListener("click", () => action("play"));
el("inspect").addEventListener("click", () => action("inspect"));
el("quit").addEventListener("click", () => { invoke("quit_app").catch((e) => console.error(e)); });

void listen<Settings>("settings-changed", (e) => renderSettings(e.payload));
void listen<CatStatus>("cat-status", (e) => renderStatus(e.payload));
void listen<CollectionView>("cat-collection", (e) => renderCollection(e.payload));
void invoke<Settings>("get_settings").then(renderSettings);
void emit("cat-status-request");
