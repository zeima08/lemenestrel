"use client";

import Link from "next/link";
import { Disc3, Globe2, Heart, House, Library, Menu, Pause, Play, Radio, Search, Volume2, X } from "lucide-react";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  downloadRecording,
  fetchRecordingStream,
  extFromCodec,
  extFromMime,
  fmtDuration,
  fmtSize,
  recordingName,
  saveRecording,
} from "@/lib/recordings";
import { Logo, StationCard } from "./StationCard";
import { InstallButton } from "./InstallButton";
import { Networks } from "./Networks";
import { Recordings } from "./Recordings";
import { WelcomeDialog } from "./WelcomeDialog";

type Tab = "discover" | "networks" | "favorites" | "recordings";
const TAB_TITLES: Record<Tab, string> = {
  discover: "Accueil", networks: "Réseaux de radios",
  favorites: "Mes favoris", recordings: "Enregistrements",
};

export default function RadioApp({ catalog }: { catalog: Catalog }) {
  const [tab, setTab] = useState<Tab>("discover");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = usePersisted("tz.country", "FR");
  const [tag, setTag] = useState("");
  const [showWebradios, setShowWebradios] = usePersisted("tz.showWebradios", true);
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
  const [recordingAllowed, setRecordingAllowed] = useState(false);
  const welcomeRef = useRef<HTMLDialogElement>(null);
  const chooseRecording = useCallback((allowed: boolean) => {
    setRecordingAllowed(allowed);
    if (!allowed) recRef.current?.stop();
  }, []);
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
    if (tab !== "discover" || !showWebradios) return;
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
  }, [query, country, tag, tab, showWebradios]);

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
    if (!recordingAllowed) return;
    if (location.protocol === "https:" && station.url.startsWith("http:")) {
      flash("Cette radio utilise un flux non sécurisé : l’enregistrement direct est indisponible sur ce site HTTPS.");
      return;
    }
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
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          flash("Impossible de créer le fichier. Décochez Fichier direct pour enregistrer dans ce navigateur.");
        return;
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

    // Un flux radio en direct ne se termine jamais "normalement" : une coupure
    // (done précoce ou erreur réseau) est en général transitoire côté serveur,
    // donc on retente plutôt que d'arrêter l'enregistrement d'un coup.
    const MAX_RETRIES = 5;
    let retries = 0;
    let failed = false;
    while (!stopped) {
      try {
        const res = await fetchRecordingStream(station.url, abort.signal);
        if (!res.ok || !res.body) throw new Error("stream");
        mime = res.headers.get("content-type") ?? mime;
        const reader = res.body.getReader();
        let gotData = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (file) await file.write(value as Uint8Array<ArrayBuffer>);
          else chunks.push(value as Uint8Array<ArrayBuffer>);
          bytes += value.length;
          gotData = true;
          retries = 0;
        }
        if (!gotData) throw new Error("empty");
      } catch (error) {
        if (stopped) break;
        // Un refus CORS est indistinguable d’une erreur réseau. Aucun repli serveur.
        if (!bytes && error instanceof TypeError) {
          failed = true;
          break;
        }
      }
      if (stopped) break;
      retries++;
      if (retries > MAX_RETRIES) {
        failed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, Math.min(1000 * retries, 5000)));
    }

    clearInterval(timer);
    recRef.current = null;
    setRec(null);
    if (failed && !bytes) {
      await file?.abort().catch(() => {});
      flash("Enregistrement direct impossible : flux indisponible ou accès refusé par la radio au navigateur. Aucun relais serveur n’est utilisé.");
      return;
    }
    if (file) {
      try {
        await file.close();
      } catch {
        flash("Impossible de finaliser le fichier sur cet appareil.");
        return;
      }
      flash(
        failed
          ? "Flux interrompu : fichier partiel conservé sur le disque."
          : "Enregistrement sauvegardé sur le disque ✓",
      );
      return;
    }
    if (!bytes) return;
    const duration = (Date.now() - started) / 1000;
    const ext = extFromMime(mime);
    const recording = {
      id: crypto.randomUUID(),
      name: recordingName(station),
      station: station.name,
      createdAt: started,
      duration,
      size: bytes,
      ext,
      blob: new Blob(chunks, { type: mime }),
    };
    try {
      await saveRecording(recording);
    } catch {
      downloadRecording(recording);
      flash("Stockage du navigateur indisponible : téléchargement du fichier lancé.");
      return;
    }
    setRecKey((k) => k + 1);
    flash(
      failed
        ? "Flux interrompu : enregistrement partiel sauvegardé."
        : "Enregistrement conservé sur cet appareil · Retrouvez-le dans Enregistrements.",
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
    <div className="min-h-screen pb-[calc(12rem+env(safe-area-inset-bottom))] sm:pb-36 lg:pl-64">
      <WelcomeDialog dialogRef={welcomeRef} onChoice={chooseRecording} />
      <aside className="border-b border-border bg-[#141414] px-5 py-5 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:px-6 lg:pb-32 lg:pt-9">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <Button ref={menuButtonRef} variant="ghost" size="icon" className="size-11 shrink-0 lg:hidden" aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={menuOpen} aria-controls="navigation-panel" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        <div id="navigation-panel" className={`${menuOpen ? "flex" : "hidden"} flex-col lg:flex lg:flex-1`} onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
            menuButtonRef.current?.focus();
          }
        }}>
        <nav aria-label="Navigation principale" className="mt-5 flex flex-col gap-2 lg:mt-10">
          {([
            ["discover", "Accueil", House],
            ["networks", "Réseaux de radios", Globe2],
            ["favorites", "Mes favoris", Heart],
            ["recordings", "Enregistrements", Library],
          ] as const).map(([key, label, Icon]) => (
            <Button key={key} variant="ghost" onClick={() => { setTab(key); setMenuOpen(false); menuButtonRef.current?.focus(); }} aria-current={tab === key ? "page" : undefined} className={`h-11 justify-start px-3 ${tab === key ? "bg-white/10 text-white" : "text-zinc-500"}`}>
              <Icon /><span>{label}</span>{key === "favorites" && favorites.length > 0 && <span className="ml-auto rounded bg-white/10 px-1.5 text-xs">{favorites.length}</span>}
            </Button>
          ))}
        </nav>
        <Button variant="ghost" size="sm" onClick={() => { setMenuOpen(false); menuButtonRef.current?.focus(); welcomeRef.current?.showModal(); }} className="mt-4 h-11 justify-start px-3 text-zinc-400">Choix d’enregistrement</Button>
        <Link href="/mentions-legales" className="mt-3 block px-3 text-xs text-zinc-400 underline underline-offset-4 hover:text-white">Mentions légales & confidentialité</Link>
        <div className="mt-auto pt-4 lg:pt-12">

          <div className="mt-5"><InstallButton /></div>
        </div>
        </div>
      </aside>
      <div className="mx-auto min-w-0 max-w-[1480px] px-4 py-6 sm:px-9 lg:px-12 lg:py-10">
      <header className="mb-9 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{TAB_TITLES[tab]}</h1>
      </header>

      {tab === "discover" && (
        <section aria-label="Rechercher et filtrer les radios" className="mb-8 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3.5 top-3.5 size-4 text-zinc-500" /><Input
              aria-label="Rechercher une radio"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une radio…"
              className="bg-card pl-10"
            /></div>
            <select
              aria-label="Pays des radios"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-11 w-full shrink-0 rounded-lg border border-input bg-card px-3 text-sm outline-none sm:w-44"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-brand/25 px-3 py-1 text-xs text-zinc-400 hover:text-white">
              <input
                type="checkbox"
                checked={showWebradios}
                onChange={(e) => {
                  const v = e.target.checked;
                  setShowWebradios(v);
                  if (!v) {
                    setStations([]);
                    setHasMore(false);
                  }
                }}
                className="accent-brand"
              />
              Webradios
            </label>
            {GENRES.map((g) => (
              <Button variant="ghost" size="sm"
                aria-pressed={tag === g}
                key={g}
                onClick={() => setTag(tag === g ? "" : g)}
                className={`rounded-full border capitalize ${tag === g ? "border-white bg-white text-black hover:bg-zinc-200 hover:text-black" : "border-border text-zinc-400"}`}
              >
                {g}
              </Button>
            ))}
          </div>
        </section>
      )}

      <main>
        {tab === "discover" && !q && !tag && list.length > 0 && (
          <section aria-label="Sélection de radios" className="mb-10">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight">Sélection de radios</h2></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.slice(0, 3).map((station, index) => (
                <Card key={station.id} className="group relative overflow-hidden bg-[#1c1c1c] p-6 transition-colors hover:border-zinc-500">
                  <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full border border-white/[0.04]" /><div className="pointer-events-none absolute -right-3 -top-3 size-36 rounded-full border border-white/[0.04]" />
                  <div className="relative flex items-start justify-between"><Logo station={station} size={64} /><span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">0{index + 1} / Sélection</span></div>
                  <h3 className="relative mt-7 truncate text-xl font-semibold tracking-tight">{station.name}</h3><p className="mt-1 truncate text-xs text-zinc-500">{station.country || "Radio du monde"} · {station.tags.split(",")[0] || "En direct"}</p>
                  <Button onClick={() => play(station)} className="relative mt-5 rounded-full" size="sm"><Play className="fill-current" /> Écouter</Button>
                </Card>
              ))}
            </div>
          </section>
        )}
        {tab === "discover" && <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight">{q || tag ? "Résultats de recherche" : "Toutes les radios"}</h2><span className="text-xs text-zinc-500">{list.length} radios</span></div>}
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
            {loading && <div role="status" className="mb-5 flex items-center gap-2 text-sm text-zinc-500"><Disc3 className="size-4 animate-spin" /> Recherche des radios…</div>}
            {error && <p className="py-10 text-center text-red-400">{error}</p>}
            {!loading && !error && !list.length && (
              <p className="py-16 text-center text-zinc-500">
                {tab === "favorites"
                  ? "Aucun favori pour l'instant. Appuie sur ♡ pour en ajouter."
                  : "Aucune radio trouvée."}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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

      </div>
      {/* Lecteur */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[#161616]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1740px] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
          {notice && (
            <div role="status" className="mb-2 flex flex-wrap items-center justify-center gap-3 rounded-lg bg-white/10 px-3 py-1.5 text-sm">
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
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
              <Logo station={current} size={44} />
              <div className="min-w-0 basis-[calc(100%-4rem)] sm:basis-auto sm:flex-1">
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
              <Volume2 className="hidden size-4 text-zinc-500 sm:block" /><input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(+e.target.value)}
                className="hidden w-24 accent-brand sm:block"
                aria-label="Volume"
              />
              {recordingAllowed && canWriteDisk && !rec && (
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
                  Fichier direct
                </label>
              )}
              <button
                onClick={toggleRec}
                disabled={!rec && !recordingAllowed}
                title={recordingAllowed ? "Enregistrer sur cet appareil" : "Enregistrement désactivé. Modifiez votre choix dans Choix d’enregistrement."}
                className={`ml-auto shrink-0 rounded-full px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 sm:ml-0 sm:px-4 sm:py-2 ${rec ? "animate-pulse bg-red-600 text-white" : "border border-red-500/50 text-red-400 hover:bg-red-500/10"}`}
              >
                {rec ? "■ Stop" : "● REC"}
              </button>
              <button
                onClick={toggle}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white sm:h-11 sm:w-11 text-lg text-black hover:scale-105"
                aria-label={playing ? "Pause" : "Lecture"}
              >
                {playing ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4"><span className="grid size-11 place-items-center rounded-lg border border-border text-zinc-500"><Radio size={20} /></span><div><p className="text-sm text-zinc-500">Choisissez une radio pour commencer l’écoute.</p></div><span className="ml-auto grid size-11 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-600"><Play size={18} /></span></div>
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
