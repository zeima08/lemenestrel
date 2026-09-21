# Le Ménestrel

Webapp de radio en ligne : écoute des milliers de radios du monde entier, classées par réseaux (Radio France, RRI, BBC…), et **enregistre-les** en un clic.

Construit avec Next.js 16, React 19 et Tailwind CSS 4. Les stations viennent de l'API libre [Radio Browser](https://www.radio-browser.info/), sans clé ni compte.

## Fonctionnalités

- **Découvrir** : recherche par nom, filtre par pays (tous les pays disponibles) et par genre, pagination « Charger plus ».
- **Réseaux** : les grands groupes radio (Radio France, RRI, RFI, NRJ, RTL, RTBF, RTS, BBC, NPR…) avec leurs versions régionales et locales, logos inclus.
- **Favoris** : gardés dans le navigateur.
- **Enregistrement** : bouton **● REC**, flux capturé tel quel (sans ré-encodage, donc sans perte).
  - Sur Chrome, Edge et Brave, l'enregistrement est écrit **directement sur le disque** au fur et à mesure : idéal pour les longues sessions.
  - Sinon, il est gardé dans le navigateur (onglet **Enregistrements**) puis téléchargeable en mp3, aac ou ogg.
- **Stations en panne** : masquées automatiquement à la lecture (avec un bouton Annuler).
- **Admin local** : gestion du catalogue, voir plus bas.

## Démarrage

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:3000
```

Pour la production :

```bash
npm run build
npm run start
```

## Enregistrer une radio

1. Lance une station.
2. Clique sur **● REC**. Sur Chrome/Edge, choisis où créer le fichier (case « Sur disque » cochée).
3. Clique sur **■ Stop** pour terminer.

Le flux passe par une petite route serveur (`/api/stream`) qui contourne les restrictions CORS des radios. Elle refuse les adresses locales et privées. Elle consomme de la bande passante et des connexions longues : prévois un hébergement classique (VPS, Docker) plutôt qu'un hébergement serverless avec limite de durée.

## Admin (en local uniquement)

Ouvre `/admin` pendant `npm run dev` (lien en bas de la page d'accueil). Tout est écrit dans [`data/catalog.json`](data/catalog.json) :

- **Recherche globale** : catalogue, stations bloquées et Radio Browser.
- **Tester les flux** : les stations mortes passent en rouge avec une icône de signal barré. Un clic bloque toutes les mortes.
- **Modifier** une station : nom, flux, logo, pays, genres.
- **Réseaux personnalisés** et **catégories** : crée tes propres groupes, puis range les stations par glisser-déposer ou avec le menu « Réseau ».
- **Vues** : liste, grille ou compact.

Pour publier tes changements : `git commit` + `git push` de `data/catalog.json`. Le site le lit au moment du build. L'écriture est refusée en production et hors `localhost`.

## Structure

```
app/
  page.tsx                  page d'accueil
  components/               interface (lecteur, réseaux, enregistrements)
  admin/                    admin du catalogue (local)
  api/stream/               relais des flux audio (enregistrement)
  api/check/                test de disponibilité d'un flux
  api/admin/catalog/        écriture de data/catalog.json (local)
lib/
  radio.ts                  client de l'API Radio Browser
  networks.ts               définition des réseaux (Radio France, RRI…)
  catalog.ts                catalogue éditorial (blocages, corrections, réseaux)
  recordings.ts             enregistrements (IndexedDB)
data/catalog.json           catalogue versionné
```

## Installer sur mobile (PWA)

Le Ménestrel est une application web installable : un bouton **📲 Installer** apparaît en haut de la page (Chrome / Android, Edge, Chrome desktop). Sur iPhone / iPad : **Partager → Sur l'écran d'accueil**. Une fois installée, l'app s'ouvre en plein écran avec son icône, et affiche tes favoris et enregistrements même hors ligne. Les flux radio, eux, demandent une connexion.

Le service worker n'est actif qu'en production (`npm run build && npm run start`). L'installation exige HTTPS, sauf sur `localhost`.

## Notes

- Favoris, volume et enregistrements sont stockés dans ton navigateur : ils ne suivent pas d'un appareil à l'autre.
- Les logos des réseaux sont récupérés via le service de favicons de Google.
