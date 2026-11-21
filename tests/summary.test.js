'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Score = require('../assets/js/score.js');
const { buildSummary, formatSet, formatSettings, tieBreakNotes } = require('../assets/js/summary.js');

const config = Score.normalizeConfig({ names: ['Léo', 'Hugo'] });
const play = (state, cfg, points) => points.reduce((s, p) => Score.addPoint(s, cfg, p), state);
const games = (state, cfg, player, n) => play(state, cfg, Array(4 * n).fill(player));

test('set notation: normal, lost tie-break and super tie-break', () => {
  assert.equal(formatSet({ games: [6, 4], tieBreak: null, superTieBreak: false }), '6-4');
  assert.equal(formatSet({ games: [6, 7], tieBreak: [5, 7], superTieBreak: false }), '6-7(5)');
  assert.equal(formatSet({ games: [6, 7], tieBreak: [5, 7], superTieBreak: false }, 1), '7-6(5)');
  assert.equal(formatSet({ games: [1, 0], tieBreak: [10, 8], superTieBreak: true }), '[10-8]');
});

test('settings description', () => {
  assert.equal(formatSettings(config), '2 sets gagnants · sets de 6 jeux · avantage');
  const cfg = Score.normalizeConfig({ games: 4, advantage: false, tieBreak: false, finalSet: 'superTieBreak' });
  assert.equal(formatSettings(cfg), '2 sets gagnants · sets de 4 jeux · point décisif · sans tie-break · super tie-break au dernier set');
});

test('format line only when asked', () => {
  const s = Score.createMatch(config);
  assert.doesNotMatch(buildSummary(s, config), /Format/);
  assert.match(buildSummary(s, config, { includeFormat: true }), /\nFormat : 2 sets gagnants · sets de 6 jeux · avantage$/);
});

test('summary of a match in progress: sets, current set, current game and server', () => {
  let s = games(Score.createMatch(config), config, 0, 6); // Léo wins the 1st set 6-0
  s = games(s, config, 1, 2);                             // 0-2 in the 2nd set
  s = play(s, config, [0, 0, 1]);                         // 30-15
  assert.equal(buildSummary(s, config), [
    'Tennis : Léo – Hugo',
    'Score : 6-0 0-2 (match en cours)',
    'Jeu en cours : 30-15, Léo au service',
  ].join('\n'));
});

test('summary at deuce and advantage', () => {
  let s = play(Score.createMatch(config), config, [0, 0, 0, 1, 1, 1]);
  assert.match(buildSummary(s, config), /Jeu en cours : égalité/);
  s = Score.addPoint(s, config, 1);
  assert.match(buildSummary(s, config), /Jeu en cours : avantage Hugo/);
});

test('summary of a finished match, from the winner\'s point of view', () => {
  let s = games(Score.createMatch(config), config, 1, 6);
  s = games(s, config, 1, 6);
  assert.equal(buildSummary(s, config), 'Tennis : Léo – Hugo\nVictoire de Hugo : 6-0 6-0');
});

test('tie-break notes: full score of each tie-break, winner first', () => {
  const state = {
    sets: [
      { games: [6, 3], tieBreak: null, superTieBreak: false },
      { games: [6, 7], tieBreak: [7, 9], superTieBreak: false },
      { games: [1, 0], tieBreak: [10, 8], superTieBreak: true },
    ],
  };
  assert.deepEqual(tieBreakNotes(state, config), ['Set 2 · TB 9-7 Hugo', 'Set 3 · Super TB 10-8 Léo']);
  assert.deepEqual(tieBreakNotes({ sets: [] }, config), []);
});
