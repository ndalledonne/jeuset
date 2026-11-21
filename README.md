# JeuSet – Score tennis

🇫🇷 Français | [🇬🇧 English](README.en.md)

[![Tests](https://github.com/ndalledonne/jeuset/actions/workflows/tests.yml/badge.svg)](https://github.com/ndalledonne/jeuset/actions/workflows/tests.yml)
[![Licence : MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Petite application web pour noter le score d'un match de tennis depuis le bord du court, sur téléphone.
HTML, CSS et JavaScript, sans framework, sans dépendance, sans serveur.

## Fonctionnalités

- Deux grands boutons, un par joueur : un appui = un point.
- Tableau de score : sets terminés (avec les points du perdant du tie-break en exposant), jeux, points, et sous le tableau le score complet de chaque tie-break (« Set 1 · TB 9-7 Marius »).
- Réglages avant le match :
  - 1 set, 2 sets gagnants ou 3 sets gagnants ;
  - sets en 3, 4, 5 ou 6 jeux ;
  - à 40-40 : **avantage** ou **point décisif** ;
  - **tie-break** en 7 points à égalité de jeux (6-6, 4-4…), ou set joué jusqu'à 2 jeux d'écart ;
  - dernier set normal ou remplacé par un **super tie-break** en 10 points ;
  - premier serveur.
- Indique **qui sert** et **de quel côté** (droite / gauche ; au point décisif, côté au choix du relanceur).
- Rotation du service en tie-break : 1 point, puis 2 points chacun.
- Messages : égalité, avantage, point décisif, tie-break, set gagné, changement de côté.
- **Annuler** le dernier point, autant de fois que nécessaire.
- **Partager le score** à tout moment (WhatsApp, SMS, e-mail ou copie) : joueurs, sets, jeu en cours et serveur ; le format du match n'est ajouté qu'au premier partage.
- Le match est conservé si la page est fermée ou rechargée (stockage local du navigateur).
- Fonctionne **hors connexion** une fois ouvert une première fois (service worker).
- Installable sur l'écran d'accueil (manifest et icônes).
- Thème clair / sombre selon le réglage du système.

## Règles appliquées

| Situation | Règle |
|-----------|-------|
| Jeu avec avantage | 4 points et 2 points d'écart |
| Point décisif | à 40-40, le point suivant gagne le jeu |
| Set | `jeux par set` et 2 jeux d'écart ; tie-break à égalité si activé |
| Tie-break | 7 points et 2 points d'écart |
| Super tie-break | 10 points et 2 points d'écart, remplace le set décisif |
| Service | change à chaque jeu ; en tie-break, 1 point puis 2 par 2 ; après un tie-break, le relanceur du 1er point sert le jeu suivant |
| Côté du service | à droite si le nombre de points joués dans le jeu est pair, à gauche s'il est impair |
| Changement de côté | après chaque jeu impair du set, et tous les 6 points en tie-break |

## Confidentialité

Aucune donnée ne quitte le téléphone : pas de serveur, pas de compte, pas de cookie, pas de statistiques, aucune ressource externe.
Une politique de sécurité du contenu (CSP) limite la page à ses propres fichiers.

## Démo

Démo en ligne : [jeuset.nicolasdalledonne.fr](https://jeuset.nicolasdalledonne.fr)

## Installation et utilisation

Aucune installation n'est nécessaire.

```bash
git clone https://github.com/ndalledonne/jeuset.git
cd jeuset
```

Ouvrez ensuite `index.html` dans un navigateur.
Le mode hors connexion ne s'active que sur une page servie en **HTTPS**.

### Mise en ligne automatique (Nuxit)

Le workflow `.github/workflows/deploy.yml` envoie le site en FTPS sur l'hébergement à chaque **tag de version** (`v1.0.0`, `v1.1.0`…), une fois les tests passés.

1. Sur Nuxit, créez le sous-domaine `jeuset.nicolasdalledonne.fr` et un compte FTP limité à son dossier.
2. Sur GitHub : **Settings → Secrets and variables → Actions** :
   - secrets `FTP_USER` et `FTP_PASSWORD` ;
   - variable `FTP_DIR` (facultative, `/` par défaut) si le compte FTP n'est pas limité au dossier du sous-domaine.
3. Publiez une version :

```bash
git tag v1.0.0
git push origin v1.0.0
```

Seuls `index.html`, `favicon.ico`, `sw.js` et le dossier `assets/` sont envoyés.

## Structure du projet

```
jeuset/
├── index.html                    Page principale
├── sw.js                         Service worker (hors connexion)
├── favicon.ico
├── assets/
│   ├── css/style.css             Styles
│   ├── js/score.js               Règles du score (testable, sans interface)
│   ├── js/summary.js             Texte du score à partager (testable)
│   ├── js/app.js                 Interface utilisateur
│   ├── site.webmanifest          Manifest (installation sur l'écran d'accueil)
│   └── favicon.svg, icon-*.png   Icônes
├── tests/                        Tests unitaires (Node.js)
├── .github/workflows/
│   ├── tests.yml                 Intégration continue
│   └── deploy.yml                Mise en ligne sur l'hébergement
├── CHANGELOG.md                  Historique des versions (en anglais)
├── EVOLUTIONS.md                 Idées pour les prochaines versions
└── LICENSE
```

## Utiliser la logique dans un autre code

`assets/js/score.js` ne touche pas à la page : il peut être réutilisé seul.
Chaque fonction reçoit un état de match et renvoie un **nouvel** état, sans modifier l'ancien.

Dans le navigateur, il expose `window.JeuSetScore` ; dans Node.js (22 ou plus) :

```js
const Score = require('./assets/js/score.js');

const config = Score.normalizeConfig({ names: ['Léo', 'Hugo'], games: 4, advantage: false });
let match = Score.createMatch(config);
match = Score.addPoint(match, config, 0);   // point pour Léo

Score.pointLabels(match);             // ['15', '0']
Score.currentServer(match);           // 0
Score.serveSide(match, config);       // 'left'
```

| Option        | Valeurs                        | Défaut                     |
|---------------|--------------------------------|----------------------------|
| `names`       | 2 noms                         | `['Joueur 1', 'Joueur 2']` |
| `sets`        | `1`, `3` ou `5`                | `3`                        |
| `games`       | entier de 1 à 6                | `6`                        |
| `advantage`   | `true` (avantage) / `false` (point décisif) | `true`        |
| `tieBreak`    | booléen                        | `true`                     |
| `finalSet`    | `'set'` ou `'superTieBreak'`   | `'set'`                    |
| `firstServer` | `0` ou `1`                     | `0`                        |

`normalizeConfig()` lève une `RangeError` si une valeur est hors limites.

## Tests

Les tests utilisent le module de test intégré de Node.js. Aucune dépendance à installer.

```bash
npm test
```

Ils sont aussi lancés automatiquement par GitHub Actions à chaque envoi de code et à chaque pull request.

## Compatibilité

Navigateurs actuels sur téléphone et ordinateur : Chrome, Edge, Firefox, Safari.

## Historique des versions

Voir [CHANGELOG.md](CHANGELOG.md) (rédigé en anglais). Les idées pour la suite sont dans [EVOLUTIONS.md](EVOLUTIONS.md).

## Licence

Distribué sous licence MIT. Voir [LICENSE](LICENSE).

© 2026 Nicolas DALLEDONNE
