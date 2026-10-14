// What Rust reports about the Windows taskbar.
export interface PlatformInfo {
  edge: "bottom" | "top" | "left" | "right" | "unknown";
  auto_hide: boolean;
  icons_left: boolean; // icons start at the left (Windows 10, or Windows 11 set to left alignment)
}

export type PerchZone = [number, number];

const CENTRED: PerchZone = [0.3, 0.7]; // fractions of the cat's range along the strip
const LEFT: PerchZone = [0.05, 0.3];

// Where the cat goes to "look at the taskbar icons". Only a bottom taskbar with left-aligned icons moves it;
// anywhere else the middle of the strip is a sensible guess.
export function perchZone(info: PlatformInfo | null): PerchZone {
  if (info && info.edge === "bottom" && info.icons_left) return [...LEFT];
  return [...CENTRED];
}
