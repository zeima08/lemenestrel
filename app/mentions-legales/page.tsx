import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "../components/Brand";
import { RecordingNotice } from "../components/RecordingNotice";

export const metadata: Metadata = {
  title: "Mentions légales & confidentialité — Le Ménestrel by zeimacode",
  description: "Informations sur l’éditeur, les radios, les droits des contenus et les données du Ménestrel.",
};

export default function LegalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-9">
      <Brand />
      <Link href="/" className="mt-8 inline-block text-sm text-zinc-400 underline underline-offset-4 hover:text-white">← Retour aux radios</Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Mentions légales & confidentialité</h1>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-400">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Éditeur et hébergement</h2>
          <p>Le Ménestrel by zeimacode est un projet personnel de loisir, développé sur le temps libre de son créateur pour apprendre, tester et expérimenter. Il est proposé gratuitement, sans finalité commerciale et sans rémunération pour son créateur au titre de ce projet.</p>
          <p className="mt-3">Ce projet expérimental est consacré au référencement et à l’écoute de radios en ligne, ainsi qu’à l’enregistrement d’émissions pour un usage privé, dans les limites autorisées par la loi.</p>
          <dl className="mt-4 space-y-3">
            <div><dt className="font-medium text-foreground">Éditeur et responsable de la publication</dt><dd>zeimacode — coordonnées de l’éditeur disponibles sur <a href="https://zeimacode.com" className="underline underline-offset-4 hover:text-white">zeimacode.com</a>.</dd></div>
            <div><dt className="font-medium text-foreground">Contact</dt><dd><a href="mailto:bonjour.zeimacode@tuta.com" className="break-all underline underline-offset-4 hover:text-white">bonjour.zeimacode@tuta.com</a>, pour les demandes relatives au site, aux données ou aux contenus.</dd></div>
            <div><dt className="font-medium text-foreground">Hébergeur</dt><dd>Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.<br /><a href="https://vercel.com/contact" className="underline underline-offset-4 hover:text-white">Contacter Vercel</a> · <a href="https://vercel.com/legal/privacy-notice" className="underline underline-offset-4 hover:text-white">Informations légales et confidentialité de Vercel</a></dd></div>
          </dl>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Usage privé et responsabilité de l’utilisateur</h2>
          <p>Le site référence des flux fournis par des radios tierces et propose des outils d’écoute et d’enregistrement. Il ne produit pas les émissions référencées. L’enregistrement est destiné à un usage strictement privé, dans les limites autorisées par la loi et à partir de sources licites.</p>
          <p className="mt-3">Chaque utilisateur est responsable de son utilisation du site et des fichiers qu’il enregistre. Il lui appartient de respecter les droits d’auteur et les droits voisins. L’accès à un flux ne vaut pas autorisation de le copier ou de le réutiliser. Le partage, la mise en ligne, la rediffusion et l’exploitation commerciale peuvent nécessiter l’autorisation des titulaires de droits.</p>
          <p className="mt-3">Le caractère expérimental du projet implique que des interruptions ou des erreurs peuvent survenir. Le service est proposé sans garantie de disponibilité continue. Ces indications ne limitent pas les responsabilités ou obligations légales qui s’appliquent à l’éditeur.</p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Radios et droits des contenus</h2>
          <p>Le Ménestrel permet d’accéder à des flux de radios fournis par des tiers. Les programmes, musiques, noms et logos des stations restent soumis aux droits de leurs titulaires respectifs. Leur présence dans le catalogue n’implique aucun partenariat avec zeimacode.</p>
          <p className="mt-3">Les stations gèrent leurs programmes et leurs flux. Leur disponibilité et leur contenu peuvent évoluer. Pour demander la correction ou le retrait d’une station ou d’un logo, écrivez à <a href="mailto:bonjour.zeimacode@tuta.com" className="break-all underline underline-offset-4 hover:text-white">bonjour.zeimacode@tuta.com</a>.</p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Données et services externes</h2>
          <p>Les favoris, réglages et choix d’enregistrement sont conservés dans le stockage local du navigateur. Les enregistrements conservés dans l’application sont stockés sur votre appareil, dans la base locale du navigateur. Vous pouvez les supprimer depuis l’application ou effacer les données du site dans votre navigateur.</p>
          <p className="mt-3">La recherche de radios utilise Radio Browser. L’écoute et l’affichage des logos peuvent établir des connexions avec les fournisseurs de flux et d’images. Ces services reçoivent les données techniques nécessaires à la connexion, notamment votre adresse IP, et appliquent leurs propres politiques de confidentialité.</p>
          <p className="mt-3">Vercel, l’hébergeur du site, peut traiter des données techniques de connexion dans ses journaux. Consultez sa <a href="https://vercel.com/legal/privacy-notice" className="underline underline-offset-4 hover:text-white">politique de confidentialité</a> pour les informations relatives à ses traitements. Pour toute question sur vos données ou pour exercer vos droits applicables, contactez l’éditeur à <a href="mailto:bonjour.zeimacode@tuta.com" className="break-all underline underline-offset-4 hover:text-white">bonjour.zeimacode@tuta.com</a>. La durée de conservation des journaux dépend de la configuration de l’hébergement et reste à préciser.</p>
        </section>
        <RecordingNotice />
        <p className="border-t border-border pt-5 text-xs">Références : <a href="https://www.economie.gouv.fr/entreprises/developper-son-entreprise/innover-et-numeriser-son-entreprise/mentions-sur-votre-site-internet-les-obligations-respecter" className="underline underline-offset-4">mentions obligatoires (Ministère de l’Économie)</a> et <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi" className="underline underline-offset-4">stockage et traceurs (CNIL)</a>.</p>
      </div>
    </main>
  );
}
