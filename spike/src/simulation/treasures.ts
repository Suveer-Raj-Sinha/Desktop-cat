export type Rarity = "common" | "uncommon" | "rare" | "legendary" | "special";

export interface Treasure {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  description: string;
}

export interface Collection {
  id: string;
  name: string;
  itemIds: readonly string[];
  rewardCosmetic: string;
  rewardName: string;
  rewardIcon: string;
}

export const TREASURES: readonly Treasure[] = [
  { id: "coin", name: "Shiny Coin", rarity: "common", icon: "🪙", description: "Found under the sofa. Very shiny." },
  { id: "button", name: "Brass Button", rarity: "common", icon: "🔘", description: "Fell off a coat, now it's the cat's." },
  { id: "yarn", name: "Scrap of Yarn", rarity: "common", icon: "🧶", description: "Slightly chewed. Highly prized." },
  { id: "bell", name: "Little Bell", rarity: "common", icon: "🔔", description: "Jingles when batted. Often." },
  { id: "bottle-cap", name: "Bottle Cap", rarity: "common", icon: "⚪", description: "Great for skidding across the floor." },
  { id: "feather", name: "Grey Feather", rarity: "common", icon: "🪶", description: "Drifted in from somewhere outdoors." },
  { id: "paper-clip", name: "Paper Clip", rarity: "common", icon: "📎", description: "Stolen right off your desk." },
  { id: "cork", name: "Wine Cork", rarity: "common", icon: "🪵", description: "Rolls in a satisfying wobble." },
  { id: "marble", name: "Glass Marble", rarity: "uncommon", icon: "🔮", description: "Swirls of blue and green inside." },
  { id: "thimble", name: "Silver Thimble", rarity: "uncommon", icon: "🧵", description: "A tiny hat for a tiny paw." },
  { id: "toy-mouse", name: "Toy Mouse", rarity: "uncommon", icon: "🐭", description: "Squeaks. The cat is suspicious of it." },
  { id: "shell", name: "Sea Shell", rarity: "uncommon", icon: "🐚", description: "Sounds like the ocean, or a purr." },
  { id: "locket", name: "Silver Locket", rarity: "rare", icon: "📿", description: "Holds a picture of a very good fish." },
  { id: "clover", name: "Four-Leaf Clover", rarity: "rare", icon: "🍀", description: "Lucky, if you are a cat." },
  { id: "fish-charm", name: "Moonlit Fish Charm", rarity: "legendary", icon: "🐟", description: "Glows faintly at night. Possibly magic." },
  { id: "paw-coin", name: "Golden Paw Coin", rarity: "special", icon: "🐾", description: "A reward for a long friendship." },
];

export const COLLECTIONS: readonly Collection[] = [
  {
    id: "desk-drawer",
    name: "Desk Drawer",
    itemIds: ["button", "paper-clip", "cork", "bottle-cap", "yarn"],
    rewardCosmetic: "red-ribbon",
    rewardName: "Red Ribbon",
    rewardIcon: "🎀",
  },
  {
    id: "shiny-things",
    name: "Shiny Things",
    itemIds: ["coin", "bell", "marble", "thimble", "locket"],
    rewardCosmetic: "bell-collar",
    rewardName: "Bell Collar",
    rewardIcon: "🔔",
  },
  {
    id: "nature-finds",
    name: "Nature Finds",
    itemIds: ["feather", "shell", "clover", "fish-charm"],
    rewardCosmetic: "leaf-crown",
    rewardName: "Leaf Crown",
    rewardIcon: "🌿",
  },
];

// Relative odds when a random find happens. Special items are never rolled; they come from milestones.
export const RARITY_WEIGHT: Record<Exclude<Rarity, "special">, number> = {
  common: 70,
  uncommon: 22,
  rare: 7,
  legendary: 1,
};

export const MILESTONE = { itemId: "paw-coin", at: 25 };

export const TREASURE_BY_ID: ReadonlyMap<string, Treasure> = new Map(TREASURES.map((t) => [t.id, t]));
export const KNOWN_COSMETICS: ReadonlySet<string> = new Set(COLLECTIONS.map((c) => c.rewardCosmetic));

// Visual intensity of the discovery sparkle.
export function rarityTier(r: Rarity): 1 | 2 | 3 {
  if (r === "common" || r === "uncommon") return 1;
  return r === "rare" ? 2 : 3;
}
