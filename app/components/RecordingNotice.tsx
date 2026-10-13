export function RecordingNotice() {
  return (
    <section aria-label="Stockage local et droits des contenus" className="rounded-xl border border-border bg-background/50 p-4 text-xs leading-relaxed text-zinc-400">
      <h3 className="mb-2 text-sm font-medium text-foreground">Votre appareil, vos enregistrements</h3>
      <p>L’enregistrement sauvegarde le son sur votre ordinateur ou téléphone. Il ne démarre qu’en appuyant sur REC. Lorsque l’accès direct à la radio est bloqué par le navigateur, le serveur du Ménestrel relaie le flux audio sans y conserver le fichier enregistré.</p>
      <p className="mt-2">Vos favoris, réglages et votre choix concernant l’enregistrement sont mémorisés dans ce navigateur. Les enregistrements y restent jusqu’à leur suppression ou l’effacement des données du site ; le navigateur peut aussi libérer cet espace. Exportez les fichiers à conserver. Un fichier exporté ou enregistré directement se supprime depuis votre appareil.</p>
      <p className="mt-2">La connexion directe communique votre adresse IP au fournisseur du flux. Les services externes utilisés pour les radios et leurs logos peuvent également recevoir des données de connexion, selon leurs propres politiques.</p>
      <p className="mt-2">Enregistrez uniquement des sources licites, pour votre usage privé, dans les limites prévues par la loi. La diffusion, le partage ou l’utilisation commerciale peuvent nécessiter l’autorisation des titulaires de droits.</p>
      <p className="mt-2">« Activer l’enregistrement » autorise cette fonctionnalité sur cet appareil. « Refuser » conserve l’accès à l’écoute et désactive l’enregistrement. Ce choix ne constitue pas un consentement à des traceurs publicitaires ni une autorisation de réutiliser les contenus.</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">Stockage et traceurs : CNIL</a>
        <a href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006278912/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">Droits d’auteur : article L122-5</a>
      </div>
    </section>
  );
}
