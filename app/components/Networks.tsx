"use client";

import { useEffect, useMemo, useState } from "react";
import type { Catalog } from "@/lib/catalog";
import { allNetworks, loadNetwork, mergeNetwork, type Network } from "@/lib/networks";
import type { Station } from "@/lib/radio";
import { StationCard } from "./StationCard";

type Props = {
  catalog: Catalog;
  currentId?: string;
  playing: boolean;
  hiddenIds: Set<string>;
  isFav: (s: Station) => boolean;
  onPlay: (s: Station) => void;
  onFavorite: (s: Station) => void;
};

export function Networks(props: Props) {
  const [network, setNetwork] = useState<Network | null>(null);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");

  if (network) return <NetworkDetail network={network} onBack={() => setNetwork(null)} {...props} />;

  const all = allNetworks(props.catalog);
  const countries = [...new Set(all.map((n) => n.country).filter(Boolean))];
  const list = all.filter(
    (n) => (!country || n.country === country) && n.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un réseau…" className="min-w-0 flex-1 rounded-xl border border-brand/25 bg-white/5 px-4 py-2.5 outline-none placeholder:text-zinc-500 focus:border-brand/60" />
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl border border-brand/25 bg-dark-card px-3 outline-none">
          <option value="">Tous pays</option>
          {countries.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((n) => (
          <button key={n.id} onClick={() => setNetwork(n)} className="flex items-center gap-3 rounded-2xl border border-brand/15 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.07]">
            <NetworkLogo network={n} />
            <div className="min-w-0">
              <div className="truncate font-medium">{n.name}</div>
              <div className="line-clamp-2 text-xs text-zinc-400">{n.country} · {n.description}</div>
            </div>
          </button>
        ))}
        {!list.length && <p className="col-span-full py-10 text-center text-zinc-500">Aucun réseau trouvé.</p>}
      </div>
    </div>
  );
}

function NetworkLogo({ network, size = 48 }: { network: Network; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ width: size, height: size }} className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-brand text-sm font-bold">
      {network.name.split(/[\s—]/)[0].slice(0, 3).toUpperCase()}
      {!failed && (network.logo || network.domain) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={network.logo || `https://www.google.com/s2/favicons?domain=${network.domain}&sz=128`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full bg-white object-contain p-1.5"
        />
      )}
    </div>
  );
}

function NetworkDetail({ network, onBack, catalog, ...p }: { network: Network; onBack: () => void } & Props) {
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof loadNetwork>> | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let live = true;
    loadNetwork(network).then((g) => live && setGroups(g)).catch(() => live && setError(true));
    return () => { live = false; };
  }, [network]);

  const merged = useMemo(() => (groups ? mergeNetwork(network, groups, catalog, true) : null), [groups, network, catalog]);

  const term = q.trim().toLowerCase();
  const visible = merged
    ?.map((g) => ({ ...g, stations: g.stations.filter((s) => (!term || s.name.toLowerCase().includes(term)) && !p.hiddenIds.has(s.id)) }))
    .filter((g) => g.stations.length);

  return (
    <div>
      <button onClick={onBack} className="mb-3 text-sm text-zinc-400 hover:text-white">← Tous les réseaux</button>
      <div className="mb-4 flex items-center gap-3">
        <NetworkLogo network={network} size={56} />
        <div>
          <h2 className="text-xl font-semibold">{network.name}</h2>
          <p className="text-sm text-zinc-400">{network.description}</p>
        </div>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par région, ville, nom…" className="mb-5 w-full rounded-xl border border-brand/25 bg-white/5 px-4 py-2.5 outline-none placeholder:text-zinc-500 focus:border-brand/60" />
      {!groups && !error && <p className="py-10 text-center text-zinc-500">Chargement…</p>}
      {error && <p className="py-10 text-center text-red-400">Impossible de charger ce réseau.</p>}
      {visible && !visible.length && <p className="py-10 text-center text-zinc-500">Aucune station trouvée.</p>}
      {visible?.map((g) => (
        <section key={g.label} className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{g.label} · {g.stations.length}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.stations.map((s) => (
              <StationCard key={s.id} station={s} active={p.currentId === s.id} playing={p.playing} favorite={p.isFav(s)} onPlay={() => p.onPlay(s)} onFavorite={() => p.onFavorite(s)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
