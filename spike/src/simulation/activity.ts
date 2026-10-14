export interface ActivityEntry {
  at: number;
  icon: string;
  text: string;
}

export const ACTIVITY_MAX = 20;

// Newest entries last; the list never grows past `max`.
export function pushActivity(list: readonly ActivityEntry[], entry: ActivityEntry, max = ACTIVITY_MAX): ActivityEntry[] {
  return [...list, entry].slice(-max);
}
