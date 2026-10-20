/*
 * Aidan's Raptor Match: a two-player memory game.
 * Players take turns flipping two cards; a match scores a pair and earns
 * another turn, a miss passes the turn to the other player.
 */
(function () {
  'use strict';

  const DINOS = window.DINOS;
  const Sound = window.Sound;
  const STORE = 'dinoMatch.settings';
  const GAME_STORE = 'dinoMatch.game';
  const GAME_MAX_AGE = 12 * 60 * 60 * 1000; // a saved game older than this starts fresh
  const DEFAULT_NAMES = ['Aidan', 'Baddy'];
  // Odd numbers of pairs, so a game can't end in a tie.
  const SIZES = [5, 9, 15];
  const OLD_SIZES = { 6: 5, 10: 9 }; // earlier versions used 6 and 10 pairs
  const DINO_BY_ID = Object.fromEntries(DINOS.map((d) => [d.id, d]));
  const CARD_RATIO = 0.78; // width / height
  const MISS_SOUND_DELAY = 700;
  const MISS_FLIP_BACK_DELAY = 1500;

  const $ = (id) => document.getElementById(id);
  const el = {
    setup: $('setup'),
    game: $('game'),
    form: $('setupForm'),
    name1: $('name1'),
    name2: $('name2'),
    board: $('board'),
    boardWrap: $('boardWrap'),
    score: [$('score1'), $('score2')],
    pairsLeft: $('pairsLeft'),
    announce: $('announce'),
    factOverlay: $('factOverlay'),
    factWho: $('factWho'),
    factArt: $('factArt'),
    factName: $('factName'),
    factSay: $('factSay'),
    factBadge: $('factBadge'),
    factText: $('factText'),
    factClose: $('factClose'),
    winOverlay: $('winOverlay'),
    winArt: $('winArt'),
    winTitle: $('winTitle'),
    winScores: $('winScores'),
    quitOverlay: $('quitOverlay'),
    confetti: $('confetti'),
  };

  const PLAYER_COLORS = ['var(--p1)', 'var(--p2)'];

  const state = {
    players: [{ name: DEFAULT_NAMES[0], score: 0 }, { name: DEFAULT_NAMES[1], score: 0 }],
    pairs: SIZES[0],
    starter: 0,
    current: 0,
    deck: [],
    flipped: [],
    lock: false,
    over: false,
    timers: [],
    afterFact: null,
  };

  /* ---------- helpers ---------- */

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function later(fn, ms) {
    const id = setTimeout(() => {
      state.timers = state.timers.filter((t) => t !== id);
      fn();
    }, ms);
    state.timers.push(id);
  }

  function clearTimers() {
    state.timers.forEach(clearTimeout);
    state.timers = [];
  }

  function possessive(name) {
    return /s$/i.test(name) ? `${name}'` : `${name}'s`;
  }

  // "vuh-LOSS-ih-rap-tor" -> the stressed (capitalised) syllables in bold.
  function sayHtml(say) {
    return say.split('-').map((part) => (part.length > 1 && part === part.toUpperCase() ? `<b>${part}</b>` : part)).join('-');
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved) {
        if (typeof saved.name1 === 'string') el.name1.value = saved.name1;
        // "Player 2" was the old default name; it's Baddy now
        if (typeof saved.name2 === 'string') el.name2.value = saved.name2 === 'Player 2' ? DEFAULT_NAMES[1] : saved.name2;
        const pairs = OLD_SIZES[saved.pairs] || saved.pairs;
        const radio = el.form.querySelector(`input[name="size"][value="${pairs}"]`);
        if (radio) radio.checked = true;
      }
    } catch (e) { /* ignore broken or blocked storage */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ name1: el.name1.value, name2: el.name2.value, pairs: state.pairs }));
    } catch (e) { /* ignore */ }
  }

  /* ---------- picking a game back up after a refresh ---------- */

  // Saved after every turn. `current` can be passed ahead of time, so a
  // refresh during a miss still hands the turn to the other player.
  function saveGame(current = state.current) {
    try {
      localStorage.setItem(GAME_STORE, JSON.stringify({
        v: 1,
        t: Date.now(),
        pairs: state.pairs,
        starter: state.starter,
        current,
        players: state.players.map((p) => ({ name: p.name, score: p.score })),
        deck: state.deck.map((c) => ({ id: c.dino.id, by: c.matched ? c.by : null })),
      }));
    } catch (e) { /* ignore */ }
  }

  function clearGame() {
    try {
      localStorage.removeItem(GAME_STORE);
    } catch (e) { /* ignore */ }
  }

  // Returns the saved game, or null if there isn't a usable one.
  function loadGame() {
    try {
      const g = JSON.parse(localStorage.getItem(GAME_STORE) || 'null');
      if (!g || g.v !== 1 || !(Date.now() - g.t < GAME_MAX_AGE)) return null;
      if (!SIZES.includes(g.pairs) || !Array.isArray(g.deck) || g.deck.length !== g.pairs * 2) return null;
      if (![0, 1].includes(g.current) || ![0, 1].includes(g.starter) || !Array.isArray(g.players) || g.players.length !== 2) return null;
      const finder = {};
      for (const c of g.deck) {
        if (!DINO_BY_ID[c.id] || ![null, 0, 1].includes(c.by)) return null;
        if (!(c.id in finder)) finder[c.id] = [];
        finder[c.id].push(c.by);
      }
      // every dinosaur twice, both cards found by the same player (or neither)
      if (Object.values(finder).some((f) => f.length !== 2 || f[0] !== f[1])) return null;
      for (let i = 0; i < 2; i++) {
        const p = g.players[i];
        if (typeof p.name !== 'string' || p.score !== g.deck.filter((c) => c.by === i).length / 2) return null;
      }
      return g;
    } catch (e) {
      return null;
    }
  }

  /* ---------- sound buttons ---------- */

  const SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  const SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

  function renderSoundButtons() {
    const on = Sound.isEnabled();
    document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
      btn.querySelector('.sound-icon').innerHTML = on ? SOUND_ON : SOUND_OFF;
      const label = btn.querySelector('.sound-label');
      if (label) label.textContent = on ? 'Sound on' : 'Sound off';
      btn.setAttribute('aria-label', on ? 'Sound is on. Turn it off.' : 'Sound is off. Turn it on.');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Sound.setEnabled(!Sound.isEnabled());
      renderSoundButtons();
      if (Sound.isEnabled()) Sound.match();
    });
  });

  /* ---------- start screen ---------- */

  function renderHero() {
    const left = DINOS.find((d) => d.id === 'velociraptor');
    const right = DINOS.find((d) => d.id === 'utahraptor');
    $('heroLeft').innerHTML = left.art();
    $('heroRight').innerHTML = right.art();
  }

  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    Sound.unlock();
    state.players[0].name = el.name1.value.trim() || DEFAULT_NAMES[0];
    state.players[1].name = el.name2.value.trim() || DEFAULT_NAMES[1];
    const picked = el.form.querySelector('input[name="size"]:checked');
    state.pairs = picked ? Number(picked.value) : SIZES[0];
    state.starter = 0;
    saveSettings();
    startGame();
  });

  /* ---------- game setup ---------- */

  // Mostly raptors: about two thirds of the pairs, the rest other dinosaurs.
  function pickDinos(pairs) {
    const raptors = shuffle(DINOS.filter((d) => d.raptor));
    const others = shuffle(DINOS.filter((d) => !d.raptor));
    const nRaptors = Math.min(raptors.length, Math.round((pairs * 2) / 3));
    return raptors.slice(0, nRaptors).concat(others.slice(0, pairs - nRaptors));
  }

  // Deals a new game, or restores `saved` (from loadGame) exactly as it was.
  function startGame(saved) {
    clearTimers();
    hideOverlay(el.winOverlay);
    hideOverlay(el.factOverlay);
    el.confetti.innerHTML = '';
    state.flipped = [];
    state.lock = false;
    state.over = false;

    if (saved) {
      state.players = saved.players.map((p) => ({ name: p.name, score: p.score }));
      state.pairs = saved.pairs;
      state.starter = saved.starter;
      state.current = saved.current;
      state.deck = saved.deck.map((c, index) => ({ dino: DINO_BY_ID[c.id], index, up: false, matched: c.by !== null, by: c.by }));
    } else {
      state.players.forEach((p) => { p.score = 0; });
      state.current = state.starter;
      const dinos = pickDinos(state.pairs);
      state.deck = shuffle(dinos.flatMap((d) => [d, d])).map((dino, index) => ({ dino, index, up: false, matched: false, by: null }));
    }

    el.setup.hidden = true;
    el.game.hidden = false;
    document.documentElement.classList.add('in-game');
    renderBoard();
    renderScores();
    layoutBoard();
    saveGame();
    if (state.deck.every((c) => c.matched)) {
      endGame();
      return;
    }
    announce(`${possessive(state.players[state.current].name)} turn. Find the matching dinosaurs!`);
  }

  function renderBoard() {
    el.board.innerHTML = '';
    delete el.board.dataset.rows; // layoutBoard sorts the new cards into rows
    const frag = document.createDocumentFragment();
    state.deck.forEach((card, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.dataset.index = String(i);
      btn.setAttribute('aria-label', `Card ${i + 1}, face down`);
      btn.innerHTML =
        '<span class="card-inner">' +
          '<span class="card-face card-back"></span>' +
          '<span class="card-face card-front">' +
            `<span class="card-art" style="--art-bg:${card.dino.bg}">${card.dino.art()}</span>` +
            '<span class="card-text">' +
              `<span class="card-name">${card.dino.name}</span>` +
              `<span class="card-say">${sayHtml(card.dino.say)}</span>` +
            '</span>' +
          '</span>' +
        '</span>' +
        '<span class="card-badge"></span>';
      card.node = btn;
      if (card.matched) markMatched(card);
      frag.appendChild(btn);
    });
    el.board.appendChild(frag);
  }

  // Row lengths for n cards in `rows` rows. Rows differ by at most one card
  // and are arranged symmetrically (10 -> 2-3-3-2, 18 -> 4-3-4-3-4); a
  // complete grid comes out as equal rows. Null if it can't be symmetric.
  function balancedRows(n, rows) {
    const base = Math.floor(n / rows);
    const extra = n % rows;
    if (base < 1) return null;
    const long = new Set();
    if (rows % 2 === 1 && extra > 0 && (extra === (rows + 1) / 2 || extra === (rows - 1) / 2)) {
      // alternate long and short rows
      for (let i = extra === (rows + 1) / 2 ? 0 : 1; i < rows; i += 2) long.add(i);
    } else if (rows % 2 === 0 && extra % 2 === 1) {
      return null;
    } else {
      // matching pairs of long rows from the middle out, plus the centre row if needed
      const mid = (rows - 1) / 2;
      let left = extra;
      if (extra % 2 === 1) {
        long.add(mid);
        left--;
      }
      for (let d = rows % 2 ? 1 : 0.5; left > 0; d++) {
        long.add(mid - d);
        long.add(mid + d);
        left -= 2;
      }
    }
    return Array.from({ length: rows }, (_, i) => base + (long.has(i) ? 1 : 0));
  }

  // Pick the row layout that gives the biggest cards that fit on screen.
  // Complete grids are the default; on a board taller than it is wide
  // (a phone held upright), balanced rows can win if the cards come out
  // clearly bigger.
  function layoutBoard() {
    if (el.game.hidden || !state.deck.length) return;
    const wrap = el.boardWrap;
    const cs = getComputedStyle(wrap);
    const W = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const n = state.deck.length;
    const gap = Math.round(Math.max(W < 500 ? 5 : 6, Math.min(14, Math.min(W, H) / 60)));

    let best = null;
    for (let rows = 1; rows <= n; rows++) {
      const counts = balancedRows(n, rows);
      const complete = n % rows === 0;
      if (!counts || (!complete && W >= H)) continue;
      const cols = Math.max(...counts);
      const byWidth = (W - gap * (cols - 1)) / cols;
      const byHeight = ((H - gap * (rows - 1)) / rows) * CARD_RATIO;
      const w = Math.min(byWidth, byHeight);
      const score = complete ? w : w / 1.05;
      if (!best || score > best.score) best = { counts, w, score };
    }

    // Always fit the whole board on screen: scrolling a phone mid-game is how
    // pages get refreshed by accident. Only a truly tiny screen scrolls.
    let w = Math.min(best.w, 230);
    let counts = best.counts;
    if (w < 44) {
      w = 56;
      const cols = Math.max(2, Math.floor((W + gap) / (w + gap)));
      counts = Array.from({ length: Math.ceil(n / cols) }, (_, i) => Math.min(cols, n - i * cols));
    }
    w = Math.floor(w);
    el.board.classList.toggle('compact', w < 92);
    el.board.style.setProperty('--card-w', `${w}px`);
    el.board.style.setProperty('--gap', `${gap}px`);

    // regroup the cards into rows only when the shape changes
    const shape = counts.join('-');
    if (el.board.dataset.rows === shape) return;
    el.board.dataset.rows = shape;
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const count of counts) {
      const row = document.createElement('div');
      row.className = 'board-row';
      for (let k = 0; k < count; k++) row.appendChild(state.deck[i++].node);
      frag.appendChild(row);
    }
    el.board.replaceChildren(frag);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutBoard, 80);
  });

  /* ---------- scores and turns ---------- */

  function renderScores() {
    state.players.forEach((p, i) => {
      const box = el.score[i];
      box.querySelector('.score-name').textContent = p.name;
      box.querySelector('.score-num').textContent = String(p.score);
      box.classList.toggle('active', i === state.current && !state.over);
      box.setAttribute('aria-label', `${p.name}: ${p.score} ${p.score === 1 ? 'pair' : 'pairs'}${i === state.current ? ', playing now' : ''}`);
    });
    const left = state.pairs - state.players[0].score - state.players[1].score;
    el.pairsLeft.innerHTML = `<b>${left}</b>${left === 1 ? 'pair' : 'pairs'} left`;
    document.documentElement.style.setProperty('--turn', PLAYER_COLORS[state.current]);
  }

  function announce(text) {
    el.announce.textContent = '';
    // a fresh text node makes screen readers read repeated messages too
    requestAnimationFrame(() => { el.announce.textContent = text; });
  }

  /* ---------- playing ---------- */

  el.board.addEventListener('click', (e) => {
    const btn = e.target.closest('.card');
    if (!btn) return;
    const card = state.deck[Number(btn.dataset.index)];
    if (!card) return;
    if (card.matched) {
      // tap a found pair to see its fact again
      if (!state.lock) showFact(card.dino, null);
      return;
    }
    if (state.lock || state.over || card.up) return;
    flipUp(card);
  });

  function flipUp(card) {
    card.up = true;
    card.node.classList.add('up');
    card.node.setAttribute('aria-label', card.dino.plainName);
    Sound.flip();
    state.flipped.push(card);

    if (state.flipped.length < 2) return;
    state.lock = true;
    const [a, b] = state.flipped;
    if (a.dino.id === b.dino.id) {
      later(() => foundPair(a, b), 480);
    } else {
      saveGame(1 - state.current);
      later(() => {
        Sound.miss();
        a.node.classList.add('shake');
        b.node.classList.add('shake');
      }, MISS_SOUND_DELAY);
      later(() => missedPair(a, b), MISS_FLIP_BACK_DELAY);
    }
  }

  function foundPair(a, b) {
    const who = state.current;
    const player = state.players[who];
    player.score += 1;
    for (const card of [a, b]) {
      card.matched = true;
      card.up = false;
      card.by = who;
      card.node.classList.remove('up');
      markMatched(card);
      card.node.classList.add('pop');
    }
    state.flipped = [];
    Sound.match();
    renderScores();
    saveGame();
    el.score[who].classList.add('bump');
    later(() => el.score[who].classList.remove('bump'), 600);
    later(() => {
      a.node.classList.remove('pop');
      b.node.classList.remove('pop');
    }, 600);

    const done = state.players[0].score + state.players[1].score === state.pairs;
    announce(`${player.name} found a pair: ${a.dino.plainName}!`);
    later(() => {
      showFact(a.dino, who, done);
      state.afterFact = () => {
        if (done) endGame();
        else state.lock = false;
      };
    }, 650);
  }

  // Found pairs stay face up, wearing the finder's colour and initial.
  function markMatched(card) {
    const player = state.players[card.by];
    card.node.classList.add('matched');
    card.node.style.setProperty('--by', PLAYER_COLORS[card.by]);
    card.node.querySelector('.card-badge').textContent = (Array.from(player.name)[0] || '?').toUpperCase();
    card.node.setAttribute('aria-label', `${card.dino.plainName}, found by ${player.name}`);
  }

  function missedPair(a, b) {
    for (const card of [a, b]) {
      card.up = false;
      card.node.classList.remove('up', 'shake');
      card.node.setAttribute('aria-label', `Card ${card.index + 1}, face down`);
    }
    Sound.flipDown();
    state.flipped = [];
    state.current = 1 - state.current;
    renderScores();
    saveGame();
    announce(`Not a match. ${possessive(state.players[state.current].name)} turn.`);
    state.lock = false;
  }

  /* ---------- fun fact popup ---------- */

  let lastFocus = null;

  function showOverlay(overlay, focusEl) {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    if (focusEl) focusEl.focus({ preventScroll: true });
  }

  function hideOverlay(overlay) {
    if (overlay.hidden) return;
    overlay.hidden = true;
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  // finder: index of the player who just found it, or null when reviewing.
  function showFact(dino, finder, lastPair = false) {
    if (finder === null) {
      el.factWho.textContent = '';
      el.factClose.textContent = 'Back to the game';
      state.afterFact = null;
    } else {
      const name = state.players[finder].name;
      el.factWho.textContent = `${name} found a pair!`;
      el.factWho.style.setProperty('--who', PLAYER_COLORS[finder]);
      el.factClose.textContent = lastPair ? 'See who won!' : `Keep going, ${name}!`;
    }
    el.factArt.style.setProperty('--art-bg', dino.bg);
    el.factArt.innerHTML = dino.art();
    el.factName.textContent = dino.plainName;
    el.factSay.innerHTML = `Say it: ${sayHtml(dino.say)}`;
    el.factBadge.hidden = !dino.raptor;
    el.factText.textContent = dino.fact;
    showOverlay(el.factOverlay, el.factClose);
  }

  function closeFact() {
    if (el.factOverlay.hidden) return;
    hideOverlay(el.factOverlay);
    const next = state.afterFact;
    state.afterFact = null;
    if (next) next();
  }

  el.factClose.addEventListener('click', closeFact);
  el.factOverlay.addEventListener('click', (e) => {
    if (e.target === el.factOverlay) closeFact();
  });

  /* ---------- end of game ---------- */

  function endGame() {
    state.over = true;
    state.lock = true;
    clearGame();
    renderScores();
    const [p1, p2] = state.players;
    const tie = p1.score === p2.score;
    const winner = tie ? null : p1.score > p2.score ? 0 : 1;

    const raptorsInGame = [...new Set(state.deck.map((c) => c.dino))].filter((d) => d.raptor);
    const star = raptorsInGame[Math.floor(Math.random() * raptorsInGame.length)] || DINOS[0];
    el.winArt.innerHTML = star.art();
    el.winTitle.textContent = tie ? "It's a tie!" : `${state.players[winner].name} wins!`;
    el.winTitle.style.setProperty('--who', tie ? 'var(--navy)' : PLAYER_COLORS[winner]);
    el.winScores.innerHTML = '';
    state.players.forEach((p, i) => {
      const chip = document.createElement('div');
      chip.className = `win-score p${i + 1}`;
      const name = document.createElement('span');
      name.textContent = p.name;
      const num = document.createElement('b');
      num.textContent = String(p.score);
      chip.append(name, num);
      el.winScores.appendChild(chip);
    });
    showOverlay(el.winOverlay, $('againBtn'));
    announce(tie ? `It's a tie, ${p1.score} pairs each!` : `${state.players[winner].name} wins with ${state.players[winner].score} pairs!`);
    Sound.win();
    const blues = ['#1f86e0', '#7fb8f2', '#f2c94c', '#24427f'];
    const oranges = ['#ee7a1a', '#f2c94c', '#fdc890', '#24427f'];
    confetti(tie ? ['#1f86e0', '#ee7a1a', '#f2c94c', '#24427f'] : winner === 0 ? blues : oranges);
  }

  function confetti(colors) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.confetti.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 90; i++) {
      const bit = document.createElement('i');
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
      bit.style.setProperty('--spin', `${(Math.random() - 0.5) * 1440}deg`);
      bit.style.animationDuration = `${2.4 + Math.random() * 2}s`;
      bit.style.animationDelay = `${Math.random() * 0.8}s`;
      if (i % 3 === 0) bit.style.borderRadius = '50%';
      frag.appendChild(bit);
    }
    el.confetti.appendChild(frag);
    later(() => { el.confetti.innerHTML = ''; }, 5500);
  }

  $('againBtn').addEventListener('click', () => {
    state.starter = 1 - state.starter; // take turns going first
    startGame();
  });
  $('newBtn').addEventListener('click', goHome);

  /* ---------- leaving a game ---------- */

  function goHome() {
    clearTimers();
    clearGame();
    document.documentElement.classList.remove('in-game');
    for (const o of [el.winOverlay, el.factOverlay, el.quitOverlay]) hideOverlay(o);
    el.confetti.innerHTML = '';
    state.deck = [];
    state.afterFact = null;
    el.board.innerHTML = '';
    delete el.board.dataset.rows;
    el.game.hidden = true;
    el.setup.hidden = false;
    document.documentElement.style.setProperty('--turn', PLAYER_COLORS[0]);
    window.scrollTo(0, 0);
  }

  $('homeBtn').addEventListener('click', () => {
    const started = state.players[0].score + state.players[1].score > 0 || state.flipped.length > 0;
    if (started && !state.over) showOverlay(el.quitOverlay, $('stayBtn'));
    else goHome();
  });
  $('stayBtn').addEventListener('click', () => hideOverlay(el.quitOverlay));
  $('leaveBtn').addEventListener('click', goHome);
  el.quitOverlay.addEventListener('click', (e) => {
    if (e.target === el.quitOverlay) hideOverlay(el.quitOverlay);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!el.factOverlay.hidden) closeFact();
    else if (!el.quitOverlay.hidden) hideOverlay(el.quitOverlay);
  });

  /* ---------- go ---------- */

  loadSettings();
  renderHero();
  renderSoundButtons();

  const savedGame = loadGame();
  if (savedGame) startGame(savedGame);
})();
