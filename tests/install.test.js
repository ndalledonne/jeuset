'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { installMode, isIOS } = require('../assets/js/install.js');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';

test('iOS detection', () => {
  assert.equal(isIOS(IPHONE, 5), true);
  assert.equal(isIOS(IPHONE_CHROME, 5), true);
  assert.equal(isIOS(IPAD_DESKTOP, 5), true); // iPad presenting as a Mac
  assert.equal(isIOS(IPAD_DESKTOP, 0), false); // real Mac
  assert.equal(isIOS(ANDROID, 5), false);
});

test('install mode', () => {
  const base = { standalone: false, hasPrompt: false, maxTouchPoints: 5 };
  assert.equal(installMode({ ...base, standalone: true, hasPrompt: true, userAgent: ANDROID }), 'none');
  assert.equal(installMode({ ...base, standalone: true, userAgent: IPHONE }), 'none');
  assert.equal(installMode({ ...base, hasPrompt: true, userAgent: ANDROID }), 'prompt');
  assert.equal(installMode({ ...base, userAgent: ANDROID }), 'none');
  assert.equal(installMode({ ...base, userAgent: IPHONE }), 'ios');
  assert.equal(installMode({ ...base, maxTouchPoints: 0, userAgent: IPAD_DESKTOP }), 'none');
});

test('iOS help text fits every iOS browser, not only Safari', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const panel = html.match(/<div class="share-panel" id="install-panel"[\s\S]*?<\/div>/)[0];
  assert.doesNotMatch(panel, /Safari/);
  assert.match(panel, /barre d'adresse/);
});

test('install mode: the browser dialog wins, iPad user agent', () => {
  const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
  assert.equal(installMode({ standalone: false, hasPrompt: true, userAgent: IPHONE, maxTouchPoints: 5 }), 'prompt');
  assert.equal(isIOS(IPAD, 5), true);
});

test('header install button shares the help panel', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const header = html.match(/<header class="top">[\s\S]*?<\/header>/)[0];
  assert.match(header, /<button type="button" class="ghost install-top" id="install-top" aria-controls="install-panel" hidden>Installer<\/button>/);
});
