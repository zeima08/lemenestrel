"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyCatalog, type Catalog } from "@/lib/catalog";
import { HIDDEN_KEY, addHidden, type HiddenEntry } from "@/lib/hidden";
import { usePersisted } from "@/lib/usePersisted";
import {
  FALLBACK_COUNTRIES,
  GENRES,
  PAGE_SIZE,
  fetchCountries,
  searchStations,
  type Country,
  type Station,
} from "@/lib/radio";
import {
  extFromCodec,
  extFromMime,
  fmtDuration,
  fmtSize,
  recordingName,
  saveRecording,
} from "@/lib/recordings";
import { Logo, StationCard } from "./StationCard";
import { Networks } from "./Networks";
import { Recordings } from "./Recordings";

type Tab = "discover" | "networks" | "favorites" | "recordings";

export default function RadioApp({ catalog }: { catalog: Catalog }) {
  const [tab, setTab] = useState<Tab>("discover");
  const [query, setQuery] = useState("");
  const [country, setCountry] = usePersisted("tz.country", "FR");
  const [tag, setTag] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [countries, setCountries] = useState<Country[]>(FALLBACK_COUNTRIES);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = usePersisted<Station[]>("tz.favorites", []);
  const [volume, setVolume] = usePersisted("tz.volume", 0.8);

  const [current, setCurrent] = useState<Station | null>(null);
  const [playing, setPlaying] = useState(false);
  const [streamError, setStreamError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- enregistrement ---
  const [rec, setRec] = useState<{
    station: Station;
    bytes: number;
    elapsed: number;
  } | null>(null);
  const recRef = useRef<{ abort: AbortController; stop: () => void } | null>(
    null,
  );
  const [recKey, setRecKey] = useState(0);
  const [notice, setNotice] = useState<{
    msg: string;
    undo?: () => void;
  } | null>(null);
  const [hidden, setHidden] = usePersisted<HiddenEntry[]>(HIDDEN_KEY, []);
  const hiddenIds = useMemo(
    () => new Set(hidden.map((h) => h.station.id)),
    [hidden],
  );
  const canWriteDisk =
    typeof window !== "undefined" && "showSaveFilePicker" in window;
  const [toDisk, setToDisk] = usePersisted("tz.toDisk", true);

  // recherche (debounce)
  useEffect(() => {
    if (tab !== "discover") return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await searchStations(
          { name: query.trim(), country, tag },
          ctrl.signal,
        );
        setStations(res);
        setHasMore(res.length >= PAGE_SIZE);
      } catch {
        if (!ctrl.signal.aborted)
          setError("Impossible de charger les radios. Vérifie ta connexion.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, country, tag, tab]);

  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  const loadMore = async () => {
    setLoading(true);
    try {
      const res = await searchStations({
        name: query.trim(),
        country,
        tag,
        offset: stations.length,
      });
      setStations((l) => [
        ...l,
        ...res.filter((r) => !l.some((x) => x.id === r.id)),
      ]);
      setHasMore(res.length >= PAGE_SIZE);
    } catch {
      setError("Impossible de charger la suite.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const play = (s: Station) => {
    const a = audioRef.current;
    if (!a) return;
    setCurrent(s);
    setStreamError("");
    // Sur une page https, les flux http sont bloqués : on passe par le proxy.
    a.src =
      location.protocol === "https:" && s.url.startsWith("http:")
        ? `/api/stream?url=${encodeURIComponent(s.url)}`
        : s.url;
    a.play().catch((e: DOMException) => {
      if (e.name === "NotSupportedError") hideBroken(s);
      else if (e.name !== "AbortError")
        setStreamError("Lecture bloquée par le navigateur.");
    });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: s.name,
        artist: s.country || "Radio",
        artwork: s.favicon ? [{ src: s.favicon }] : [],
      });
    }
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) a.play().catch(() => setStreamError("Lecture impossible."));
    else a.pause();
  };

  const isFav = (s: Station) => favorites.some((f) => f.id === s.id);
  const toggleFav = (s: Station) =>
    setFavorites((f) =>
      f.some((x) => x.id === s.id) ? f.filter((x) => x.id !== s.id) : [s, ...f],
    );

  const flash = (msg: string, undo?: () => void) => {
    setNotice({ msg, undo });
    setTimeout(() => setNotice(null), undo ? 7000 : 4000);
  };

  // Station en panne : on la masque (annulable) et on coupe la lecture.
  const hideBroken = (s: Station) => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    setHidden((h) => addHidden(h, s, "Flux en erreur à la lecture"));
    setCurrent(null);
    setStreamError("");
    flash(`« ${s.name} » ne répond pas : masquée.`, () =>
      setHidden((h) => h.filter((x) => x.station.id !== s.id)),
    );
  };

  const startRec = async (station: Station) => {
    // Sauvegarde progressive : le fichier est choisi avant (geste utilisateur requis).
    let file: FileSystemWritableFileStream | null = null;
    if (canWriteDisk && toDisk) {
      const ext = extFromCodec(station.codec);
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${recordingName(station).replace(/[\\/:*?"<>|]/g, "-")}.${ext}`,
          types: [{ description: "Audio", accept: { "audio/*": [`.${ext}`] } }],
        });
        file = await handle.createWritable();
      } catch {
        return; // choix annulé
      }
    }
    const abort = new AbortController();
    const started = Date.now();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0;
    let mime = "audio/mpeg";
    let stopped = false;

    setRec({ station, bytes: 0, elapsed: 0 });
    const timer = setInterval(
      () =>
        setRec(
          (r) => r && { ...r, elapsed: (Date.now() - started) / 1000, bytes },
        ),
      500,
    );
    recRef.current = {
      abort,
      stop: () => {
        stopped = true;
        abort.abort();
      },
    };

    let failed = false;
    try {
      const res = await fetch(
        `/api/stream?url=${encodeURIComponent(station.url)}`,
        { signal: abort.signal },
      );
      if (!res.ok || !res.body) throw new Error("stream");
      mime = res.headers.get("content-type") ?? mime;
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (file) await file.write(value as Uint8Array<ArrayBuffer>);
        else chunks.push(value as Uint8Array<ArrayBuffer>);
        bytes += value.length;
      }
    } catch {
      failed = !stopped;
    }

    clearInterval(timer);
    recRef.current = null;
    setRec(null);
    if (file) {
      await file.close().catch(() => {});
      flash(
        failed
          ? "Flux interrompu : fichier partiel conservé sur le disque."
          : "Enregistrement sauvegardé sur le disque ✓",
      );
      return;
    }
    if (failed && !bytes) return flash("Impossible d'enregistrer ce flux.");
    if (!bytes) return;
    const duration = (Date.now() - started) / 1000;
    const ext = extFromMime(mime);
    await saveRecording({
      id: crypto.randomUUID(),
      name: recordingName(station),
      station: station.name,
      createdAt: started,
      duration,
      size: bytes,
      ext,
      blob: new Blob(chunks, { type: mime }),
    });
    setRecKey((k) => k + 1);
    flash(
      failed
        ? "Flux interrompu : enregistrement partiel sauvegardé."
        : "Enregistrement sauvegardé ✓",
    );
  };

  const toggleRec = () => {
    if (rec) recRef.current?.stop();
    else if (current) startRec(current);
  };

  // avertit avant de fermer pendant un enregistrement
  useEffect(() => {
    if (!rec) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [rec]);

  const q = query.trim().toLowerCase();
  const custom = catalog.custom.filter(
    (s) =>
      (!country || s.countryCode === country) &&
      (!q || s.name.toLowerCase().includes(q)) &&
      (!tag || s.tags.toLowerCase().includes(tag)),
  );
  const list = applyCatalog(
    tab === "favorites" ? favorites : [...custom, ...stations],
    catalog,
  ).filter((s) => !hiddenIds.has(s.id));

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-40 pt-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="bg-gradient-to-r from-brand-light to-brand bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          Le <span className="font-light">Ménestrel</span>
        </h1>
        <nav className="flex rounded-full bg-white/5 p-1 text-sm">
          {(
            [
              ["discover", "Découvrir"],
              ["networks", "Réseaux"],
              [
                "favorites",
                `Favoris${favorites.length ? ` (${favorites.length})` : ""}`,
              ],
              ["recordings", "Enregistrements"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 transition ${tab === k ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "discover" && (
        <section className="mb-5 space-y-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une radio…"
              className="min-w-0 flex-1 rounded-xl border border-brand/25 bg-white/5 px-4 py-2.5 outline-none placeholder:text-zinc-500"
            />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-xl border border-brand/25 bg-dark-card px-3 outline-none"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setTag(tag === g ? "" : g)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition ${tag === g ? "border-brand bg-brand/20 text-brand-light" : "border-brand/25 text-zinc-400 hover:text-white"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </section>
      )}

      <main className="flex-1">
        {tab === "networks" ? (
          <Networks
            catalog={catalog}
            hiddenIds={hiddenIds}
            currentId={current?.id}
            playing={playing}
            isFav={isFav}
            onPlay={play}
            onFavorite={toggleFav}
          />
        ) : tab === "recordings" ? (
          <Recordings
            refreshKey={recKey}
            onPlayStart={() => audioRef.current?.pause()}
          />
        ) : (
          <>
            {loading && (
              <p className="py-10 text-center text-zinc-500">Chargement…</p>
            )}
            {error && <p className="py-10 text-center text-red-400">{error}</p>}
            {!loading && !error && !list.length && (
              <p className="py-16 text-center text-zinc-500">
                {tab === "favorites"
                  ? "Aucun favori pour l'instant. Appuie sur ♡ pour en ajouter."
                  : "Aucune radio trouvée."}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((s) => (
                <StationCard
                  key={s.id}
                  station={s}
                  active={current?.id === s.id}
                  playing={playing}
                  favorite={isFav(s)}
                  onPlay={() => play(s)}
                  onFavorite={() => toggleFav(s)}
                />
              ))}
            </div>
            {tab === "discover" && hasMore && !loading && !error && (
              <button
                onClick={loadMore}
                className="mx-auto mt-4 block rounded-full border border-brand/25 px-5 py-2 text-sm text-zinc-300 hover:bg-white/10"
              >
                Charger plus
              </button>
            )}
          </>
        )}
      </main>

      {process.env.NODE_ENV !== "production" && (
        <footer className="mt-10 text-center text-xs text-zinc-600">
          <Link href="/admin" className="hover:text-zinc-300">
            Admin (local)
            {hidden.length
              ? ` · ${hidden.length} masquée${hidden.length > 1 ? "s" : ""} ici`
              : ""}
          </Link>
        </footer>
      )}

      {/* Lecteur */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-brand/25 bg-dark-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {notice && (
            <div className="mb-2 flex items-center justify-center gap-3 rounded-lg bg-white/10 px-3 py-1.5 text-sm">
              {notice.msg}
              {notice.undo && (
                <button
                  onClick={() => {
                    notice.undo?.();
                    setNotice(null);
                  }}
                  className="font-medium text-brand-light hover:underline"
                >
                  Annuler
                </button>
              )}
            </div>
          )}
          {current ? (
            <div className="flex items-center gap-3">
              <Logo station={current} size={48} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{current.name}</div>
                <div
                  className={`truncate text-xs ${streamError ? "text-red-400" : "text-zinc-400"}`}
                >
                  {streamError ||
                    (rec ? (
                      <span className="text-red-400">
                        ● REC {fmtDuration(rec.elapsed)} · {fmtSize(rec.bytes)}
                      </span>
                    ) : playing ? (
                      "En direct"
                    ) : (
                      "En pause"
                    ))}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(+e.target.value)}
                className="hidden w-24 accent-brand sm:block"
                aria-label="Volume"
              />
              {canWriteDisk && !rec && (
                <label
                  className="hidden cursor-pointer select-none items-center gap-1.5 text-xs text-zinc-400 md:flex"
                  title="Écrit l'enregistrement directement dans un fichier (recommandé pour les longues sessions)"
                >
                  <input
                    type="checkbox"
                    checked={toDisk}
                    onChange={(e) => setToDisk(e.target.checked)}
                    className="accent-brand"
                  />
                  Sur disque
                </label>
              )}
              <button
                onClick={toggleRec}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${rec ? "animate-pulse bg-red-600 text-white" : "border border-red-500/50 text-red-400 hover:bg-red-500/10"}`}
              >
                {rec ? "■ Stop" : "● REC"}
              </button>
              <button
                onClick={toggle}
                className="grid h-11 w-11 place-items-center rounded-full bg-white text-lg text-black hover:scale-105"
                aria-label={playing ? "Pause" : "Lecture"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-500">
              Choisis une radio pour commencer
            </p>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={(e) =>
          current && e.currentTarget.getAttribute("src") && hideBroken(current)
        }
        onPlaying={() => setStreamError("")}
      />
    </div>
  );
}
