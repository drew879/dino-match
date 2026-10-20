/*
 * Little sound effects made with the Web Audio API, so there are no audio
 * files to load. Browsers only allow audio after a tap, so `unlock()` is
 * called from the first button press.
 *
 * iPhones treat Web Audio as "ambient" sound, which the ringer switch mutes.
 * Safari 16.4+ lets a page ask for "playback" audio instead; older iOS needs a
 * silent looping <audio> element to move Web Audio onto the media channel.
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

  const hasAudioSession = 'audioSession' in navigator;
  if (hasAudioSession) {
    try {
      navigator.audioSession.type = 'playback';
    } catch (e) { /* not allowed here: fall through to the defaults */ }
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let silentTag = null;

  // Half a second of 8-bit silence as a WAV file.
  function silentWavUrl() {
    const rate = 8000;
    const n = rate / 2;
    const buf = new ArrayBuffer(44 + n);
    const v = new DataView(buf);
    const str = (o, text) => { for (let i = 0; i < text.length; i++) v.setUint8(o + i, text.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    str(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  // Older iOS only: keep a silent clip looping so sounds play with the ringer off.
  function keepMediaChannel() {
    if (hasAudioSession || !isIOS) return;
    if (!silentTag) {
      silentTag = document.createElement('audio');
      silentTag.setAttribute('x-webkit-airplay', 'deny');
      silentTag.setAttribute('playsinline', '');
      silentTag.loop = true;
      silentTag.src = silentWavUrl();
    }
    if (silentTag.paused) silentTag.play().catch(() => {});
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && silentTag) silentTag.pause();
  });

  function unlock() {
    if (!enabled) return;
    keepMediaChannel();
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.7;
      out.connect(ctx.destination);
    }
    // iOS can leave the context "interrupted" after a call or app switch
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
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

  // A short burst of filtered noise.
  function noiseHit(at, dur, vol, filters) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.02);
    let node = src;
    for (const make of filters) {
      const flt = make(t);
      node.connect(flt);
      node = flt;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.008, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g).connect(out);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function filter(type, freq, q, sweepTo, sweepTime) {
    return (t) => {
      const flt = ctx.createBiquadFilter();
      flt.type = type;
      flt.Q.value = q;
      flt.frequency.setValueAtTime(freq, t);
      if (sweepTo) flt.frequency.exponentialRampToValueAtTime(sweepTo, t + sweepTime);
      return flt;
    };
  }

  // A papery card flick: a quick swish as the card turns, then a soft tap as it lands.
  function cardFlip(level) {
    if (!ready()) return;
    noiseHit(0, 0.075, 0.4 * level, [filter('highpass', 700, 0.7), filter('bandpass', 4200, 0.7, 1500, 0.07)]);
    noiseHit(0.055, 0.035, 0.52 * level, [filter('lowpass', 2400, 0.7)]);
    tone(170, 0.055, 0.06, { type: 'sine', vol: 0.1 * level, slide: 90 });
  }

  function flip() { cardFlip(1); }

  // Softer, for cards turning back face down.
  function flipDown() { cardFlip(0.55); }

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

  window.Sound = { unlock, flip, flipDown, match, miss, roar, win, setEnabled, isEnabled: () => enabled };
})();
