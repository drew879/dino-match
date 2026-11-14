/*
 * The night-sky card back, built as an SVG string.
 *
 * Hidden in the sky is a "constellation" with one star per card, laid out
 * in the same rows as the board. game.js decides each star's tint: in cheat
 * mode the two stars of a pair share a tint, otherwise the tints are paired
 * up between cards that don't match. Everything else is decoration.
 * Uses a 78 x 100 viewBox, the shape of a card.
 */
(function () {
  'use strict';

  const CREAM = '#f3e6c4';
  // Pastel tints for the constellation stars. More pairs than tints?
  // game.js adds a ring to some stars so no two pairs look alike.
  const TINTS = ['#f6b3c4', '#f8c48f', '#f1e17f', '#b2e09f', '#98ddd4', '#a8c9f6', '#c6b2f4', '#f2efe6'];

  const f = (n) => Math.round(n * 100) / 100;

  // Small seeded random numbers, so the decoration is the same every time.
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Four-pointed star with thin rays.
  function sparkle(x, y, size, fill, opacity = 1) {
    const w = size * 0.2;
    return `<path d="M${f(x)} ${f(y - size)}L${f(x + w)} ${f(y - w)}L${f(x + size)} ${f(y)}L${f(x + w)} ${f(y + w)}` +
      `L${f(x)} ${f(y + size)}L${f(x - w)} ${f(y + w)}L${f(x - size)} ${f(y)}L${f(x - w)} ${f(y - w)}Z" fill="${fill}" opacity="${opacity}"/>`;
  }

  function cloud(id, x, y, rx, ry, rot, color, opacity) {
    return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/>` +
      `<stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>` +
      `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="url(#${id})"/>`;
  }

  // Centre of each constellation star, row by row, matching the board.
  function starSpots(rows) {
    const box = { x: 9, y: 16, w: 60, h: 63 };
    const cols = Math.max(...rows);
    const cell = Math.min(box.w / cols, box.h / rows.length);
    const top = box.y + (box.h - rows.length * cell) / 2;
    const spots = [];
    rows.forEach((count, r) => {
      for (let i = 0; i < count; i++) {
        spots.push({ x: box.x + box.w / 2 + (i - (count - 1) / 2) * cell, y: top + cell * (r + 0.5) });
      }
    });
    return { spots, cell };
  }

  // The hills, a volcano and a long-necked dinosaur along the bottom edge.
  function horizon() {
    const dark = '#0d1736';
    let s = '<radialGradient id="glow"><stop offset="0" stop-color="#f6a35c" stop-opacity="0.7"/><stop offset="1" stop-color="#f6a35c" stop-opacity="0"/></radialGradient>';
    s += '<ellipse cx="15" cy="81.5" rx="6" ry="3.5" fill="url(#glow)"/>';
    // volcano with a little smoke
    s += `<path d="M6 89L12.5 82.5Q15 81.5 17.5 82.5L25 89Z" fill="${dark}"/>`;
    s += `<path d="M15 81Q13.5 78.5 15.5 77Q17.5 75.5 16 73.5" fill="none" stroke="${CREAM}" stroke-width="0.5" stroke-linecap="round" opacity="0.25"/>`;
    // rolling hills
    s += `<path d="M3 88Q12 85 22 87.5Q33 90 44 86.5Q56 83 66 86Q72 87.5 75 86.5V97H3Z" fill="${dark}"/>`;
    // sauropod on the right-hand hill
    s += `<g fill="${dark}"><ellipse cx="61" cy="83.6" rx="4.2" ry="2.3"/>` +
      '<path d="M64 83Q66.5 80 67.2 76.8Q67.5 75.8 68.6 75.9Q69.6 76.1 69 76.9Q68.2 77.5 68 78.5Q67.2 82 65.4 84.4Z"/>' +
      '<path d="M57.3 83.3Q54 84 51.5 86.3Q55 85.6 58 84.8Z"/>' +
      '<rect x="57.7" y="84.6" width="1.3" height="2.6" rx="0.4"/><rect x="62.6" y="84.6" width="1.3" height="2.6" rx="0.4"/></g>';
    // ferns
    for (const [x, y, k] of [[30, 88.6, 1], [36, 88.2, -1], [47, 86.8, 1]]) {
      s += `<g fill="none" stroke="${dark}" stroke-width="0.6" stroke-linecap="round"><path d="M${x} ${y}q${k * 0.6} -2.8 ${k * 2.4} -4"/>` +
        `<path d="M${x + k * 0.5} ${y - 1.2}l${k * -1.3} -1"/><path d="M${x + k * 1} ${y - 2.4}l${k * -1.2} -1.1"/><path d="M${x + k * 0.9} ${y - 1.5}l${k * 1.2} -0.2"/></g>`;
    }
    return s;
  }

  // rows: cards per row, top to bottom. tints[i] / rings[i]: style of card i's star.
  function svg(rows, tints, rings) {
    const rand = seeded(20241114);
    const { spots, cell } = starSpots(rows);
    let defs = '<radialGradient id="sky" cx="50%" cy="28%" r="85%"><stop offset="0" stop-color="#46619f"/>' +
      '<stop offset=".55" stop-color="#233a78"/><stop offset="1" stop-color="#121d42"/></radialGradient>';
    let s = '<rect width="78" height="100" fill="url(#sky)"/>';

    // the Milky Way and a few soft coloured clouds
    s += cloud('band', 39, 50, 58, 10, -50, '#dfe6ff', 0.16);
    s += cloud('c1', 60, 28, 20, 12, -25, '#e9a6c8', 0.2);
    s += cloud('c2', 18, 66, 18, 11, 20, '#8fd6d2', 0.16);
    s += cloud('c3', 44, 52, 26, 9, -40, '#b7a3f0', 0.14);

    // star dust, thickest along the Milky Way, some of it faintly tinted
    for (let i = 0; i < 120; i++) {
      let x;
      let y;
      if (i % 2) {
        const t = rand();
        x = 4 + t * 70 + (rand() - 0.5) * 14;
        y = 96 - t * 92 + (rand() - 0.5) * 14;
      } else {
        x = 4 + rand() * 70;
        y = 4 + rand() * 80;
      }
      if (x < 4 || x > 74 || y < 4 || y > 86) continue;
      const pick = rand();
      const color = pick < 0.62 ? CREAM : pick < 0.8 ? '#cfe0ff' : TINTS[Math.floor(rand() * TINTS.length)];
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.14 + rand() * 0.36)}" fill="${color}" opacity="${f(0.3 + rand() * 0.55)}"/>`;
    }
    // decoy sparkles, some of them tinted like the constellation
    for (let i = 0; i < 22; i++) {
      const x = 6 + rand() * 66;
      const y = 6 + rand() * 76;
      const pick = rand();
      const color = pick < 0.45 ? CREAM : pick < 0.6 ? '#cfe0ff' : TINTS[Math.floor(rand() * TINTS.length)];
      s += sparkle(x, y, 0.7 + rand() * 1.2, color, f(0.55 + rand() * 0.35));
    }
    // a little constellation of its own, top right
    const dipper = [[52, 8], [56.5, 6.6], [61, 7.8], [64.5, 11], [69.5, 9.6]];
    s += `<path d="M${dipper.map((p) => p.join(' ')).join('L')}" fill="none" stroke="${CREAM}" stroke-width="0.25" opacity="0.3"/>`;
    for (const [x, y] of dipper) s += `<circle cx="${x}" cy="${y}" r="0.55" fill="${CREAM}" opacity="0.85"/>`;
    // crescent moon, a ringed planet and a shooting star
    s += cloud('halo', 11, 11, 7, 7, 0, CREAM, 0.18);
    s += `<path d="M11 6.6A4.4 4.4 0 1 0 11 15.4A3.4 4.4 0 1 1 11 6.6Z" fill="${CREAM}" opacity="0.9"/>`;
    s += '<circle cx="9" cy="9.6" r="0.5" fill="#d8c79c" opacity="0.6"/>';
    s += `<circle cx="7" cy="40" r="1.9" fill="#c9b8f2" opacity="0.8"/><ellipse cx="7" cy="40" rx="3.4" ry="0.9" transform="rotate(-20 7 40)" fill="none" stroke="${CREAM}" stroke-width="0.35" opacity="0.6"/>`;
    defs += `<linearGradient id="tail" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CREAM}" stop-opacity="0"/><stop offset="1" stop-color="${CREAM}" stop-opacity="0.8"/></linearGradient>`;
    s += '<path d="M44 4.6L36.5 8.2" stroke="url(#tail)" stroke-width="0.6" stroke-linecap="round"/>';

    // the board constellation: faint lines winding row by row, one star per card
    const order = [];
    let k = 0;
    rows.forEach((count, r) => {
      const ids = Array.from({ length: count }, (_, i) => k + i);
      k += count;
      order.push(...(r % 2 ? ids.reverse() : ids));
    });
    s += `<path d="M${order.map((i) => `${f(spots[i].x)} ${f(spots[i].y)}`).join('L')}" fill="none" stroke="${CREAM}" stroke-width="0.25" opacity="0.16"/>`;
    // Kept small and soft so they sit among the other stars; capped so the
    // few big stars of a 10-card board don't stand out.
    const size = Math.min(cell * 0.27, 3.4);
    spots.forEach((p, i) => {
      s += `<g class="card-star">`;
      s += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(size * 0.6)}" fill="${tints[i]}" opacity="0.12"/>`;
      s += sparkle(p.x, p.y, size, tints[i], 0.85);
      if (rings[i]) {
        s += `<circle class="ring" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(size * 1.25)}" fill="none" stroke="${tints[i]}" stroke-width="${f(Math.max(0.25, size * 0.1))}" opacity="0.55"/>`;
      }
      s += '</g>';
    });

    s += horizon();
    // frame
    s += `<rect x="3" y="3" width="72" height="94" rx="5" fill="none" stroke="${CREAM}" stroke-width="0.5" opacity="0.5"/>`;
    s += `<rect x="4.7" y="4.7" width="68.6" height="90.6" rx="3.8" fill="none" stroke="${CREAM}" stroke-width="0.3" stroke-dasharray="0.8 1.2" opacity="0.35"/>`;
    for (const [x, y] of [[3, 3], [75, 3], [75, 97], [3, 97]]) s += sparkle(x, y, 1.5, CREAM, 0.8);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 78 100" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${s}</svg>`;
  }

  window.CardBack = { svg, TINTS, seeded };
})();
