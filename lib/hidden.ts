import type { Station } from "./radio";

export type HiddenEntry = { station: Station; at: number; reason: string };

export const HIDDEN_KEY = "tz.hidden";

export function addHidden(list: HiddenEntry[], station: Station, reason: string): HiddenEntry[] {
  if (list.some((h) => h.station.id === station.id)) return list;
  return [{ station, at: Date.now(), reason }, ...list];
}
