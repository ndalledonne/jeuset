/**
 * JeuSet — install button
 *
 * Decides what the "Installer l'appli" button does on this browser:
 *  - 'prompt': the browser offered its own install dialog (Android Chrome, Edge...);
 *  - 'ios': iPhone / iPad, where a site cannot open that dialog, so the button
 *    shows how to use Share > "Sur l'écran d'accueil";
 *  - 'none': already installed, or no way to install: the button stays hidden.
 * Pure functions: no DOM, testable in Node.js.
 *
 * Works as a classic browser script (exposes window.JeuSetInstall)
 * and as a CommonJS module (for the Node.js tests).
 *
 * @license MIT
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JeuSetInstall = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** iPhone, iPod or iPad (recent iPads present themselves as a Mac with a touch screen). */
  function isIOS(userAgent, maxTouchPoints) {
    const ua = String(userAgent || '');
    return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  }

  /** @returns {'none'|'prompt'|'ios'} */
  function installMode({ standalone, hasPrompt, userAgent, maxTouchPoints }) {
    if (standalone) return 'none';
    if (hasPrompt) return 'prompt';
    if (isIOS(userAgent, maxTouchPoints)) return 'ios';
    return 'none';
  }

  return Object.freeze({ installMode, isIOS });
});
