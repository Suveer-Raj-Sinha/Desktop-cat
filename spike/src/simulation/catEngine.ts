import { ANIMS, CELL } from "./animation";
import type { AnimName, Dir } from "./animation";

export interface EngineEnv {
  random: () => number;
}

export interface CatState {
  x: number; // logical sprite pixels, left edge of the 32px cell
  dir: Dir;
  anim: AnimName;
  frame: number;
  mode: "idle" | "walk";
}

const MAX_DT = 500; // ms; caps catch-up after sleep or a stalled page
const WALK_SPEED = 30; // logical px per second
const MIN_WALK = 40; // logical px
const IDLE_MIN = 3000;
const IDLE_MAX = 7000;
const INTERACT_IDLE = 2000;

export class CatEngine {
  readonly state: CatState = { x: 0, dir: 1, anim: "sit", frame: 0, mode: "idle" };
  private env: EngineEnv;
  private t = 0;
  private ft = 0;
  private idleUntil: number;
  private target = 0;
  private maxX = 0;

  constructor(env: EngineEnv) {
    this.env = env;
    this.idleUntil = this.rollIdle();
  }

  // The cat's left edge may range over [0, maxX] (viewport width minus one cell).
  setBounds(maxX: number): void {
    this.maxX = Math.max(0, maxX);
    this.state.x = clamp(this.state.x, 0, this.maxX);
    this.target = clamp(this.target, 0, this.maxX);
  }

  // True when nothing will visibly change soon, so the renderer can sleep.
  get settled(): boolean {
    const a = ANIMS[this.state.anim];
    return this.state.mode === "idle" && !a.loop && this.state.frame >= a.frames - 1;
  }

  interact(): void {
    this.startIdle();
    this.idleUntil = this.t + INTERACT_IDLE;
  }

  step(dtRaw: number): void {
    const dt = Math.min(Math.max(dtRaw, 0), MAX_DT);
    this.t += dt;
    this.advanceFrame(dt);
    const s = this.state;
    if (s.mode === "walk") {
      s.x += s.dir * WALK_SPEED * (dt / 1000);
      const reached = s.dir > 0 ? s.x >= this.target : s.x <= this.target;
      if (reached) {
        s.x = this.target;
        this.startIdle();
      }
    } else if (this.t >= this.idleUntil) {
      this.startWalk();
    }
    s.x = clamp(s.x, 0, this.maxX);
  }

  private advanceFrame(dt: number): void {
    const s = this.state;
    const a = ANIMS[s.anim];
    this.ft += dt;
    while (this.ft >= a.ms) {
      this.ft -= a.ms;
      if (s.frame < a.frames - 1) s.frame++;
      else if (a.loop) s.frame = 0;
      else {
        this.ft = 0;
        break;
      }
    }
  }

  private rollIdle(): number {
    return this.t + IDLE_MIN + this.env.random() * (IDLE_MAX - IDLE_MIN);
  }

  private startIdle(): void {
    const s = this.state;
    s.mode = "idle";
    s.anim = "sit";
    s.frame = 0;
    this.ft = 0;
    this.idleUntil = this.rollIdle();
  }

  private startWalk(): void {
    const s = this.state;
    if (this.maxX < MIN_WALK) {
      this.idleUntil = this.rollIdle();
      return;
    }
    let target = this.env.random() * this.maxX;
    if (Math.abs(target - s.x) < MIN_WALK) target = s.x < this.maxX / 2 ? this.maxX : 0;
    this.target = target;
    s.dir = target >= s.x ? 1 : -1;
    s.mode = "walk";
    s.anim = "walk";
    s.frame = 0;
    this.ft = 0;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export { CELL };
