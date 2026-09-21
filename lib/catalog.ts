import type { Station } from "./radio";

// Catalogue éditorial versionné dans le dépôt (data/catalog.json), édité via /admin en local.
export type CustomNetwork = { id: string; name: string; country: string; description: string; logo: string };

export type Catalog = {
  networks?: CustomNetwork[]; // réseaux créés dans /admin
  categories?: Record<string, string[]>; // catégories ajoutées à un réseau (id de réseau → libellés)
  custom: Station[]; // stations ajoutées à la main (peuvent être rattachées à un réseau)
  overrides: Record<string, Partial<Station>>; // corrections appliquées aux stations de l'API
  blocked: Record<string, { station: Station; reason: string; at: number }>; // retirées pour tout le monde
  checks: Record<string, { ok: boolean; reason: string; at: number }>; // dernier test de chaque station
};

export const EMPTY_CATALOG: Catalog = { custom: [], overrides: {}, blocked: {}, checks: {} };

export const applyOverrides = (s: Station, c: Catalog): Station =>
  c.overrides[s.id] ? { ...s, ...c.overrides[s.id] } : s;

// Retire les stations bloquées, applique les corrections, dédoublonne par id.
export function applyCatalog(list: Station[], c: Catalog): Station[] {
  const seen = new Set<string>();
  return list
    .filter((s) => !c.blocked[s.id] && !seen.has(s.id) && seen.add(s.id))
    .map((s) => applyOverrides(s, c));
}
