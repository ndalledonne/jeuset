# JeuSet – Tennis score keeper

[🇫🇷 Français](README.md) | 🇬🇧 English

[![Tests](https://github.com/ndalledonne/jeuset/actions/workflows/tests.yml/badge.svg)](https://github.com/ndalledonne/jeuset/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A small web app to keep the score of a tennis match from the side of the court, on a phone.
HTML, CSS and JavaScript, no framework, no dependency, no server. The interface is in French.

## Features

- Two large buttons, one per player: one tap = one point.
- Scoreboard: completed sets (lost tie-break points as superscript), games, points, and below it the full score of each tie-break ("Set 1 · TB 9-7 Marius").
- Settings before the match:
  - 1 set, best of 3 or best of 5;
  - sets of 3, 4, 5 or 6 games;
  - at 40-40: **advantage** or **deciding point** (no-ad);
  - 7-point **tie-break** when games are level (6-6, 4-4…), or the set goes on until a 2-game margin;
  - deciding set played normally or replaced by a 10-point **match tie-break**;
  - first server.
- Shows **who serves** and **from which side** (right / left; on a deciding point, the receiver chooses).
- Tie-break serve rotation: 1 point, then 2 points each.
- Messages: deuce, advantage, deciding point, tie-break, set won, change of ends.
- **Undo** the last point, as many times as needed.
- **Share the score** at any time (WhatsApp, SMS, e-mail or copy): players, sets, current game and server; the match format is only added to the first share.
- The match is kept when the page is closed or reloaded (browser local storage).
- Works **offline** once opened (service worker).
- Can be added to the home screen (manifest and icons).
- Light / dark theme following the system setting.

## Demo

Live demo: [jeuset.nicolasdalledonne.fr](https://jeuset.nicolasdalledonne.fr)

## Privacy

No data leaves the phone: no server, no account, no cookie, no analytics, no external resource.
A Content Security Policy restricts the page to its own files.

## Usage

No installation needed: clone the repository and open `index.html` in a browser.
Offline mode only works on a page served over **HTTPS**.

### Automatic deployment (Nuxit)

`.github/workflows/deploy.yml` uploads the site over FTPS each time a **version tag** (`v1.0.0`…) is pushed, once the tests pass.
Set the `FTP_USER` and `FTP_PASSWORD` repository secrets, and optionally the `FTP_DIR` variable (default `/`).

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Reusing the scoring logic

`assets/js/score.js` has no access to the page. Each function takes a match state and returns a **new** state.
It exposes `window.JeuSetScore` in the browser and is a CommonJS module in Node.js (22+):

```js
const Score = require('./assets/js/score.js');

const config = Score.normalizeConfig({ names: ['Léo', 'Hugo'], games: 4, advantage: false });
let match = Score.createMatch(config);
match = Score.addPoint(match, config, 0);

Score.pointLabels(match);         // ['15', '0']
Score.serveSide(match, config);   // 'left'
```

See the [French README](README.md#utiliser-la-logique-dans-un-autre-code) for the list of options.

## Tests

```bash
npm test
```

Node.js built-in test runner, no dependency. Also run by GitHub Actions on every push and pull request.

## License

Released under the MIT License. See [LICENSE](LICENSE).

© 2026 Nicolas DALLEDONNE
