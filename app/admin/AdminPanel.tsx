"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { applyOverrides, type Catalog, type CustomNetwork } from "@/lib/catalog";
import { HIDDEN_KEY, type HiddenEntry } from "@/lib/hidden";
import { NETWORKS, allNetworks, loadNetwork, mergeNetwork, type Section } from "@/lib/networks";
import { FALLBACK_COUNTRIES, searchStations, type Station } from "@/lib/radio";
import { usePersisted } from "@/lib/usePersisted";
import { Logo } from "../components/StationCard";

type Save = "idle" | "pending" | "saved" | "error";
type View = "list" | "grid" | "compact";
type Status = "blocked" | "dead" | "ok" | "unknown";

export default function AdminPanel({ initial }: { initial: Catalog }) {
  if (process.env.NODE_ENV === "production") {
    return <p className="p-10 text-center text-zinc-400">L&apos;admin n&apos;est disponible qu&apos;en local (<code>npm run dev</code>).</p>;
  }
  return <Admin initial={initial} />;
}

function Admin({ initial }: { initial: Catalog }) {
  const [catalog, setCatalog] = useState(initial);
  const ref = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [save, setSave] = useState<Save>("idle");
  const [hidden, setHidden] = usePersisted<HiddenEntry[]>(HIDDEN_KEY, []);
  const [view, setView] = usePersisted<View>("tz.adminView", "list");

  const [source, setSource] = useState("catalog");
  const [groups, setGroups] = useState<Section[] | null>([]); // stations de l'API du réseau affiché
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [found, setFound] = useState<Station[] | null>([]); // résultats Radio Browser
  const [state, setState] = useState<"all" | Status>("all");
  const [testing, setTesting] = useState<Record<string, true>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [netForm, setNetForm] = useState<CustomNetwork | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const dragged = useRef<Station | null>(null);
  const stop = useRef(false);

  // Toute modification est écrite dans data/catalog.json (à committer puis pousser pour publier).
  const update = (fn: (c: Catalog) => Catalog) => {
    ref.current = fn(ref.current);
    setCatalog(ref.current);
    setSave("pending");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/admin/catalog", { method: "PUT", body: JSON.stringify(ref.current) });
        setSave(r.ok ? "saved" : "error");
      } catch {
        setSave("error");
      }
    }, 400);
  };

  const nets = allNetworks(catalog);
  const customNets = catalog.networks ?? [];
  const searching = query.trim().length > 0;

  // recherche globale (debounce) : catalogue en local + Radio Browser
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setFound(null);
      try {
        setFound(await searchStations({ name: q, country, limit: 100 }, ctrl.signal));
      } catch {
        if (!ctrl.signal.aborted) setFound([]);
      }
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, country]);

  const changeSource = async (v: string) => {
    setSource(v);
    setQuery("");
    setEditing(null);
    const n = v.startsWith("net:") ? nets.find((x) => x.id === v.slice(4)) : null;
    if (!n || n.custom) return setGroups([]);
    setGroups(null);
    try { setGroups(await loadNetwork(n)); } catch { setGroups([]); }
  };

  const netSource = source.startsWith("net:") ? nets.find((n) => n.id === source.slice(4)) : undefined;
  const q = query.trim().toLowerCase();
  const matches = (s: Station) => `${s.name} ${s.country} ${s.tags}`.toLowerCase().includes(q);

  const rows: Station[] = searching
    ? [...catalog.custom.filter(matches), ...Object.values(catalog.blocked).map((b) => b.station).filter(matches), ...(found ?? [])]
    : source === "catalog" ? catalog.custom
    : source === "blocked" ? Object.values(catalog.blocked).map((b) => b.station)
    : source === "local" ? hidden.map((h) => h.station)
    : netSource ? mergeNetwork(netSource, groups ?? [], catalog, false).flatMap((g) => g.stations)
    : [];
  const loading = searching ? found === null : !!netSource && !netSource.custom && groups === null;

  const statusOf = (s: Station): Status =>
    catalog.blocked[s.id] ? "blocked" : catalog.checks[s.id] ? (catalog.checks[s.id].ok ? "ok" : "dead") : "unknown";

  const seen = new Set<string>();
  const shown = rows
    .filter((s) => !seen.has(s.id) && seen.add(s.id))
    .map((s) => applyOverrides(s, catalog))
    .filter((s) => state === "all" || statusOf(s) === state);

  const customOf = (id: string) => catalog.custom.find((s) => s.id === id);
  const rawOf = (id: string) => rows.find((r) => r.id === id)!;

  const runChecks = async (list: Station[]) => {
    stop.current = false;
    const queue = [...list];
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let s = queue.shift(); s && !stop.current; s = queue.shift()) {
          const id = s.id;
          setTesting((t) => ({ ...t, [id]: true }));
          let res: { ok: boolean; reason: string };
          try {
            res = await (await fetch(`/api/check?url=${encodeURIComponent(s.url)}`)).json();
          } catch {
            res = { ok: false, reason: "Erreur réseau" };
          }
          update((c) => ({ ...c, checks: { ...c.checks, [id]: { ...res, at: Date.now() } } }));
          setTesting((t) => { const n = { ...t }; delete n[id]; return n; });
        }
      }),
    );
  };
  const busy = Object.keys(testing).length > 0;

  const block = (list: Station[], reason: string) =>
    update((c) => ({
      ...c,
      blocked: { ...c.blocked, ...Object.fromEntries(list.filter((s) => !c.blocked[s.id]).map((s) => [s.id, { station: s, reason, at: Date.now() }])) },
    }));
  const unblock = (id: string) => update((c) => { const b = { ...c.blocked }; delete b[id]; return { ...c, blocked: b }; });

  // Rattache une station à un réseau ("none" = à aucun, undefined = automatique). L'ajoute au catalogue si besoin.
  const assign = (s: Station, network: string | undefined, group?: string) =>
    update((c) => {
      const base = applyOverrides(c.custom.find((x) => x.id === s.id) ?? s, c);
      return { ...c, custom: [{ ...base, network, group }, ...c.custom.filter((x) => x.id !== s.id)] };
    });
  const removeCustom = (id: string) => update((c) => ({ ...c, custom: c.custom.filter((s) => s.id !== id) }));
  const edit = (s: Station, patch: Partial<Station>) =>
    update((c) =>
      c.custom.some((x) => x.id === s.id)
        ? { ...c, custom: c.custom.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) }
        : { ...c, overrides: { ...c.overrides, [s.id]: { ...c.overrides[s.id], ...patch } } },
    );
  const resetEdit = (id: string) => update((c) => { const o = { ...c.overrides }; delete o[id]; return { ...c, overrides: o }; });

  const createNetwork = (name?: string): string | null => {
    const n = (name ?? prompt("Nom du nouveau réseau ?") ?? "").trim();
    if (!n) return null;
    const id = `perso-${crypto.randomUUID().slice(0, 8)}`;
    update((c) => ({ ...c, networks: [...(c.networks ?? []), { id, name: n, country: "", description: "", logo: "" }] }));
    return id;
  };
  // Choix d'un réseau pour une station (menu ou glisser-déposer)
  const moveTo = (s: Station, target: string, group?: string) => {
    if (target === "__new") {
      const id = createNetwork();
      if (id) assign(s, id);
    } else if (target === "") {
      if (customOf(s.id)) assign(s, undefined, undefined);
    } else {
      const cur = customOf(s.id);
      // sans catégorie précisée, on garde celle d'origine seulement si le réseau ne change pas
      assign(s, target, target === "none" ? undefined : group ?? (cur?.network === target ? cur.group : undefined));
    }
  };

  // Catégories d'un réseau : celles du site (réseaux intégrés) + celles ajoutées ici
  const extraCats = (id: string) => catalog.categories?.[id] ?? [];
  const catsOf = (id: string) => {
    const n = nets.find((x) => x.id === id);
    return [...(n?.groups.map((g) => g.label) ?? []), ...extraCats(id).filter((l) => !n?.groups.some((g) => g.label === l))];
  };
  const addCategory = (id: string) => {
    const name = (prompt("Nom de la nouvelle catégorie ?") ?? "").trim();
    if (!name || catsOf(id).includes(name)) return;
    update((c) => ({ ...c, categories: { ...c.categories, [id]: [...(c.categories?.[id] ?? []), name] } }));
    setOpen((o) => new Set(o).add(id));
  };
  const removeCategory = (id: string, label: string) => {
    if (!confirm(`Supprimer la catégorie « ${label} » ? Ses stations restent dans le réseau.`)) return;
    update((c) => ({
      ...c,
      categories: { ...c.categories, [id]: (c.categories?.[id] ?? []).filter((l) => l !== label) },
      custom: c.custom.map((s) => (s.network === id && s.group === label ? { ...s, group: undefined } : s)),
    }));
  };
  const saveNet = (n: CustomNetwork) => {
    update((c) => {
      const list = c.networks ?? [];
      return { ...c, networks: list.some((x) => x.id === n.id) ? list.map((x) => (x.id === n.id ? n : x)) : [...list, n] };
    });
    setNetForm(null);
  };
  const deleteNet = (n: CustomNetwork) => {
    if (!confirm(`Supprimer le réseau « ${n.name} » ? Ses stations restent dans le catalogue, sans réseau.`)) return;
    update((c) => ({
      ...c,
      networks: (c.networks ?? []).filter((x) => x.id !== n.id),
      custom: c.custom.map((s) => (s.network === n.id ? { ...s, network: undefined, group: undefined } : s)),
    }));
  };
  const newStation = () => {
    const s: Station = { id: crypto.randomUUID(), name: query.trim() || "Nouvelle radio", url: "", favicon: "", country: "", tags: "", bitrate: 0, codec: "MP3" };
    assign(s, netSource?.id);
    setQuery("");
    setSource(netSource ? source : "catalog");
    setEditing(s.id);
  };

  const dead = shown.filter((s) => statusOf(s) === "dead");
  const counts = { ok: shown.filter((s) => statusOf(s) === "ok").length, dead: dead.length, blocked: shown.filter((s) => statusOf(s) === "blocked").length };
  const netCount = (id: string) => catalog.custom.filter((s) => s.network === id).length;

  const drop = (target: string) => {
    const s = dragged.current;
    setOver(null);
    dragged.current = null;
    if (!s) return;
    const [net, cat] = target.split("::");
    moveTo(s, net, cat);
  };

  // Un réseau (zone de dépôt) + ses catégories dépliables, elles aussi zones de dépôt
  const netZone = (id: string, name: string) => {
    const isOpen = open.has(id) || source === `net:${id}`;
    const cats = catsOf(id);
    return (
      <div key={id}>
        <Zone
          id={id} over={over} setOver={setOver} onDrop={drop} count={netCount(id)} active={source === `net:${id}`}
          onClick={() => changeSource(`net:${id}`)}
          toggle={{ open: isOpen, onToggle: () => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; }) }}
        >{name}</Zone>
        {isOpen && (
          <div className="mb-1 ml-4 border-l border-brand/20 pl-2">
            {cats.map((label) => (
              <Zone
                key={label} id={`${id}::${label}`} over={over} setOver={setOver} onDrop={drop} small
                count={catalog.custom.filter((s) => s.network === id && s.group === label).length}
                onRemove={extraCats(id).includes(label) ? () => removeCategory(id, label) : undefined}
              >{label}</Zone>
            ))}
            <button onClick={() => addCategory(id)} className="w-full rounded-lg px-2 py-1 text-left text-xs text-brand-light hover:bg-white/5">+ catégorie</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Admin des stations</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className={save === "error" ? "text-red-400" : save === "pending" ? "text-zinc-400" : "text-emerald-400"}>
            {save === "error" ? "✕ Écriture impossible" : save === "pending" ? "Enregistrement…" : save === "saved" ? "✓ Écrit dans data/catalog.json" : ""}
          </span>
          <Link href="/" className="text-zinc-400 hover:text-white">← Retour</Link>
        </div>
      </div>
      <p className="mb-5 text-sm text-zinc-400">
        Les changements sont écrits dans <code className="text-zinc-300">data/catalog.json</code> : ils s&apos;appliquent au site après <code className="text-zinc-300">git commit</code> + <code className="text-zinc-300">git push</code>.
        Glisse une station sur un réseau à droite pour l&apos;y ranger.
      </p>

      {/* Recherche globale (catalogue, bloquées, Radio Browser) */}
      <div className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setEditing(null); }}
          placeholder="🔍 Rechercher une station…"
          className="min-w-0 flex-1 rounded-xl border border-brand/25 bg-white/5 px-4 py-2.5 outline-none placeholder:text-zinc-500 focus:border-brand/60"
        />
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="max-w-32 rounded-xl border border-brand/25 bg-dark-card px-2 text-sm outline-none" aria-label="Pays de la recherche">
          {FALLBACK_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        {searching && <Btn onClick={() => setQuery("")}>✕</Btn>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_270px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {searching ? (
              <span className="text-sm text-zinc-400">Résultats pour « {query.trim()} »</span>
            ) : (
              <select value={source} onChange={(e) => changeSource(e.target.value)} className="rounded-xl border border-brand/25 bg-dark-card px-3 py-2 text-sm outline-none">
                <optgroup label="Mon catalogue">
                  <option value="catalog">Stations ajoutées ({catalog.custom.length})</option>
                  <option value="blocked">Stations bloquées ({Object.keys(catalog.blocked).length})</option>
                  <option value="local">Masquées dans ce navigateur ({hidden.length})</option>
                </optgroup>
                <optgroup label="Mes réseaux">
                  <option value="networks">⚙ Gérer mes réseaux ({customNets.length})</option>
                  {customNets.map((n) => <option key={n.id} value={`net:${n.id}`}>{n.name} ({netCount(n.id)})</option>)}
                </optgroup>
                <optgroup label="Réseaux du site">
                  {NETWORKS.map((n) => <option key={n.id} value={`net:${n.id}`}>{n.name}</option>)}
                </optgroup>
              </select>
            )}
            <Btn onClick={newStation}>+ Nouvelle station</Btn>
            <div className="ml-auto flex rounded-lg border border-brand/25 text-xs">
              {([["list", "Liste"], ["grid", "Grille"], ["compact", "Compact"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 ${view === k ? "bg-brand/30 text-white" : "text-zinc-400 hover:text-white"}`}>{l}</button>
              ))}
            </div>
          </div>

          {source === "networks" && !searching ? (
            <NetworkManager
              networks={customNets}
              count={netCount}
              form={netForm}
              onForm={setNetForm}
              onSave={saveNet}
              onDelete={deleteNet}
              onOpen={(id) => changeSource(`net:${id}`)}
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select value={state} onChange={(e) => setState(e.target.value as typeof state)} className="rounded-xl border border-brand/25 bg-dark-card px-2 py-2 text-sm outline-none">
                  <option value="all">Toutes</option>
                  <option value="dead">Mortes</option>
                  <option value="ok">Fonctionnent</option>
                  <option value="unknown">Non testées</option>
                  <option value="blocked">Bloquées</option>
                </select>
                {busy ? <Btn onClick={() => { stop.current = true; }}>■ Arrêter ({Object.keys(testing).length})</Btn> : <Btn disabled={!shown.length} onClick={() => runChecks(shown)}>Tester la liste ({shown.length})</Btn>}
                <Btn disabled={!dead.length} onClick={() => confirm(`Bloquer ${dead.length} station(s) morte(s) pour tout le site ?`) && block(dead, "Flux mort (test)")}>Bloquer les {dead.length} mortes</Btn>
                <span className="ml-auto text-xs text-zinc-500">{shown.length} · <span className="text-emerald-400">{counts.ok} OK</span> · <span className="text-red-400">{counts.dead} mortes</span> · {counts.blocked} bloquées</span>
              </div>

              {loading && <p className="py-10 text-center text-zinc-500">Chargement…</p>}
              {!loading && !shown.length && <p className="py-10 text-center text-zinc-500">Aucune station.</p>}

              <div className={view === "grid" ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
                {shown.map((s) => {
                  const st = statusOf(s);
                  const chk = catalog.checks[s.id];
                  const cs = customOf(s.id);
                  const compact = view === "compact";
                  const netId = cs?.network ?? "";
                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={(e) => { dragged.current = rawOf(s.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); }}
                      onDragEnd={() => { dragged.current = null; setOver(null); }}
                      className={`cursor-grab rounded-2xl border active:cursor-grabbing ${compact ? "px-3 py-1.5" : "p-3"} ${st === "dead" ? "border-red-500/40 bg-red-500/10" : st === "blocked" ? "border-brand/15 bg-white/[0.02] opacity-60" : "border-brand/15 bg-white/[0.03]"}`}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap">
                        <Logo station={s} size={compact ? 28 : 40} dead={st === "dead"} />
                        <div className="min-w-0 flex-1 basis-32">
                          <div className={`truncate text-sm font-medium ${st === "blocked" ? "line-through" : ""}`}>
                            {s.name}{catalog.overrides[s.id] && <span className="ml-2 text-xs text-amber-400">modifiée</span>}{cs && <span className="ml-2 text-xs text-sky-400">catalogue</span>}
                          </div>
                          {!compact && <div className="truncate text-xs text-zinc-500">{[s.country, s.tags].filter(Boolean).join(" · ")}</div>}
                        </div>
                        <span className={`shrink-0 text-xs ${testing[s.id] ? "text-zinc-400" : st === "ok" ? "text-emerald-400" : st === "dead" ? "text-red-400" : "text-zinc-500"}`}>
                          {testing[s.id] ? "Test…" : st === "ok" ? "● OK" : st === "dead" ? `✕ ${compact ? "morte" : chk.reason}` : st === "blocked" ? "⛔" : "○"}
                        </span>
                        {compact && <NetSelect value={netId} nets={nets} onChange={(v) => moveTo(rawOf(s.id), v)} />}
                        {compact && <Btn onClick={() => runChecks([s])}>Tester</Btn>}
                        {compact && <Btn onClick={() => setEditing(editing === s.id ? null : s.id)}>Modifier</Btn>}
                      </div>
                      {!compact && (
                        <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                          <NetSelect value={netId} nets={nets} onChange={(v) => moveTo(rawOf(s.id), v)} />
                          <Btn onClick={() => runChecks([s])}>Tester</Btn>
                          <Btn onClick={() => setEditing(editing === s.id ? null : s.id)}>Modifier</Btn>
                          {cs && <Btn onClick={() => removeCustom(s.id)}>Retirer du catalogue</Btn>}
                          {st === "blocked" ? <Btn onClick={() => unblock(s.id)}>Débloquer</Btn> : <Btn onClick={() => block([rawOf(s.id)], "Bloquée manuellement")}>Bloquer</Btn>}
                          {source === "local" && !searching && <Btn onClick={() => setHidden((h) => h.filter((x) => x.station.id !== s.id))}>Ré-afficher ici</Btn>}
                        </div>
                      )}
                      {editing === s.id && (
                        <EditForm
                          station={s}
                          custom={!!cs}
                          canReset={!!catalog.overrides[s.id]}
                          blocked={st === "blocked"}
                          onSave={(patch) => { edit(rawOf(s.id), patch); setEditing(null); }}
                          onReset={() => { resetEdit(s.id); setEditing(null); }}
                          onCancel={() => setEditing(null)}
                          onRemove={cs ? () => { removeCustom(s.id); setEditing(null); } : undefined}
                          onBlock={st === "blocked" ? () => unblock(s.id) : () => block([rawOf(s.id)], "Bloquée manuellement")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Réseaux : zones de dépôt */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-brand/15 bg-white/[0.03] p-2">
            <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Glisser vers un réseau</p>
            <Zone id="__new" over={over} setOver={setOver} onDrop={drop} accent>+ Nouveau réseau</Zone>
            <Zone id="none" over={over} setOver={setOver} onDrop={drop}>Aucun réseau (exclure)</Zone>
            {customNets.length > 0 && <p className="px-2 pt-3 text-[10px] uppercase tracking-wider text-zinc-600">Mes réseaux</p>}
            {customNets.map((n) => netZone(n.id, n.name))}
            <p className="px-2 pt-3 text-[10px] uppercase tracking-wider text-zinc-600">Réseaux du site</p>
            {NETWORKS.map((n) => netZone(n.id, n.name))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Zone({ id, over, setOver, onDrop, count, active, accent, small, toggle, onClick, onRemove, children }: {
  id: string; over: string | null; setOver: (v: string | null) => void; onDrop: (id: string) => void;
  count?: number; active?: boolean; accent?: boolean; small?: boolean;
  toggle?: { open: boolean; onToggle: () => void }; onClick?: () => void; onRemove?: () => void; children: React.ReactNode;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(id); }}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => { e.preventDefault(); onDrop(id); }}
      onClick={onClick}
      className={`mb-1 flex items-center justify-between gap-2 rounded-xl border transition ${small ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"} ${
        over === id ? "border-brand bg-brand/30" : active ? "border-brand/40 bg-brand/15" : accent ? "border-dashed border-brand/40 text-brand-light" : "border-transparent text-zinc-300 hover:bg-white/5"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {toggle && (
          <button onClick={(e) => { e.stopPropagation(); toggle.onToggle(); }} aria-label="Catégories" className="w-4 shrink-0 text-zinc-500 hover:text-white">{toggle.open ? "▾" : "▸"}</button>
        )}
        <span className="truncate">{children}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {count ? <span className="text-xs text-zinc-500">{count}</span> : null}
        {onRemove && <button onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="Supprimer la catégorie" className="text-zinc-600 hover:text-red-400">✕</button>}
      </span>
    </div>
  );
}

// "" = automatique (détection par nom), "none" = exclue, sinon id de réseau, "__new" = créer.
function NetSelect({ value, nets, onChange }: { value: string; nets: { id: string; name: string }[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()} aria-label="Réseau" className="max-w-40 rounded-lg border border-brand/25 bg-dark-card px-2 py-1.5 text-xs text-zinc-300 outline-none">
      <option value="">Réseau : auto</option>
      <option value="none">Aucun réseau</option>
      {nets.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
      <option value="__new">+ Nouveau réseau…</option>
    </select>
  );
}

function EditForm({ station, custom, canReset, blocked, onSave, onReset, onCancel, onRemove, onBlock }: {
  station: Station; custom: boolean; canReset: boolean; blocked: boolean;
  onSave: (p: Partial<Station>) => void; onReset: () => void; onCancel: () => void; onRemove?: () => void; onBlock: () => void;
}) {
  const [f, setF] = useState({ name: station.name, url: station.url, favicon: station.favicon, country: station.country, countryCode: station.countryCode ?? "", tags: station.tags, group: station.group ?? "" });
  const field = (k: keyof typeof f, label: string) => (
    <label className="block text-xs text-zinc-400">
      {label}
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="mt-1 w-full rounded-lg border border-brand/25 bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none focus:border-brand/60" />
    </label>
  );
  return (
    <div className="mt-3 grid gap-3 border-t border-brand/25 pt-3 sm:grid-cols-2">
      {field("name", "Nom")}
      {field("url", "URL du flux")}
      {field("favicon", "URL du logo")}
      {field("country", "Pays")}
      {field("countryCode", "Code pays (FR, ID…)")}
      {field("tags", "Genres (séparés par des virgules)")}
      {custom && station.network && station.network !== "none" && field("group", "Sous-groupe dans le réseau (ex. Régionales)")}
      <div className="flex flex-wrap items-end gap-2 sm:col-span-2 sm:justify-end">
        {onRemove && <Btn onClick={onRemove}>Retirer du catalogue</Btn>}
        <Btn onClick={onBlock}>{blocked ? "Débloquer" : "Bloquer"}</Btn>
        {canReset && <Btn onClick={onReset}>Annuler mes corrections</Btn>}
        <Btn onClick={onCancel}>Fermer</Btn>
        <button onClick={() => onSave({ ...f, countryCode: f.countryCode.toUpperCase() || undefined, group: custom ? f.group || undefined : undefined })} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium hover:bg-brand-light">Enregistrer</button>
      </div>
    </div>
  );
}

function NetworkManager({ networks, count, form, onForm, onSave, onDelete, onOpen }: {
  networks: CustomNetwork[]; count: (id: string) => number; form: CustomNetwork | null;
  onForm: (n: CustomNetwork | null) => void; onSave: (n: CustomNetwork) => void;
  onDelete: (n: CustomNetwork) => void; onOpen: (id: string) => void;
}) {
  const field = (k: "name" | "country" | "description" | "logo", label: string) => (
    <label className="block text-xs text-zinc-400">
      {label}
      <input value={form?.[k] ?? ""} onChange={(e) => onForm({ ...form!, [k]: e.target.value })} className="mt-1 w-full rounded-lg border border-brand/25 bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none focus:border-brand/60" />
    </label>
  );
  return (
    <div className="mb-6 space-y-2">
      <p className="text-xs text-zinc-500">
        Un réseau regroupe des stations que tu choisis (ex. « Mes radios jazz »). Il apparaît dans l&apos;onglet Réseaux du site. Range-y des stations par glisser-déposer ou avec le menu « Réseau » de chaque station.
      </p>
      {networks.map((n) => (
        <div key={n.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-brand/15 bg-white/[0.03] p-3">
          <div className="min-w-0 flex-1 basis-40">
            <div className="truncate text-sm font-medium">{n.name}</div>
            <div className="truncate text-xs text-zinc-500">{[n.country, `${count(n.id)} station(s)`, n.description].filter(Boolean).join(" · ")}</div>
          </div>
          <Btn onClick={() => onOpen(n.id)}>Stations</Btn>
          <Btn onClick={() => onForm(n)}>Modifier</Btn>
          <Btn onClick={() => onDelete(n)}>Supprimer</Btn>
        </div>
      ))}
      {form ? (
        <div className="grid gap-3 rounded-2xl border border-brand/25 bg-white/[0.03] p-3 sm:grid-cols-2">
          {field("name", "Nom du réseau")}
          {field("country", "Pays / région (optionnel)")}
          {field("description", "Description")}
          {field("logo", "URL du logo (optionnel)")}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Btn onClick={() => onForm(null)}>Annuler</Btn>
            <button disabled={!form.name.trim()} onClick={() => onSave({ ...form, name: form.name.trim() })} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium hover:bg-brand-light disabled:opacity-40">Enregistrer</button>
          </div>
        </div>
      ) : (
        <Btn onClick={() => onForm({ id: `perso-${crypto.randomUUID().slice(0, 8)}`, name: "", country: "", description: "", logo: "" })}>+ Nouveau réseau</Btn>
      )}
    </div>
  );
}

function Btn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className="rounded-lg border border-brand/25 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 disabled:opacity-40 sm:py-1.5 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}
