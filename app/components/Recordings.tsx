"use client";

import { useEffect, useState } from "react";
import { RecordingNotice } from "./RecordingNotice";
import { deleteRecording, exportRecording, fmtDuration, fmtSize, listRecordings, type Recording } from "@/lib/recordings";

export function Recordings({ refreshKey, onPlayStart, temporaryRecordings, onRemoveTemporary }: {
  refreshKey: number;
  onPlayStart: () => void;
  temporaryRecordings: Recording[];
  onRemoveTemporary: (id: string) => void;
}) {
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

  const remove = async (r: Recording) => {
    if (!confirm(`Supprimer « ${r.name} » ?`)) return;
    if (temporaryRecordings.some((item) => item.id === r.id)) onRemoveTemporary(r.id);
    else await deleteRecording(r.id);
    if (openId === r.id) { setOpenId(null); setUrl(null); }
    setItems((l) => l?.filter((x) => x.id !== r.id) ?? null);
  };

  if (!items && !temporaryRecordings.length) return null;
  const recordings = [...temporaryRecordings, ...(items ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  if (!recordings.length)
    return <div><p className="py-16 text-center text-zinc-500">Aucun enregistrement sur cet appareil. Lance une radio puis appuie sur ● REC.</p><RecordingNotice /></div>;

  return (
    <div>
    {temporaryRecordings.length > 0 && <p role="alert" className="mb-4 text-sm text-amber-300">Le stockage du navigateur est indisponible. Les enregistrements temporaires doivent être exportés avant de fermer ou recharger cette page.</p>}
    <p className="mb-5 text-sm leading-relaxed text-zinc-400">Vos enregistrements sont conservés dans le navigateur de cet appareil. Utilisez « Enregistrer sur l’appareil » pour en garder un fichier dans vos téléchargements ou, si proposé par votre téléphone, dans Fichiers. Les fichiers enregistrés directement sont dans le dossier choisi.</p>
    <ul className="space-y-2">
      {recordings.map((r) => (
        <li key={r.id} className="rounded-2xl border border-brand/15 bg-white/[0.03] p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button onClick={() => toggle(r)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand hover:bg-brand-light" aria-label="Lire">
              {openId === r.id ? "✕" : "▶"}
            </button>
            <div className="min-w-0 flex-1 basis-40">
              <div className="truncate font-medium">{r.name}</div>
              <div className="text-xs text-zinc-400">{fmtDuration(r.duration)} · {fmtSize(r.size)} · .{r.ext}</div>
              {temporaryRecordings.some((item) => item.id === r.id) && <p className="text-xs text-amber-300">Temporaire · à exporter</p>}
            </div>
            <button onClick={() => exportRecording(r)} className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 sm:py-1.5" aria-label={`Enregistrer ${r.name} sur l’appareil`}>⬇<span className="ml-1">Enregistrer sur l’appareil</span></button>
            <button onClick={() => remove(r)} className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:bg-red-500/20 hover:text-red-300" aria-label="Supprimer">🗑</button>
          </div>
          {openId === r.id && url && <audio src={url} controls autoPlay className="mt-3 w-full" />}
        </li>
      ))}
    </ul>
    <div className="mt-6"><RecordingNotice /></div>
    </div>
  );
}
