"use client";

import { useEffect, type RefObject } from "react";
import { AudioLines, ArrowRight, Globe2, Heart, Mic2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordingNotice } from "./RecordingNotice";

const CHOICE_KEY = "menestrel.recording-choice.v1";
const features = [
  { icon: Search, title: "Rechercher une radio", description: "Recherchez une radio et filtrez par pays ou style musical dans le nouvel accueil." },
  { icon: Globe2, title: "Réseaux de radios", description: "Retrouvez les stations nationales et régionales de Radio Platine, RedZing et des autres réseaux." },
  { icon: Heart, title: "Favoris", description: "Appuyez sur le cœur d’une radio pour la retrouver dans Mes favoris. Votre sélection reste enregistrée dans ce navigateur." },
  { icon: Mic2, title: "Enregistrement", description: "Lancez une radio, puis appuyez sur REC dans le lecteur. Le son est sauvegardé sur votre ordinateur ou téléphone. Retrouvez-le dans Enregistrements pour le réécouter ou l’exporter en fichier." },
];

export function WelcomeDialog({ dialogRef, onChoice }: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onChoice: (allowed: boolean) => void;
}) {
  useEffect(() => {
    let choice: string | null = null;
    try {
      choice = localStorage.getItem(CHOICE_KEY);
    } catch {}
    if (choice === "accepted" || choice === "refused") {
      onChoice(choice === "accepted");
    } else if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [dialogRef, onChoice]);

  const choose = (allowed: boolean) => {
    onChoice(allowed);
    try {
      localStorage.setItem(CHOICE_KEY, allowed ? "accepted" : "refused");
    } catch {
      // Le choix reste appliqué pour cette visite si le stockage est désactivé.
    }
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => { event.preventDefault(); choose(false); }}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 sm:p-8">
        <Button variant="ghost" size="icon" onClick={() => choose(false)} aria-label="Fermer et continuer sans enregistrement" className="absolute right-3 top-3 text-zinc-400"><X /></Button>
        <span className="mb-5 grid size-12 place-items-center rounded-xl bg-white text-black"><AudioLines size={26} /></span>
        <h2 id="welcome-title" className="text-2xl font-semibold tracking-tight">Fonctionnalités et enregistrement</h2>
        <p id="welcome-description" className="mt-3 text-sm leading-relaxed text-zinc-400">Présentation des fonctionnalités et choix concernant l’enregistrement sur votre appareil.</p>
        <ul className="my-7 space-y-5">
          {features.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-zinc-300"><Icon size={17} /></span>
              <div><h3 className="text-sm font-medium">{title}</h3><p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p></div>
            </li>
          ))}
        </ul>
        <RecordingNotice />
        <p className="mt-4 text-xs leading-relaxed text-zinc-400">L’écoute reste accessible dans les deux cas. Vous pouvez modifier votre choix à tout moment depuis « Choix d’enregistrement ».</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button autoFocus variant="outline" onClick={() => choose(false)}>Refuser</Button>
          <Button onClick={() => choose(true)}>Activer l’enregistrement <ArrowRight /></Button>
        </div>
      </div>
    </dialog>
  );
}
