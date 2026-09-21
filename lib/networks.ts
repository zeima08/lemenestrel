import { applyOverrides, type Catalog, type CustomNetwork } from "./catalog";
import { searchStations, type Station } from "./radio";

export type Group = { label: string; match?: RegExp }; // sans match = tout le reste
export type Network = {
  id: string;
  name: string;
  country: string;
  domain: string; // sert à récupérer le logo
  logo?: string; // URL de logo (réseaux personnalisés)
  custom?: boolean; // réseau créé dans /admin : stations = celles du catalogue
  description: string;
  queries: string[]; // recherches envoyées à l'API
  filter: RegExp; // ne garde que les vraies stations du réseau
  countryCode?: string;
  groups: Group[]; // premier groupe qui correspond gagne
};

export const NETWORKS: Network[] = [
  {
    id: "radiofrance", name: "Radio France", country: "France", domain: "radiofrance.fr",
    description: "Les antennes du service public et les radios locales ici (ex-France Bleu).",
    queries: ["france inter", "france info", "france culture", "france musique", "fip", "mouv", "ici ", "france bleu"],
    filter: /^(france (inter|info|culture|musique|bleu)|fip|mouv|ici\b)/i, countryCode: "FR",
    groups: [
      { label: "Antennes nationales", match: /^france (inter|info|culture|musique)\b/i },
      { label: "Webradios FIP & Mouv'", match: /^(fip|mouv)/i },
      { label: "Radios locales (ici / France Bleu)" },
    ],
  },
  {
    id: "rri", name: "RRI — Radio Republik Indonesia", country: "Indonésie", domain: "rri.co.id",
    description: "Le réseau public indonésien : programmes nationaux Pro 1 à 4 et stations de chaque province.",
    queries: ["rri", "radio republik indonesia"],
    filter: /^rri\b|radio republik indonesia/i, countryCode: "ID",
    groups: [
      { label: "Pro 1 — programme régional", match: /pro ?1\b/i },
      { label: "Pro 2 — jeunesse & musique", match: /pro ?2\b/i },
      { label: "Pro 3 — information nationale", match: /pro ?3\b|nasional/i },
      { label: "Pro 4 — culture", match: /pro ?4\b/i },
      { label: "Autres stations (villes, RRI Net, Voice of Indonesia…)" },
    ],
  },
  {
    id: "rfi", name: "RFI", country: "France", domain: "rfi.fr",
    description: "Radio France Internationale : édition monde, Afrique et éditions en langues.",
    queries: ["rfi"], filter: /^rfi\b/i,
    groups: [{ label: "Éditions principales", match: /monde|afrique|france|fran[cç]ais/i }, { label: "Autres langues" }],
  },
  {
    id: "nrj", name: "NRJ", country: "France", domain: "nrj.fr",
    description: "NRJ et ses webradios thématiques et locales.",
    queries: ["nrj"], filter: /\bnrj\b/i,
    groups: [{ label: "NRJ", match: /^nrj\s*(france|paris)?\s*$/i }, { label: "Webradios & locales" }],
  },
  {
    id: "nostalgie", name: "Nostalgie", country: "France", domain: "nostalgie.fr",
    description: "Nostalgie nationale, webradios et locales.",
    queries: ["nostalgie"], filter: /nostalgie/i,
    groups: [{ label: "Nostalgie", match: /^nostalgie\s*(france)?\s*$/i }, { label: "Webradios & locales" }],
  },
  {
    id: "rtl", name: "RTL", country: "France", domain: "rtl.fr",
    description: "RTL, RTL2 et Fun Radio.",
    queries: ["rtl", "fun radio"], filter: /^(rtl|fun radio)/i, countryCode: "FR",
    groups: [{ label: "RTL", match: /^rtl/i }, { label: "Fun Radio" }],
  },
  {
    id: "rmc", name: "RMC & BFM", country: "France", domain: "rmc.bfmtv.com",
    description: "RMC, RMC Sport, BFM Business…",
    queries: ["rmc", "bfm"], filter: /^(rmc|bfm)/i, countryCode: "FR",
    groups: [{ label: "RMC", match: /^rmc/i }, { label: "BFM" }],
  },
  {
    id: "virgin", name: "Virgin Radio", country: "France", domain: "virginradio.fr",
    description: "Virgin Radio et ses webradios.",
    queries: ["virgin radio"], filter: /virgin radio/i, countryCode: "FR",
    groups: [{ label: "Virgin Radio" }],
  },
  {
    id: "generalistes", name: "Groupe Lagardère & autres", country: "France", domain: "europe1.fr",
    description: "Europe 1, RFM, Skyrock, Chérie FM, Rire & Chansons, Radio Classique…",
    queries: ["europe 1", "rfm", "skyrock", "cherie", "rire et chansons", "radio classique", "tsf jazz", "radio nova"],
    filter: /^(europe 1|rfm|skyrock|ch[ée]rie|rire (et|&) chansons|radio classique|tsf jazz|radio nova)/i, countryCode: "FR",
    groups: [{ label: "Radios nationales" }],
  },
  {
    id: "rtbf", name: "RTBF", country: "Belgique", domain: "rtbf.be",
    description: "La Première, Vivacité, Classic 21, Tipik, Pure.",
    queries: ["la première", "vivacité", "classic 21", "tipik", "pure fm"], filter: /^(la premi[eè]re|vivacit|classic 21|tipik|pure)/i, countryCode: "BE",
    groups: [{ label: "Radios RTBF" }],
  },
  {
    id: "rts", name: "RTS", country: "Suisse", domain: "rts.ch",
    description: "La 1ère, Espace 2, Couleur 3, Option Musique.",
    queries: ["la 1ère", "espace 2", "couleur 3", "option musique", "rts"], filter: /^(rts|la 1[eè]re|espace 2|couleur 3|option musique)/i, countryCode: "CH",
    groups: [{ label: "Radios RTS" }],
  },
  {
    id: "radiocanada", name: "Radio-Canada / ICI", country: "Canada", domain: "ici.radio-canada.ca",
    description: "ICI Première, ICI Musique et leurs versions régionales.",
    queries: ["ici première", "ici musique", "radio-canada", "cbc radio"], filter: /^(ici (premi[eè]re|musique)|radio-canada|cbc)/i, countryCode: "CA",
    groups: [{ label: "ICI Première", match: /premi[eè]re/i }, { label: "ICI Musique", match: /musique/i }, { label: "CBC & autres" }],
  },
  {
    id: "bbc", name: "BBC", country: "Royaume-Uni", domain: "bbc.co.uk",
    description: "Radio 1 à 6 Music, World Service et radios locales.",
    queries: ["bbc"], filter: /^bbc/i,
    groups: [
      { label: "Nationales", match: /radio [1-5]\b|radio 4 extra|5 live|6 music|asian network|world service/i },
      { label: "Locales & régionales" },
    ],
  },
  {
    id: "npr", name: "NPR & radios publiques", country: "États-Unis", domain: "npr.org",
    description: "NPR et ses stations membres.",
    queries: ["npr"], filter: /\bnpr\b/i, countryCode: "US",
    groups: [{ label: "NPR" }],
  },
  {
    id: "rne", name: "RNE", country: "Espagne", domain: "rtve.es",
    description: "Radio Nacional de España : Radio 1, Radio 3, Radio 5, Clásica.",
    queries: ["rne", "radio nacional de españa"], filter: /^(rne|radio nacional)/i, countryCode: "ES",
    groups: [{ label: "RNE" }],
  },
  {
    id: "romania", name: "Radio România", country: "Roumanie", domain: "radioromania.ro",
    description: "Radio România Actualități, Cultural, Muzical et stations régionales.",
    queries: ["radio românia", "radio romania"], filter: /^radio rom[aâ]nia/i, countryCode: "RO",
    groups: [
      { label: "Nationales", match: /actualit|cultural|muzical|antena satelor|international|itinerar|3net|jazz|chill|folclor/i },
      { label: "Régionales" },
    ],
  },
  {
    id: "philippines", name: "Radios philippines (PBS, DZRH…)", country: "Philippines", domain: "dzrh.com.ph",
    description: "Radios publiques et grands réseaux philippins : Radyo Pilipinas, DZRH, DZBB, Love Radio…",
    queries: ["radyo pilipinas", "dzrh", "dzbb", "love radio", "monster radio", "mor "],
    filter: /radyo pilipinas|dzrh|dzbb|love radio|monster|^mor\b/i, countryCode: "PH",
    groups: [{ label: "Radios nationales", match: /pilipinas|dzrh|dzbb/i }, { label: "Autres réseaux" }],
  },
];

export function groupIndex(n: Network, name: string) {
  let i = n.groups.findIndex((g) => g.match?.test(name));
  if (i < 0) i = n.groups.findIndex((g) => !g.match);
  return i < 0 ? n.groups.length - 1 : i;
}

export const toNetwork = (c: CustomNetwork): Network => ({
  id: c.id, name: c.name, country: c.country, description: c.description,
  domain: "", logo: c.logo, custom: true, queries: [], filter: /$^/, groups: [],
});

export const allNetworks = (c: Catalog): Network[] => [...NETWORKS, ...(c.networks ?? []).map(toNetwork)];

export type Section = { label: string; stations: Station[] };

// Fusionne les stations de l'API, celles du catalogue rattachées au réseau et les déplacements
// décidés dans /admin (une station du catalogue avec un autre réseau — ou "none" — sort de celui-ci).
export function mergeNetwork(n: Network, groups: Section[], c: Catalog, hideBlocked: boolean): Section[] {
  const customById = new Map(c.custom.map((s) => [s.id, s]));
  const mine = c.custom.filter((s) => s.network === n.id);
  const finish = (list: Station[]) => {
    const seen = new Set<string>();
    return list
      .filter((s) => !seen.has(s.id) && seen.add(s.id))
      .filter((s) => !hideBlocked || !c.blocked[s.id])
      .map((s) => applyOverrides(s, c))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  };

  const extra = (c.categories?.[n.id] ?? []).filter((l) => !n.groups.some((g) => g.label === l));

  if (n.custom) {
    const by = new Map<string, Station[]>();
    for (const s of mine) by.set(s.group || "Stations", [...(by.get(s.group || "Stations") ?? []), s]);
    return [...by].sort(([a], [b]) => a.localeCompare(b, "fr")).map(([label, st]) => ({ label, stations: finish(st) }));
  }

  const out: Section[] = [...n.groups.map((g) => g.label), ...extra].map((label) => ({ label, stations: [] }));
  for (const s of mine) {
    const i = out.findIndex((o) => o.label === s.group);
    out[i >= 0 ? i : groupIndex(n, s.name)].stations.push(s);
  }
  for (const g of groups) {
    const t = out.find((o) => o.label === g.label);
    t?.stations.push(...g.stations.filter((s) => { const cs = customById.get(s.id); return !(cs?.network && cs.network !== n.id); }));
  }
  return out.map((g) => ({ ...g, stations: finish(g.stations) })).filter((g) => g.stations.length);
}

const cache = new Map<string, Promise<{ label: string; stations: Station[] }[]>>();

export function loadNetwork(n: Network) {
  let p = cache.get(n.id);
  if (!p) {
    p = (async () => {
      const results = await Promise.all(
        n.queries.map((q) => searchStations({ name: q.trim(), country: n.countryCode, limit: 500 }).catch(() => [])),
      );
      const seen = new Set<string>();
      const all = results.flat().filter((s) => {
        const key = s.name.trim().toLowerCase();
        if (seen.has(key) || !n.filter.test(s.name.trim())) return false;
        seen.add(key);
        return true;
      });
      const buckets = n.groups.map((g) => ({ label: g.label, stations: [] as Station[] }));
      for (const s of all) {
        buckets[groupIndex(n, s.name)].stations.push(s);
      }
      buckets.forEach((b) => b.stations.sort((a, c) => a.name.localeCompare(c.name, "fr")));
      return buckets.filter((b) => b.stations.length);
    })();
    cache.set(n.id, p);
    p.catch(() => cache.delete(n.id));
  }
  return p;
}
