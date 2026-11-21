/**
 * JeuSet — tennis scoring rules
 *
 * Pure scoring logic: no DOM, no storage, no side effects.
 * Every function takes a match state and returns a new one, so the
 * interface can keep a history of states for "undo".
 *
 * Works as a classic browser script (exposes window.JeuSetScore)
 * and as a CommonJS module (for the Node.js tests).
 *
 * @license MIT
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.JeuSetScore = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Types ---------- */

  /**
   * Match settings, chosen before the match starts.
   * @typedef {Object} MatchConfig
   * @property {[string, string]} names  Player names (index 0 and 1).
   * @property {1|3|5} sets              Best of 1, 3 or 5 sets.
   * @property {number} games            Games needed to win a set (3 to 6).
   * @property {boolean} advantage       true: advantage at deuce; false: deciding point.
   * @property {boolean} tieBreak        Play a 7-point tie-break when games are level at `games`-`games`.
   * @property {'set'|'superTieBreak'} finalSet  How the deciding set is played.
   * @property {0|1} firstServer         Player who serves the first game.
   */

  /**
   * A completed set.
   * @typedef {Object} SetResult
   * @property {[number, number]} games        Games won by each player.
   * @property {[number, number]|null} tieBreak  Tie-break points, or null if none was played.
   * @property {boolean} superTieBreak         true if the set was a match tie-break.
   */

  /**
   * Full state of a match. Plain data, safe to serialise with JSON.
   * @typedef {Object} MatchState
   * @property {SetResult[]} sets        Completed sets.
   * @property {[number, number]} games  Games in the current set.
   * @property {[number, number]} points Points in the current game or tie-break.
   * @property {null|'tieBreak'|'superTieBreak'} tieBreak  Current tie-break, if any.
   * @property {0|1} server              Server of the current game (outside tie-breaks).
   * @property {0|1} tieBreakFirstServer Player who served the first tie-break point.
   * @property {[number, number]} setsWon
   * @property {null|0|1} winner         Match winner, or null while in play.
   * @property {null|string} event       Last notable event, for display (see EVENTS).
   * @property {boolean} changeEnds      true when players must change ends before the next point.
   */

  /* ---------- Constants ---------- */

  /** Default settings: best of 3 sets of 6 games, advantage, tie-break. */
  const DEFAULT_CONFIG = Object.freeze({
    names: Object.freeze(['Joueur 1', 'Joueur 2']),
    sets: 3,
    games: 6,
    advantage: true,
    tieBreak: true,
    finalSet: 'set',
    firstServer: 0,
  });

  /** Points needed to win a tie-break and a super tie-break (2-point margin). */
  const TIE_BREAK_POINTS = 7;
  const SUPER_TIE_BREAK_POINTS = 10;

  /** Players change ends every 6 points in a tie-break. */
  const TIE_BREAK_CHANGE_EVERY = 6;

  /** Events reported in `state.event`. */
  const EVENTS = Object.freeze({
    TIE_BREAK: 'tieBreak',
    SUPER_TIE_BREAK: 'superTieBreak',
    SET_WON: 'setWon',
    MATCH_WON: 'matchWon',
  });

  /* ---------- Helpers ---------- */

  const other = (player) => 1 - player;

  /** Deep copy of a state (states only hold plain data). */
  const clone = (state) => JSON.parse(JSON.stringify(state));

  /** Number of sets a player must win: 1, 2 or 3. */
  function setsToWin(config) {
    return (config.sets + 1) / 2;
  }

  /**
   * Checks the settings and fills missing ones with the defaults.
   * @param {Partial<MatchConfig>} [config]
   * @returns {MatchConfig}
   * @throws {RangeError} if a value is out of range.
   */
  function normalizeConfig(config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    cfg.names = [0, 1].map((i) => String((config.names && config.names[i]) || DEFAULT_CONFIG.names[i]).trim() || DEFAULT_CONFIG.names[i]);
    if (![1, 3, 5].includes(cfg.sets)) throw new RangeError('sets must be 1, 3 or 5');
    if (!Number.isInteger(cfg.games) || cfg.games < 1 || cfg.games > 6) throw new RangeError('games must be an integer from 1 to 6');
    if (!['set', 'superTieBreak'].includes(cfg.finalSet)) throw new RangeError('finalSet must be "set" or "superTieBreak"');
    if (![0, 1].includes(cfg.firstServer)) throw new RangeError('firstServer must be 0 or 1');
    cfg.advantage = Boolean(cfg.advantage);
    cfg.tieBreak = Boolean(cfg.tieBreak);
    return cfg;
  }

  /* ---------- Match creation ---------- */

  /**
   * Creates the state of a new match.
   * @param {MatchConfig} config
   * @returns {MatchState}
   */
  function createMatch(config) {
    const state = {
      sets: [],
      games: [0, 0],
      points: [0, 0],
      tieBreak: null,
      server: config.firstServer,
      tieBreakFirstServer: config.firstServer,
      setsWon: [0, 0],
      winner: null,
      event: null,
      changeEnds: false,
    };
    startSuperTieBreakIfDue(state, config);
    return state;
  }

  /** Replaces the deciding set by a super tie-break when the settings ask for it. */
  function startSuperTieBreakIfDue(state, config) {
    const last = setsToWin(config) - 1;
    if (config.sets > 1 && config.finalSet === 'superTieBreak' && state.setsWon[0] === last && state.setsWon[1] === last) {
      state.tieBreak = 'superTieBreak';
      state.tieBreakFirstServer = state.server;
      state.event = EVENTS.SUPER_TIE_BREAK;
    }
  }

  /* ---------- Scoring ---------- */

  /**
   * Gives a point to a player.
   * @param {MatchState} previous
   * @param {MatchConfig} config
   * @param {0|1} player  Player who won the point.
   * @returns {MatchState} New state (the previous one is left untouched).
   */
  function addPoint(previous, config, player) {
    if (player !== 0 && player !== 1) throw new RangeError('player must be 0 or 1');
    if (previous.winner !== null) return previous;

    const state = clone(previous);
    state.event = null;
    state.changeEnds = false;
    state.points[player] += 1;

    if (state.tieBreak) {
      scoreTieBreakPoint(state, config, player);
    } else {
      scoreGamePoint(state, config, player);
    }
    return state;
  }

  function scoreGamePoint(state, config, player) {
    const won = state.points[player];
    const lost = state.points[other(player)];
    // Deciding point: at 40-40 (3-3) the next point wins, so 4 points is always enough.
    const gameWon = config.advantage ? won >= 4 && won - lost >= 2 : won >= 4;
    if (gameWon) winGame(state, config, player);
  }

  function scoreTieBreakPoint(state, config, player) {
    const target = state.tieBreak === 'superTieBreak' ? SUPER_TIE_BREAK_POINTS : TIE_BREAK_POINTS;
    const won = state.points[player];
    const lost = state.points[other(player)];
    if (won >= target && won - lost >= 2) {
      state.games[player] += 1;
      winSet(state, config, player);
    } else if ((won + lost) % TIE_BREAK_CHANGE_EVERY === 0) {
      state.changeEnds = true;
    }
  }

  function winGame(state, config, player) {
    state.games[player] += 1;
    state.points = [0, 0];
    const target = config.games;
    const won = state.games[player];
    const lost = state.games[other(player)];

    if (won >= target && won - lost >= 2) {
      winSet(state, config, player);
      return;
    }

    state.server = other(state.server);
    // Ends are changed after every odd game of the set.
    if ((won + lost) % 2 === 1) state.changeEnds = true;

    if (config.tieBreak && won === target && lost === target) {
      state.tieBreak = 'tieBreak';
      state.tieBreakFirstServer = state.server;
      state.event = EVENTS.TIE_BREAK;
    }
  }

  function winSet(state, config, player) {
    const playedTieBreak = state.tieBreak !== null;
    state.sets.push({
      games: state.games.slice(),
      tieBreak: playedTieBreak ? state.points.slice() : null,
      superTieBreak: state.tieBreak === 'superTieBreak',
    });
    state.setsWon[player] += 1;

    // After a tie-break, the player who received first serves the next game.
    state.server = playedTieBreak ? other(state.tieBreakFirstServer) : other(state.server);
    const totalGames = state.games[0] + state.games[1];
    state.games = [0, 0];
    state.points = [0, 0];
    state.tieBreak = null;

    if (state.setsWon[player] >= setsToWin(config)) {
      state.winner = player;
      state.event = EVENTS.MATCH_WON;
      return;
    }
    state.event = EVENTS.SET_WON;
    // Ends are changed when the set ended on an odd total of games.
    state.changeEnds = totalGames % 2 === 1;
    startSuperTieBreakIfDue(state, config);
  }

  /* ---------- Reading the state ---------- */

  /**
   * Player serving the next point.
   * In a tie-break the first server serves 1 point, then each player serves 2.
   * @param {MatchState} state
   * @returns {0|1}
   */
  function currentServer(state) {
    if (!state.tieBreak) return state.server;
    const played = state.points[0] + state.points[1];
    if (played === 0) return state.tieBreakFirstServer;
    return Math.floor((played - 1) / 2) % 2 === 0 ? other(state.tieBreakFirstServer) : state.tieBreakFirstServer;
  }

  /**
   * Side of the court the server serves from, seen from the server facing the net.
   * Even number of points played: right; odd: left.
   * @param {MatchState} state
   * @param {MatchConfig} config
   * @returns {'right'|'left'|'receiverChoice'} `receiverChoice` on a deciding point.
   */
  function serveSide(state, config) {
    if (isDecidingPoint(state, config)) return 'receiverChoice';
    return (state.points[0] + state.points[1]) % 2 === 0 ? 'right' : 'left';
  }

  /** true at 40-40 when the match is played without advantage. */
  function isDecidingPoint(state, config) {
    return !state.tieBreak && !config.advantage && state.points[0] === 3 && state.points[1] === 3;
  }

  /**
   * Points as displayed on a scoreboard.
   * @param {MatchState} state
   * @returns {[string, string]} e.g. ['30', '15'], ['AV', '40'], or tie-break points ['5', '3'].
   */
  function pointLabels(state) {
    const [a, b] = state.points;
    if (state.tieBreak) return [String(a), String(b)];
    if (a >= 3 && b >= 3) {
      if (a === b) return ['40', '40'];
      return a > b ? ['AV', '40'] : ['40', 'AV'];
    }
    const labels = ['0', '15', '30', '40'];
    return [labels[a], labels[b]];
  }

  /**
   * Situation of the current game at deuce.
   * @param {MatchState} state
   * @param {MatchConfig} config
   * @returns {null|{type: 'deuce'|'advantage'|'decidingPoint', player?: 0|1}}
   */
  function deuceStatus(state, config) {
    const [a, b] = state.points;
    if (state.tieBreak || a < 3 || b < 3) return null;
    if (!config.advantage) return { type: 'decidingPoint' };
    if (a === b) return { type: 'deuce' };
    return { type: 'advantage', player: a > b ? 0 : 1 };
  }

  /** true before the first point of a regular game (when the server may still be corrected). */
  function isGameStart(state) {
    return state.winner === null && !state.tieBreak && state.points[0] + state.points[1] === 0;
  }

  /**
   * Corrects the server of the current game. Only allowed at the start of a game.
   * @param {MatchState} previous
   * @param {0|1} player
   * @returns {MatchState}
   */
  function setServer(previous, player) {
    if (!isGameStart(previous) || previous.server === player) return previous;
    const state = clone(previous);
    state.server = player;
    return state;
  }

  return Object.freeze({
    DEFAULT_CONFIG,
    EVENTS,
    TIE_BREAK_POINTS,
    SUPER_TIE_BREAK_POINTS,
    normalizeConfig,
    createMatch,
    addPoint,
    setServer,
    currentServer,
    serveSide,
    pointLabels,
    deuceStatus,
    isDecidingPoint,
    isGameStart,
    setsToWin,
  });
});
