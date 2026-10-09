import { ANIMS, CELL } from "./animation";
import type { AnimName, Dir } from "./animation";

export type Mood = "happy" | "curious" | "sleepy" | "playful" | "grumpy";
export type Behavior = "idle" | "walk" | "look" | "nap" | "play" | "celebrate" | "ponder" | "discover";
export type OpportunitySource = "walk" | "look" | "ponder" | "play" | "inspect";

// Moments when the cat might stumble on something; the treasure system decides whether it does.
export interface EngineEvent {
  type: "opportunity";
  source: OpportunitySource;
}
export type Trait = "curiosity" | "playfulness" | "affection" | "laziness" | "mischief";
export type Traits = Record<Trait, number>;
export type Interaction = "pet" | "play" | "inspect";
export const INTERACTIONS: readonly Interaction[] = ["pet", "play", "inspect"];

export interface EngineEnv {
  random: () => number;
  hour: () => number; // local time of day, 0 <= h < 24
}

export interface CatState {
  x: number; // logical sprite pixels, left edge of the 32px cell
  dir: Dir;
  anim: AnimName;
  frame: number;
  behavior: Behavior;
  mood: Mood;
  hearts: number; // counts accepted pets so the renderer can show a reaction
  discoverTier: number; // 0 = none; 1-3 = sparkle intensity while a find is being celebrated
}

export interface CatStatus {
  mood: Mood;
  behavior: Behavior;
  traits: Traits;
}

type StillBehavior = Exclude<Behavior, "walk" | "play">;

const MAX_DT = 500; // ms; caps catch-up after sleep or a stalled page
const SPEED: Partial<Record<AnimName, number>> = { walk: 30, run: 90, run2: 100 }; // logical px/s
const MIN_WALK = 40; // logical px
const MIN_RUN = 80;
const APPROACH_GAP = 28; // how far from the cursor the cat stops
const MOOD_MS: [number, number] = [60000, 120000];
const PET_MOOD_MS = 90000;
const INTERACT_MOOD_MS = 60000;
const PET_WINDOW_MS = 20000;
const PET_LIMIT = 6; // more pets than this within the window makes the cat grumpy for a while
const GRUMPY_MS = 40000;
const COOLDOWN_NAP = 30000;
const COOLDOWN_PLAY = 20000;
const COOLDOWN_PONDER = 45000;
const DISCOVER_MS: Record<number, number> = { 1: 2500, 2: 3500, 3: 5000 };
const EVENT_CAP = 8;
// Where the cat goes to ponder: the middle of the strip, roughly where taskbar icons sit (fractions of the range).
export const PERCH_LO = 0.3;
export const PERCH_HI = 0.7;

const DURATION: Record<StillBehavior, [number, number]> = {
  idle: [2000, 4500],
  look: [2500, 4500],
  nap: [8000, 14000],
  celebrate: [2500, 4000],
  ponder: [4000, 7000],
  discover: [2500, 2500],
};
const ANIM_FOR: Record<StillBehavior, AnimName> = {
  idle: "sit",
  look: "look",
  nap: "lay",
  celebrate: "look",
  ponder: "sit",
  discover: "look",
};

export const DEFAULT_TRAITS: Traits = {
  curiosity: 60,
  playfulness: 55,
  affection: 60,
  laziness: 45,
  mischief: 40,
};

// Base odds for what the cat does next. A behavior never lists itself, so it never repeats back to back.
export const NEXT: Record<Behavior, Partial<Record<Behavior, number>>> = {
  idle: { look: 25, walk: 40, nap: 25, play: 10, ponder: 12 },
  look: { walk: 45, idle: 20, play: 10, nap: 25, ponder: 10 },
  nap: { idle: 70, look: 30 },
  walk: { idle: 35, look: 35, nap: 25, play: 5, ponder: 8 },
  play: { idle: 50, look: 25, nap: 25 },
  celebrate: { idle: 60, look: 20, walk: 20 },
  ponder: { idle: 50, look: 30, walk: 20 },
  discover: { idle: 60, look: 20, walk: 20 },
};

const MOOD_MULT: Record<Mood, Partial<Record<Behavior, number>>> = {
  happy: {},
  curious: { walk: 1.5, look: 1.5, ponder: 2 },
  sleepy: { nap: 2.5, walk: 0.6, play: 0.3, idle: 1.2, ponder: 0.4 },
  playful: { play: 2, walk: 1.2 },
  grumpy: { look: 0.5, play: 0.5, nap: 1.5 },
};

export function pickWeighted<T>(random: () => number, entries: [T, number][]): T {
  const total = entries.reduce((sum, e) => sum + e[1], 0);
  let r = random() * total;
  for (const [item, w] of entries) {
    r -= w;
    if (r < 0) return item;
  }
  return entries[entries.length - 1][0];
}

export class CatEngine {
  readonly state: CatState = {
    x: 0,
    dir: 1,
    anim: "sit",
    frame: 0,
    behavior: "idle",
    mood: "happy",
    hearts: 0,
    discoverTier: 0,
  };
  private env: EngineEnv;
  private traits: Traits;
  private t = 0;
  private ft = 0;
  private until = 0;
  private target = 0;
  private maxX = 0;
  private moodUntil = 0;
  private after: Behavior | null = null;
  private afterMs: number | undefined;
  private cursor: number | null = null;
  private petTimes: number[] = [];
  private cooldown: Partial<Record<Behavior, number>> = {};
  private events: EngineEvent[] = [];
  private inspectPending = false;

  constructor(env: EngineEnv, traits?: Partial<Traits>) {
    this.env = env;
    this.traits = { ...DEFAULT_TRAITS, ...traits };
    this.rollMood();
    this.startBehavior("idle");
  }

  get status(): CatStatus {
    return { mood: this.state.mood, behavior: this.state.behavior, traits: { ...this.traits } };
  }

  // Replaces the traits, e.g. with the ones loaded from a save.
  setTraits(t: Traits): void {
    for (const k of Object.keys(this.traits) as Trait[]) this.traits[k] = clamp(t[k] ?? this.traits[k], 0, 100);
  }

  // Hands over (and clears) the moments when a discovery could happen.
  takeEvents(): EngineEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // The cat found something: it stops to look around and sparkles. Tier 1-3 sets how long and how bright.
  startDiscovery(tier: 1 | 2 | 3): void {
    this.startBehavior("discover", DISCOVER_MS[tier]);
    this.state.discoverTier = tier;
  }

  // The cat's left edge may range over [0, maxX] (viewport width minus one cell).
  setBounds(maxX: number): void {
    this.maxX = Math.max(0, maxX);
    this.state.x = clamp(this.state.x, 0, this.maxX);
    this.target = clamp(this.target, 0, this.maxX);
  }

  // True when nothing will visibly change soon, so the renderer can sleep.
  get settled(): boolean {
    const b = this.state.behavior;
    if (b !== "idle" && b !== "nap" && b !== "ponder") return false;
    return this.state.frame >= ANIMS[this.state.anim].frames - 1;
  }

  // Read-only pointer position in logical px (window-relative), or null when it is not near the cat.
  setCursor(x: number | null): void {
    const arrived = x !== null && this.cursor === null;
    this.cursor = x;
    if (!arrived || x === null) return;
    const s = this.state;
    if (s.behavior !== "idle" && s.behavior !== "look" && s.behavior !== "walk") return;
    const chance = (0.15 + (0.5 * this.traits.curiosity) / 100) * (s.mood === "sleepy" ? 0.3 : 1);
    if (this.env.random() >= chance) return;
    const target = clamp(x >= s.x + CELL / 2 ? x - CELL / 2 - APPROACH_GAP : x - CELL / 2 + APPROACH_GAP, 0, this.maxX);
    if (Math.abs(target - s.x) < MIN_WALK / 2) return;
    this.startBehavior("walk");
    this.moveTo(target);
    this.after = "idle";
    this.afterMs = 4000 + this.env.random() * 4000;
  }

  interact(kind: Interaction): void {
    if (kind === "pet") this.pet();
    else if (kind === "play") this.playNow();
    else this.inspectNow();
  }

  step(dtRaw: number): void {
    const dt = Math.min(Math.max(dtRaw, 0), MAX_DT);
    this.t += dt;
    this.advanceFrame(dt);
    this.faceCursor();
    const s = this.state;
    if (s.behavior === "walk" || s.behavior === "play") {
      this.maybeRetarget(dt);
      s.x += s.dir * (SPEED[s.anim] ?? 0) * (dt / 1000);
      const reached = s.dir > 0 ? s.x >= this.target : s.x <= this.target;
      if (reached) {
        s.x = this.target;
        this.arrive();
      }
    } else if (this.t >= this.until) {
      this.beginNext();
    }
    s.x = clamp(s.x, 0, this.maxX);
  }

  private pet(): void {
    const s = this.state;
    this.petTimes = this.petTimes.filter((ts) => this.t - ts < PET_WINDOW_MS);
    this.petTimes.push(this.t);
    if (this.petTimes.length > PET_LIMIT) {
      this.setMood("grumpy", GRUMPY_MS); // too much fuss: harmless, it just ignores you for a bit
      return;
    }
    if (s.mood === "grumpy" && this.env.random() < 0.5) return;
    this.bump("affection", 1);
    s.hearts++;
    if (s.behavior === "nap" && s.mood === "sleepy") return; // purrs in its sleep
    this.setMood("happy", PET_MOOD_MS);
    this.startBehavior("celebrate");
  }

  private playNow(): void {
    this.bump("playfulness", 1);
    this.setMood("playful", INTERACT_MOOD_MS);
    this.startBehavior(this.feasible("play") ? "play" : "celebrate");
  }

  private inspectNow(): void {
    this.bump("curiosity", 1);
    this.setMood("curious", INTERACT_MOOD_MS);
    if (this.feasible("walk")) {
      this.startBehavior("walk");
      this.after = "look";
      this.inspectPending = true;
    } else {
      this.startBehavior("look");
    }
  }

  private noteOpportunity(prev: Behavior): void {
    let source: OpportunitySource | null = null;
    if (prev === "walk") {
      source = this.inspectPending ? "inspect" : "walk";
      this.inspectPending = false;
    } else if (prev === "look" || prev === "ponder" || prev === "play") {
      source = prev;
    }
    if (source !== null && this.events.length < EVENT_CAP) this.events.push({ type: "opportunity", source });
  }

  private bump(trait: Trait, d: number): void {
    this.traits[trait] = clamp(this.traits[trait] + d, 0, 100);
  }

  private setMood(m: Mood, ms: number): void {
    this.state.mood = m;
    this.moodUntil = this.t + ms;
  }

  private nightFactor(): number {
    const h = this.env.hour();
    if (h >= 23 || h < 6) return 1;
    if (h >= 21) return (h - 21) / 2;
    if (h < 8) return (8 - h) / 2;
    return 0;
  }

  private rollMood(): void {
    const tr = this.traits;
    const entries: [Mood, number][] = [
      ["happy", 20 + tr.affection * 0.3],
      ["curious", tr.curiosity * 0.5],
      ["sleepy", tr.laziness * 0.4 + this.nightFactor() * 80],
      ["playful", tr.playfulness * 0.5],
      ["grumpy", 3],
    ];
    this.setMood(pickWeighted(this.env.random, entries), MOOD_MS[0] + this.env.random() * (MOOD_MS[1] - MOOD_MS[0]));
  }

  private weight(b: Behavior, base: number): number {
    const tr = this.traits;
    let w = base;
    switch (b) {
      case "walk":
        w *= 0.5 + tr.curiosity / 100;
        break;
      case "look":
        w *= 0.6 + (0.8 * tr.curiosity) / 100;
        break;
      case "play":
        w *= 0.3 + (1.4 * tr.playfulness) / 100;
        break;
      case "nap":
        w *= 0.4 + (1.2 * tr.laziness) / 100;
        break;
      case "ponder":
        w *= 0.2 + (1.3 * tr.curiosity) / 100;
        break;
      default:
        break;
    }
    return w * (MOOD_MULT[this.state.mood][b] ?? 1);
  }

  private feasible(b: Behavior): boolean {
    if (b === "walk") return this.maxX >= MIN_WALK * 2;
    if (b === "play") return this.maxX >= MIN_RUN * 2;
    if (b === "ponder") return this.maxX >= MIN_WALK * 4;
    return true;
  }

  private faceCursor(): void {
    const s = this.state;
    if (this.cursor === null || (s.behavior !== "idle" && s.behavior !== "look")) return;
    const c = s.x + CELL / 2;
    if (Math.abs(this.cursor - c) > 6) s.dir = this.cursor >= c ? 1 : -1;
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

  // Mischief: now and then a walking cat changes its mind and heads somewhere else.
  private maybeRetarget(dt: number): void {
    const s = this.state;
    if (s.behavior !== "walk" || this.after !== null || !this.feasible("walk")) return;
    if (this.env.random() < (dt / 1000) * (this.traits.mischief / 100) * 0.03) this.moveTo(this.randomTarget(MIN_WALK));
  }

  private arrive(): void {
    const next = this.after;
    const ms = this.afterMs;
    if (next) this.startBehavior(next, ms);
    else this.beginNext();
  }

  private beginNext(): void {
    if (this.t >= this.moodUntil) this.rollMood();
    const entries: [Behavior, number][] = [];
    for (const [b, base] of Object.entries(NEXT[this.state.behavior]) as [Behavior, number][]) {
      if (!this.feasible(b)) continue;
      const cd = this.cooldown[b];
      if (cd !== undefined && this.t < cd) continue;
      const w = this.weight(b, base);
      if (w > 0) entries.push([b, w]);
    }
    const next = entries.length > 0 ? pickWeighted(this.env.random, entries) : "idle";
    if (next === "ponder") this.goPonder();
    else this.startBehavior(next);
  }

  // Pondering happens over the "icons": walk to the middle of the strip first if needed, then sit and think.
  private goPonder(): void {
    const lo = this.maxX * PERCH_LO;
    const hi = this.maxX * PERCH_HI;
    if (this.state.x >= lo && this.state.x <= hi) {
      this.startBehavior("ponder");
      return;
    }
    this.startBehavior("walk");
    this.moveTo(lo + this.env.random() * (hi - lo));
    this.after = "ponder";
  }

  private randomTarget(min: number): number {
    const s = this.state;
    const target = this.env.random() * this.maxX;
    return Math.abs(target - s.x) < min ? (s.x < this.maxX / 2 ? this.maxX : 0) : target;
  }

  private moveTo(target: number): void {
    this.target = clamp(target, 0, this.maxX);
    this.state.dir = this.target >= this.state.x ? 1 : -1;
  }

  private startBehavior(b: Behavior, durationMs?: number): void {
    const s = this.state;
    const prev = s.behavior;
    if (prev !== b) this.noteOpportunity(prev);
    if (prev !== "walk") this.inspectPending = false;
    s.discoverTier = 0;
    if (prev !== b) {
      if (prev === "nap") this.cooldown.nap = this.t + COOLDOWN_NAP;
      if (prev === "play") this.cooldown.play = this.t + COOLDOWN_PLAY;
      if (prev === "ponder") this.cooldown.ponder = this.t + COOLDOWN_PONDER;
    }
    s.behavior = b;
    s.frame = 0;
    this.ft = 0;
    this.after = null;
    this.afterMs = undefined;
    switch (b) {
      case "walk":
        s.anim = "walk";
        this.moveTo(this.randomTarget(MIN_WALK));
        break;
      case "play":
        s.anim = this.env.random() < 0.2 + (0.5 * this.traits.mischief) / 100 ? "run2" : "run";
        this.moveTo(this.randomTarget(MIN_RUN));
        break;
      default: {
        s.anim = ANIM_FOR[b];
        const [lo, hi] = DURATION[b];
        this.until = this.t + (durationMs ?? lo + this.env.random() * (hi - lo));
      }
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
