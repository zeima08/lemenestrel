"use client";

import type { Station } from "@/lib/radio";

export function Logo({ station, size = 48, dead = false }: { station: Station; size?: number; dead?: boolean }) {
  const initial = station.name.charAt(0).toUpperCase() || "♪";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl bg-brand grid place-items-center font-bold text-white ${dead ? "opacity-50 grayscale" : ""}`}
    >
      {initial}
      {station.favicon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={station.favicon}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="absolute inset-0 h-full w-full bg-dark-card object-contain"
        />
      )}
    </div>
    {dead && (
      <svg viewBox="0 0 16 16" className="absolute -bottom-1 -right-1 h-4 w-4" aria-label="Station morte">
        <circle cx="8" cy="8" r="8" fill="#dc2626" />
        <path d="M4 11v1M7 9v3M10 7v5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 3l10 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )}
    </div>
  );
}

export function StationCard({
  station, active, playing, favorite, onPlay, onFavorite,
}: {
  station: Station; active: boolean; playing: boolean; favorite: boolean;
  onPlay: () => void; onFavorite: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl border p-3 transition ${
        active ? "border-brand/60 bg-brand/10" : "border-brand/15 bg-white/[0.03] hover:bg-white/[0.07]"
      }`}
    >
      <button onClick={onPlay} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Écouter ${station.name}`}>
        <Logo station={station} />
        <div className="min-w-0">
          <div className="truncate font-medium">{station.name}</div>
          <div className="truncate text-xs text-zinc-400">
            {[station.country, station.tags.split(",").slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
          </div>
        </div>
        {active && playing && <Bars />}
      </button>
      <button
        onClick={onFavorite}
        aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        className={`text-xl transition ${favorite ? "text-brand-light" : "text-zinc-600 hover:text-zinc-300"}`}
      >
        {favorite ? "♥" : "♡"}
      </button>
    </div>
  );
}

function Bars() {
  return (
    <div className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1 animate-pulse rounded-full bg-brand-light" style={{ height: `${50 + i * 25}%`, animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  );
}
