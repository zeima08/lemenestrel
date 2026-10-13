# Le Ménestrel

Application web de radio en ligne pour ordinateur et smartphone : recherchez des stations, explorez les réseaux, conservez vos favoris et enregistrez une radio sur votre appareil.

Projet personnel de loisir signé **zeimacode**, construit avec **Next.js 16**, **React 19**, **TypeScript** et **Tailwind CSS 4**. La recherche utilise l’API publique [Radio Browser](https://www.radio-browser.info/), sans compte ni clé API.

## Fonctionnalités

- **Accueil** : recherche par nom, filtres par pays et genre, sélection de radios et chargement de résultats supplémentaires.
- **Réseaux de radios** : stations nationales, régionales et locales regroupées par réseau.
- **Favoris** : sélection conservée dans le navigateur de l’appareil.
- **Lecteur** : lecture, pause, contrôle du volume sur ordinateur et informations de lecture via Media Session lorsque disponible.
- **Enregistrements** : capture du flux audio sans réencodage, écoute des fichiers enregistrés, export et suppression.
- **Stations en panne** : masquage local automatique en cas d’erreur de lecture, avec possibilité d’annuler.
- **Installation** : application web installable lorsque le navigateur le permet.
- **Administration locale** : édition du catalogue, des réseaux et des catégories.

## Démarrage en local

Prérequis : **Node.js 20.9 minimum** et npm.

```bash
npm ci
npm run dev
```

Ouvrez [localhost:3000](http://localhost:3000).

Pour vérifier le projet :

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Pour lancer la version de production après le build :

```bash
npm run start
```

## Enregistrer sur ordinateur ou smartphone

1. Acceptez l’activation de l’enregistrement dans l’écran d’accueil. Vous pouvez modifier ce choix depuis **Choix d’enregistrement** dans le menu.
2. Lancez une radio, puis appuyez sur **● REC**.
3. Le lecteur affiche la connexion au flux, puis **● REC**, la durée et la taille lorsque des données audio sont reçues. Le bouton devient **■ Stop**.
4. Appuyez sur **■ Stop** pour terminer et sauvegarder.

### Sur smartphone et appareil tactile

L’enregistrement est conservé dans le navigateur, sans ouvrir de sélecteur de fichier au démarrage. Retrouvez-le dans **Enregistrements** pour le réécouter ou utilisez **Enregistrer sur l’appareil** pour l’exporter.

Selon les possibilités du navigateur, l’export ouvre le menu de partage de fichiers du téléphone ou lance un téléchargement. Le format dépend du flux de la radio : MP3, AAC, OGG, Opus ou M4A ; l’application ne convertit pas le son.

Le démarrage de l’enregistrement a été confirmé sur **DuckDuckGo pour Android** lors d’un test utilisateur. La compatibilité des autres navigateurs mobiles reste à vérifier sur les appareils concernés.

### Sur ordinateur

Lorsque le navigateur propose l’écriture directe et que l’appareil n’utilise pas principalement un pointeur tactile, l’option **Fichier direct** permet de choisir un fichier avant de démarrer. Les données y sont écrites progressivement ; le fichier se retrouve dans le dossier choisi, sans être ajouté à la liste **Enregistrements**.

Sans cette option, le fichier est conservé dans le navigateur comme sur smartphone. Si la création du fichier direct échoue, l’application utilise le stockage du navigateur. Annuler volontairement le sélecteur annule le démarrage.

### Stockage et interruptions

- Les enregistrements de l’application sont sauvegardés localement dans **IndexedDB**. Ils ne sont pas synchronisés entre appareils ou navigateurs.
- Si le stockage échoue, le fichier reste temporairement accessible dans **Enregistrements** : exportez-le avant de fermer ou recharger la page.
- Le navigateur peut effacer les données du site ou libérer du stockage. Exportez les fichiers à conserver.
- Sans écriture directe, les données sont accumulées en mémoire pendant la capture : la durée possible dépend des ressources de l’appareil.
- Une réception bloquée déclenche une nouvelle tentative. En cas de coupure définitive, les données déjà reçues sont conservées comme enregistrement partiel.
- Gardez la page ouverte pendant l’enregistrement. La continuité en arrière-plan ou avec l’écran verrouillé dépend du navigateur et du système.

### Accès au flux audio

L’application essaie de recevoir le flux directement depuis la radio. Si cet accès échoue, elle utilise le relais **`/api/stream`** du site. Les flux HTTP sur une page HTTPS passent également par ce relais. Une réception qui reste bloquée peut déclencher une nouvelle tentative via le relais.

Le relais transporte le son ; le fichier enregistré est constitué et sauvegardé sur l’appareil de l’utilisateur. La route filtre les URL cibles, notamment les adresses locales et certaines adresses privées.

L’écoute et l’enregistrement nécessitent une connexion Internet et un flux disponible. Certaines radios ou certains formats peuvent rester incompatibles.

## Hébergement

Le projet utilise des routes serveur : prévoyez un hébergement capable d’exécuter Next.js, plutôt qu’un export HTML statique.

Le relais audio consomme de la bande passante et maintient des requêtes ouvertes. Les limites de durée de l’hébergeur, du proxy et du réseau peuvent interrompre les sessions ; vérifiez-les pour les enregistrements longs. Utilisez HTTPS pour les fonctionnalités qui nécessitent un contexte sécurisé, notamment l’installation de l’application et certaines méthodes d’export.

## Administration du catalogue

Ouvrez **`/admin`** pendant `npm run dev`. Un lien est disponible en bas de l’accueil en développement.

Le panneau permet de rechercher des radios, tester leurs flux, bloquer des stations, corriger leurs informations et gérer des réseaux personnalisés et leurs catégories. Les modifications sont écrites dans [data/catalog.json](data/catalog.json).

L’écriture du catalogue est refusée en production et lorsque la requête ne provient pas d’un hôte local autorisé (`localhost`, `127.0.0.1` ou `[::1]`).

Pour publier le catalogue, versionnez `data/catalog.json`, puis reconstruisez et redéployez le site : le catalogue est importé par l’application au build.

## Installation et accès hors ligne

Le bouton **📲 Installer** apparaît dans la navigation lorsque le navigateur propose l’installation. Sur iPhone ou iPad, l’interface indique **Partager → Sur l’écran d’accueil**.

Le service worker est enregistré uniquement en production. Il conserve des pages et des ressources déjà chargées pour permettre un accès hors ligne aux données locales, lorsque le cache nécessaire est disponible. Les radios en direct et la recherche nécessitent une connexion.

## Structure du projet

```text
app/
  page.tsx                  Accueil et chargement du catalogue
  components/               Lecteur, réseaux, enregistrements et installation
  admin/                    Administration locale
  mentions-legales/         Informations légales et confidentialité
  api/stream/               Relais audio
  api/check/                Vérification des flux
  api/admin/catalog/        Écriture locale du catalogue
  manifest.ts               Manifeste de l’application installable
lib/
  radio.ts                  Client Radio Browser
  networks.ts               Définition des réseaux
  catalog.ts                Corrections et organisation du catalogue
  recordings.ts             Stockage, accès aux flux et export audio
  hidden.ts                 Stations masquées sur cet appareil
  usePersisted.ts           Préférences locales
public/
  sw.js                     Service worker
  icons/                    Icônes de l’application
  logos/                    Logos locaux
data/catalog.json           Catalogue versionné
```

## Données et usage des contenus

Les favoris, réglages, choix d’enregistrement et fichiers conservés dans l’application restent dans le navigateur de l’appareil. Les connexions aux radios, aux services de recherche, aux fournisseurs de logos et à l’hébergement impliquent les échanges techniques nécessaires au fonctionnement du site.

L’enregistrement est destiné à un usage privé à partir de sources licites, dans les limites autorisées par la loi. Consultez la page **Mentions légales & confidentialité** du site pour les informations détaillées sur les données et les droits des contenus.
