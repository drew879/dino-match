/*
 * Hand-built drawings for the dinosaurs that don't fit the standard raptor
 * shape. Registered on DinoArt.custom by dinosaur id.
 */
(function () {
  'use strict';

  const A = window.DinoArt;
  const { INK, CLAW, leaf, limb, taper, ellipsePath, eye, shadow, svg, f, pt } = A;
  let uid = 0;

  // Outline pass then fill pass, so overlapping parts merge into one silhouette.
  function blob(paths, fill, sw = 5) {
    const list = paths.map((d) => `<path d="${d}"/>`).join('');
    return `<g fill="${INK}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round">${list}</g><g fill="${fill}">${list}</g>`;
  }

  function clipTo(paths, inner) {
    const id = 'cart' + (++uid);
    return `<clipPath id="${id}">${paths.map((d) => `<path d="${d}"/>`).join('')}</clipPath><g clip-path="url(#${id})">${inner}</g>`;
  }

  function cloud(x, y, k = 1) {
    return `<g fill="#fff" opacity="0.85"><circle cx="${x}" cy="${y}" r="${f(9 * k)}"/><circle cx="${f(x + 11 * k)}" cy="${f(y - 4 * k)}" r="${f(11 * k)}"/>` +
      `<circle cx="${f(x + 23 * k)}" cy="${y}" r="${f(8 * k)}"/><rect x="${x}" y="${y}" width="${f(23 * k)}" height="${f(8 * k)}"/></g>`;
  }

  // Long curved claw starting at (x, y), pointing along `angle` degrees.
  function bigClaw(x, y, len, angle, fill = CLAW) {
    return `<path d="M0 -3.2C${f(len * 0.45)} -6 ${f(len * 0.9)} -1 ${f(len)} ${f(len * 0.32)}C${f(len * 0.7)} 2.5 ${f(len * 0.35)} 3.5 0 3.2Z" ` +
      `transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  }

  function teethAlong(x0, y0, x1, y1, n, size = 3.2) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t + 0.8;
      s += `<path d="M${f(x - size * 0.5)} ${f(y - 0.5)}L${f(x)} ${f(y + size)}L${f(x + size * 0.5)} ${f(y - 0.5)}Z" fill="#fff" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
    }
    return s;
  }

  function line(d, w = 2.2, color = INK) {
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /* ---------- Microraptor: gliding on four wings ---------- */

  // A feather with a shimmering center vein (Microraptor's glossy black plumage).
  function glossFeather(x, y, angle, len, wid, fill, sheen) {
    return leaf(x, y, angle, len, wid, fill, 1.8) +
      `<path d="M0 0L${f(len * 0.8)} 0" transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})" stroke="${sheen}" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/>`;
  }

  function raisedWing(sh, wr, color, sheen, k = 1) {
    let s = '';
    // primaries fan up and back from the hand
    for (const [a, l] of [[258, 34], [241, 37], [224, 35]]) s += glossFeather(wr[0] - 1, wr[1] + 1, a, l * k, 8, color, sheen);
    // secondaries trail back from the forearm
    for (let i = 3; i >= 0; i--) {
      const t = 0.15 + i * 0.22;
      const x = sh[0] + (wr[0] - sh[0]) * t;
      const y = sh[1] + (wr[1] - sh[1]) * t;
      s += glossFeather(x, y, 196 + i * 5, (24 + i * 3) * k, 7.5, color, sheen);
    }
    return s;
  }

  function microraptor(d) {
    const c = { body: '#2a3044', belly: '#46506e', feather: '#2c3450', far: '#191c28', sheen: '#7aa8f5', farSheen: '#3c5a94' };
    let s = cloud(22, 30, 1) + cloud(150, 122, 0.8);
    const body = ellipsePath(100, 86, 26, 14, -6);
    const tail = taper([80, 88], [54, 88], [30, 84], 11, 4);
    const neck = taper([116, 82], [128, 77], [137, 69], 14, 10);
    const head = A.headShape(143, 64, 10, 22, 8);
    const parts = [tail, body, neck, head];

    // far wing, raised behind
    s += raisedWing([116, 78], [140, 42], c.far, c.farSheen, 0.9);
    // tail fan
    for (const [a, l] of [[166, 22], [177, 28], [188, 28], [199, 22]]) s += glossFeather(36, 84, a, l, 7, c.feather, c.sheen);
    // far leg wing
    s += legWing([90, 92], c.far, c.farSheen, -6);
    // crest
    s += leaf(138, 55, 222, 12, 4.5, c.feather) + leaf(134, 59, 205, 12, 4.5, c.feather);

    s += blob(parts, c.body);
    s += clipTo(parts, `<path d="${ellipsePath(104, 97, 22, 7, -6)}" fill="${c.belly}"/>` +
      line('M84 79Q100 71 118 75', 3, c.sheen) + line('M50 83Q64 81 78 83', 2.4, c.sheen));

    // near leg wing
    s += legWing([94, 94], c.feather, c.sheen, 0);
    // near wing
    s += raisedWing([112, 80], [132, 44], c.feather, c.sheen, 1);
    s += limb([{ pts: [[112, 80], [122, 60]], w: 7 }, { pts: [[122, 60], [132, 44]], w: 6 }], c.body);
    s += line('M117 71L127 53', 1.8, c.sheen);
    for (const [ax, ay] of [[4, -3], [5, 0], [3, 3]]) s += line(`M133 44q${ax} ${ay - 1} ${ax + 2} ${ay + 1}`, 2);
    s += A.face({ teeth: 3 }, 143, 64, 10, 22, 8);
    return svg(s, d.plainName);
  }

  // Long feathers on the hind leg (Microraptor's "back wings").
  function legWing(hip, color, sheen, dx) {
    const knee = [hip[0] - 10 + dx, hip[1] + 10];
    const ankle = [knee[0] - 16, knee[1] + 4];
    const foot = [ankle[0] - 12, ankle[1] + 1];
    let s = '';
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const x = knee[0] + (foot[0] - knee[0]) * t;
      const y = knee[1] + (foot[1] - knee[1]) * t;
      s += glossFeather(x, y, 120 + i * 12, 19 + i * 2, 6.5, color, sheen);
    }
    s += limb([{ pts: [hip, knee], w: 9 }, { pts: [knee, ankle], w: 6 }, { pts: [ankle, foot], w: 4.5 }], color);
    s += `<path d="M${pt(foot)}c-3 -6 1 -10 6 -9c-3 2 -4 5 -3 9z" fill="${CLAW}" stroke="${INK}" stroke-width="1.6"/>`;
    return s;
  }

  /* ---------- Halszkaraptor: swan neck, flippers, wading ---------- */

  function halszkaraptor(d) {
    const c = { body: '#f3f0e8', dark: '#3a3c47', far: '#cfc9bc', belly: '#ffffff', water: '#7fc0e3', foam: '#d7eef9' };
    let s = '';
    const hx = 134;
    const hy = 28;
    const body = ellipsePath(84, 96, 29, 19, -20);
    const tail = taper([64, 104], [48, 102], [34, 94], 16, 5);
    const neck1 = taper([100, 86], [95, 60], [108, 44], 15, 10);
    const neck2 = taper([107, 46], [113, 30], [hx - 4, hy + 1], 10.5, 9.5);
    const head = A.headShape(hx, hy, 8, 30, 6);
    const bill = ellipsePath(hx + 27, hy + 1.2, 6.5, 4.4, 0);
    const parts = [tail, body, neck1, neck2, head, bill];

    // tail feathers
    for (const [a, l] of [[176, 14], [190, 16], [204, 13]]) s += leaf(40, 96, a, l, 4.5, c.dark);
    // far leg
    s += limb([{ pts: [[80, 104], [76, 118]], w: 11 }, { pts: [[76, 118], [72, 136]], w: 8 }], c.far);
    s += blob(parts, c.body);
    // dark cap and back
    s += clipTo(parts, line(`M30 92Q60 80 82 78Q96 74 98 60Q100 46 112 38Q120 24 ${hx + 2} ${hy - 8}`, 11, c.dark) +
      `<path d="${ellipsePath(88, 108, 26, 8, -18)}" fill="${c.belly}"/>`);
    // flipper
    s += leaf(98, 90, 112, 28, 7.5, c.dark, 2.4);
    // near leg
    s += limb([{ pts: [[88, 112], [94, 124]], w: 9 }, { pts: [[94, 124], [90, 138]], w: 7.5 }], c.body);
    s += `<path d="${ellipsePath(86, 104, 11, 15, -30)}" fill="${c.body}" stroke="${INK}" stroke-width="2.5"/>`;
    // water hides the feet
    s += `<path d="M-5 130Q0 127 0 130Q12 125 25 130T50 130T75 130T100 130T125 130T150 130T175 130T200 130T225 130V160H-5Z" fill="${c.water}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    s += line('M14 140Q22 137 30 140', 2, c.foam) + line('M104 143Q112 140 120 143', 2, c.foam) + line('M168 138Q176 135 184 138', 2, c.foam);
    // a little fish
    s += `<g transform="translate(150 141)"><path d="M0 0Q8 -6 16 0Q8 6 0 0Z" fill="#f39c3c" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M0 0L-5 -4L-5 4Z" fill="#f39c3c" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="11" cy="-0.6" r="1" fill="${INK}"/></g>`;
    // face: tiny teeth and a long bill
    s += teethAlong(hx + 6, hy + 4.6, hx + 28, hy + 4.4, 7, 2.4);
    s += line(`M${hx + 4} ${hy + 4.6}L${hx + 31} ${hy + 4.4}`, 2);
    s += `<ellipse cx="${hx + 28}" cy="${hy - 1}" rx="1.4" ry="1" fill="${INK}"/>`;
    s += eye(hx + 1, hy - 2, 3.6);
    return svg(s, d.plainName);
  }

  /* ---------- Therizinosaurus: pot belly and giant claws ---------- */

  function therizinosaurus(d) {
    const c = { body: '#a8794a', belly: '#edd6ad', dark: '#7a5533', feather: '#6b4524', leafy: '#5ea34a', twig: '#7a5533' };
    let s = shadow(92, 58);
    // a leafy branch to reach for
    s += line('M200 14Q176 16 156 30', 4, c.twig);
    for (const [x, y, a] of [[186, 15, 250], [176, 18, 110], [166, 22, 240], [160, 27, 120], [158, 29, 200]]) s += leaf(x, y, a, 15, 5.5, c.leafy);

    const hx = 128;
    const hy = 28;
    const tail = taper([70, 104], [50, 112], [28, 112], 22, 6);
    const body = ellipsePath(88, 92, 34, 28, -40);
    const neck = taper([100, 76], [108, 48], [hx - 3, hy + 4], 21, 12);
    const head = A.headShape(hx, hy, 9, 17, 7);
    const parts = [tail, body, neck, head];

    // fluffy feathers along the back and neck, and at the tail tip
    for (const [x, y, a] of [[124, 22, 225], [117, 30, 215], [112, 42, 206], [108, 54, 200], [102, 64, 196], [92, 70, 192], [80, 76, 186], [68, 86, 180]]) {
      s += leaf(x, y, a, 13, 5, c.feather);
    }
    for (const [a, l] of [[170, 15], [182, 18], [194, 15]]) s += leaf(32, 112, a, l, 5, c.feather);
    // far arm and claws
    s += limb([{ pts: [[114, 74], [124, 94]], w: 8 }, { pts: [[124, 94], [138, 100]], w: 6.5 }], c.dark);
    for (const [a, l] of [[38, 32], [50, 35], [62, 30]]) s += bigClaw(139, 100, l, a, '#ddd2b6');
    // far leg
    s += limb([{ pts: [[78, 106], [74, 124]], w: 11 }, { pts: [[74, 124], [74, 138]], w: 8 }, { pts: [[72, 139.5], [86, 140.5]], w: 5 }], c.dark);

    s += blob(parts, c.body);
    s += clipTo(parts, `<path d="${ellipsePath(100, 104, 24, 20, -40)}" fill="${c.belly}"/>` +
      `<path d="${taper([110, 80], [116, 54], [hx + 4, hy + 10], 10, 7)}" fill="${c.belly}"/>`);
    // near leg
    s += limb([{ pts: [[90, 116], [94, 128]], w: 11 }, { pts: [[94, 128], [94, 139]], w: 8 }, { pts: [[93, 140], [109, 141]], w: 5.5 }], c.body);
    s += `<path d="M109 138l5 3l-5 2.5z" fill="${CLAW}" stroke="${INK}" stroke-width="1.6"/>`;
    s += `<path d="${ellipsePath(86, 108, 15, 16, -20)}" fill="${c.body}" stroke="${INK}" stroke-width="2.5"/>`;
    // near arm with feather fluff and giant claws
    for (const [x, y, a] of [[114, 92, 150], [120, 98, 140], [127, 102, 125]]) s += leaf(x, y, a, 16, 5, c.feather);
    s += limb([{ pts: [[110, 78], [116, 96]], w: 8.5 }, { pts: [[116, 96], [132, 104]], w: 7 }], c.body);
    for (const [a, l] of [[34, 36], [47, 40], [60, 34]]) s += bigClaw(133, 104, l, a);
    // face: beak, no teeth
    s += line(`M${hx + 3} ${hy + 4}Q${hx + 10} ${hy + 6} ${hx + 16} ${hy + 3}`, 2);
    s += `<ellipse cx="${hx + 13}" cy="${hy - 1.5}" rx="1.3" ry="1" fill="${INK}"/>`;
    s += eye(hx + 1, hy - 3, 3.8);
    return svg(s, d.plainName);
  }

  /* ---------- Parasaurolophus: trombone crest ---------- */

  function parasaurolophus(d) {
    const c = { body: '#e3a13d', belly: '#f8e4ba', dark: '#b17627', crest: '#d4472f', pattern: '#b65a2a' };
    let s = shadow(96, 74);
    const tail = taper([66, 80], [40, 82], [12, 94], 30, 5);
    const body = ellipsePath(96, 82, 40, 25, -4);
    const neck = taper([124, 76], [140, 66], [150, 52], 26, 16);
    const head = 'M142 58C140 46 146 38 156 38C166 38 174 46 182 52Q189 57 184 62C176 65 166 64 158 65C152 66 146 64 142 58Z';
    const parts = [tail, body, neck, head];
    // crest sits behind the head
    s += blob([taper([154, 44], [132, 28], [108, 21], 10, 9), ellipsePath(108, 21, 4.6, 4.6, 0)], c.crest, 4.5);
    // far legs
    s += limb([{ pts: [[110, 96], [116, 118]], w: 8 }, { pts: [[116, 118], [118, 138]], w: 7 }], c.dark);
    s += limb([{ pts: [[74, 98], [70, 122]], w: 13 }, { pts: [[70, 122], [72, 138]], w: 10 }], c.dark);
    s += blob(parts, c.body);
    let marks = `<path d="${ellipsePath(102, 100, 36, 10, -4)}" fill="${c.belly}"/>`;
    for (const x of [30, 44, 58, 72, 86, 100, 114]) marks += line(`M${x} 50L${x - 3} ${x < 60 ? 78 : 70}`, 5, c.pattern);
    marks += `<path d="M150 62Q166 64 184 60L186 70L148 70Z" fill="${c.belly}"/>`;
    s += clipTo(parts, marks);
    // near legs
    s += limb([{ pts: [[90, 104], [92, 124]], w: 12 }, { pts: [[92, 124], [94, 139]], w: 10 }], c.body);
    s += `<path d="M86 139Q94 136 102 139Q103 143 94 143Q85 143 86 139Z" fill="${CLAW}" stroke="${INK}" stroke-width="1.8"/>`;
    s += `<path d="${ellipsePath(86, 92, 18, 22, -12)}" fill="${c.body}" stroke="${INK}" stroke-width="2.5"/>`;
    s += limb([{ pts: [[126, 92], [128, 116]], w: 8.5 }, { pts: [[128, 116], [132, 138]], w: 7.5 }], c.body);
    s += `<path d="M126 139Q132 136 139 139Q139 142 132 142Q126 142 126 139Z" fill="${CLAW}" stroke="${INK}" stroke-width="1.8"/>`;
    // face: duck bill
    s += line('M160 61Q172 61 183 58', 2);
    s += `<ellipse cx="179" cy="52.5" rx="1.6" ry="1.1" fill="${INK}"/>`;
    s += eye(157, 47, 4.4);
    return svg(s, d.plainName);
  }

  /* ---------- Amargasaurus: spiky neck sauropod ---------- */

  function amargasaurus(d) {
    const c = { body: '#93a66b', belly: '#e4ecc9', dark: '#6b7e47', spine: '#6f8a42', spineFar: '#506530' };
    let s = shadow(92, 72);
    const p0 = [116, 86];
    const cp = [142, 70];
    const p2 = [158, 47];
    const neck = taper(p0, cp, p2, 24, 11);
    const head = A.headShape(162, 43, 8.5, 16, 8.5);
    const body = ellipsePath(88, 92, 36, 22, -4);
    const tail = taper([56, 92], [30, 102], [8, 118], 22, 3);
    const parts = [tail, body, neck, head];

    const spine = (base, n, tan, len, color) => {
      // spikes stand up and lean slightly back
      const dir = [-0.42, -0.91];
      const a = [base[0] - tan[0] * 3.6, base[1] - tan[1] * 3.6];
      const b = [base[0] + tan[0] * 3.6, base[1] + tan[1] * 3.6];
      const tip = [base[0] + dir[0] * len, base[1] + dir[1] * len];
      return `<path d="M${pt(a)}L${pt(tip)}L${pt(b)}Z" fill="${color}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
    };
    const neckSpines = (offset, color, scale) => {
      let out = '';
      for (let i = 0; i < 6; i++) {
        const t = 0.2 + i * 0.13;
        const P = [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * cp[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * cp[1] + t * t * p2[1]];
        const T = [2 * (1 - t) * (cp[0] - p0[0]) + 2 * t * (p2[0] - cp[0]), 2 * (1 - t) * (cp[1] - p0[1]) + 2 * t * (p2[1] - cp[1])];
        const tl = Math.hypot(T[0], T[1]);
        const tan = [T[0] / tl, T[1] / tl];
        const n = [tan[1], -tan[0]];
        const w = 24 + (11 - 24) * t;
        const base = [P[0] + n[0] * (w / 2 - 3) + offset[0], P[1] + n[1] * (w / 2 - 3) + offset[1]];
        const len = (34 - (t - 0.2) * 32) * scale;
        out += spine(base, n, tan, len, color);
      }
      return out;
    };
    s += neckSpines([6, -2], c.spineFar, 0.95);
    s += neckSpines([0, 0], c.spine, 1);
    for (const [x, len] of [[62, 9], [74, 12], [86, 13], [98, 13], [110, 11]]) {
      const top = 92 - 22 * Math.sqrt(Math.max(0, 1 - ((x - 88) / 36) ** 2));
      s += spine([x, top + 4], [-0.25, -1], [1, 0], len, c.spine);
    }
    // far legs
    s += limb([{ pts: [[72, 100], [72, 138]], w: 13 }], c.dark);
    s += limb([{ pts: [[116, 100], [120, 138]], w: 12 }], c.dark);
    s += blob(parts, c.body);
    s += clipTo(parts, `<path d="${ellipsePath(94, 108, 32, 9, -4)}" fill="${c.belly}"/>` +
      `<path d="${taper([122, 98], [146, 80], [164, 54], 10, 6)}" fill="${c.belly}"/>`);
    // near legs
    s += limb([{ pts: [[84, 106], [82, 138]], w: 14 }], c.body);
    s += `<path d="${ellipsePath(80, 100, 14, 18, -10)}" fill="${c.body}" stroke="${INK}" stroke-width="2.5"/>`;
    s += limb([{ pts: [[106, 100], [108, 138]], w: 12.5 }], c.body);
    for (const x of [78, 84, 104, 110]) s += `<path d="M${x - 3} 141a3 3 0 0 1 6 0z" fill="${CLAW}" stroke="${INK}" stroke-width="1.4"/>`;
    // face
    s += line('M166 47Q172 49 178 46', 2);
    s += `<ellipse cx="176" cy="41" rx="1.4" ry="1" fill="${INK}"/>`;
    s += eye(162, 40, 3.8);
    return svg(s, d.plainName);
  }

  /* ---------- bipeds built on the raptor template ---------- */

  function pachycephalosaurus(d) {
    const hx = 136;
    const hy = 44;
    return A.raptor({
      label: d.plainName,
      colors: { body: '#9479ae', belly: '#ece2f3', dark: '#6c5386', feather: '#6c5386', pattern: '#6c5386' },
      pattern: 'stripes', armFeathers: 0, armLen: 0.75, tailFan: 0, sickle: false, bulk: 1.15, neckW: 1.3,
      headDX: hx - 140, headDY: hy - 38,
      headFn: () => {
        const path = `M${hx - 14} ${hy + 6}C${hx - 12} ${hy + 17} ${hx + 6} ${hy + 20} ${hx + 20} ${hy + 16}` +
          `Q${hx + 30} ${hy + 13} ${hx + 29} ${hy + 6}C${hx + 26} ${hy - 2} ${hx + 14} ${hy - 6} ${hx - 4} ${hy - 6}Q${hx - 14} ${hy - 4} ${hx - 14} ${hy + 6}Z`;
        let over = `<path d="M${hx - 16} ${hy + 4}C${hx - 19} ${hy - 20} ${hx + 8} ${hy - 31} ${hx + 20} ${hy - 6}Q${hx + 3} ${hy - 3} ${hx - 16} ${hy + 4}Z" ` +
          `fill="#f2e6c9" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
        // bony knobs around the dome and on the snout
        for (const [x, y] of [[hx - 17, hy + 6], [hx - 13, hy + 11], [hx + 20, hy - 3], [hx + 24, hy + 1], [hx + 18, hy - 7]]) {
          over += `<circle cx="${x}" cy="${y}" r="2.6" fill="#f2e6c9" stroke="${INK}" stroke-width="1.6"/>`;
        }
        over += `<path d="M${hx - 4} ${hy - 22}Q${hx + 8} ${hy - 22} ${hx + 14} ${hy - 12}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
        const face = line(`M${hx + 10} ${hy + 12}Q${hx + 20} ${hy + 13} ${hx + 28} ${hy + 9}`, 2) +
          `<ellipse cx="${hx + 25}" cy="${hy + 3}" rx="1.4" ry="1" fill="${INK}"/>` + eye(hx + 7, hy + 2, 4.4);
        return { path, over, face };
      },
    });
  }

  function carnotaurus(d) {
    const hx = 140;
    const hy = 42;
    const horn = (dx, fill) => `<path d="M${hx - 6 + dx} ${hy - 8}Q${hx - 9 + dx} ${hy - 20} ${hx - 16 + dx} ${hy - 25}Q${hx - 4 + dx} ${hy - 22} ${hx + 3 + dx} ${hy - 9}Z" ` +
      `fill="${fill}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
    return A.raptor({
      label: d.plainName,
      colors: { body: '#b8503a', belly: '#f3cdb5', dark: '#86382a', feather: '#86382a', pattern: '#7a3022' },
      pattern: 'bumps', armFeathers: 0, armLen: 0.35, tailFan: 0, sickle: false, bulk: 1.2, bodyLen: 1.06, neckW: 1.35,
      headDY: hy - 38,
      back: horn(6, '#9c4331'),
      headFn: () => {
        const path = `M${hx - 12} ${hy + 10}C${hx - 14} ${hy - 4} ${hx - 6} ${hy - 12} ${hx + 6} ${hy - 11}C${hx + 18} ${hy - 10} ${hx + 28} ${hy - 6} ${hx + 31} ${hy + 2}` +
          `Q${hx + 33} ${hy + 10} ${hx + 27} ${hy + 13}C${hx + 18} ${hy + 17} ${hx + 4} ${hy + 19} ${hx - 8} ${hy + 17}Z`;
        const over = horn(0, '#c96a4e');
        const face = teethAlong(hx + 2, hy + 8.5, hx + 28, hy + 7, 6) +
          line(`M${hx - 2} ${hy + 9}Q${hx + 14} ${hy + 10} ${hx + 29} ${hy + 6.5}`, 2.2) +
          `<ellipse cx="${hx + 27}" cy="${hy - 1}" rx="1.6" ry="1.1" fill="${INK}"/>` +
          eye(hx + 4, hy - 2, 4.4) + line(`M${hx - 3} ${hy - 7}L${hx + 11} ${hy - 4.5}`, 3);
        return { path, over, face };
      },
    });
  }

  function oviraptor(d) {
    const hx = 141;
    const hy = 40;
    let nest = '';
    for (const [x, y] of [[26, 126], [38, 122], [50, 126]]) {
      nest += `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="8.5" fill="#f7efdc" stroke="${INK}" stroke-width="2"/>` +
        `<circle cx="${x - 2}" cy="${y - 3}" r="1.4" fill="#d9c9a6"/>`;
    }
    nest += `<path d="M10 128Q38 152 66 128Q38 136 10 128Z" fill="#9a6a3a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
      line('M16 132L30 136M36 138L52 134M24 138L44 140', 1.6, '#6e4724');
    return A.raptor({
      label: d.plainName,
      colors: { body: '#4a86b5', belly: '#d9e9f5', dark: '#33628a', feather: '#2a5279', pattern: '#33628a' },
      pattern: 'none', sickle: false, tailFan: 0.9, armFeathers: 1.1, teeth: 0,
      headDX: hx - 140, headDY: hy - 38,
      front: nest,
      headFn: () => {
        const path = `M${hx - 11} ${hy + 6}C${hx - 13} ${hy - 6} ${hx - 5} ${hy - 12} ${hx + 4} ${hy - 11}C${hx + 12} ${hy - 10} ${hx + 18} ${hy - 4} ${hx + 20} ${hy + 4}` +
          `Q${hx + 21} ${hy + 10} ${hx + 16} ${hy + 12}C${hx + 10} ${hy + 14} ${hx + 2} ${hy + 14} ${hx - 6} ${hy + 12}Z`;
        let over = `<path d="M${hx - 7} ${hy - 9}C${hx - 9} ${hy - 25} ${hx + 6} ${hy - 33} ${hx + 14} ${hy - 22}C${hx + 16} ${hy - 16} ${hx + 14} ${hy - 10} ${hx + 9} ${hy - 7}Z" ` +
          `fill="#f08a24" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
        over += `<path d="M${hx + 7} ${hy - 10}C${hx + 14} ${hy - 8} ${hx + 20} ${hy - 3} ${hx + 20} ${hy + 4}Q${hx + 21} ${hy + 10} ${hx + 16} ${hy + 12}` +
          `C${hx + 12} ${hy + 13} ${hx + 9} ${hy + 13} ${hx + 7} ${hy + 12}Q${hx + 4} ${hy + 1} ${hx + 7} ${hy - 10}Z" fill="#f3c24f" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
        const face = line(`M${hx + 8} ${hy + 5}Q${hx + 14} ${hy + 6.5} ${hx + 20} ${hy + 5}`, 2) +
          `<ellipse cx="${hx + 15}" cy="${hy - 3}" rx="1.3" ry="1" fill="${INK}"/>` + eye(hx - 1, hy - 1, 4.6);
        return { path, over, face };
      },
    });
  }

  A.custom = { microraptor, halszkaraptor, therizinosaurus, parasaurolophus, amargasaurus, pachycephalosaurus, carnotaurus, oviraptor };
})();
