# 3KOS SalesOS — Copilote de prospection téléphonique

Progressive Web App conçue comme un **copilote**, pas un site de référence : pendant un appel,
l'application décide toujours de la seule prochaine action, le commercial exécute. Aucun menu à
consulter en plein appel — inspiré du fonctionnement d'un GPS (Waze) plutôt que d'un manuel.
HTML / CSS / JavaScript natif, aucun framework, aucune dépendance externe.

## Les 3 modes

1. **Mission** — écran d'accueil : compteurs du jour (appels / objectif, RDV), un seul bouton
   « COMMENCER LE PROCHAIN APPEL ».
2. **Copilote d'appel** — le cœur de l'app. Écran « Avant d'appeler » (persona + diagnostic
   optionnel), puis un appel guidé étape par étape : objectif actuel, réplique exacte à dire,
   boutons « que vient de dire le prospect ? ». Jamais plus de 3 informations à traiter en même
   temps. Se termine par une fiche de qualification condensée, puis retour à la Mission.
3. **Bibliothèque** — tout ce qui n'est pas utilisé en direct pendant un appel : Formation
   (onboarding, les 3 moteurs, règles d'or, erreurs mortelles, closing, après-appel), Personas,
   Accroches, Questions, Objections, Historique (KPI + fiches), Paramètres.

## Lancer en local

Le projet utilise des modules ES (`import`/`export`) et `fetch()` sur des fichiers JSON locaux :
il doit être servi par un serveur HTTP (pas de double-clic sur `index.html`, les navigateurs
bloquent `fetch()` en `file://`).

```bash
# n'importe quel serveur statique fait l'affaire, par exemple :
npx serve .
# ou
python -m http.server 8080
```

Puis ouvrez `http://localhost:PORT`.

## Déploiement Netlify

Aucune configuration nécessaire : c'est un site 100% statique.

1. Glissez le dossier `STUDIO3K_SALES_OS` sur [app.netlify.com/drop](https://app.netlify.com/drop),
   ou connectez le dépôt Git et laissez le "Build command" vide avec "Publish directory" = `.`
2. Netlify sert `index.html` à la racine, `manifest.json` et `service-worker.js` sont déjà
   à la racine (obligatoire pour que le service worker contrôle tout le site).
3. HTTPS est fourni automatiquement par Netlify : requis pour que le service worker et
   l'installation PWA fonctionnent.
4. Si le site est déjà en ligne (déploiement par glisser-déposer, sans intégration Git), il ne
   se met pas à jour tout seul : il faut retourner sur l'onglet **Deploys** du site Netlify et
   glisser à nouveau le dossier. L'URL reste la même.

## Installer sur iPhone

Safari ne propose pas d'invite d'installation automatique : ouvrez le site, appuyez sur
**Partager**, puis **Sur l'écran d'accueil**. L'app se lance ensuite en plein écran, sans barre
d'adresse.

## Installer sur Android / desktop

Chrome (et la plupart des navigateurs Chromium) affichent une bannière d'installation
automatique (`beforeinstallprompt`) : appuyez sur **Installer**. Sinon, menu du navigateur >
« Installer l'application » / « Ajouter à l'écran d'accueil ».

## Structure du projet

```
index.html                   Coquille des 3 modes + contenu statique de la Bibliothèque
manifest.json                 Manifest PWA (icônes, couleurs, mode standalone, portrait)
service-worker.js             Cache app shell, fonctionnement hors ligne
css/
  main.css                     Variables (couleurs, espacement, typo), reset, transitions
  layout.css                   Coquille des 3 modes, barre de navigation, Mission, Bibliothèque
  components.css                Cartes, fiche, KPI, recherche, paramètres, Copilote d'appel
  mobile.css                    Ajustements responsive, cibles tactiles ≥44-56px
js/
  app.js                        Bootstrap : état, services, composants
  router.js                     showMode('mission'|'copilote'|'bibliotheque')
  state.js                      État centralisé (mode, persona, onglet Bibliothèque, thème…)
  components/
    mission.js                   Mode 1
    callMode.js                  Mode 2 — moteur du Copilote (GPS conversationnel)
    library.js                   Mode 3 — bascule entre les 7 onglets
    personas.js, hooks.js, objections.js, diagnostics.js, qualification.js,
    questions.js, fiche.js, dashboard.js, search.js, settings.js
  services/                    Fonctions transverses sans état d'écran
    storage.js, searchEngine.js, theme.js
  data/                        Contenu métier en JSON pur (aucune logique)
    personas.json, hooks.json, objections.json, diagnostics.json,
    qualification.json, questions.json, personaFocus.json
assets/icons/                  Icônes PWA + script de génération (generate-icons.js)
```

## Fonctionnalités conservées

Rien n'a été supprimé par rapport à la version précédente — tout a été réorganisé en 3 modes :

| Contenu d'origine | Nouvelle place |
|---|---|
| Onboarding, 3 moteurs, règles d'or, erreurs mortelles, closing, après l'appel | Bibliothèque > Formation |
| Moteur d'appel par persona | Bibliothèque > Personas (+ Copilote en direct) |
| 6 familles d'accroches | Bibliothèque > Accroches |
| Banque de questions | Bibliothèque > Questions |
| 7 catégories d'objections | Bibliothèque > Objections (+ barre « il dévie » du Copilote) |
| Qualification guidée | Bibliothèque > Formation (+ calculée automatiquement en direct) |
| GPS de diagnostic | Écran « Avant d'appeler » du Copilote (désormais optionnel et intégré) |
| Fiche + score /100 | Après chaque appel (RDV/conversation), dans le Copilote |
| KPI du jour | Mission (résumé) + Bibliothèque > Historique (détail + taux) |
| Barre rouge « il vient de dire » | Barre d'objections du Copilote, disponible à tout moment de l'appel |

Les clés `localStorage` historiques sont conservées (`fiches3k`, `kpi3k`) : les données déjà
enregistrées continuent de fonctionner après la mise à jour.

## Curation par persona

`js/data/personaFocus.json` associe à chaque persona les accroches, objections et questions les
plus pertinentes — ce sont des références vers le contenu existant (`hooks.json`,
`objections.json`, `questions.json`), pas du texte commercial réécrit. Visible dans
Bibliothèque > Personas.

## Régénérer les icônes

Les PNG sont produits par un script Node sans dépendance (`assets/icons/generate-icons.js`) :

```bash
cd assets/icons
node generate-icons.js
```
