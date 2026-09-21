"use client";

import { useEffect, useState } from "react";
import { deleteRecording, fmtDuration, fmtSize, listRecordings, type Recording } from "@/lib/recordings";

export function Recordings({ refreshKey, onPlayStart }: { refreshKey: number; onPlayStart: () => void }) {
  const [items, setItems] = useState<Recording[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    listRecordings().then(setItems).catch(() => setItems([]));
  }, [refreshKey]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const toggle = (r: Recording) => {
    if (openId === r.id) { setOpenId(null); setUrl(null); return; }
    setOpenId(r.id);
    setUrl(URL.createObjectURL(r.blob));
    onPlayStart();
  };

  const download = (r: Recording) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(r.blob);
    a.download = `${r.name.replace(/[\\/:*?"<>|]/g, "-")}.${r.ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const remove = async (r: Recording) => {
    if (!confirm(`Supprimer « ${r.name} » ?`)) return;
    await deleteRecording(r.id);
    if (openId === r.id) { setOpenId(null); setUrl(null); }
    setItems((l) => l?.filter((x) => x.id !== r.id) ?? null);
  };

  if (!items) return null;
  if (!items.length)
    return <p className="py-16 text-center text-zinc-500">Aucun enregistrement. Lance une radio puis appuie sur ● REC.</p>;

  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li key={r.id} className="rounded-2xl border border-brand/15 bg-white/[0.03] p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button onClick={() => toggle(r)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand hover:bg-brand-light" aria-label="Lire">
              {openId === r.id ? "✕" : "▶"}
            </button>
            <div className="min-w-0 flex-1 basis-40">
              <div className="truncate font-medium">{r.name}</div>
              <div className="text-xs text-zinc-400">{fmtDuration(r.duration)} · {fmtSize(r.size)} · .{r.ext}</div>
            </div>
            <button onClick={() => download(r)} className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 sm:py-1.5" aria-label="Télécharger">⬇<span className="hidden sm:inline"> Télécharger</span></button>
            <button onClick={() => remove(r)} className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:bg-red-500/20 hover:text-red-300" aria-label="Supprimer">🗑</button>
          </div>
          {openId === r.id && url && <audio src={url} controls autoPlay className="mt-3 w-full" />}
        </li>
      ))}
    </ul>
  );
}
