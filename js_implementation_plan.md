# Plan de Modularisation du JavaScript (`script.js`)

Le fichier `script.js` actuel est une grande fonction IIFE (Immediately Invoked Function Expression) de 2350 lignes. L'objectif est de le scinder en plusieurs modules ES6 (`type="module"`) distincts, chacun responsable d'une fonctionnalité spécifique.

Nous devons modifier les appels dans les fichiers `.html` pour utiliser `<script type="module" src="js/main.js"></script>` au lieu de `<script src="script.js" defer></script>`.

## Étape 1 : Fichiers Utilitaires et Configuration
Création des fonctions de base qui seront réutilisées partout.

- **`js/config.js`** :
  - Définition de `prefersReducedMotion`
  - Extraction des couleurs `sparkColors`
- **`js/utils.js`** :
  - Fonctions `clamp`, `formatTime`
- **`js/storage.js`** :
  - Gestion sécurisée du `localStorage` (lecture/écriture de l'état du lecteur)
  - `isGlobalPlayerEnabled`, `setGlobalPlayerEnabled`

## Étape 2 : Animations et Effets Visuels
- **`js/sparks.js`** : 
  - Système `createSpark(x, y)`
- **`js/reveal.js`** :
  - Observer pour `initReveal` et `initRevealOnLoad`

## Étape 3 : Composants d'Interface (UI)
- **`js/lightbox.js`** :
  - Fonction `ensureLightbox` (zoom sur les images)
- **`js/decks.js`** :
  - Gestion des modales complexes et animations des cartes (`initCardDecks`, `animateCardToModal`)
- **`js/project-rail.js`** :
  - Gestion du carrousel de projets et de la navigation latérale (`initProjectRail`)

## Étape 4 : Formulaires et Contact
- **`js/contact.js`** :
  - Intégration reCAPTCHA et envois via EmailJS (`initContactForms`)

## Étape 5 : Le Lecteur Audio et la Navigation (Le cœur du système)
- **`js/audio-player.js`** :
  - Toute la logique du lecteur musical (`mountSitePlayer`, gestion de la playlist, persistance d'état avec `storage.js`).
- **`js/pjax.js`** :
  - Système de navigation sans rechargement de page (`replacePage`, `pjaxNavigate`) qui permet au lecteur audio de continuer à jouer entre les pages.
- **`js/unlock.js`** :
  - Animations de déblocage (`showPlayerUnlockFireworks`, `showPlayerUnlockToast`).

## Étape 6 : Point d'Entrée Principal
- **`js/main.js`** :
  - Fichier principal qui importe, coordonne et initialise tous les modules (`initPageFeatures`, listeners globaux).

## Mode Opératoire
Comme pour le CSS, la procédure de validation stricte s'applique :
1. Je te montrerai le code *exact* de chaque nouveau fichier créé dans le dossier `js/`.
2. Je te montrerai les lignes exactes retirées de `script.js`.
3. J'attendrai ta validation ("OK", "Go") pour appliquer chaque étape, fichier par fichier.

**Notes importantes :**
* Le passage aux modules ES6 implique un nettoyage de la structure globale IIFE `(() => { ... })()` car les modules ont leur propre portée (scope).
* Pour que les modules ES6 fonctionnent en local avec le protocole `file://`, il faut utiliser une extension comme "Live Server", ce dont tu es sûrement familier vu les validations EmailJS actuelles.

**Es-tu d'accord avec ce plan de découpage pour démarrer la création des premiers fichiers (Dossier js + utilitaires) ?**
