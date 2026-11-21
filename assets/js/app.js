/**
 * JeuSet — user interface
 *
 * Connects the page to the scoring rules (assets/js/score.js):
 * settings form, scoreboard, point buttons, undo and local saving.
 * All text shown to the user is in French.
 *
 * @license MIT
 */
(function () {
  'use strict';

  const Score = window.JeuSetScore;
  const Summary = window.JeuSetSummary;
  const Install = window.JeuSetInstall;

  /* ---------- Settings options (form) ---------- */

  /** Choices of each segmented control: [value, label]. */
  const OPTIONS = Object.freeze({
    sets: [[1, '1 set'], [3, '2 sets gagnants'], [5, '3 sets gagnants']],
    games: [[3, '3'], [4, '4'], [5, '5'], [6, '6']],
    advantage: [[true, 'Avantage'], [false, 'Point décisif']],
    tieBreak: [[true, 'Oui'], [false, 'Non']],
    finalSet: [['set', 'Set normal'], ['superTieBreak', 'Super tie-break']],
  });

  /** Choices of a control; the first-server choices use the players' names. */
  function optionsFor(key) {
    if (key === 'firstServer') return [[0, app.config.names[0]], [1, app.config.names[1]]];
    return OPTIONS[key];
  }

  const SIDE_LABELS = {
    right: 'Sert à droite →',
    left: '← Sert à gauche',
    receiverChoice: 'Côté au choix du relanceur',
  };

  /** Maximum number of states kept for "undo" (a long 5-set match is about 400 points). */
  const MAX_HISTORY = 600;

  /* ---------- Local saving ---------- */

  /**
   * Saves the match in the browser so it survives a reload or a closed tab.
   * Storage may be unavailable (private browsing): the app then works without it.
   */
  const storage = {
    KEY: 'jeuset-v1',
    load() {
      try {
        return JSON.parse(localStorage.getItem(this.KEY)) || null;
      } catch {
        return null;
      }
    },
    save(data) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(data));
      } catch {
        /* storage full or disabled: ignore */
      }
    },
  };

  /* ---------- App state ---------- */

  const app = {
    config: Score.normalizeConfig(),
    /** @type {null|object} current match, null when no match is in progress */
    match: null,
    /** @type {object[]} previous states, most recent last */
    history: [],
    confirmingNewMatch: false,
    sharing: false,
    /** true once the score of the current match has been shared (the format is then not repeated) */
    formatShared: false,
    /** @type {null|Event} install dialog offered by the browser (beforeinstallprompt), usable once */
    installPrompt: null,
    /** true while the iPhone / iPad install help is open */
    installHelp: false,
  };

  /** Minimal check that saved data is a match state of this version. */
  function isMatchState(value) {
    return Boolean(value) && Array.isArray(value.sets) && Array.isArray(value.points) && Array.isArray(value.games);
  }

  function restore() {
    const saved = storage.load();
    if (!saved) return;
    try {
      app.config = Score.normalizeConfig(saved.config);
      if (isMatchState(saved.match)) {
        app.match = saved.match;
        app.history = Array.isArray(saved.history) ? saved.history.filter(isMatchState) : [];
        app.formatShared = saved.formatShared === true;
      }
    } catch {
      /* saved data from an older version: start fresh */
    }
  }

  function persist() {
    storage.save({
      config: app.config,
      match: app.match,
      history: app.history.slice(-MAX_HISTORY),
      formatShared: app.formatShared,
    });
  }

  /* ---------- DOM helpers ---------- */

  const $ = (id) => document.getElementById(id);

  const escapeHtml = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const el = {
    subtitle: $('subtitle'),
    undo: $('undo'),
    newMatch: $('new-match'),
    confirm: $('confirm'),
    confirmNo: $('confirm-no'),
    confirmYes: $('confirm-yes'),
    match: $('match'),
    board: $('board'),
    status: $('status'),
    serveInfo: $('serve-info'),
    pads: $('pads'),
    pad: [$('pad-0'), $('pad-1')],
    padName: [$('pad-name-0'), $('pad-name-1')],
    result: $('result'),
    share: $('share'),
    sharePanel: $('share-panel'),
    shareWhatsapp: $('share-whatsapp'),
    shareMail: $('share-mail'),
    shareCopy: $('share-copy'),
    shareFeedback: $('share-feedback'),
    shareClose: $('share-close'),
    setup: $('setup'),
    name: [$('name-0'), $('name-1')],
    finalSetField: $('final-set-field'),
    tieBreakLabel: $('tie-break-label'),
    advantageHint: $('advantage-hint'),
    install: $('install'),
    installPanel: $('install-panel'),
    installClose: $('install-close'),
  };

  /* ---------- Rendering: settings ---------- */

  function renderSetup() {
    const cfg = app.config;
    el.name[0].value = cfg.names[0];
    el.name[1].value = cfg.names[1];

    for (const group of el.setup.querySelectorAll('.seg')) {
      const key = group.dataset.key;
      group.innerHTML = optionsFor(key)
        .map(([value, label], i) =>
          `<button type="button" data-index="${i}" aria-pressed="${cfg[key] === value}">${escapeHtml(label)}</button>`)
        .join('');
    }

    el.finalSetField.hidden = cfg.sets === 1;
    el.tieBreakLabel.textContent = `Tie-break à ${cfg.games}-${cfg.games}`;
    el.advantageHint.textContent = cfg.advantage
      ? 'Il faut 2 points d’écart pour gagner le jeu.'
      : 'À 40-40, le point suivant gagne le jeu.';
  }

  function readNames() {
    app.config = Score.normalizeConfig({ ...app.config, names: [el.name[0].value, el.name[1].value] });
  }

  /* ---------- Rendering: match ---------- */

  /** Score of one completed set for one player, e.g. "6", "6⁴" or "10" for a super tie-break. */
  function setCell(set, player) {
    const won = set.games[player] > set.games[1 - player];
    const value = set.superTieBreak ? set.tieBreak[player] : set.games[player];
    const tieBreak = set.tieBreak && !set.superTieBreak && !won ? `<sup>${set.tieBreak[player]}</sup>` : '';
    return `<span class="${won ? 'won' : ''}">${value}${tieBreak}</span>`;
  }

  function renderBoard() {
    const { match, config } = app;
    const server = Score.currentServer(match);
    const points = Score.pointLabels(match);
    const over = match.winner !== null;
    const canSwapServer = Score.isGameStart(match);

    el.board.innerHTML = [0, 1].map((p) => {
      const serving = !over && server === p;
      const side = serving ? `<span class="side">${SIDE_LABELS[Score.serveSide(match, config)]}</span>` : '';
      // No games column during a super tie-break: it replaces the set.
      const games = over || match.tieBreak === 'superTieBreak' ? '' : match.games[p];
      const pointCell = over ? (match.winner === p ? '✓' : '') : points[p];
      return `
        <div class="row">
          <span class="ball${serving ? ' on' : ''}" aria-hidden="true"></span>
          <div class="player">
            <button type="button" class="name" data-player="${p}" ${canSwapServer ? '' : 'tabindex="-1"'}
              aria-label="${escapeHtml(config.names[p])}${serving ? ', au service' : ''}">${escapeHtml(config.names[p])}</button>
            ${side}
          </div>
          <div class="sets">${match.sets.map((s) => setCell(s, p)).join('')}</div>
          <div class="games">${games}</div>
          <div class="points${pointCell ? '' : ' empty'}">${pointCell}</div>
        </div>`;
    }).join('') + tieBreakNotesHtml();
  }

  /** Full tie-break scores under the scoreboard, e.g. "Set 1 · TB 9-7 Marius". */
  function tieBreakNotesHtml() {
    const notes = Summary.tieBreakNotes(app.match, app.config);
    if (!notes.length) return '';
    return `<p class="tb-notes">${notes.map(escapeHtml).join('<br>')}</p>`;
  }

  /** Short message under the scoreboard (deuce, tie-break, change of ends...). */
  function statusMessage() {
    const { match, config } = app;
    const names = config.names;
    const deuce = Score.deuceStatus(match, config);
    if (deuce) {
      if (deuce.type === 'decidingPoint') return 'Point décisif';
      if (deuce.type === 'deuce') return 'Égalité';
      return `Avantage ${names[deuce.player]}`;
    }
    const parts = [];
    const E = Score.EVENTS;
    if (match.event === E.TIE_BREAK) parts.push('Tie-break');
    if (match.event === E.SUPER_TIE_BREAK) parts.push('Super tie-break');
    if (match.event === E.SET_WON) {
      const last = match.sets[match.sets.length - 1];
      parts.push(`Set ${names[last.games[0] > last.games[1] ? 0 : 1]}`);
    }
    if (match.changeEnds) parts.push('Changement de côté');
    return parts.join(' · ');
  }

  /** Score line of a finished match from the winner's point of view, e.g. "6-4 7-6(5)". */
  function finalScore() {
    const w = app.match.winner;
    return app.match.sets.map((s) => {
      if (s.superTieBreak) return `[${s.tieBreak[w]}-${s.tieBreak[1 - w]}]`;
      const tb = s.tieBreak ? `(${Math.min(...s.tieBreak)})` : '';
      return `${s.games[w]}-${s.games[1 - w]}${tb}`;
    }).join('  ');
  }

  function renderMatch() {
    const { match, config } = app;
    const over = match.winner !== null;
    renderBoard();

    const message = over ? '' : statusMessage();
    el.status.innerHTML = message ? `<b>${escapeHtml(message)}</b>` : '';
    if (!message && match.tieBreak) {
      el.status.textContent = match.tieBreak === 'superTieBreak' ? 'Super tie-break · 10 points' : 'Tie-break · 7 points';
    }

    if (over) {
      el.serveInfo.textContent = '';
    } else {
      const server = config.names[Score.currentServer(match)];
      const hint = Score.isGameStart(match) ? ' (touchez un nom pour changer de serveur)' : '';
      el.serveInfo.textContent = `Au service : ${server}${hint}`;
    }

    el.pads.hidden = over;
    el.padName[0].textContent = config.names[0];
    el.padName[1].textContent = config.names[1];

    el.result.hidden = !over;
    if (over) {
      el.result.innerHTML = `
        <h2>Victoire de ${escapeHtml(config.names[match.winner])}</h2>
        <p>${escapeHtml(finalScore())}</p>
        <button type="button" class="primary" id="play-again">Nouveau match</button>`;
    }
    el.undo.disabled = app.history.length === 0;
  }

  /** Redraws the whole page from the app state. */
  function render() {
    const inMatch = app.match !== null;
    el.setup.hidden = inMatch;
    el.match.hidden = !inMatch;
    el.undo.hidden = !inMatch;
    el.newMatch.hidden = !inMatch;
    el.confirm.hidden = !app.confirmingNewMatch;
    el.share.hidden = !inMatch;
    el.sharePanel.hidden = !(inMatch && app.sharing);
    const install = installMode();
    el.install.hidden = inMatch || install === 'none';
    el.installPanel.hidden = inMatch || install !== 'ios' || !app.installHelp;
    if (install === 'ios') el.install.setAttribute('aria-expanded', String(!el.installPanel.hidden));
    else el.install.removeAttribute('aria-expanded');
    el.subtitle.textContent = !inMatch ? 'Nouveau match' : app.match.winner !== null ? 'Terminé' : 'En cours';

    if (inMatch) {
      renderMatch();
    } else {
      el.status.textContent = '';
      el.serveInfo.textContent = '';
      el.pads.hidden = true;
      el.result.hidden = true;
      renderSetup();
    }
  }

  /* ---------- Actions ---------- */

  /** Applies a change to the match, keeping the previous state for "undo". */
  function update(nextMatch) {
    if (nextMatch === app.match) return;
    app.sharing = false;
    app.history.push(app.match);
    if (app.history.length > MAX_HISTORY) app.history.shift();
    app.match = nextMatch;
    persist();
    render();
  }

  /* ---------- Sharing ---------- */

  /**
   * Shares the score summary. Uses the phone's share menu (WhatsApp, SMS, e-mail...)
   * when the browser offers it; otherwise opens a panel with WhatsApp, e-mail and copy.
   */
  /** Text to share: the match format is added only to the first share of a match. */
  function summaryText() {
    return Summary.buildSummary(app.match, app.config, { includeFormat: !app.formatShared });
  }

  /** Remembers that the score has been shared once, so the format is not repeated. */
  function markShared() {
    if (app.formatShared) return;
    app.formatShared = true;
    persist();
    // Refresh the panel links once the current one has been opened, so the next share has no format line.
    setTimeout(() => setShareLinks(summaryText()), 0);
  }

  function setShareLinks(text) {
    const subject = `Score : ${app.config.names[0]} – ${app.config.names[1]}`;
    el.shareWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    el.shareMail.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }

  async function shareScore() {
    const text = summaryText();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Score JeuSet', text });
        markShared();
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return; // closed by the user
        // Share refused (unsupported context): fall back to the panel.
      }
    }
    openSharePanel(text);
  }

  function openSharePanel(text) {
    setShareLinks(text);
    el.shareFeedback.textContent = '';
    app.sharing = true;
    render();
  }

  async function copySummary() {
    const text = summaryText();
    try {
      await navigator.clipboard.writeText(text);
      markShared();
      el.shareFeedback.textContent = 'Score copié. Collez-le dans votre message.';
    } catch {
      el.shareFeedback.textContent = text; // clipboard refused: show the text so it can be selected
    }
  }

  function scorePoint(player) {
    update(Score.addPoint(app.match, app.config, player));
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function undo() {
    if (!app.history.length) return;
    app.match = app.history.pop();
    app.sharing = false;
    persist();
    render();
  }

  function startMatch() {
    readNames();
    app.match = Score.createMatch(app.config);
    app.history = [];
    app.formatShared = false;
    app.installHelp = false;
    persist();
    render();
  }

  function endMatch() {
    app.match = null;
    app.history = [];
    app.confirmingNewMatch = false;
    app.sharing = false;
    persist();
    render();
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    el.setup.addEventListener('click', (event) => {
      const button = event.target.closest('.seg button');
      if (!button) return;
      const key = button.parentElement.dataset.key;
      readNames();
      app.config = Score.normalizeConfig({ ...app.config, [key]: optionsFor(key)[Number(button.dataset.index)][0] });
      persist();
      renderSetup();
    });

    // Keep the "first server" buttons in step with the names being typed.
    for (const input of el.name) {
      input.addEventListener('input', () => {
        el.setup.querySelectorAll('[data-key=firstServer] button').forEach((b, i) => {
          b.textContent = el.name[i].value.trim() || Score.DEFAULT_CONFIG.names[i];
        });
      });
    }

    el.setup.addEventListener('submit', (event) => {
      event.preventDefault();
      startMatch();
    });

    el.pad[0].addEventListener('click', () => scorePoint(0));
    el.pad[1].addEventListener('click', () => scorePoint(1));
    el.undo.addEventListener('click', undo);

    el.board.addEventListener('click', (event) => {
      const name = event.target.closest('[data-player]');
      if (name) update(Score.setServer(app.match, Number(name.dataset.player)));
    });

    el.share.addEventListener('click', shareScore);
    el.shareCopy.addEventListener('click', copySummary);
    // The links already hold the text: the share counts as soon as one is opened.
    el.shareWhatsapp.addEventListener('click', markShared);
    el.shareMail.addEventListener('click', markShared);
    el.shareClose.addEventListener('click', () => { app.sharing = false; render(); });

    el.newMatch.addEventListener('click', () => { app.confirmingNewMatch = true; render(); });
    el.confirmNo.addEventListener('click', () => { app.confirmingNewMatch = false; render(); });
    el.confirmYes.addEventListener('click', endMatch);
    el.result.addEventListener('click', (event) => {
      if (event.target.closest('#play-again')) endMatch();
    });
  }

  /* ---------- Install on the home screen ---------- */

  function installMode() {
    return Install.installMode({
      standalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
      hasPrompt: app.installPrompt !== null,
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    });
  }

  async function installApp() {
    if (installMode() === 'ios') {
      app.installHelp = !app.installHelp;
      render();
      return;
    }
    const prompt = app.installPrompt;
    if (!prompt) return;
    app.installPrompt = null; // the browser's dialog can only be shown once
    render();
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      // dialog refused by the browser: the button stays hidden until it is offered again
    }
  }

  function bindInstall() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); // keep the dialog for our own button
      app.installPrompt = event;
      render();
    });
    window.addEventListener('appinstalled', () => {
      app.installPrompt = null;
      app.installHelp = false;
      render();
    });
    el.install.addEventListener('click', installApp);
    el.installClose.addEventListener('click', () => { app.installHelp = false; render(); el.install.focus(); });
  }

  /* ---------- Offline support ---------- */

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  }

  /* ---------- Start ---------- */

  restore();
  bindEvents();
  bindInstall();
  render();
  registerServiceWorker();
})();
