import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface Settings {
  visible: boolean;
  paused: boolean;
  click_through: boolean;
}

const el = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

function render(s: Settings): void {
  el("vis").textContent = s.visible ? "Hide cat" : "Show cat";
  el("pause").textContent = s.paused ? "Resume" : "Pause";
  el("ct").textContent = s.click_through ? "Switch to interactive mode" : "Switch to click-through mode";
  el("st").textContent = `visible: ${s.visible}   paused: ${s.paused}   click-through: ${s.click_through}`;
}

function toggle(what: "visible" | "paused" | "click_through"): void {
  invoke("toggle_setting", { what }).catch((e) => console.error(e));
}

el("vis").addEventListener("click", () => toggle("visible"));
el("pause").addEventListener("click", () => toggle("paused"));
el("ct").addEventListener("click", () => toggle("click_through"));
el("quit").addEventListener("click", () => { invoke("quit_app").catch((e) => console.error(e)); });

void listen<Settings>("settings-changed", (e) => render(e.payload));
void invoke<Settings>("get_settings").then(render);
