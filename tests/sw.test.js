'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('service worker bypasses the HTTP cache and caches every script', () => {
  const sw = read('sw.js');
  assert.match(sw, /fetch\(request, \{ cache: 'no-cache' \}\)/);
  for (const [, src] of read('index.html').matchAll(/<script src="([^"]+)"/g)) {
    assert.ok(sw.includes(`'${src}'`), `${src} missing from APP_FILES`);
  }
});

test('.htaccess is deployed and sets no-cache for pages and scripts', () => {
  assert.match(read('.htaccess'), /\\.\(html\|js\|css\|webmanifest\)\$[\s\S]*?no-cache/);
  assert.match(read('.github/workflows/deploy.yml'), /cp -r [^\n]*\.htaccess/);
});
