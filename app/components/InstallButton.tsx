"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt(): Promise<void> };

// Enregistre le service worker (production) et propose d'installer l'app.
export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) setIos(true);

    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallEvent); };
    const onInstalled = () => { setPrompt(null); setIos(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt && !ios) return null;

  return (
    <div className="relative">
      <button
        onClick={async () => {
          if (prompt) { await prompt.prompt(); setPrompt(null); }
          else setHint((h) => !h);
        }}
        className="rounded-full border border-brand/40 px-3 py-1.5 text-xs text-brand-light hover:bg-brand/15"
      >
        📲 Installer
      </button>
      {hint && (
        <div className="absolute left-0 top-full z-20 mt-2 w-60 rounded-xl border border-brand/25 bg-dark-card p-3 text-xs text-zinc-300 shadow-xl">
          Sur iPhone / iPad : touche <b>Partager</b> puis <b>« Sur l&apos;écran d&apos;accueil »</b>.
        </div>
      )}
    </div>
  );
}
