export interface CatSheet {
  id: string;
  label: string;
}

// Every base colour sheet from the art pack, cropped to the 24x16 frame grid and stored in public/cats/.
export const CAT_SHEETS: readonly CatSheet[] = [
  { id: "black_0", label: "Black 1" },
  { id: "black_1", label: "Black 2" },
  { id: "black_2", label: "Black 3" },
  { id: "black_3", label: "Black 4" },
  { id: "black_4", label: "Black 5" },
  { id: "blue_0", label: "Blue 1" },
  { id: "blue_1", label: "Blue 2" },
  { id: "blue_2", label: "Blue 3" },
  { id: "blue_3", label: "Blue 4" },
  { id: "brown_0", label: "Brown 1" },
  { id: "brown_1", label: "Brown 2" },
  { id: "brown_2", label: "Brown 3" },
  { id: "brown_3", label: "Brown 4" },
  { id: "brown_4", label: "Brown 5" },
  { id: "brown_5", label: "Brown 6" },
  { id: "brown_6", label: "Brown 7" },
  { id: "brown_7", label: "Brown 8" },
  { id: "brown_8", label: "Brown 9" },
  { id: "calico_0", label: "Calico" },
  { id: "cotton_candy_blue_0", label: "Cotton candy blue" },
  { id: "cotton_candy_pink_0", label: "Cotton candy pink" },
  { id: "creme_0", label: "Creme 1" },
  { id: "creme_1", label: "Creme 2" },
  { id: "dark_0", label: "Dark" },
  { id: "game_boy_0", label: "Game boy 1" },
  { id: "game_boy_1", label: "Game boy 2" },
  { id: "game_boy_2", label: "Game boy 3" },
  { id: "ghost_0", label: "Ghost" },
  { id: "gold_0", label: "Gold" },
  { id: "grey_0", label: "Grey 1" },
  { id: "grey_1", label: "Grey 2" },
  { id: "grey_2", label: "Grey 3" },
  { id: "hairless_0", label: "Hairless 1" },
  { id: "hairless_1", label: "Hairless 2" },
  { id: "indigo_0", label: "Indigo" },
  { id: "orange_0", label: "Orange 1" },
  { id: "orange_1", label: "Orange 2" },
  { id: "orange_2", label: "Orange 3" },
  { id: "orange_3", label: "Orange 4" },
  { id: "peach_0", label: "Peach" },
  { id: "pink_0", label: "Pink" },
  { id: "radioactive_0", label: "Radioactive" },
  { id: "red_0", label: "Red 1" },
  { id: "red_1", label: "Red 2" },
  { id: "seal_point_0", label: "Seal point" },
  { id: "teal_0", label: "Teal" },
  { id: "white_0", label: "White" },
  { id: "white_grey_0", label: "White grey 1" },
  { id: "white_grey_1", label: "White grey 2" },
  { id: "yellow_0", label: "Yellow" },
];

export const DEFAULT_CAT_SHEET = "black_0";

const KNOWN: ReadonlySet<string> = new Set(CAT_SHEETS.map((s) => s.id));

export function isCatSheet(id: unknown): id is string {
  return typeof id === "string" && KNOWN.has(id);
}
