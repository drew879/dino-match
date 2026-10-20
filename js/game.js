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
    players: [{ name: 'Aidan', score: 0 }, { name: 'Player 2', score: 0 }],
    pairs: 6,
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
        if (typeof saved.name2 === 'string') el.name2.value = saved.name2;
        const radio = el.form.querySelector(`input[name="size"][value="${saved.pairs}"]`);
        if (radio) radio.checked = true;
      }
    } catch (e) { /* ignore broken or blocked storage */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ name1: el.name1.value, name2: el.name2.value, pairs: state.pairs }));
    } catch (e) { /* ignore */ }
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
    state.players[0].name = el.name1.value.trim() || 'Player 1';
    state.players[1].name = el.name2.value.trim() || 'Player 2';
    const picked = el.form.querySelector('input[name="size"]:checked');
    state.pairs = picked ? Number(picked.value) : 6;
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

  function startGame() {
    clearTimers();
    hideOverlay(el.winOverlay);
    hideOverlay(el.factOverlay);
    el.confetti.innerHTML = '';
    state.players.forEach((p) => { p.score = 0; });
    state.current = state.starter;
    state.flipped = [];
    state.lock = false;
    state.over = false;

    const dinos = pickDinos(state.pairs);
    state.deck = shuffle(dinos.flatMap((d) => [d, d])).map((dino, index) => ({ dino, index, up: false, matched: false, by: null }));

    el.setup.hidden = true;
    el.game.hidden = false;
    renderBoard();
    renderScores();
    layoutBoard();
    announce(`${possessive(state.players[state.current].name)} turn. Find the matching dinosaurs!`);
  }

  function renderBoard() {
    el.board.innerHTML = '';
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
      frag.appendChild(btn);
    });
    el.board.appendChild(frag);
  }

  // Pick the column count that gives the biggest cards that fit on screen.
  function layoutBoard() {
    if (el.game.hidden || !state.deck.length) return;
    const wrap = el.boardWrap;
    const cs = getComputedStyle(wrap);
    const W = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const n = state.deck.length;
    const gap = Math.round(Math.max(6, Math.min(14, Math.min(W, H) / 60)));

    let best = null;
    for (let cols = 2; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const byWidth = (W - gap * (cols - 1)) / cols;
      const byHeight = ((H - gap * (rows - 1)) / rows) * CARD_RATIO;
      const w = Math.min(byWidth, byHeight);
      const empty = rows * cols - n;
      // prefer full rows, but accept a short last row for noticeably bigger cards
      const tidy = empty === 0 ? 1 : empty <= 2 ? 0.95 : 0.88;
      const score = w * tidy;
      if (!best || score > best.score) best = { cols, w, score };
    }

    const minW = W < 500 ? 84 : 96;
    let w = Math.min(best.w, 230);
    let cols = best.cols;
    if (w < minW) {
      // too small to read: keep a readable size and let the board scroll
      w = Math.min(minW, (W - gap) / 2);
      cols = Math.max(2, Math.floor((W + gap) / (w + gap)));
    }
    w = Math.floor(w);
    el.board.style.setProperty('--card-w', `${w}px`);
    el.board.style.setProperty('--gap', `${gap}px`);
    el.board.style.width = `${cols * w + (cols - 1) * gap}px`;
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
      card.node.classList.add('matched', 'pop');
      card.node.style.setProperty('--by', PLAYER_COLORS[who]);
      card.node.querySelector('.card-badge').textContent = (Array.from(player.name)[0] || '?').toUpperCase();
      card.node.setAttribute('aria-label', `${card.dino.plainName}, found by ${player.name}`);
    }
    state.flipped = [];
    Sound.match();
    renderScores();
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

  function missedPair(a, b) {
    for (const card of [a, b]) {
      card.up = false;
      card.node.classList.remove('up', 'shake');
      card.node.setAttribute('aria-label', `Card ${card.index + 1}, face down`);
    }
    state.flipped = [];
    state.current = 1 - state.current;
    renderScores();
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
    renderScores();
    const [p1, p2] = state.players;
    const tie = p1.score === p2.score;
    const winner = tie ? null : p1.score > p2.score ? 0 : 1;

    const raptorsInGame = [...new Set(state.deck.map((c) => c.dino))].filter((d) => d.raptor);
    const star = raptorsInGame[Math.floor(Math.random() * raptorsInGame.length)] || DINOS[0];
    el.winArt.innerHTML = star.art();
    el.winTitle.textContent = tie ? "It's a tie!" : `${state.players[winner].name} wins!`;
    el.winTitle.style.setProperty('--who', tie ? 'var(--green)' : PLAYER_COLORS[winner]);
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
    confetti(tie ? ['#ec7a1c', '#2f7fd6', '#4f9a5c', '#f2c94c'] : winner === 0 ? ['#ec7a1c', '#f2c94c', '#fde4c9', '#4f9a5c'] : ['#2f7fd6', '#7fb6f0', '#f2c94c', '#4f9a5c']);
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
    for (const o of [el.winOverlay, el.factOverlay, el.quitOverlay]) hideOverlay(o);
    el.confetti.innerHTML = '';
    state.deck = [];
    state.afterFact = null;
    el.board.innerHTML = '';
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
})();
