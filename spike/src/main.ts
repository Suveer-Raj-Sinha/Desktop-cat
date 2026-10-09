import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CELL, cell, pixelScale } from "./simulation/animation";
import { CatEngine } from "./simulation/catEngine";

interface Settings {
  visible: boolean;
  paused: boolean;
  click_through: boolean;
}

const BASE = 23; // lowest opaque pixel row inside a 32x32 cell (measured from the art)
const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const img = new Image();
const engine = new CatEngine({ random: Math.random });
let dpr = window.devicePixelRatio || 1;
let S = pixelScale(dpr); // whole physical pixels per sprite pixel
let settings: Settings = { visible: true, paused: false, click_through: false };
let last = performance.now();
let handle = 0;
let kind: "raf" | "timer" | "" = "";
let lastSent = "";

function resize(): void {
  dpr = window.devicePixelRatio || 1;
  S = pixelScale(dpr);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.imageSmoothingEnabled = false;
  engine.setBounds(canvas.width / S - CELL);
  if (settings.visible) draw();
}

function top(): number {
  return canvas.height - S - (BASE + 1) * S;
}

function draw(): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = engine.state;
  const { sx, sy } = cell(s.anim, s.dir, s.frame);
  ctx.drawImage(img, sx, sy, CELL, CELL, Math.round(s.x * S), top(), CELL * S, CELL * S);
}

function stop(): void {
  if (kind === "raf") cancelAnimationFrame(handle);
  else if (kind === "timer") clearTimeout(handle);
  kind = "";
  handle = 0;
}

function schedule(): void {
  if (engine.settled) {
    kind = "timer"; // nothing is changing: wake only a few times a second
    handle = window.setTimeout(() => tick(performance.now()), 250);
  } else {
    kind = "raf";
    handle = requestAnimationFrame(tick);
  }
}

function tick(ts: number): void {
  engine.step(ts - last);
  last = ts;
  draw();
  schedule();
}

function apply(s: Settings): void {
  settings = s;
  const running = s.visible && !s.paused;
  if (running && kind === "") {
    last = performance.now();
    schedule();
  } else if (!running) {
    stop();
  }
  if (!s.visible) ctx.clearRect(0, 0, canvas.width, canvas.height);
  else if (!running) draw();
}

canvas.addEventListener("click", () => {
  engine.interact();
  if (settings.visible && !settings.paused) {
    stop();
    last = performance.now();
    draw();
    schedule();
  }
});
window.addEventListener("resize", resize);

// Report the cat's rectangle (CSS px, window-relative) so Rust can toggle click-through. Only on change.
setInterval(() => {
  if (!settings.visible || settings.click_through) return;
  const r = {
    x: (engine.state.x * S) / dpr,
    y: top() / dpr,
    w: (CELL * S) / dpr,
    h: (CELL * S) / dpr,
  };
  const key = `${Math.round(r.x)}|${Math.round(r.y)}|${Math.round(r.w)}`;
  if (key === lastSent) return;
  lastSent = key;
  invoke("set_cat_rect", r).catch((e) => console.error(e));
}, 50);

resize();
void listen<Settings>("settings-changed", (e) => apply(e.payload));
img.onload = () => { void invoke<Settings>("get_settings").then(apply); };
img.src = "/cat.png";
