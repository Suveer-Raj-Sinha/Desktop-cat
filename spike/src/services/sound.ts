// Tiny synthesized effects (no audio files). Quiet by design.
export type SoundName = "pet" | "discover" | "collect";

interface Note {
  f: number; // Hz
  t: number; // start offset, seconds
  d: number; // duration, seconds
}

const SOUNDS: Record<SoundName, Note[]> = {
  pet: [{ f: 660, t: 0, d: 0.09 }, { f: 880, t: 0.08, d: 0.12 }],
  discover: [{ f: 784, t: 0, d: 0.12 }, { f: 988, t: 0.1, d: 0.12 }, { f: 1318, t: 0.2, d: 0.2 }],
  collect: [{ f: 1047, t: 0, d: 0.08 }, { f: 1568, t: 0.07, d: 0.18 }],
};

const VOLUME = 0.05;

// The small part of the Web Audio API we use, so it can be faked in tests.
export interface AudioCtx {
  currentTime: number;
  destination: unknown;
  state: string;
  resume(): Promise<void> | void;
  createOscillator(): {
    type: string;
    frequency: { value: number };
    connect(node: unknown): unknown;
    start(when: number): void;
    stop(when: number): void;
  };
  createGain(): {
    gain: { setValueAtTime(v: number, t: number): unknown; exponentialRampToValueAtTime(v: number, t: number): unknown };
    connect(node: unknown): unknown;
  };
}

export function defaultContext(): AudioCtx | null {
  if (typeof AudioContext === "undefined") return null;
  return new AudioContext() as unknown as AudioCtx;
}

export function createSoundPlayer(enabled: () => boolean, makeContext: () => AudioCtx | null = defaultContext): { play(name: SoundName): void } {
  let ctx: AudioCtx | null = null;
  return {
    play(name: SoundName): void {
      if (!enabled()) return;
      try {
        if (ctx === null) ctx = makeContext();
        if (ctx === null) return;
        if (ctx.state === "suspended") void ctx.resume(); // browsers only allow sound after a click on the page
        const now = ctx.currentTime;
        for (const n of SOUNDS[name]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = n.f;
          gain.gain.setValueAtTime(VOLUME, now + n.t);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d + 0.02);
        }
      } catch {
        // sound is optional: never let it break the cat
      }
    },
  };
}
