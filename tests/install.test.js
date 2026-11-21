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
