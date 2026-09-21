export type Station = {
  id: string;
  name: string;
  url: string;
  favicon: string;
  country: string;
  tags: string;
  bitrate: number;
  codec: string;
  countryCode?: string;
  network?: string; // id de réseau (stations ajoutées via /admin)
  group?: string; // sous-groupe dans un réseau personnalisé
};

type ApiStation = {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  country: string;
  tags: string;
  bitrate: number;
  codec: string;
  countrycode: string;
};

export const PAGE_SIZE = 60;

const SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
];

export const FALLBACK_COUNTRIES = [
  { code: "", label: "Monde" },
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "US", label: "États-Unis" },
  { code: "DE", label: "Allemagne" },
  { code: "ES", label: "Espagne" },
  { code: "IT", label: "Italie" },
  { code: "BR", label: "Brésil" },
  { code: "JP", label: "Japon" },
];

export const GENRES = ["pop", "rock", "jazz", "news", "electronic", "classical", "hip hop", "dance", "lofi", "reggae"];

export async function searchStations(
  opts: { name?: string; country?: string; tag?: string; offset?: number; limit?: number },
  signal?: AbortSignal,
): Promise<Station[]> {
  const params = new URLSearchParams({
    limit: String(opts.limit ?? PAGE_SIZE),
    offset: String(opts.offset ?? 0),
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
  });
  if (opts.name) params.set("name", opts.name);
  if (opts.country) params.set("countrycode", opts.country);
  if (opts.tag) params.set("tag", opts.tag);

  let lastError: unknown;
  for (const server of SERVERS) {
    try {
      const res = await fetch(`${server}/json/stations/search?${params}`, { signal });
      if (!res.ok) throw new Error(String(res.status));
      const data: ApiStation[] = await res.json();
      return data
        .filter((s) => s.url_resolved)
        .map((s) => ({
          id: s.stationuuid,
          name: s.name.trim(),
          url: s.url_resolved,
          favicon: s.favicon,
          country: s.country,
          tags: s.tags,
          bitrate: s.bitrate,
          codec: s.codec,
          countryCode: s.countrycode,
        }));
    } catch (e) {
      if (signal?.aborted) throw e;
      lastError = e;
    }
  }
  throw lastError;
}

export type Country = { code: string; label: string };

// Tous les pays ayant des radios, triés par nombre de stations.
export async function fetchCountries(): Promise<Country[]> {
  const names = new Intl.DisplayNames(["fr"], { type: "region" });
  for (const server of SERVERS) {
    try {
      const res = await fetch(`${server}/json/countrycodes?hidebroken=true`);
      if (!res.ok) continue;
      const data: { name: string; stationcount: number }[] = await res.json();
      const list = data
        .filter((c) => /^[A-Z]{2}$/.test(c.name) && c.stationcount > 0)
        .map((c) => {
          let label = c.name;
          try { label = names.of(c.name) ?? c.name; } catch {}
          return { code: c.name, label };
        })
        .sort((a, b) => a.label.localeCompare(b.label, "fr"));
      return [{ code: "", label: "Monde" }, ...list];
    } catch {}
  }
  return FALLBACK_COUNTRIES;
}
