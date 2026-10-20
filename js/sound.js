/*
 * Little sound effects made with the Web Audio API, so there are no audio
 * files to load. Browsers only allow audio after a tap, so `unlock()` is
 * called from the first button press.
 */
(function () {
  'use strict';

  const KEY = 'dinoMatch.sound';
  let ctx = null;
  let out = null;
  let enabled = true;

  try {
    enabled = localStorage.getItem(KEY) !== 'off';
  } catch (e) { /* storage unavailable: keep the default */ }

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.7;
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function ready() {
    if (!enabled) return false;
    unlock();
    return !!ctx;
  }

  function tone(freq, at, dur, opts = {}) {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
    const vol = opts.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // A soft "thwip" for flipping a card.
  function flip() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.12);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(1200, t);
    bp.frequency.exponentialRampToValueAtTime(3600, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    src.connect(bp).connect(g).connect(out);
    src.start(t);
    tone(520, 0, 0.08, { type: 'triangle', slide: 820, vol: 0.08 });
  }

  // A happy rising chime for a match.
  function match() {
    if (!ready()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => tone(fr, i * 0.085, 0.32, { type: 'triangle', vol: 0.24 }));
    tone(1568, 0.34, 0.4, { type: 'sine', vol: 0.06 });
  }

  // A gentle "boop boop" for a miss.
  function miss() {
    if (!ready()) return;
    tone(392, 0, 0.18, { type: 'sine', vol: 0.22, slide: 370 });
    tone(294, 0.17, 0.26, { type: 'sine', vol: 0.22, slide: 262 });
  }

  // A dinosaur roar: a growling sawtooth and rumbling noise through a closing filter.
  function roar(at = 0) {
    if (!ready()) return;
    const t = ctx.currentTime + at;
    const dur = 1.7;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.45, t + 0.14);
    env.gain.setValueAtTime(0.45, t + 0.5);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(1800, t + 0.25);
    lp.frequency.exponentialRampToValueAtTime(380, t + dur);

    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i / 511) * 2 - 1;
      curve[i] = Math.tanh(x * 3.5);
    }
    shaper.curve = curve;

    // growl voice with a fast wobble
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(175, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(62, t + dur);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 27;
    const wobbleAmt = ctx.createGain();
    wobbleAmt.gain.value = 22;
    wobble.connect(wobbleAmt).connect(osc.frequency);

    const rasp = ctx.createOscillator();
    rasp.frequency.value = 11;
    const raspAmt = ctx.createGain();
    raspAmt.gain.value = 0.35;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.6;
    rasp.connect(raspAmt).connect(voiceGain.gain);

    // breathy rumble
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(dur + 0.1);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.exponentialRampToValueAtTime(260, t + dur);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.55;

    osc.connect(voiceGain).connect(shaper);
    noise.connect(bp).connect(noiseGain).connect(shaper);
    shaper.connect(lp).connect(env).connect(out);

    for (const node of [osc, wobble, rasp, noise]) {
      node.start(t);
      node.stop(t + dur + 0.1);
    }
  }

  // Roar, then a little fanfare.
  function win() {
    if (!ready()) return;
    roar(0);
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [1.55, 1.7, 1.85, 2.0, 2.25, 2.4];
    notes.forEach((fr, i) => tone(fr, times[i], i === notes.length - 1 ? 0.7 : 0.22, { type: 'triangle', vol: 0.26 }));
  }

  function setEnabled(on) {
    enabled = on;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch (e) { /* ignore */ }
    if (on) unlock();
  }

  window.Sound = { unlock, flip, match, miss, roar, win, setEnabled, isEnabled: () => enabled };
})();
