# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-11-21

### Added

- Compact "Installer" button in the header of the settings screen, in addition to the one under "Commencer le match". On iPhone / iPad it scrolls to the install help.

## [1.1.1] - 2026-11-21

### Fixed

- Site not updating after a deployment: the service worker now checks every file with the server instead of using the browser's HTTP cache, and a new `.htaccess` sends `Cache-Control: no-cache` for pages, scripts and styles (icons: one week). The deployment uploads it.
- iPhone install help no longer reopens by itself after a match.
- Accessibility: the install button announces whether the help is open (`aria-expanded`), focus returns to it when the help is closed, and the decorative icons of the share and install buttons are no longer read aloud.

## [1.1.0] - 2026-11-21

### Added

- "Installer l'appli" button on the match settings screen: opens the browser's install dialog (Android Chrome, Edge...) or, on iPhone / iPad, shows how to add JeuSet to the home screen from the browser's Share menu. Hidden during a match, once installed, and on browsers that cannot install it. Decision logic in `assets/js/install.js`, with unit tests.

## [1.0.0] - 2026-11-21

### Added

- Score keeping for a tennis match with two large point buttons, designed for phones.
- Match settings: number of sets (1, best of 3, best of 5), games per set (3 to 6), advantage or deciding point, tie-break at games all, deciding set played normally or as a 10-point match tie-break, first server.
- Scoreboard with completed sets, lost tie-break points as superscript, games and points, and the full score of each tie-break below it (e.g. "Set 1 · TB 9-7 Marius").
- Server indicator, serving side (right / left, receiver's choice on a deciding point) and tie-break serve rotation.
- Messages for deuce, advantage, deciding point, tie-break, set won and change of ends.
- Unlimited undo.
- "Partager le score" button, available at any time: phone share menu (WhatsApp, SMS, e-mail...) or, when the browser has none, a panel with WhatsApp, e-mail and copy. The text gives the players, sets, current set, current game and server; the match format is only added to the first share of a match.
- Match saved in the browser's local storage.
- Offline support (service worker), web app manifest and icons.
- Scoring rules (`assets/js/score.js`) and share text (`assets/js/summary.js`) in standalone modules with unit tests (`node --test`).
- GitHub Actions workflows: tests on every push and pull request, FTPS deployment to the hosting on version tags.
- `EVOLUTIONS.md`: list of ideas for the next versions (in French).
