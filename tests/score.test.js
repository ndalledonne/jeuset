'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Score = require('../assets/js/score.js');

const { normalizeConfig, createMatch, addPoint, setServer, currentServer, serveSide, pointLabels, deuceStatus, EVENTS } = Score;

/**
 * Plays several points.
 * play(state, cfg, [0, 0, 1]) plays the listed points; play(state, cfg, 0, 4) gives 4 points to player 0.
 */
function play(state, config, who, times = 1) {
  const sequence = Array.isArray(who) ? who : Array(times).fill(who);
  return sequence.reduce((s, p) => addPoint(s, config, p), state);
}
const game = (state, config, player) => play(state, config, player, 4);
function games(state, config, player, n) {
  for (let i = 0; i < n; i++) state = game(state, config, player);
  return state;
}

/* ---------- Settings ---------- */

test('default settings: best of 3 sets of 6 games, advantage, tie-break', () => {
  const cfg = normalizeConfig();
  assert.equal(cfg.sets, 3);
  assert.equal(cfg.games, 6);
  assert.equal(cfg.advantage, true);
  assert.equal(cfg.tieBreak, true);
  assert.equal(cfg.finalSet, 'set');
  assert.deepEqual(cfg.names, ['Joueur 1', 'Joueur 2']);
});

test('empty names fall back to the defaults', () => {
  assert.deepEqual(normalizeConfig({ names: ['  ', 'Hugo'] }).names, ['Joueur 1', 'Hugo']);
});

test('invalid settings are rejected', () => {
  assert.throws(() => normalizeConfig({ sets: 2 }), RangeError);
  assert.throws(() => normalizeConfig({ games: 0 }), RangeError);
  assert.throws(() => normalizeConfig({ finalSet: 'x' }), RangeError);
  assert.throws(() => normalizeConfig({ firstServer: 2 }), RangeError);
});

/* ---------- Points and games ---------- */

test('points are shown as 0, 15, 30, 40', () => {
  const cfg = normalizeConfig();
  let s = createMatch(cfg);
  assert.deepEqual(pointLabels(s), ['0', '0']);
  s = play(s, cfg, [0, 0, 0, 1]);
  assert.deepEqual(pointLabels(s), ['40', '15']);
});

test('with advantage: deuce, advantage, back to deuce, then game', () => {
  const cfg = normalizeConfig();
  let s = play(createMatch(cfg), cfg, [0, 0, 0, 1, 1, 1]);
  assert.deepEqual(deuceStatus(s, cfg), { type: 'deuce' });
  s = addPoint(s, cfg, 1);
  assert.deepEqual(pointLabels(s), ['40', 'AV']);
  assert.deepEqual(deuceStatus(s, cfg), { type: 'advantage', player: 1 });
  s = addPoint(s, cfg, 0);
  assert.deepEqual(deuceStatus(s, cfg), { type: 'deuce' });
  s = play(s, cfg, 0, 2);
  assert.deepEqual(s.games, [1, 0]);
  assert.deepEqual(s.points, [0, 0]);
});

test('deciding point: at 40-40 the next point wins the game', () => {
  const cfg = normalizeConfig({ advantage: false });
  let s = play(createMatch(cfg), cfg, [0, 0, 0, 1, 1, 1]);
  assert.deepEqual(deuceStatus(s, cfg), { type: 'decidingPoint' });
  s = addPoint(s, cfg, 1);
  assert.deepEqual(s.games, [0, 1]);
});

test('addPoint does not modify the previous state', () => {
  const cfg = normalizeConfig();
  const before = createMatch(cfg);
  const copy = JSON.stringify(before);
  addPoint(before, cfg, 0);
  assert.equal(JSON.stringify(before), copy);
});

/* ---------- Serve ---------- */

test('server alternates every game; ends change after odd games', () => {
  const cfg = normalizeConfig({ firstServer: 1 });
  let s = createMatch(cfg);
  assert.equal(currentServer(s), 1);
  s = game(s, cfg, 0);
  assert.equal(currentServer(s), 0);
  assert.equal(s.changeEnds, true);
  s = game(s, cfg, 0);
  assert.equal(currentServer(s), 1);
  assert.equal(s.changeEnds, false);
});

test('serve side: right on an even number of points, left on an odd one', () => {
  const cfg = normalizeConfig();
  let s = createMatch(cfg);
  assert.equal(serveSide(s, cfg), 'right');
  s = addPoint(s, cfg, 0);
  assert.equal(serveSide(s, cfg), 'left');
  s = play(s, cfg, [0, 0, 1, 1, 1]); // 40-40
  assert.equal(serveSide(s, cfg), 'right');
  s = addPoint(s, cfg, 0); // advantage
  assert.equal(serveSide(s, cfg), 'left');
});

test('serve side on a deciding point is the receiver\'s choice', () => {
  const cfg = normalizeConfig({ advantage: false });
  const s = play(createMatch(cfg), cfg, [0, 0, 0, 1, 1, 1]);
  assert.equal(serveSide(s, cfg), 'receiverChoice');
});

test('the server can be corrected only before the first point of a game', () => {
  const cfg = normalizeConfig();
  let s = createMatch(cfg);
  s = setServer(s, 1);
  assert.equal(currentServer(s), 1);
  const afterPoint = addPoint(s, cfg, 0);
  assert.equal(setServer(afterPoint, 0), afterPoint);
});

/* ---------- Sets and tie-breaks ---------- */

test('set won 6-4; 6-5 is not enough', () => {
  const cfg = normalizeConfig();
  let s = createMatch(cfg);
  for (let i = 0; i < 5; i++) s = game(game(s, cfg, 0), cfg, 1);
  assert.deepEqual(s.games, [5, 5]);
  s = game(s, cfg, 0);
  assert.equal(s.sets.length, 0);
  s = game(s, cfg, 0);
  assert.deepEqual(s.sets[0].games, [7, 5]);
  assert.equal(s.event, EVENTS.SET_WON);
});

test('tie-break at 6-6: 1 point then 2 by 2 serve rotation, set 7-6', () => {
  const cfg = normalizeConfig();
  let s = createMatch(cfg);
  for (let i = 0; i < 6; i++) s = game(game(s, cfg, 0), cfg, 1);
  assert.equal(s.tieBreak, 'tieBreak');
  assert.equal(s.event, EVENTS.TIE_BREAK);

  const first = currentServer(s);
  const servers = [];
  for (let i = 0; i < 5; i++) {
    servers.push(currentServer(s));
    s = addPoint(s, cfg, i % 2);
  }
  const o = 1 - first;
  assert.deepEqual(servers, [first, o, o, first, first]);

});

test('tie-break won 7-2: set 7-6, the tie-break receiver serves the next set', () => {
  const cfg = normalizeConfig();
  let s = createMatch(cfg);
  for (let i = 0; i < 6; i++) s = game(game(s, cfg, 0), cfg, 1);
  const tbFirst = currentServer(s);
  s = play(s, cfg, [0, 0, 0, 0, 0, 0, 1, 1, 0]);
  assert.deepEqual(s.sets[0].games, [7, 6]);
  assert.deepEqual(s.sets[0].tieBreak, [7, 2]);
  assert.equal(currentServer(s), 1 - tbFirst);
});

test('tie-break needs a 2-point margin', () => {
  const cfg = normalizeConfig();
  let s = createMatch(cfg);
  for (let i = 0; i < 6; i++) s = game(game(s, cfg, 0), cfg, 1);
  s = play(s, cfg, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]); // 6-6
  s = addPoint(s, cfg, 0); // 7-6
  assert.equal(s.sets.length, 0);
  s = addPoint(s, cfg, 0); // 8-6
  assert.deepEqual(s.sets[0].tieBreak, [8, 6]);
});

test('without tie-break, the set goes on until a 2-game margin', () => {
  const cfg = normalizeConfig({ tieBreak: false });
  let s = createMatch(cfg);
  for (let i = 0; i < 6; i++) s = game(game(s, cfg, 0), cfg, 1);
  assert.equal(s.tieBreak, null);
  s = games(s, cfg, 1, 2);
  assert.deepEqual(s.sets[0].games, [6, 8]);
});

test('short sets of 4 games: tie-break at 4-4', () => {
  const cfg = normalizeConfig({ games: 4 });
  let s = createMatch(cfg);
  for (let i = 0; i < 4; i++) s = game(game(s, cfg, 0), cfg, 1);
  assert.equal(s.tieBreak, 'tieBreak');
});

/* ---------- Match ---------- */

test('one-set match ends after one set', () => {
  const cfg = normalizeConfig({ sets: 1 });
  const s = games(createMatch(cfg), cfg, 1, 6);
  assert.equal(s.winner, 1);
  assert.equal(s.event, EVENTS.MATCH_WON);
});

test('best of 3: a third set is played at one set all', () => {
  const cfg = normalizeConfig();
  let s = games(createMatch(cfg), cfg, 0, 6);
  s = games(s, cfg, 1, 6);
  assert.equal(s.winner, null);
  assert.equal(s.tieBreak, null);
  s = games(s, cfg, 0, 6);
  assert.equal(s.winner, 0);
});

test('super tie-break replaces the deciding set: 10 points, 2-point margin', () => {
  const cfg = normalizeConfig({ games: 4, finalSet: 'superTieBreak' });
  let s = games(createMatch(cfg), cfg, 0, 4);
  s = games(s, cfg, 1, 4);
  assert.equal(s.tieBreak, 'superTieBreak');
  assert.equal(s.event, EVENTS.SUPER_TIE_BREAK);
  for (let i = 0; i < 9; i++) s = play(s, cfg, [0, 1]);
  assert.deepEqual(s.points, [9, 9]);
  s = addPoint(s, cfg, 0);
  assert.equal(s.winner, null, '10-9 is not enough');
  s = addPoint(s, cfg, 0);
  assert.equal(s.winner, 0);
  assert.equal(s.sets[2].superTieBreak, true);
  assert.deepEqual(s.sets[2].tieBreak, [11, 9]);
});

test('super tie-break: best of 5 starts it at two sets all', () => {
  const cfg = normalizeConfig({ sets: 5, games: 3, finalSet: 'superTieBreak' });
  let s = createMatch(cfg);
  for (const p of [0, 1, 0, 1]) s = games(s, cfg, p, 3);
  assert.equal(s.tieBreak, 'superTieBreak');
});

test('no point is counted once the match is over', () => {
  const cfg = normalizeConfig({ sets: 1 });
  const s = games(createMatch(cfg), cfg, 0, 6);
  assert.equal(addPoint(s, cfg, 1), s);
});
