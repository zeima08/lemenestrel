import type { Station } from "./radio";

export type Recording = {
  id: string;
  name: string;
  station: string;
  createdAt: number;
  duration: number; // secondes
  size: number;
  ext: string;
  blob: Blob;
};

const STORE = "recordings";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("tunerzeima", 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const req = fn(transaction.objectStore(STORE));
    transaction.oncomplete = () => { db.close(); resolve(req.result); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? req.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Stockage local indisponible")); };
  });
}

export const listRecordings = async () =>
  (await tx<Recording[]>("readonly", (s) => s.getAll())).sort((a, b) => b.createdAt - a.createdAt);
export const saveRecording = (r: Recording) => tx("readwrite", (s) => s.put(r));
export const deleteRecording = (id: string) => tx("readwrite", (s) => s.delete(id));

// Aucun relais applicatif : le navigateur lit directement le flux autorisé par la radio.
export function fetchRecordingStream(url: string, signal: AbortSignal) {
  return fetch(url, {
    signal,
    mode: "cors",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-store",
  });
}

export function downloadRecording(r: Recording) {
  const url = URL.createObjectURL(r.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${r.name.replace(/[\\/:*?"<>|]/g, "-")}.${r.ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Appelé depuis un bouton pour conserver le geste utilisateur requis sur mobile.
export async function exportRecording(r: Recording) {
  const file = new File([r.blob], `${r.name.replace(/[\\/:*?"<>|]/g, "-")}.${r.ext}`, {
    type: r.blob.type || "audio/mpeg",
  });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: r.name });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  downloadRecording(r);
}

export function extFromMime(mime: string) {
  if (mime.includes("aac")) return "aac";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("opus")) return "opus";
  if (mime.includes("mp4")) return "m4a";
  return "mp3";
}

export function extFromCodec(codec: string) {
  const c = (codec ?? "").toLowerCase();
  if (c.includes("aac")) return "aac";
  if (c.includes("ogg") || c.includes("vorbis")) return "ogg";
  if (c.includes("opus")) return "opus";
  return "mp3";
}

export function recordingName(station: Station, date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}h${pad(date.getMinutes())}`;
  return `${station.name} — ${d}`;
}

export function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export const fmtSize = (b: number) =>
  b > 1e6 ? `${(b / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1e3))} Ko`;

declare global {
  interface Window {
    showSaveFilePicker(opts?: {
      suggestedName?: string;
      types?: { description?: string; accept: Record<string, string[]> }[];
    }): Promise<{ createWritable(): Promise<FileSystemWritableFileStream> }>;
  }
}
