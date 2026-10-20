/*
 * Cartoon dinosaur drawings, built as inline SVG strings.
 * Every drawing uses a 200 x 150 viewBox with the animal facing right.
 */
(function () {
  'use strict';

  const INK = '#2b211c';
  const CLAW = '#fbf3df';
  let uid = 0;

  const f = (n) => Math.round(n * 10) / 10;
  const pt = (p) => f(p[0]) + ' ' + f(p[1]);

  /* ---------- shape helpers ---------- */

  // A pointed feather/leaf shape starting at (x, y) and pointing along `angle` degrees.
  function leaf(x, y, angle, len, wid, fill, sw = 2) {
    return `<path d="M0 0Q${f(len * 0.45)} ${f(-wid)} ${f(len)} 0Q${f(len * 0.45)} ${f(wid)} 0 0Z" ` +
      `transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})" fill="${fill}" stroke="${INK}" ` +
      `stroke-width="${sw}" stroke-linejoin="round"/>`;
  }

  // Outlined round-capped tubes (legs, arms, toes). All outlines are drawn
  // before all fills so joints between segments merge cleanly.
  function limb(segs, fill) {
    let out = '';
    let inn = '';
    for (const s of segs) {
      const d = 'M' + s.pts.map(pt).join('L');
      out += `<path d="${d}" stroke-width="${f(s.w + 4.5)}"/>`;
      inn += `<path d="${d}" stroke="${fill}" stroke-width="${f(s.w)}"/>`;
    }
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="${INK}">${out}</g>${inn}</g>`;
  }

  // Filled tapering band along a quadratic curve (necks, tails).
  function taper(p0, c, p2, w0, w2) {
    const norm = (a, b) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    };
    const n0 = norm(p0, c);
    const n2 = norm(c, p2);
    const nc = norm(p0, p2);
    const wc = (w0 + w2) / 2;
    const off = (p, n, w, s) => [p[0] + n[0] * w / 2 * s, p[1] + n[1] * w / 2 * s];
    return `M${pt(off(p0, n0, w0, 1))}Q${pt(off(c, nc, wc, 1))} ${pt(off(p2, n2, w2, 1))}` +
      `L${pt(off(p2, n2, w2, -1))}Q${pt(off(c, nc, wc, -1))} ${pt(off(p0, n0, w0, -1))}Z`;
  }

  function ellipsePath(cx, cy, rx, ry, rot) {
    // Ellipse as a path so it can live inside clip paths and outline groups.
    const t = (rot * Math.PI) / 180;
    const p = (a) => [cx + rx * Math.cos(a) * Math.cos(t) - ry * Math.sin(a) * Math.sin(t),
      cy + rx * Math.cos(a) * Math.sin(t) + ry * Math.sin(a) * Math.cos(t)];
    const a = p(0);
    const b = p(Math.PI);
    return `M${pt(a)}A${f(rx)} ${f(ry)} ${f(rot)} 1 1 ${pt(b)}A${f(rx)} ${f(ry)} ${f(rot)} 1 1 ${pt(a)}Z`;
  }

  // Highest point of a rotated ellipse at a given x (for placing back stripes).
  function ellipseTop(e, x) {
    const t = (e.rot * Math.PI) / 180;
    let best = null;
    for (let i = 0; i < 360; i += 2) {
      const a = (i * Math.PI) / 180;
      const px = e.cx + e.rx * Math.cos(a) * Math.cos(t) - e.ry * Math.sin(a) * Math.sin(t);
      const py = e.cy + e.rx * Math.cos(a) * Math.sin(t) + e.ry * Math.sin(a) * Math.cos(t);
      if (Math.abs(px - x) < 2.5 && (best === null || py < best)) best = py;
    }
    return best;
  }

  function eye(x, y, r, opts = {}) {
    const brow = opts.brow === false ? '' :
      `<path d="M${f(x - r * 1.3)} ${f(y - r * 1.25)}Q${f(x)} ${f(y - r * 1.9)} ${f(x + r * 1.4)} ${f(y - r * 0.95)}" ` +
      `fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="${f(x + r * 0.25)}" cy="${f(y + r * 0.05)}" r="${f(r * 0.6)}" fill="${INK}"/>` +
      `<circle cx="${f(x + r * 0.45)}" cy="${f(y - r * 0.25)}" r="${f(r * 0.22)}" fill="#fff"/>` + brow;
  }

  function shadow(cx = 100, rx = 64) {
    return `<ellipse cx="${cx}" cy="142" rx="${rx}" ry="5.5" fill="${INK}" opacity="0.13"/>`;
  }

  function svg(inner, label) {
    return `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${inner}</svg>`;
  }

  /* ---------- patterns (clipped to the silhouette) ---------- */

  function pattern(o, geo) {
    const c = o.colors;
    const kind = o.pattern;
    let s = '';
    const topAt = (x) => {
      if (x < geo.tailBase) return geo.tailTop(x);
      return ellipseTop(geo.body, x) ?? geo.tailTop(x);
    };
    if (kind === 'stripes' || kind === 'tiger') {
      const xs = kind === 'tiger' ? [32, 41, 50, 59, 68, 77, 86, 95, 104, 113] : [36, 49, 62, 75, 88, 100, 111];
      const depth = kind === 'tiger' ? 16 : 11;
      const w = kind === 'tiger' ? 4.5 : 5;
      for (const x of xs) {
        const y = topAt(x);
        if (y == null) continue;
        s += `<path d="M${f(x - 2)} ${f(y - 6)}Q${f(x + 3)} ${f(y + depth * 0.5)} ${f(x - 1)} ${f(y + depth)}" ` +
          `fill="none" stroke="${c.pattern}" stroke-width="${w}" stroke-linecap="round"/>`;
      }
    } else if (kind === 'bands') {
      for (const x of [28, 38, 48, 58]) {
        s += `<path d="M${x} 40L${x - 4} 110" stroke="${c.pattern}" stroke-width="6"/>`;
      }
    } else if (kind === 'spots' || kind === 'rosettes' || kind === 'dots' || kind === 'speckles') {
      const spots = {
        spots: [[34, 64, 3.5], [50, 69, 4.5], [66, 72, 5], [80, 70, 5.5], [96, 69, 5], [86, 82, 4], [104, 80, 4.5], [70, 84, 4], [112, 72, 3.5]],
        rosettes: [[40, 66, 3.6], [58, 71, 4.4], [74, 72, 4.8], [90, 70, 5], [106, 72, 4.4], [82, 84, 4.2], [64, 86, 3.8], [100, 84, 3.8]],
        dots: [[46, 68, 2.4], [60, 71, 2.6], [74, 69, 2.8], [88, 67, 2.8], [102, 68, 2.6], [67, 81, 2.4], [81, 79, 2.6], [95, 78, 2.6], [109, 76, 2.2], [32, 64, 2]],
        speckles: [[30, 63, 1.6], [40, 67, 2], [48, 64, 1.5], [56, 70, 2.2], [64, 66, 1.6], [70, 75, 2], [78, 68, 2.2], [86, 74, 1.8], [92, 66, 2],
          [100, 72, 2.2], [108, 68, 1.6], [114, 74, 2], [82, 82, 1.8], [96, 82, 2], [66, 84, 1.6], [120, 66, 1.6], [126, 56, 1.6], [130, 48, 1.4]],
      }[kind];
      for (const [x, y, r] of spots) {
        if (kind === 'rosettes') {
          s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.patternFill || 'none'}" stroke="${c.pattern}" stroke-width="2.4" stroke-dasharray="5 2.2"/>`;
        } else {
          s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.pattern}"/>`;
        }
      }
    } else if (kind === 'flames') {
      const flame = (x, y, h) => `<path d="M${x - 7} ${y + 6}Q${x - 6} ${y - h * 0.4} ${x - 1} ${y - h}Q${x + 1} ${y - h * 0.45} ${x + 4} ${y - h * 0.6}` +
        `Q${x + 7} ${y - h * 0.2} ${x + 7} ${y + 6}Z" fill="${c.pattern}"/>`;
      s += flame(56, 92, 18) + flame(72, 96, 24) + flame(88, 98, 26) + flame(104, 96, 22) + flame(40, 86, 13);
    } else if (kind === 'zigzag') {
      s += `<path d="M24 64L32 70L40 64L48 72L56 66L64 76L72 68L80 78L88 68L96 78L104 68L112 76L120 66" ` +
        `fill="none" stroke="${c.pattern}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    } else if (kind === 'bumps') {
      for (let x = 30; x <= 120; x += 7) {
        const y = topAt(x);
        if (y != null) s += `<circle cx="${x}" cy="${f(y + 5)}" r="3.2" fill="${c.pattern}"/>`;
      }
      for (const [x, y] of [[60, 86], [74, 90], [88, 90], [102, 86], [68, 78], [84, 80], [98, 76]]) {
        s += `<circle cx="${x}" cy="${y}" r="2.2" fill="${c.pattern}" opacity="0.6"/>`;
      }
    } else if (kind === 'saddle') {
      const pts = [];
      for (let x = 26; x <= 122; x += 6) {
        const y = topAt(x);
        if (y != null) pts.push([x, y + 3]);
      }
      s += `<path d="M${pts.map(pt).join('L')}" fill="none" stroke="${c.pattern}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (kind === 'chevrons') {
      for (const x of [34, 50, 66, 82, 98]) {
        const y = topAt(x) ?? 70;
        s += `<path d="M${x - 6} ${f(y - 4)}L${x + 1} ${f(y + 8)}L${x + 8} ${f(y - 4)}" fill="none" stroke="${c.pattern}" stroke-width="4" stroke-linejoin="round"/>`;
      }
    }
    return s;
  }

  /* ---------- the raptor template ---------- */

  // Raptor head: rounded skull at (hx, hy) with a snout of length L and depth D.
  function headShape(hx, hy, hr, L, D) {
    return `M${f(hx - hr * 0.95)} ${f(hy + hr * 0.45)}` +
      `C${f(hx - hr * 1.15)} ${f(hy - hr * 0.7)} ${f(hx - hr * 0.3)} ${f(hy - hr * 1.15)} ${f(hx + hr * 0.4)} ${f(hy - hr * 1.05)}` +
      `C${f(hx + L * 0.55)} ${f(hy - hr * 0.95)} ${f(hx + L * 0.85)} ${f(hy - D * 0.75)} ${f(hx + L)} ${f(hy - D * 0.35)}` +
      `Q${f(hx + L + D * 0.5)} ${f(hy + D * 0.15)} ${f(hx + L - D * 0.15)} ${f(hy + D * 0.6)}` +
      `C${f(hx + L * 0.6)} ${f(hy + D * 0.95)} ${f(hx + L * 0.2)} ${f(hy + hr * 0.95)} ${f(hx - hr * 0.35)} ${f(hy + hr * 1.0)}Z`;
  }

  function raptor(o) {
    const id = 'dino' + (++uid);
    const c = o.colors;
    const bulk = o.bulk || 1;
    const body = { cx: 92, cy: 84, rx: 32 * (o.bodyLen || 1), ry: 19 * bulk, rot: -12 };
    const legLen = o.legLen || 1;

    // tail
    const tailTipY = o.tailTipY ?? 56;
    const tail = `M72 ${f(84 - 12 * bulk)}C56 ${f(72 - 4 * bulk)} 40 ${f(tailTipY + 4)} 24 ${tailTipY}` +
      `Q17 ${tailTipY + 1} 20 ${tailTipY + 6}C38 ${tailTipY + 16} 52 ${f(84 + 8 * bulk)} 74 ${f(84 + 16 * bulk)}Z`;
    const tailTop = (x) => tailTipY + (x - 24) * ((84 - 12 * bulk) - tailTipY) / 48;

    // neck + head
    const hx = 140 + (o.headDX || 0);
    const hy = 38 + (o.headDY || 0);
    const hr = 12 * (o.headSize || 1);
    const L = 34 * (o.snout || 1);
    const D = 10 * (o.snoutDepth || 1);
    const neckW = 20 * (o.neckW || 1);
    const neck = taper([110, 80], [127, 66], [hx - 4, hy + 6], neckW + 4 * bulk, neckW * 0.7);
    const custom = o.headFn ? o.headFn({ hx, hy, hr, L, D, c }) : null;
    const head = custom ? custom.path : headShape(hx, hy, hr, L, D);
    const bodyPath = ellipsePath(body.cx, body.cy, body.rx, body.ry, body.rot);
    const silhouette = [tail, bodyPath, neck, head];

    const geo = { body, tailBase: 70, tailTop };

    let s = shadow(96, 66) + (o.back || '');

    // feathers behind the body: tail fan and head crest
    s += tailFan(o, tailTipY);
    s += crest(o, hx, hy, hr);

    // far leg and arm (in shadow)
    s += leg(o, c.dark, -13, legLen, true);
    s += arm(o, c.dark, c.featherDark || c.dark, -3, -5, true);

    // silhouette: outline pass then fill pass
    s += `<g fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round">` +
      silhouette.map((d) => `<path d="${d}"/>`).join('') + '</g>';
    s += `<g fill="${c.body}">` + silhouette.map((d) => `<path d="${d}"/>`).join('') + '</g>';

    // belly + markings, clipped to the silhouette
    s += `<clipPath id="${id}c">` + silhouette.map((d) => `<path d="${d}"/>`).join('') + '</clipPath>';
    s += `<g clip-path="url(#${id}c)">`;
    s += `<path d="${ellipsePath(body.cx + 6, body.cy + body.ry * 0.85, body.rx * 0.9, 9 * bulk, body.rot - 2)}" fill="${c.belly}"/>`;
    s += `<path d="${taper([118, 96], [132, 74], [hx + 2, hy + 12], 12, 8)}" fill="${c.belly}"/>`;
    s += `<path d="M${f(hx - 2)} ${f(hy + hr * 0.75)}Q${f(hx + L * 0.5)} ${f(hy + D * 0.95)} ${f(hx + L)} ${f(hy + D * 0.4)}L${f(hx + L)} ${f(hy + 30)}L${f(hx - 4)} ${f(hy + 30)}Z" fill="${c.belly}"/>`;
    s += pattern(o, geo);
    if (o.mask) {
      s += `<path d="M${f(hx - hr * 1.2)} ${f(hy - 2)}Q${f(hx + 4)} ${f(hy - 8)} ${f(hx + L * 0.55)} ${f(hy - 2)}L${f(hx + L * 0.5)} ${f(hy + 3)}Q${f(hx + 4)} ${f(hy + 1)} ${f(hx - hr * 1.2)} ${f(hy + 6)}Z" fill="${c.mask || INK}"/>`;
    }
    s += '</g>';
    if (custom && custom.over) s += custom.over;

    // near leg and arm
    s += leg(o, c.body, 0, legLen, false);
    s += arm(o, c.body, c.feather, 0, 0, false);

    // face
    s += custom ? custom.face : face(o, hx, hy, hr, L, D);
    s += o.front || '';

    return svg(s, o.label || 'dinosaur');
  }

  function tailFan(o, tipY) {
    const c = o.colors;
    const size = o.tailFan ?? 1;
    if (!size) return '';
    let s = '';
    const fc = c.feather;
    // feathers fanning off the end of the tail, top and bottom
    const spots = [[40, tipY + 6, 198, 0.85], [33, tipY + 4, 191, 0.95], [27, tipY + 3, 184, 1], [22, tipY + 4, 177, 1],
      [27, tipY + 8, 168, 0.95], [35, tipY + 12, 160, 0.85], [43, tipY + 15, 154, 0.75]];
    for (const [x, y, a, k] of spots) s += leaf(x, y, a, 17 * size * k, 5 * Math.sqrt(size), fc);
    return s;
  }

  function crest(o, hx, hy, hr) {
    const c = o.colors;
    const fc = c.crest || c.feather;
    if (o.crest === 'tuft') {
      return leaf(hx - hr * 0.6, hy - hr * 0.5, 205, 17, 4.5, fc) + leaf(hx - hr * 0.3, hy - hr * 0.8, 220, 19, 4.5, fc) +
        leaf(hx, hy - hr * 0.95, 238, 15, 4, fc);
    }
    if (o.crest === 'mohawk') {
      let s = '';
      const pts = [[hx + 4, hy - hr * 0.95, 262, 12], [hx - 3, hy - hr * 0.95, 248, 14], [hx - 9, hy - hr * 0.6, 232, 14],
        [hx - 13, hy - hr * 0.1, 218, 13], [hx - 15, hy + 6, 205, 12], [hx - 17, hy + 13, 195, 11]];
      for (const [x, y, a, l] of pts) s += leaf(x, y, a, l, 4, fc);
      return s;
    }
    if (o.crest === 'plume') {
      return leaf(hx - hr * 0.5, hy - hr * 0.7, 200, 28, 5, fc) + leaf(hx - hr * 0.2, hy - hr * 0.9, 212, 30, 5, fc) +
        leaf(hx + 2, hy - hr, 226, 22, 4.5, fc);
    }
    if (o.crest === 'fluff') {
      let s = '';
      const pts = [[hx - 2, hy - hr, 250], [hx - 8, hy - hr * 0.75, 232], [hx - 12, hy - hr * 0.3, 214], [hx - 14, hy + 4, 200], [hx - 16, hy + 11, 190]];
      for (const [x, y, a] of pts) s += leaf(x, y, a, 11, 5, fc);
      return s;
    }
    return '';
  }

  function leg(o, color, dx, k, far) {
    const ox = dx;
    const knee = far ? [90 + ox, 102] : [104, 104];
    const ankle = far ? [80 + ox, 124 * k + (1 - k) * 104] : [94, 104 + 22 * k];
    const foot = far ? [74 + ox, 139] : [100, 139];
    const toe = far ? [86 + ox, 140.5] : [114, 140.5];
    let s = limb([
      { pts: [[far ? 88 + ox : 98, 92], knee], w: 13 },
      { pts: [knee, ankle], w: 9.5 },
      { pts: [ankle, foot], w: 7 },
      { pts: [[foot[0] - 1, foot[1] + 0.5], toe], w: 5 },
    ], color);
    const cx = foot[0];
    const cy = foot[1] - 1;
    if (o.sickle === false) {
      // ordinary three-toed foot
      s += `<path d="M${f(toe[0] - 9)} ${f(toe[1] - 3)}l4 2.5l-4 2.5z" fill="${CLAW}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
      s += `<path d="M${f(toe[0] + 1)} ${f(toe[1] - 3)}l5 3l-5 2.5z" fill="${CLAW}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
      if (!far) s += `<path d="${ellipsePath(97, 92, 13.5, 18.5 * (o.bulk || 1), -32)}" fill="${color}" stroke="${INK}" stroke-width="2.5"/>`;
      return s;
    }
    // sickle claw held up off the ground
    s += `<path d="M${f(cx - 1)} ${f(cy + 1)}C${f(cx - 4)} ${f(cy - 9)} ${f(cx + 2)} ${f(cy - 15)} ${f(cx + 10)} ${f(cy - 13)}` +
      `C${f(cx + 5)} ${f(cy - 9)} ${f(cx + 3)} ${f(cy - 5)} ${f(cx + 4)} ${f(cy + 1)}Z" fill="${CLAW}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    // little toe claw
    s += `<path d="M${f(toe[0] + 1)} ${f(toe[1] - 3)}l5 3l-5 2.5z" fill="${CLAW}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    if (!far) {
      // thigh, drawn last so it sits on top of the shin
      s += `<path d="${ellipsePath(97, 92, 13.5, 18.5 * (o.bulk || 1), -32)}" fill="${color}" stroke="${INK}" stroke-width="2.5"/>`;
    }
    return s;
  }

  function arm(o, color, featherColor, dx, dy, far) {
    const size = o.armFeathers ?? 1;
    const k = o.armLen || 1;
    const sh = [118 + dx, 82 + dy];
    const el = [sh[0] + 5 * k, sh[1] + 15 * k];
    const wr = [el[0] + 12 * k, el[1] - 2 * k];
    let s = '';
    if (size > 0) {
      s += wing(sh, el, wr, size, featherColor);
    }
    s += limb([{ pts: [sh, el], w: 7.5 }, { pts: [el, wr], w: 6 }], color);
    // three hand claws
    for (const [ax, ay] of [[4, -1.5], [5, 2], [3, 5]]) {
      s += `<path d="M${f(wr[0] + 1)} ${f(wr[1] + ay * 0.4)}q${ax} ${ay - 1} ${f(ax + 2)} ${f(ay + 2)}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return s;
  }

  // Wing feathers fanning down and back from the forearm, like a folded bird wing.
  function wing(sh, el, wr, size, fill) {
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const body = [el[0] - 12, el[1] - 4];
    const attach = [wr, lerp(wr, el, 0.5), el, lerp(el, body, 0.5), body];
    const ang = [112, 122, 134, 147, 160];
    const len = [15, 20, 21, 19, 15];
    const tips = attach.map((a, i) => {
      const r = (ang[i] * Math.PI) / 180;
      return [a[0] + Math.cos(r) * len[i] * size, a[1] + Math.sin(r) * len[i] * size];
    });
    let d = `M${pt([wr[0] + 3, wr[1]])}`;
    for (let i = 0; i < tips.length; i++) {
      const t = tips[i];
      const prev = i === 0 ? [wr[0] + 3, wr[1]] : lerp(attach[i], tips[i - 1], 0.55);
      const ctrl = lerp(prev, t, 0.5);
      d += `Q${f(ctrl[0] + 2.5)} ${f(ctrl[1] + 1)} ${pt(t)}`;
      if (i < tips.length - 1) d += `L${pt(lerp(attach[i + 1], t, 0.55))}`;
    }
    d += `Q${f(body[0] - 6)} ${f(body[1] + 4)} ${pt([body[0] + 2, body[1] - 4])}L${pt(sh)}L${pt(el)}Z`;
    let s = `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // feather shafts
    for (let i = 1; i < 4; i++) {
      const a = attach[i];
      s += `<path d="M${pt(a)}L${pt(lerp(a, tips[i], 0.8))}" stroke="${INK}" stroke-width="1.3" opacity="0.35" stroke-linecap="round"/>`;
    }
    return s;
  }

  function face(o, hx, hy, hr, L, D) {
    let s = '';
    // mouth with a few small teeth
    const m0 = [hx + L * 0.18, hy + D * 0.55];
    const m1 = [hx + L - D * 0.3, hy + D * 0.3];
    const teeth = o.teeth ?? 4;
    for (let i = 0; i < teeth; i++) {
      const t = 0.25 + (i / Math.max(1, teeth - 1)) * 0.6;
      const x = m0[0] + (m1[0] - m0[0]) * t;
      const y = m0[1] + (m1[1] - m0[1]) * t + 1.2;
      s += `<path d="M${f(x - 1.7)} ${f(y - 0.6)}L${f(x)} ${f(y + 3.4)}L${f(x + 1.7)} ${f(y - 0.6)}Z" fill="#fff" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
    }
    s += `<path d="M${pt(m0)}Q${f(hx + L * 0.6)} ${f(hy + D * 0.75)} ${pt(m1)}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
    // nostril
    s += `<ellipse cx="${f(hx + L - D * 0.35)}" cy="${f(hy - D * 0.15)}" rx="1.6" ry="1.1" fill="${INK}"/>`;
    s += eye(hx + hr * 0.1, hy - hr * 0.3, hr * 0.42 * (o.eyeSize || 1));
    return s;
  }

  window.DinoArt = { raptor, headShape, face, leaf, limb, taper, ellipsePath, eye, shadow, svg, wing, INK, CLAW, f, pt };
})();
