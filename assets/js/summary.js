/**
 * JeuSet — score summary
 *
 * Builds the plain-text summary of a match, used by the "Partager" button
 * (WhatsApp, e-mail, SMS...). Pure function: no DOM, testable in Node.js.
 * The match format is only included when asked (first share of a match),
 * since it does not change during a match.
 * The text is in French, like the interface. It contains no emoji on purpose:
 * WhatsApp share links (wa.me) do not always display them.
 *
 * Works as a classic browser script (exposes window.JeuSetSummary)
 * and as a CommonJS module (for the Node.js tests).
 * In the browser, load assets/js/score.js first.
 *
 * @license MIT
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./score.js'));
  } else {
    root.JeuSetSummary = factory(root.JeuSetScore);
  }
})(typeof self !== 'undefined' ? self : this, function (Score) {
  'use strict';

  const FORMAT_LABELS = Object.freeze({ 1: '1 set', 3: '2 sets gagnants', 5: '3 sets gagnants' });

  /**
   * One completed set, from the point of view of player `first`.
   * e.g. "6-4", "6-7(5)" (lost tie-break points in brackets), "[10-8]" for a super tie-break.
   */
  function formatSet(set, first = 0) {
    const second = 1 - first;
    if (set.superTieBreak) return `[${set.tieBreak[first]}-${set.tieBreak[second]}]`;
    const tieBreak = set.tieBreak ? `(${Math.min(set.tieBreak[0], set.tieBreak[1])})` : '';
    return `${set.games[first]}-${set.games[second]}${tieBreak}`;
  }

  /**
   * Short description of the settings,
   * e.g. "2 sets gagnants · sets de 6 jeux · point décisif · super tie-break au dernier set".
   */
  function formatSettings(config) {
    const parts = [FORMAT_LABELS[config.sets], `sets de ${config.games} jeux`, config.advantage ? 'avantage' : 'point décisif'];
    if (!config.tieBreak) parts.push('sans tie-break');
    if (config.sets > 1 && config.finalSet === 'superTieBreak') parts.push('super tie-break au dernier set');
    return parts.join(' · ');
  }

  /** Line describing the current game or tie-break, e.g. "Jeu en cours : 30-15, Léo au service". */
  function formatCurrentGame(state, config) {
    const names = config.names;
    const [a, b] = Score.pointLabels(state);
    const server = names[Score.currentServer(state)];
    const deuce = Score.deuceStatus(state, config);
    let score = `${a}-${b}`;
    if (deuce && deuce.type === 'deuce') score = 'égalité';
    if (deuce && deuce.type === 'advantage') score = `avantage ${names[deuce.player]}`;
    if (deuce && deuce.type === 'decidingPoint') score = '40-40, point décisif';

    const label = state.tieBreak === 'superTieBreak' ? 'Super tie-break' : state.tieBreak ? 'Tie-break' : 'Jeu en cours';
    return `${label} : ${score}, ${server} au service`;
  }

  /**
   * Full tie-break scores of the completed sets, from the winner's point of view,
   * e.g. ["Set 1 · TB 9-7 Marius"]. Sets without a tie-break are skipped.
   * @param {object} state   Match state (see score.js).
   * @param {object} config  Match settings (see score.js).
   * @returns {string[]}
   */
  function tieBreakNotes(state, config) {
    return state.sets.flatMap((set, i) => {
      if (!set.tieBreak) return [];
      const winner = set.tieBreak[0] > set.tieBreak[1] ? 0 : 1;
      const label = set.superTieBreak ? 'Super TB' : 'TB';
      return [`Set ${i + 1} · ${label} ${set.tieBreak[winner]}-${set.tieBreak[1 - winner]} ${config.names[winner]}`];
    });
  }

  /**
   * Plain-text summary of a match, ready to be shared.
   * @param {object} state   Match state (see score.js).
   * @param {object} config  Match settings (see score.js).
   * @param {{includeFormat?: boolean}} [options]  includeFormat: add the match format line.
   * @returns {string}
   */
  function buildSummary(state, config, { includeFormat = false } = {}) {
    const [p1, p2] = config.names;
    const lines = [`Tennis : ${p1} – ${p2}`];

    if (state.winner !== null) {
      // Final score from the winner's point of view, as usual in tennis.
      const sets = state.sets.map((s) => formatSet(s, state.winner)).join(' ');
      lines.push(`Victoire de ${config.names[state.winner]} : ${sets}`);
    } else {
      const done = state.sets.map((s) => formatSet(s, 0));
      const current = state.tieBreak === 'superTieBreak' ? [] : [`${state.games[0]}-${state.games[1]}`];
      lines.push(`Score : ${[...done, ...current].join(' ')} (match en cours)`);
      lines.push(formatCurrentGame(state, config));
    }

    if (includeFormat) lines.push(`Format : ${formatSettings(config)}`);
    return lines.join('\n');
  }

  return Object.freeze({ buildSummary, formatSet, formatSettings, tieBreakNotes });
});
