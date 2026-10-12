"use client";

import { Heart, Play, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Station } from "@/lib/radio";

export function Logo({ station, size = 48, dead = false }: { station: Station; size?: number; dead?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className={`relative grid h-full w-full place-items-center overflow-hidden rounded-xl border border-white/5 bg-[#292929] font-semibold text-white ${dead ? "opacity-50 grayscale" : ""}`}>
        {station.name.charAt(0).toUpperCase() || "♪"}
        {station.favicon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={station.favicon} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = "none")} className="absolute inset-0 h-full w-full bg-dark-card object-contain" />
        )}
      </div>
      {dead && <span className="absolute -bottom-1 -right-1 size-3 rounded-full bg-red-500" role="img" aria-label="Station indisponible" />}
    </div>
  );
}

export function StationCard({ station, active, playing, favorite, onPlay, onFavorite }: {
  station: Station; active: boolean; playing: boolean; favorite: boolean;
  onPlay: () => void; onFavorite: () => void;
}) {
  return (
    <Card className={`group relative min-w-0 p-4 transition-colors sm:p-5 ${active ? "border-zinc-400 bg-[#242424]" : "hover:border-zinc-500 hover:bg-[#1e1e1e]"}`}>
      <Button variant="ghost" size="icon" onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? `Retirer ${station.name} des favoris` : `Ajouter ${station.name} aux favoris`} className={`absolute right-2 top-2 size-8 ${favorite ? "text-white" : "text-zinc-500"}`}><Heart className={favorite ? "fill-current" : ""} /></Button>
      <button onClick={onPlay} className="block w-full text-left" aria-label={`Écouter ${station.name}`}>
        <Logo station={station} size={64} />
        <h3 className="mt-5 truncate text-sm font-semibold">{station.name}</h3>
        <p className="mt-1 truncate text-xs text-zinc-500">{station.tags.split(",").slice(0, 2).join(" · ") || station.country || "Radio en direct"}</p>
        <div className="mt-5 flex items-center justify-between"><span className="truncate pr-2 text-[10px] text-zinc-500">{station.bitrate ? `${station.bitrate} kbps` : station.country || "En direct"}</span><span className={`grid size-8 shrink-0 place-items-center rounded-full transition-colors ${active ? "bg-white text-black" : "bg-white/5 text-zinc-400 group-hover:bg-white group-hover:text-black"}`}>{active && playing ? <AudioLines size={14} /> : <Play size={12} className="fill-current" />}</span></div>
      </button>
    </Card>
  );
}
