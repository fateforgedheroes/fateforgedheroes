// ================= SPRITES v2: layered 64x64 pixel art with poses =================
const SPR_BG = (function () {
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function shade(h, f) { const [r, g, b] = hex(h); const c = v => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + ((c(r) << 16) | (c(g) << 8) | c(b)).toString(16).padStart(6, '0'); }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).map(v => v.toString(16).padStart(2, '0')).join(''); }

  // ---------- layer painter ----------
  // Each part is drawn on its own layer, thresholded to hard pixels, then shaded by its own silhouette:
  // top/left rim light, bottom/right shadow, soft vertical falloff. That gives every part volume.
  function Painter(W, H, ox, oy) {
    const base = canvas(W, H), bg = base.getContext('2d');
    let L = null, Lg = null, opts = null;
    function begin(o) { L = canvas(W, H); Lg = L.getContext('2d'); Lg.translate(ox || 0, oy || 0); opts = o || {}; return Lg; }
    function end() {
      const img = Lg.getImageData(0, 0, W, H), d = img.data;
      let top = H, bot = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i + 3] >= 100) { d[i + 3] = 255; if (y < top) top = y; if (y > bot) bot = y; } else d[i + 3] = 0;
      }
      if (opts.shade !== false && bot >= top) {
        const src = new Uint8ClampedArray(d);
        const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[(y * W + x) * 4 + 3] > 0;
        const span = Math.max(1, bot - top);
        for (let y = top; y <= bot; y++) for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4; if (!src[i + 3]) continue;
          let f = 1.1 - 0.2 * (y - top) / span;
          const R = !op(x + 1, y), B = !op(x, y + 1), Lf = !op(x - 1, y), T = !op(x, y - 1);
          if (B || R) f *= 0.7; else if (!op(x + 2, y) || !op(x, y + 2)) f *= 0.86;
          else if (T || Lf) f *= 1.22;
          if (opts.flat) f = (B || R) ? 0.8 : 1;
          d[i] = Math.min(255, d[i] * f); d[i + 1] = Math.min(255, d[i + 1] * f); d[i + 2] = Math.min(255, d[i + 2] * f);
        }
      }
      Lg.putImageData(img, 0, 0);
      bg.drawImage(L, 0, 0);
    }
    function part(o, fn) { const g = begin(o); fn(g); end(); }
    function finish(outlineCol) {
      const img = bg.getImageData(0, 0, W, H), d = img.data, src = new Uint8ClampedArray(d);
      const a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : src[(y * W + x) * 4 + 3]);
      const [r, g, b] = hex(outlineCol || '#120c10');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (src[i + 3] === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
      }
      bg.putImageData(img, 0, 0);
      return base;
    }
    return { part, finish, g: bg };
  }
  // drawing primitives on a 2d context
  const P = {
    rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    poly(g, pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); },
    ell(g, x, y, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); },
    rrect(g, x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); },
    line(g, x0, y0, x1, y1, w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); },
    path(g, pts, w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); },
    px(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
  };

  // ---------- humanoid 64x64, facing right, feet at y=62 ----------
  const POSES = {
    idle0: {},
    idle1: { by: 1 },
    atk: { lean: 3, arm: 'strike', step: 1 },
    cast: { by: -1, arm: 'raise' },
    hit: { lean: -3, by: 1, hurt: 1 },
  };
  function human(o, poseName) {
    const pose = POSES[poseName] || {};
    const pt = Painter(80, 80, 8, 16);
    const bk = o.bulk || 0, D = o.dy || 0, ux = pose.lean || 0, uy = (pose.by || 0) + D;
    const skin = o.skin, arm = o.armor, sleeve = o.sleeve || o.armor, legs = o.legs || shade(o.armor, 0.7);
    const boots = o.boots || '#4a3628', metal = o.metal || '#c8cdd6', wood = o.wood || '#7a5234', glow = o.glow || '#ffe89a';
    const bow = o.weapon === 'bow';
    let armPose = pose.arm || 'rest';
    if (bow && armPose === 'strike') armPose = 'draw';
    if (o.weapon === 'staff' && armPose === 'strike') armPose = 'raise';
    const hipY = 42 + uy, footY = 61;
    // shoulders / hands
    const sb = [23 + ux - bk, 28 + uy], sf = [38 + ux + bk, 28 + uy];
    const HANDS = {
      rest: { fe: [42 + ux + bk, 34 + uy], fh: [43 + ux + bk, 41 + uy], bh: [20 + ux - bk, 41 + uy], be: [20 + ux - bk, 35 + uy] },
      strike: { fe: [46 + ux + bk, 31 + uy], fh: [52 + ux + bk, 33 + uy], bh: [18 + ux - bk, 37 + uy], be: [19 + ux - bk, 33 + uy] },
      raise: { fe: [44 + ux + bk, 22 + uy], fh: [46 + ux + bk, 14 + uy], bh: [20 + ux - bk, 40 + uy], be: [20 + ux - bk, 34 + uy] },
      draw: { fe: [46 + ux + bk, 30 + uy], fh: [52 + ux + bk, 30 + uy], bh: [36 + ux, 30 + uy], be: [30 + ux, 32 + uy] },
    };
    const hp = HANDS[armPose];
    const WDIR = { rest: [0.28, -1], strike: [1, 0.45], raise: [0.12, -1], draw: [0, -1] };
    let dir = WDIR[armPose]; const dl = Math.hypot(dir[0], dir[1]); dir = [dir[0] / dl, dir[1] / dl];
    const nrm = [-dir[1], dir[0]];

    // cape
    if (o.cape) pt.part({}, g => {
      P.poly(g, [[sb[0] + 1, sb[1] - 2], [sf[0] - 4, sf[1] - 2], [sb[0] - 3, 58], [sb[0] - 10 - (pose.lean > 0 ? 2 : 0), 59]], o.cape);
      P.line(g, sb[0] - 4, 36 + uy, sb[0] - 7, 57, 1, shade(o.cape, 0.7));
    });
    // back arm
    pt.part({}, g => {
      P.path(g, [sb, hp.be, hp.bh], 5, shade(sleeve, 0.8));
      P.ell(g, hp.bh[0], hp.bh[1] + 1, 2.6, 2.6, shade(skin, 0.85));
    });
    // legs
    const fStep = pose.step ? 4 : 0;
    pt.part({}, g => {
      P.line(g, 27 + ux * 0.5, hipY, 26, 57, 6, shade(legs, 0.85));
    });
    pt.part({}, g => {
      P.line(g, 34 + ux * 0.5, hipY, 35 + fStep, 57, 6, legs);
    });
    pt.part({}, g => {
      P.rrect(g, 21, 55, 10, 7, 2, shade(boots, 0.85)); P.rect(g, 21, 55, 9, 2, shade(boots, 1.2));
      P.rrect(g, 31 + fStep, 55, 11, 7, 2, boots); P.rect(g, 31 + fStep, 55, 9, 2, shade(boots, 1.25));
    });
    // robe skirt / coat tails
    if (o.robe) pt.part({}, g => {
      P.poly(g, [[22 + ux - bk, hipY - 3], [40 + ux + bk, hipY - 3], [44 + fStep * 0.5, 58], [18, 58]], arm);
      if (o.trim) { P.rect(g, 30 + ux * 0.6, hipY - 2, 2, 60 - hipY, o.trim); P.rect(g, 18, 55, 26 + fStep * 0.5, 2, o.trim); }
    });
    if (o.coat) pt.part({}, g => {
      P.poly(g, [[22 + ux - bk, hipY - 3], [29 + ux, hipY - 3], [26, 54], [18, 53]], arm);
      P.poly(g, [[31 + ux, hipY - 3], [40 + ux + bk, hipY - 3], [43, 52], [35, 54]], shade(arm, 0.9));
    });
    // torso
    pt.part({}, g => {
      const tx = 22 + ux - bk, tw = 18 + 2 * bk;
      if (o.style === 'ribs') {
        P.rrect(g, 26 + ux, 25 + uy, 11, 17, 3, arm);
      } else P.rrect(g, tx, 25 + uy, tw, 18, 4, arm);
    });
    // torso details (flat, no rim)
    pt.part({ shade: false }, g => {
      const tx = 22 + ux - bk, tw = 18 + 2 * bk, ty = 25 + uy;
      const dk = shade(arm, 0.62), lt = shade(arm, 1.3);
      if (o.style === 'plate') {
        P.rect(g, tx + 3, ty + 3, tw - 6, 1, lt); P.rect(g, tx + tw / 2 - 1, ty + 4, 1, 9, dk);
        P.rect(g, tx + 4, ty + 9, tw - 8, 1, dk);
      } else if (o.style === 'leather') {
        for (let i = 0; i < 4; i++) P.rect(g, tx + tw / 2 - 1 + (i % 2), ty + 3 + i * 3, 2, 1, dk);
        P.rect(g, tx + 2, ty + 2, 3, 12, shade(arm, 1.12));
      } else if (o.style === 'ribs') {
        for (let i = 0; i < 4; i++) P.rect(g, 28 + ux, ty + 3 + i * 3, 8, 1, dk);
        P.rect(g, 31 + ux, ty + 2, 2, 14, dk);
      } else if (o.style === 'bare') {
        P.line(g, tx + 2, ty + 1, tx + tw - 3, ty + 14, 3, o.strap || '#5a3a22');
        P.rect(g, tx + tw / 2 + 2, ty + 5, 3, 1, dk); P.rect(g, tx + tw / 2 - 3, ty + 5, 3, 1, dk);
      } else if (o.style === 'robe') {
        P.poly(g, [[tx + tw / 2 - 5, ty], [tx + tw / 2 + 5, ty], [tx + tw / 2, ty + 6]], shade(arm, 0.75));
        if (o.trim) P.rect(g, tx + tw / 2 - 1, ty + 6, 2, 12, o.trim);
      } else if (o.style === 'coat') {
        P.rect(g, tx + tw / 2, ty, 1, 18, dk);
        for (let i = 0; i < 3; i++) P.rect(g, tx + tw / 2 + 2, ty + 4 + i * 4, 2, 2, o.buttons || '#d9b45a');
        P.poly(g, [[tx + tw / 2 - 4, ty], [tx + tw / 2 + 4, ty], [tx + tw / 2, ty + 5]], o.shirt || '#e6e0d0');
      }
      if (o.emblem && o.style !== 'robe') { P.rect(g, tx + tw / 2 - 2, ty + 5, 4, 4, o.emblem); P.px(g, tx + tw / 2 - 1, ty + 6, shade(o.emblem, 1.3)); }
    });
    // belt
    if (o.style !== 'ribs') pt.part({}, g => {
      P.rect(g, 22 + ux - bk, 39 + uy, 18 + 2 * bk, 3, o.belt || shade(arm, 0.55));
      P.rect(g, 30 + ux, 38 + uy, 4, 5, o.buckle || '#d9b45a');
    });
    else pt.part({}, g => { P.rrect(g, 25 + ux, 39 + uy, 13, 4, 2, arm); });
    // pauldrons
    if (o.pauldrons) pt.part({}, g => {
      P.ell(g, sb[0] + 1, sb[1] - 1, 5, 4, shade(o.pauldrons, 0.85));
      P.ell(g, sf[0] - 1, sf[1] - 1, 6, 4.5, o.pauldrons);
    });
    // neck + head
    const hx = 23 + ux + (pose.lean > 0 ? 1 : 0), hy = 8 + uy;
    pt.part({}, g => {
      P.rect(g, hx + 6, hy + 14, 5, 4, shade(skin, 0.85));
      P.rrect(g, hx, hy, 16, 16, 4, skin);
      P.rect(g, hx + 15, hy + 9, 2, 2, skin); // nose
      if (o.ears === 'elf') P.poly(g, [[hx + 3, hy + 8], [hx + 6, hy + 8], [hx + 1, hy + 1]], skin);
      else if (o.ears !== 'none') P.ell(g, hx + 4, hy + 9, 2, 2.5, skin);
    });
    // face (flat)
    pt.part({ shade: false }, g => {
      const eye = o.eye || '#1a1418';
      if (pose.hurt) { P.rect(g, hx + 10, hy + 8, 3, 1, '#1a1418'); P.rect(g, hx + 5, hy + 8, 2, 1, '#1a1418'); }
      else {
        P.rect(g, hx + 11, hy + 7, 2, 3, eye); P.px(g, hx + 11, hy + 7, o.eyeHi || '#f4ecdc');
        P.rect(g, hx + 6, hy + 7, 1, 3, shade(eye, 0.9));
      }
      if (o.brow !== false) P.rect(g, hx + 10, hy + 5, 4, 1, o.browCol || shade(o.hair || skin, 0.7));
      P.rect(g, hx + 11, hy + 12, 3, 1, shade(skin, 0.62));
      if (o.jaw) { P.rect(g, hx + 8, hy + 12, 7, 1, o.jaw); for (let i = 0; i < 3; i++) P.px(g, hx + 9 + i * 2, hy + 13, o.jaw); }
      if (o.tusk) { P.rect(g, hx + 13, hy + 11, 1, 3, '#efe6cf'); P.px(g, hx + 13, hy + 10, '#efe6cf'); }
      if (o.scar) P.rect(g, hx + 12, hy + 3, 1, 5, shade(skin, 0.6));
      if (o.blush) P.rect(g, hx + 12, hy + 10, 2, 1, mix(skin, '#d06060', 0.45));
      P.rect(g, hx + 4, hy + 13, 8, 1, shade(skin, 0.82));
    });
    // hair
    const hc = o.hair;
    if (hc && o.hairStyle) pt.part({}, g => {
      if (o.hairStyle === 'short') { P.rrect(g, hx - 1, hy - 2, 18, 7, 3, hc); P.rrect(g, hx - 1, hy - 2, 7, 13, 3, hc); P.poly(g, [[hx + 12, hy + 3], [hx + 17, hy + 3], [hx + 16, hy + 6]], hc); }
      if (o.hairStyle === 'long') { P.rrect(g, hx - 1, hy - 2, 18, 7, 3, hc); P.rrect(g, hx - 3, hy - 2, 9, 26, 3, hc); P.poly(g, [[hx + 11, hy + 3], [hx + 17, hy + 3], [hx + 17, hy + 8]], hc); }
      if (o.hairStyle === 'spiky') { P.rrect(g, hx - 1, hy - 1, 18, 6, 3, hc); P.rrect(g, hx - 1, hy - 1, 7, 12, 3, hc); [[hx, hy], [hx + 5, hy - 1], [hx + 10, hy], [hx + 14, hy + 2]].forEach(([x, y], i) => P.poly(g, [[x, y + 2], [x + 5, y + 1], [x - 1 + i, y - 5]], hc)); }
      if (o.hairStyle === 'topknot') { P.rrect(g, hx + 1, hy - 1, 14, 4, 2, hc); P.ell(g, hx + 5, hy - 4, 3.5, 3.5, hc); P.line(g, hx + 3, hy - 3, hx - 3, hy + 6, 2, hc); }
      if (o.hairStyle === 'bun') { P.rrect(g, hx - 1, hy - 2, 18, 7, 3, hc); P.rrect(g, hx - 1, hy - 2, 7, 12, 3, hc); P.ell(g, hx - 1, hy + 2, 4, 4, hc); }
      if (o.hairStyle === 'mohawk') { P.poly(g, [[hx + 2, hy + 2], [hx + 12, hy], [hx + 10, hy - 6], [hx + 3, hy - 5]], hc); }
      // strand highlight
      P.rect(g, hx + 3, hy - 1, 6, 1, shade(hc, 1.35));
    });
    if (o.beard) pt.part({}, g => {
      P.poly(g, [[hx + 6, hy + 10], [hx + 17, hy + 10], [hx + 16, hy + 17], [hx + 12, hy + 23], [hx + 8, hy + 18]], o.beard);
      P.rect(g, hx + 10, hy + 11, 5, 1, shade(skin, 0.55));
    });
    // headgear
    const c = o.headCol;
    if (o.head) pt.part({}, g => {
      if (o.head === 'helm') { P.rrect(g, hx - 1, hy - 3, 18, 9, 4, c); P.rrect(g, hx - 1, hy - 3, 8, 16, 3, c); P.rect(g, hx + 7, hy + 4, 10, 2, shade(c, 0.8)); }
      if (o.head === 'greathelm') { P.rrect(g, hx - 1, hy - 3, 18, 18, 4, c); P.rect(g, hx + 9, hy + 6, 8, 2, '#1a1418'); P.rect(g, hx + 12, hy + 9, 1, 5, '#1a1418'); }
      if (o.head === 'hood') { P.rrect(g, hx - 2, hy - 3, 20, 9, 5, c); P.rrect(g, hx - 3, hy - 3, 10, 22, 4, c); P.poly(g, [[hx + 16, hy - 1], [hx + 19, hy + 4], [hx + 15, hy + 5]], c); }
      if (o.head === 'hat') { P.ell(g, hx + 8, hy + 1, 14, 3.5, c); P.rrect(g, hx + 1, hy - 8, 14, 9, 2, c); P.rect(g, hx + 1, hy - 2, 14, 2, o.hatBand || '#8a2a2a'); }
      if (o.head === 'witch') { P.ell(g, hx + 8, hy + 1, 13, 3, c); P.poly(g, [[hx + 1, hy], [hx + 14, hy], [hx + 2, hy - 16], [hx - 5, hy - 20]], c); P.rect(g, hx + 1, hy - 2, 13, 2, o.hatBand || '#6a3a8a'); }
      if (o.head === 'horns') { const hcol = o.hornCol || '#d8cfb8'; P.path(g, [[hx + 3, hy + 2], [hx - 1, hy - 4], [hx - 5, hy - 7]], 3, hcol); P.path(g, [[hx + 11, hy], [hx + 12, hy - 6], [hx + 9, hy - 10]], 3, hcol); }
      if (o.head === 'circlet') { P.rect(g, hx, hy + 2, 17, 2, c); P.rect(g, hx + 12, hy + 1, 3, 3, o.gem || '#9af0ff'); }
      if (o.head === 'wreath') { P.rect(g, hx - 1, hy + 1, 18, 2, '#4f8a3a'); [[hx + 2, '#e79ac0'], [hx + 7, '#f0e08a'], [hx + 12, '#e79ac0'], [hx + 16, '#f0e08a']].forEach(([x, col]) => P.rect(g, x, hy, 2, 2, col)); }
      if (o.head === 'crown') { P.rect(g, hx + 1, hy - 3, 14, 4, c); [0, 5, 10].forEach(i => P.poly(g, [[hx + 1 + i, hy - 3], [hx + 5 + i, hy - 3], [hx + 3 + i, hy - 7]], c)); P.rect(g, hx + 7, hy - 2, 2, 2, o.gem || '#c8402e'); }
      if (o.plume) P.poly(g, [[hx + 4, hy - 3], [hx + 9, hy - 4], [hx + 1, hy - 10], [hx - 6, hy - 2]], o.plume);
    });
    // shield (in front of body)
    if (o.shield) pt.part({}, g => {
      const sx = 38 + ux + bk, sy = 29 + uy + (armPose === 'strike' ? -2 : 0);
      P.poly(g, [[sx, sy], [sx + 14, sy], [sx + 14, sy + 10], [sx + 7, sy + 19], [sx, sy + 10]], o.shield);
    });
    if (o.shield) pt.part({ shade: false }, g => {
      const sx = 38 + ux + bk, sy = 29 + uy + (armPose === 'strike' ? -2 : 0);
      P.poly(g, [[sx + 2, sy + 2], [sx + 12, sy + 2], [sx + 12, sy + 9], [sx + 7, sy + 16], [sx + 2, sy + 9]], o.shield2 || shade(o.shield, 1.22));
      P.rect(g, sx + 6, sy + 4, 2, 9, o.emblemS || '#d9b45a'); P.rect(g, sx + 4, sy + 6, 6, 2, o.emblemS || '#d9b45a');
    });
    // weapon
    const [wx, wy] = hp.fh;
    const at = k => [wx + dir[0] * k, wy + dir[1] * k];
    const wp = o.weapon;
    if (wp && wp !== 'orb') pt.part({}, g => {
      if (wp === 'sword' || wp === 'greatsword') {
        const L = wp === 'greatsword' ? 26 : 20;
        P.line(g, ...at(3), ...at(L), wp === 'greatsword' ? 4 : 3, metal);
        P.line(g, ...at(L - 1), ...at(L + 2), 1.5, metal);
        P.line(g, wx + nrm[0] * 5 + dir[0] * 2, wy + nrm[1] * 5 + dir[1] * 2, wx - nrm[0] * 5 + dir[0] * 2, wy - nrm[1] * 5 + dir[1] * 2, 2, o.guard || '#d9b45a');
        P.line(g, ...at(-4), ...at(1), 2, o.grip || '#5a3a2a');
        P.ell(g, ...at(-5), 1.6, 1.6, o.guard || '#d9b45a');
      } else if (wp === 'hammer') {
        P.line(g, ...at(-5), ...at(16), 2, wood);
        const [cx, cy] = at(16);
        P.poly(g, [[cx + nrm[0] * 7 - dir[0] * 4, cy + nrm[1] * 7 - dir[1] * 4], [cx + nrm[0] * 7 + dir[0] * 4, cy + nrm[1] * 7 + dir[1] * 4], [cx - nrm[0] * 7 + dir[0] * 4, cy - nrm[1] * 7 + dir[1] * 4], [cx - nrm[0] * 7 - dir[0] * 4, cy - nrm[1] * 7 - dir[1] * 4]], metal);
      } else if (wp === 'axe') {
        P.line(g, ...at(-5), ...at(17), 2, wood);
        const [cx, cy] = at(14), s = nrm[0] > 0 ? 1 : -1;
        P.poly(g, [[cx, cy], [cx + dir[0] * 6, cy + dir[1] * 6], [cx + nrm[0] * 8 * s + dir[0] * 9, cy + nrm[1] * 8 * s + dir[1] * 9], [cx + nrm[0] * 9 * s - dir[0] * 3, cy + nrm[1] * 9 * s - dir[1] * 3]], metal);
      } else if (wp === 'staff') {
        P.line(g, ...at(-14), ...at(20), 2, wood);
        P.ell(g, ...at(21), 3, 3, shade(wood, 0.8));
      } else if (wp === 'spear') {
        P.line(g, ...at(-14), ...at(22), 2, wood);
        const [cx, cy] = at(22);
        P.poly(g, [[cx + nrm[0] * 3, cy + nrm[1] * 3], [cx + dir[0] * 9, cy + dir[1] * 9], [cx - nrm[0] * 3, cy - nrm[1] * 3]], metal);
        P.rect(g, cx - 1, cy - 1, 3, 3, o.guard || '#d9b45a');
      } else if (wp === 'dagger') {
        P.line(g, ...at(2), ...at(10), 2, metal); P.line(g, wx + nrm[0] * 3, wy + nrm[1] * 3, wx - nrm[0] * 3, wy - nrm[1] * 3, 1.5, o.guard || '#8a6a3a');
      } else if (wp === 'sabre') {
        const pts = []; for (let k = 2; k <= 19; k += 3) { const b = (k / 19) ** 2 * 4; pts.push([wx + dir[0] * k - nrm[0] * b, wy + dir[1] * k - nrm[1] * b]); }
        P.path(g, pts, 2.5, metal);
        P.path(g, [[wx + nrm[0] * 3, wy + nrm[1] * 3], [wx - nrm[0] * 3, wy - nrm[1] * 3]], 2, o.guard || '#d9b45a');
      } else if (wp === 'club') {
        P.line(g, ...at(-3), ...at(9), 3, wood); P.line(g, ...at(9), ...at(17), 5, shade(wood, 0.85));
        P.px(g, ...at(14).map(Math.round), '#c8cdd6');
      } else if (wp === 'claws') {
        for (let i = -1; i <= 1; i++) P.line(g, wx + nrm[0] * i * 2, wy + nrm[1] * i * 2, wx + nrm[0] * i * 2 + dir[0] * 6, wy + nrm[1] * i * 2 + dir[1] * 6, 1, '#e8e0d0');
      } else if (wp === 'bow') {
        const drawn = armPose === 'draw';
        const bx = wx + 2, top = wy - 15, bot = wy + 15;
        g.strokeStyle = wood; g.lineWidth = 2.5; g.beginPath(); g.moveTo(bx - 2, top); g.quadraticCurveTo(bx + 9, wy, bx - 2, bot); g.stroke();
        g.strokeStyle = '#e6e0d0'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx - 2, top); g.lineTo(drawn ? hp.bh[0] + 1 : bx - 2, wy); g.lineTo(bx - 2, bot); g.stroke();
        if (drawn) { P.line(g, hp.bh[0] + 1, wy, bx + 10, wy, 1, '#d8c8a8'); P.rect(g, bx + 9, wy - 1, 3, 3, metal); }
      }
    });
    // staff crystal glow (flat)
    if (wp === 'staff') pt.part({ shade: false }, g => { const [cx, cy] = at(24); P.poly(g, [[cx, cy - 5], [cx + 3, cy], [cx, cy + 4], [cx - 3, cy]], glow); P.px(g, cx - 1, cy - 2, '#ffffff'); });
    // front arm + hand
    pt.part({}, g => {
      P.path(g, [sf, hp.fe, hp.fh], 5, sleeve);
      if (o.bracer) P.line(g, hp.fe[0] + (hp.fh[0] - hp.fe[0]) * 0.4, hp.fe[1] + (hp.fh[1] - hp.fe[1]) * 0.4, hp.fh[0] - (hp.fh[0] - hp.fe[0]) * 0.15, hp.fh[1] - (hp.fh[1] - hp.fe[1]) * 0.15, 5.5, o.bracer);
      P.ell(g, hp.fh[0], hp.fh[1], 2.8, 2.8, o.glove || skin);
    });
    if (wp === 'orb') pt.part({ shade: false }, g => {
      const ox = hp.fh[0] + 2, oy = hp.fh[1] - 5;
      P.ell(g, ox, oy, 4.5, 4.5, shade(glow, 0.8)); P.ell(g, ox - 0.5, oy - 0.5, 3, 3, glow); P.rect(g, ox - 2, oy - 2, 2, 2, '#ffffff');
    });
    if (armPose === 'raise' && wp !== 'staff') pt.part({ shade: false }, g => {
      const [cx, cy] = hp.fh; P.ell(g, cx, cy - 4, 3, 3, glow); P.px(g, cx - 1, cy - 5, '#ffffff');
    });
    return pt.finish();
  }

  // ---------- monsters ----------
  function wolf(pose) {
    const pt = Painter(64, 64), b = pose === 'idle1' ? 1 : 0, lean = pose === 'atk' ? 4 : pose === 'hit' ? -3 : 0, bite = pose === 'atk';
    const c = '#5d5d6c', s = '#454552', l = '#8a8a98', belly = '#b0a898';
    pt.part({}, g => { P.poly(g, [[12 + lean * 0.3, 30 + b], [2, 20], [0, 26], [8, 36 + b]], c); P.poly(g, [[3, 21], [0, 24], [2, 27]], l); });
    pt.part({}, g => { P.line(g, 16, 42, 13, 58, 5, s); P.line(g, 22, 44, 23, 58, 5, s); });
    pt.part({}, g => { P.ell(g, 28 + lean * 0.5, 38 + b, 19, 10, c); });
    pt.part({ shade: false }, g => { P.ell(g, 30 + lean * 0.5, 44 + b, 12, 3, belly); for (let i = 0; i < 5; i++) P.rect(g, 16 + i * 5 + lean * 0.5, 30 + b + (i % 2), 3, 1, shade(c, 0.75)); });
    pt.part({}, g => { P.line(g, 38 + lean * 0.5, 44, 40 + lean * 0.4, 58, 5, c); P.line(g, 43 + lean * 0.5, 43, 47 + lean * 0.6, 58, 5, s); });
    pt.part({}, g => { P.rrect(g, 36, 56, 7, 4, 2, '#34343e'); P.rrect(g, 44 + lean * 0.6, 56, 7, 4, 2, '#34343e'); P.rrect(g, 9, 56, 7, 4, 2, '#2c2c34'); P.rrect(g, 20, 56, 7, 4, 2, '#2c2c34'); });
    pt.part({}, g => {
      const hx = 42 + lean, hy = 22 + b;
      P.ell(g, hx + 4, hy + 6, 10, 9, c);
      P.poly(g, [[hx + 8, hy + 2], [hx + 22, hy + 6], [hx + 22, hy + 10], [hx + 9, hy + 12]], c);
      if (bite) P.poly(g, [[hx + 9, hy + 12], [hx + 21, hy + 14], [hx + 20, hy + 17], [hx + 7, hy + 15]], s);
      else P.poly(g, [[hx + 9, hy + 10], [hx + 21, hy + 10], [hx + 20, hy + 13], [hx + 9, hy + 14]], s);
      P.poly(g, [[hx - 2, hy], [hx + 1, hy - 10], [hx + 5, hy - 1]], c); P.poly(g, [[hx + 4, hy - 1], [hx + 8, hy - 9], [hx + 10, hy + 1]], s);
      P.poly(g, [[hx - 6, hy + 4], [hx + 2, hy + 8], [hx - 4, hy + 16]], l);
    });
    pt.part({ shade: false }, g => {
      const hx = 42 + lean, hy = 22 + b;
      P.rect(g, hx + 9, hy + 4, 3, 2, pose === 'hit' ? '#1a1418' : '#ffb040'); P.px(g, hx + 11, hy + 4, '#fff0a0');
      P.rect(g, hx + 21, hy + 6, 2, 2, '#1a1418');
      if (bite) { for (let i = 0; i < 4; i++) { P.px(g, hx + 11 + i * 3, hy + 12, '#efe6cf'); P.px(g, hx + 11 + i * 3, hy + 14, '#efe6cf'); } }
      else { P.px(g, hx + 13, hy + 11, '#efe6cf'); P.px(g, hx + 18, hy + 11, '#efe6cf'); }
    });
    return pt.finish();
  }
  function imp(pose) {
    const pt = Painter(64, 64), b = pose === 'idle1' ? -2 : 0, lean = pose === 'atk' ? 3 : pose === 'hit' ? -3 : 0;
    const r = '#c8402e', wing = '#5a1a2a';
    const flap = pose === 'idle1' ? -4 : 0;
    pt.part({}, g => { P.poly(g, [[26, 30 + b], [8, 16 + flap], [6, 28 + flap], [12, 26 + flap], [10, 36], [16, 32], [22, 40 + b]], wing); });
    pt.part({ shade: false }, g => { P.path(g, [[10, 18 + flap], [22, 32 + b]], 1, shade(wing, 1.5)); P.path(g, [[8, 28 + flap], [22, 34 + b]], 1, shade(wing, 1.5)); });
    pt.part({}, g => { P.path(g, [[26, 46 + b], [16, 50], [10, 46], [8, 40]], 2, shade(r, 0.8)); P.poly(g, [[6, 38], [11, 40], [7, 43]], shade(r, 0.8)); });
    pt.part({}, g => { P.line(g, 28, 48 + b, 26, 58, 4, shade(r, 0.8)); P.line(g, 35, 48 + b, 37, 58, 4, r); P.rect(g, 23, 57, 6, 3, '#2a0a0a'); P.rect(g, 35, 57, 7, 3, '#2a0a0a'); });
    pt.part({}, g => { P.ell(g, 32 + lean * 0.5, 42 + b, 9, 9, r); });
    pt.part({}, g => { P.ell(g, 34 + lean, 28 + b, 10, 9, r); P.path(g, [[28 + lean, 21 + b], [25 + lean, 14 + b], [27 + lean, 10 + b]], 2.5, '#efe6cf'); P.path(g, [[38 + lean, 20 + b], [40 + lean, 13 + b], [38 + lean, 9 + b]], 2.5, '#efe6cf'); P.poly(g, [[43 + lean, 26 + b], [47 + lean, 28 + b], [43 + lean, 30 + b]], r); });
    pt.part({ shade: false }, g => {
      const x = 34 + lean, y = 28 + b;
      P.rect(g, x + 4, y - 3, 3, 2, pose === 'hit' ? '#1a0a0a' : '#ffdd33'); P.rect(g, x - 2, y - 3, 2, 2, '#ffdd33');
      P.rect(g, x - 1, y + 3, 8, 1, '#3a0a0a'); P.px(g, x + 1, y + 4, '#efe6cf'); P.px(g, x + 5, y + 4, '#efe6cf');
    });
    pt.part({}, g => { P.line(g, 36 + lean, 38 + b, 44 + lean + (pose === 'atk' ? 4 : 0), 34 + b, 4, shade(r, 1.05)); });
    pt.part({ shade: false }, g => { const x = 47 + lean + (pose === 'atk' ? 4 : 0), y = 31 + b; P.ell(g, x, y, 5, 5, '#ff8a2a'); P.ell(g, x, y, 3, 3, '#ffd060'); P.rect(g, x - 1, y - 1, 2, 2, '#fff6d0'); P.px(g, x - 2, y - 7, '#ff8a2a'); P.px(g, x + 2, y - 8, '#ffd060'); });
    return pt.finish();
  }
  function ghost(pose) {
    const pt = Painter(64, 64), b = pose === 'idle1' ? -2 : 0, lean = pose === 'atk' ? 5 : pose === 'hit' ? -4 : 0;
    const c = '#8ac4d8', s = '#5a90aa';
    pt.part({}, g => {
      P.poly(g, [[22 + lean, 26 + b], [44 + lean, 26 + b], [46 + lean * 0.6, 44 + b], [42, 56 + b], [38, 50 + b], [34, 60 + b], [30, 50 + b], [25, 57 + b], [22, 46 + b]], c);
    });
    pt.part({}, g => { P.ell(g, 34 + lean, 20 + b, 11, 11, c); });
    pt.part({}, g => { P.path(g, [[24 + lean, 32 + b], [16 + lean, 38 + b], [14 + lean, 44 + b]], 4, s); P.path(g, [[44 + lean, 32 + b], [52 + lean + (pose === 'atk' ? 4 : 0), 30 + b], [56 + lean + (pose === 'atk' ? 5 : 0), 26 + b]], 4, c); });
    pt.part({ shade: false }, g => {
      const x = 34 + lean, y = 20 + b;
      P.rect(g, x + 3, y - 2, 3, 5, '#0e2030'); P.rect(g, x - 4, y - 2, 3, 5, '#0e2030'); P.px(g, x + 4, y - 1, '#c8f4ff'); P.px(g, x - 3, y - 1, '#c8f4ff');
      P.ell(g, x + 1, y + 6, 2.5, pose === 'atk' ? 3 : 1.5, '#0e2030');
      for (let i = 0; i < 3; i++) P.rect(g, 26 + i * 6, 40 + b + (i % 2) * 3, 1, 5, s);
    });
    const cv = pt.finish('#0c2230');
    const g = cv.getContext('2d'), img = g.getImageData(0, 0, 64, 64);
    for (let i = 3; i < img.data.length; i += 4) if (img.data[i]) img.data[i] = 225;
    g.putImageData(img, 0, 0);
    return cv;
  }
  function larva(pose) {
    const pt = Painter(64, 64), b = pose === 'idle1' ? 1 : 0, lean = pose === 'atk' ? 4 : pose === 'hit' ? -3 : 0;
    const c = '#c8a0a0', s = '#9a7070';
    pt.part({}, g => { for (let i = 0; i < 5; i++) P.ell(g, 14 + i * 7 + lean * i / 5, 52 - (i === 4 ? 6 : 0) + (i % 2 ? b : 0), 6, 6 - (i === 0 ? 1 : 0), i % 2 ? s : c); });
    pt.part({}, g => { P.ell(g, 46 + lean, 40 + b, 8, 8, c); });
    pt.part({ shade: false }, g => { const x = 46 + lean, y = 40 + b; P.ell(g, x + 4, y + 2, 3, pose === 'atk' ? 4 : 2, '#3a1418'); for (let i = 0; i < 3; i++) P.px(g, x + 2 + i * 2, y, '#efe6cf'); P.rect(g, x - 1, y - 4, 2, 2, '#1a0a0a'); });
    return pt.finish();
  }
  function worm(pose) {
    const W = 96, pt = Painter(W, W), b = pose === 'idle1' ? 2 : 0, lean = pose === 'atk' ? 8 : pose === 'hit' ? -5 : 0;
    const burrow = pose === 'burrow';
    const c = '#b8868a', s = '#8a5a60', l = '#dcb0b0';
    pt.part({ flat: true }, g => { P.ell(g, 48, 86, 38, 8, '#3a2a22'); P.ell(g, 48, 84, 32, 5, '#4a382c'); for (let i = 0; i < 8; i++) P.rect(g, 16 + i * 9, 80 + (i % 3), 5, 3, '#5a4434'); });
    if (!burrow) {
      const seg = [[30, 80], [34, 68], [40, 57], [48 + lean * 0.3, 47], [56 + lean * 0.6, 38 + b]];
      pt.part({}, g => { seg.forEach(([x, y], i) => P.ell(g, x, y, 15 - i, 11 - i * 0.6, i % 2 ? s : c)); });
      pt.part({ shade: false }, g => { seg.forEach(([x, y], i) => { P.rect(g, x - 10 + i, y - 1, 20 - 2 * i, 1, shade(c, 0.7)); P.rect(g, x - 8, y - 6, 4, 2, l); }); });
      pt.part({}, g => { P.ell(g, 64 + lean, 26 + b, 16, 14, c); });
      pt.part({ shade: false }, g => {
        const x = 64 + lean, y = 26 + b, open = pose === 'atk' ? 1 : 0;
        P.ell(g, x + 8, y + 3, 7, 6 + open * 3, '#3a0e14');
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.poly(g, [[x + 8 + Math.cos(a) * 6, y + 3 + Math.sin(a) * (6 + open * 3)], [x + 8 + Math.cos(a) * 3, y + 3 + Math.sin(a) * 3], [x + 8 + Math.cos(a + 0.3) * 6, y + 3 + Math.sin(a + 0.3) * (6 + open * 3)]], '#efe6cf'); }
        P.rect(g, x - 4, y - 8, 3, 2, '#ffdd33'); P.rect(g, x + 2, y - 10, 3, 2, '#ffdd33'); P.rect(g, x - 8, y - 4, 2, 2, '#ffdd33');
      });
    } else {
      pt.part({}, g => { P.ell(g, 48, 78, 22, 8, s); });
      pt.part({ shade: false }, g => { for (let i = 0; i < 12; i++) P.rect(g, 22 + i * 4.5, 70 + (i % 3) * 2, 3, 2, '#6a5040'); });
    }
    return pt.finish();
  }
  function golem(pose) {
    const W = 96, pt = Painter(W, W), b = pose === 'idle1' ? 1 : 0, lean = pose === 'atk' ? 6 : pose === 'hit' ? -4 : 0, up = pose === 'cast';
    const c = '#8a5a36', s = '#5e3a22', l = '#a8703e', rv = '#e8b070', dk = '#3e2616', moss = '#5a7a3a';
    pt.part({}, g => { P.path(g, [[30 + lean * 0.5, 40 + b], [18, 54], [16, 66]], 12, s); P.rrect(g, 8, 62, 20, 18, 5, s); });
    pt.part({}, g => { P.rrect(g, 28, 64, 16, 22, 4, s); P.rrect(g, 52, 64, 16, 22, 4, c); P.rrect(g, 25, 84, 22, 8, 3, dk); P.rrect(g, 50, 84, 22, 8, 3, dk); });
    pt.part({}, g => { P.rrect(g, 22 + lean * 0.5, 28 + b, 54, 42, 10, c); });
    pt.part({ shade: false }, g => {
      const x = 22 + lean * 0.5, y = 28 + b;
      P.rrect(g, x + 8, y + 6, 18, 16, 3, l); P.rrect(g, x + 30, y + 6, 18, 16, 3, l);
      P.rect(g, x + 8, y + 6, 18, 2, '#c88a50'); P.rect(g, x + 30, y + 6, 18, 2, '#c88a50');
      [[x + 10, y + 9], [x + 23, y + 9], [x + 10, y + 19], [x + 23, y + 19], [x + 32, y + 9], [x + 45, y + 9], [x + 32, y + 19], [x + 45, y + 19]].forEach(([a, bb]) => P.rect(g, a, bb, 2, 2, rv));
      P.rect(g, x + 4, y + 28, 46, 5, dk); P.rect(g, x + 22, y + 27, 10, 7, '#7a7a82'); P.rect(g, x + 24, y + 29, 6, 3, '#ffb040');
      P.rect(g, x + 14, y + 24, 6, 3, moss); P.rect(g, x + 40, y + 34, 5, 4, moss); P.rect(g, x + 3, y + 14, 3, 6, dk); P.rect(g, x + 36, y + 24, 8, 1, dk);
    });
    pt.part({}, g => { P.rrect(g, 36 + lean, 6 + b, 26, 22, 6, c); P.rect(g, 42 + lean, 0 + b, 6, 8, dk); P.rect(g, 40 + lean, 0 + b, 10, 2, dk); });
    pt.part({ shade: false }, g => { const x = 36 + lean, y = 6 + b; P.rect(g, x + 12, y + 8, 10, 4, pose === 'hit' ? '#6a3a1a' : '#ffb040'); P.rect(g, x + 14, y + 9, 6, 2, '#fff0a0'); P.rect(g, x + 6, y + 16, 16, 2, dk); });
    pt.part({}, g => {
      const sx = 72 + lean, sy = 34 + b;
      const hand = pose === 'atk' ? [92, 46] : up ? [80, 8] : [78, 62];
      P.path(g, [[sx, sy], [sx + 8, sy + 12], hand], 12, c);
      P.rrect(g, hand[0] - 10, hand[1] - 8, 20, 18, 5, l);
      P.rect(g, hand[0] - 8, hand[1] + 5, 16, 2, s);
    });
    return pt.finish();
  }
  function doll(pose) {
    const pt = Painter(64, 64), b = pose === 'idle1' ? 1 : 0, lean = pose === 'atk' ? 3 : pose === 'hit' ? -3 : 0;
    const cloth = '#b89a78', patch = '#8a6a8a';
    pt.part({}, g => { P.line(g, 28, 48, 27, 58, 4, cloth); P.line(g, 35, 48, 37, 58, 4, cloth); });
    pt.part({}, g => { P.rrect(g, 24 + lean * 0.5, 34 + b, 16, 16, 4, patch); });
    pt.part({}, g => { P.line(g, 24 + lean, 38 + b, 18 + lean, 46 + b, 4, cloth); P.line(g, 40 + lean, 38 + b, 46 + lean + (pose === 'atk' ? 4 : 0), 42 + b, 4, cloth); });
    pt.part({}, g => { P.ell(g, 33 + lean, 26 + b, 10, 9, cloth); });
    pt.part({ shade: false }, g => {
      const x = 33 + lean, y = 26 + b;
      P.path(g, [[x + 1, y - 3], [x + 5, y + 1]], 1, '#1a1418'); P.path(g, [[x + 5, y - 3], [x + 1, y + 1]], 1, '#1a1418');
      P.rect(g, x - 5, y - 2, 3, 3, '#1a1418');
      for (let i = 0; i < 4; i++) P.rect(g, x - 4 + i * 3, y + 5, 1, 2, '#3a2a2a'); P.rect(g, x - 4, y + 6, 11, 1, '#3a2a2a');
      P.rect(g, 28 + lean * 0.5, 38 + b, 6, 1, '#e8e0d0'); P.rect(g, 30 + lean * 0.5, 44 + b, 1, 5, '#e8e0d0');
      P.path(g, [[x - 4, y - 9], [x - 8, y - 40]], 1, 'rgba(230,230,240,0.9)');
    });
    return pt.finish();
  }

  // ---------- looks ----------
  const LOOK = {
    aldric: { skin: '#e8b890', hair: '#6b6b6b', hairStyle: 'short', armor: '#a4adba', style: 'plate', legs: '#5a6070', pauldrons: '#bcc4d0', belt: '#6a4a30', head: 'helm', headCol: '#c0c8d4', plume: '#b8403a', weapon: 'sword', shield: '#8a2f2a', shield2: '#a8403a', cape: '#7a2a2a', emblem: '#d9b45a', bracer: '#bcc4d0' },
    lyra: { skin: '#f2cca4', hair: '#e0c86a', hairStyle: 'long', ears: 'elf', armor: '#4f7a3a', style: 'leather', legs: '#6a5236', belt: '#8a6a3a', head: 'hood', headCol: '#3f6630', weapon: 'bow', cape: '#35552a', bracer: '#7a5a3a', boots: '#5a4028' },
    grolm: { skin: '#e0a47a', hair: '#c05a2a', hairStyle: 'short', beard: '#c05a2a', armor: '#7a6a5a', style: 'leather', legs: '#4a3a30', belt: '#3a2a20', bulk: 2, dy: 6, weapon: 'hammer', head: 'helm', headCol: '#8a8f99', pauldrons: '#8a8f99', metal: '#b0b6c0', bracer: '#5a4a3a' },
    maren: { skin: '#eec4a0', hair: '#8a5a3a', hairStyle: 'long', armor: '#ece6d6', style: 'robe', robe: true, trim: '#d9b45a', head: 'hood', headCol: '#dcd4c2', weapon: 'orb', glow: '#fff0a8', boots: '#8a7a60', blush: 1 },
    vex: { skin: '#dcac8a', hair: '#2a2a3a', hairStyle: 'spiky', armor: '#3c3c4e', style: 'leather', legs: '#2a2a36', belt: '#6a3a5a', buckle: '#9aff6a', weapon: 'dagger', metal: '#b8ff8a', cape: '#5a2a4a', scar: 1, bracer: '#5a2a4a' },
    wachter: { skin: '#dcd4c0', armor: '#dcd4c0', style: 'ribs', legs: '#c4bca8', eye: '#5ad0ff', eyeHi: '#c8f4ff', ears: 'none', brow: false, jaw: '#8a8270', head: 'helm', headCol: '#6e5e52', weapon: 'sword', metal: '#9a8a7a', shield: '#4a4a56', shield2: '#5c5c68', emblemS: '#5ad0ff', boots: '#5a4a3a', sleeve: '#c4bca8' },
    kira: { skin: '#c8d0dc', hair: '#eeeef6', hairStyle: 'long', armor: '#2c2640', style: 'robe', robe: true, trim: '#8a6ad8', eye: '#b08aff', weapon: 'staff', glow: '#c0a0ff', cape: '#3a2a5a', wood: '#3a3048' },
    baelzor: { skin: '#c0443a', armor: '#2a1c1c', style: 'plate', legs: '#1c1212', head: 'horns', eye: '#ffd040', eyeHi: '#fff0a0', bulk: 2, weapon: 'greatsword', metal: '#ff8a3a', guard: '#5a1a1a', cape: '#5a1a1a', belt: '#5a1a1a', buckle: '#ffd040', pauldrons: '#3a2424', ears: 'none' },
    nixa: { skin: '#8accc4', hair: '#2a6a8a', hairStyle: 'long', ears: 'elf', armor: '#3a7a8a', style: 'robe', robe: true, trim: '#9af0ff', eye: '#10283a', weapon: 'orb', glow: '#9af0ff', boots: '#2a4a5a' },
    drenk: { skin: '#cc9c7c', hair: '#3a2a20', hairStyle: 'short', beard: '#3a2a20', head: 'hat', headCol: '#2a2a32', hatBand: '#8a2a2a', armor: '#9a2e2e', style: 'coat', coat: true, legs: '#3a3a44', belt: '#2a2020', weapon: 'sabre', scar: 1, boots: '#2a2020' },
    urgha: { skin: '#6a9a4a', hair: '#2a2a2a', hairStyle: 'topknot', armor: '#6a9a4a', style: 'bare', strap: '#6a4a30', legs: '#5a4028', belt: '#3a2a1a', bulk: 3, eye: '#ffdd33', tusk: 1, weapon: 'axe', sleeve: '#6a9a4a', bracer: '#6a4a30' },
    thessa: { skin: '#eac2a2', hair: '#e8e8da', hairStyle: 'long', ears: 'elf', head: 'wreath', armor: '#5a8a4a', style: 'robe', robe: true, trim: '#aef08a', weapon: 'staff', glow: '#aef08a', cape: '#3a5a2a', wood: '#6a4a2a' },
    sera: { skin: '#f0c49e', hair: '#f0d890', hairStyle: 'bun', armor: '#e6e0cc', style: 'plate', legs: '#b8b0a0', pauldrons: '#f0d890', head: 'circlet', headCol: '#d9b45a', gem: '#ff9a4a', weapon: 'spear', metal: '#f0f0e6', cape: '#e8c060', emblem: '#e8743b', bracer: '#d9b45a' },
    bram: { skin: '#d8986e', hair: '#3a2a22', hairStyle: 'short', beard: '#5a3a2a', armor: '#6a6e78', style: 'plate', legs: '#4a4a52', belt: '#3a2a20', bulk: 2, dy: 6, head: 'greathelm', headCol: '#7a7e88', shield: '#5a4a3a', shield2: '#7a6048', emblemS: '#e8743b', weapon: 'hammer', pauldrons: '#8a8e98' },
    elwin: { skin: '#e8c8a8', hair: '#5a8ac0', hairStyle: 'long', ears: 'elf', armor: '#4a6aa0', style: 'robe', robe: true, trim: '#c8e0ff', weapon: 'staff', glow: '#9ad0ff', wood: '#8a6a4a' },
    mira: { skin: '#d0a080', hair: '#1a1a22', hairStyle: 'bun', armor: '#2e3440', style: 'leather', legs: '#22262e', belt: '#4a2a3a', head: 'hood', headCol: '#22262e', weapon: 'dagger', metal: '#e0e4ea', cape: '#3a1e2a', bracer: '#4a2a3a' },
    morvin: { skin: '#d8dce6', hair: '#1a1420', hairStyle: 'short', armor: '#3a1420', style: 'coat', coat: true, shirt: '#e8e0e0', buttons: '#c8a050', legs: '#1a1418', eye: '#ff3a4a', eyeHi: '#ffc0c0', head: 'crown', headCol: '#8a7a5a', gem: '#ff3a4a', weapon: 'claws', cape: '#6a1024', boots: '#1a1418' },
    zhar: { skin: '#a84a3a', armor: '#3a2020', style: 'robe', robe: true, trim: '#ff8a3a', head: 'horns', hornCol: '#2a1a1a', eye: '#ffb040', weapon: 'orb', glow: '#ff8a3a', ears: 'none', cape: '#5a2a1a' },
    kaalvoet: { skin: '#8ab0a8', armor: '#4a6a6a', style: 'plate', legs: '#3a5454', head: 'greathelm', headCol: '#5a7a74', weapon: 'hammer', metal: '#7a9a94', shield: '#3a5a5a', shield2: '#4a7070', emblemS: '#9af0ff', pauldrons: '#6a8a84', cape: '#2a4a4a', boots: '#2a3a3a' },
    rogh: { skin: '#6a5a58', hair: '#4a3e3c', hairStyle: 'mohawk', armor: '#6a5a58', style: 'bare', strap: '#8a2a2a', legs: '#4a3a30', bulk: 2, eye: '#ffdd33', tusk: 1, weapon: 'claws', sleeve: '#6a5a58', ears: 'elf' },
    // enemies
    skelet: { skin: '#dcd4c0', armor: '#dcd4c0', style: 'ribs', legs: '#c4bca8', eye: '#ff5a3a', eyeHi: '#ffc0a0', ears: 'none', brow: false, jaw: '#8a8270', weapon: 'sword', metal: '#9a7a5a', guard: '#5a4a3a', sleeve: '#c4bca8', boots: '#6a5a4a' },
    boogskelet: { skin: '#dcd4c0', armor: '#dcd4c0', style: 'ribs', legs: '#c4bca8', eye: '#ff5a3a', eyeHi: '#ffc0a0', ears: 'none', brow: false, jaw: '#8a8270', head: 'hood', headCol: '#3a3438', weapon: 'bow', wood: '#5a4a3a', sleeve: '#c4bca8', boots: '#4a3a30' },
    ork: { skin: '#7aa04a', armor: '#5a5a62', style: 'plate', legs: '#4a3a2a', belt: '#3a2a1a', bulk: 3, eye: '#ffdd33', tusk: 1, head: 'helm', headCol: '#5a5a62', weapon: 'club', sleeve: '#7aa04a', pauldrons: '#6a6a72' },
    sjamaan: { skin: '#7aa04a', armor: '#6a3a6a', style: 'robe', robe: true, trim: '#9aff6a', bulk: 1, eye: '#ffdd33', tusk: 1, head: 'hood', headCol: '#4a2a4a', weapon: 'staff', glow: '#9aff6a', wood: '#5a3a2a' },
    grak: { skin: '#6a9040', armor: '#4a4a52', style: 'plate', legs: '#3a2a20', belt: '#8a2a20', bulk: 3, eye: '#ff4a2a', tusk: 1, scar: 1, head: 'horns', hornCol: '#e6dcc0', weapon: 'hammer', metal: '#8a8f99', cape: '#7a2a20', pauldrons: '#5a5a62', sleeve: '#6a9040', bracer: '#4a4a52' },
    morwenna: { skin: '#b8c8a8', hair: '#2a2a2a', hairStyle: 'long', armor: '#2a2230', style: 'robe', robe: true, trim: '#8a5aa8', head: 'witch', headCol: '#221c28', hatBand: '#8a5aa8', eye: '#c8ff6a', weapon: 'staff', glow: '#c8ff6a', wood: '#3a2a2a', cape: '#3a2a48' },
  };
  const CUSTOM = { wolf, imp, nevelgeest: ghost, roestreus: golem, uthrak: worm, larve: larva, pop: doll };

  // ---------- frame cache ----------
  const cache = {};
  const FRAMES = ['idle0', 'idle1', 'atk', 'cast', 'hit'];
  function make(id, f) {
    if (CUSTOM[id]) return CUSTOM[id](f);
    return human(LOOK[id] || LOOK.aldric, f);
  }
  function frame(id, f, kind) {
    f = f || 'idle0';
    const key = id + ':' + f + ':' + (kind || '');
    if (cache[key]) return cache[key];
    let c;
    if (!kind) {
      if (f === 'dead' && CUSTOM[id] && id !== 'pop') {
        const s = frame(id, 'hit'); c = canvas(s.width, s.height); const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        const h = Math.round(s.height * 0.5);
        g.drawImage(s, 0, 0, s.width, s.height, -Math.round(s.width * 0.08), s.height - h, Math.round(s.width * 1.16), h);
        const oi = g.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < oi.data.length; i += 4) { oi.data[i] *= 0.6; oi.data[i + 1] *= 0.58; oi.data[i + 2] *= 0.62; }
        g.putImageData(oi, 0, 0);
      } else if (f === 'dead') {
        const s = frame(id, 'hit'); c = canvas(s.width, s.height); const g = c.getContext('2d');
        // find bbox, rotate 90deg (fall backwards), rest on ground line
        g.translate(0, s.height); g.rotate(-Math.PI / 2); g.drawImage(s, 0, 0);
        const img = g.getImageData(0, 0, c.width, c.height); let maxY = 0, minX = c.width, maxX = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (img.data[(y * c.width + x) * 4 + 3]) { if (y > maxY) maxY = y; if (x < minX) minX = x; if (x > maxX) maxX = x; }
        const out = canvas(s.width, s.height), og = out.getContext('2d');
        og.globalAlpha = 1; og.drawImage(c, Math.round((s.width - (maxX - minX)) / 2 - minX), s.height - 2 - maxY);
        const oi = og.getImageData(0, 0, out.width, out.height);
        for (let i = 0; i < oi.data.length; i += 4) { oi.data[i] *= 0.6; oi.data[i + 1] *= 0.58; oi.data[i + 2] *= 0.62; }
        og.putImageData(oi, 0, 0);
        c = out;
      } else if (f === 'burrow' && id !== 'uthrak') c = frame(id, 'idle0');
      else c = make(id, f);
    } else {
      const s = frame(id, f); c = canvas(s.width, s.height); const g = c.getContext('2d');
      if (kind === 'flip' || kind === 'whiteflip') { g.translate(s.width, 0); g.scale(-1, 1); }
      g.drawImage(s, 0, 0);
      if (kind === 'white' || kind === 'whiteflip') { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff6e0'; g.fillRect(0, 0, c.width, c.height); }
    }
    return (cache[key] = c);
  }
  function get(id) { return frame(id, 'idle0'); }
  const urls = {};
  function url(id, scale, flip) {
    const key = id + '@' + (scale || 1) + (flip ? 'f' : '');
    if (urls[key]) return urls[key];
    const s = frame(id, 'idle0', flip ? 'flip' : ''), k = scale || 1;
    // crop to content box for portraits
    const g0 = s.getContext('2d'), d = g0.getImageData(0, 0, s.width, s.height).data;
    let x0 = s.width, y0 = s.height, x1 = 0, y1 = 0;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (d[(y * s.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const side = Math.max(x1 - x0, y1 - y0) + 3, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const c = canvas(side * k, side * k), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(s, Math.round(cx - side / 2), Math.round(cy - side / 2), side, side, 0, 0, side * k, side * k);
    return (urls[key] = c.toDataURL());
  }

  // ---------- backgrounds 480x270 ----------
  function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  const BG_W = 480, BG_H = 270, GROUND = 150;
  function sky(g, R, bands) { const h = Math.ceil(GROUND / bands.length); bands.forEach((c, i) => { R(0, i * h, BG_W, h, c); if (i < bands.length - 1) for (let x = 0; x < BG_W; x += 2) { R(x + (i % 2), i * h + h - 1, 1, 1, bands[i + 1]); R(x + ((i + 1) % 2), i * h + h - 3, 1, 1, bands[i + 1]); } }); }
  function noise(R, r, y0, y1, cols, n) { for (let i = 0; i < n; i++) R(Math.floor(r() * BG_W), y0 + Math.floor(r() * (y1 - y0)), 1 + Math.floor(r() * 3), 1, cols[Math.floor(r() * cols.length)]); }
  function background(area) {
    const c = canvas(BG_W, BG_H), g = c.getContext('2d'), r = rng(31 + area * 17);
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    if (area === 0) { // Asvlakte: dusk over burnt ruins
      sky(g, R, ['#141020', '#1a1426', '#22182c', '#2e1c30', '#402432', '#582e32', '#743c34', '#8a4a36']);
      for (let i = 0; i < 60; i++) R(Math.floor(r() * BG_W), Math.floor(r() * 70), 1, 1, r() < 0.3 ? '#e8e0d0' : '#8a7a90');
      g.fillStyle = '#e6d4b4'; g.beginPath(); g.arc(372, 48, 18, 0, 7); g.fill(); g.fillStyle = '#c8b494'; R(362, 42, 8, 3, '#c8b494'); R(376, 54, 6, 3, '#c8b494'); R(380, 40, 3, 3, '#d8c4a4');
      for (let i = 0; i < 5; i++) { const y = 70 + i * 9, x = Math.floor(r() * 400); R(x, y, 60 + r() * 60, 2, 'rgba(90,50,60,0.6)'); }
      let x = 0; while (x < BG_W) { const w = 8 + Math.floor(r() * 24), h = 16 + Math.floor(r() * 44); R(x, GROUND - 12 - h, w, h + 12, '#2c1e2a'); if (r() < 0.45) { R(x + 3, GROUND - 12 - h - 10, 3, 10, '#2c1e2a'); R(x + 1, GROUND - 12 - h - 12, 7, 3, '#2c1e2a'); } for (let k = 0; k < 3; k++) if (r() < 0.35) R(x + 3 + k * 5, GROUND - h + k * 7, 2, 3, r() < 0.6 ? '#e8a050' : '#ffd080'); x += w + Math.floor(r() * 8); }
      for (let xx = 0; xx < BG_W; xx++) { const h = 14 + Math.round(Math.sin(xx / 31) * 6 + Math.sin(xx / 11) * 3); R(xx, GROUND - h, 1, h, '#201622'); }
      R(0, GROUND, BG_W, BG_H - GROUND, '#302428');
      noise(R, r, GROUND, BG_H, ['#3c2e30', '#28202a', '#44342e'], 1600);
      for (let y = GROUND + 6; y < BG_H; y += 4) { const w = 90 + (y - GROUND) * 1.6; R(BG_W / 2 - w / 2 + Math.round(Math.sin(y * 0.7) * 4), y, w, 2, '#3a2c2c'); }
      for (let i = 0; i < 28; i++) { const x3 = Math.floor(r() * BG_W), y3 = GROUND + 8 + Math.floor(r() * 110); R(x3, y3, 3, 2, '#5a4a3a'); R(x3 + 1, y3 - 1, 2, 1, '#7a6a50'); }
      [[30, GROUND + 10], [440, GROUND + 14], [220, GROUND + 4], [120, GROUND + 2]].forEach(([dx, dy]) => { R(dx, dy - 18, 3, 18, '#1a1216'); R(dx - 6, dy - 13, 15, 3, '#1a1216'); });
      for (let i = 0; i < 6; i++) { const x4 = Math.floor(r() * BG_W), y4 = GROUND + 20 + Math.floor(r() * 90); R(x4, y4, 1, 4, '#4a5a3a'); R(x4 + 2, y4 + 1, 1, 3, '#4a5a3a'); R(x4 - 2, y4 + 2, 1, 2, '#4a5a3a'); }
    } else if (area === 1) { // Zoutmijnen
      R(0, 0, BG_W, BG_H, '#14161c');
      for (let i = 0; i < 40; i++) { const x = Math.floor(r() * BG_W), h = 10 + Math.floor(r() * 50), w = 4 + Math.floor(r() * 12); g.fillStyle = '#1c2029'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w / 2, h); g.fill(); }
      noise(R, r, 20, GROUND, ['#1e232c', '#232834'], 900);
      for (let i = 0; i < 16; i++) { const x = 10 + Math.floor(r() * 460), y = 70 + Math.floor(r() * 70); R(x, y, 3, 9, '#9ab8c8'); R(x + 3, y + 3, 3, 6, '#c8dce6'); R(x - 3, y + 4, 3, 5, '#7a98a8'); R(x + 1, y + 1, 1, 3, '#ffffff'); }
      [[60, 44], [410, 38]].forEach(([x, y]) => { R(x, y, 5, GROUND - y, '#3a2a1e'); R(x - 8, y, 21, 5, '#3a2a1e'); R(x - 6, y + 5, 3, 8, '#3a2a1e'); R(x + 14, y + 10, 4, 5, '#e8a050'); R(x + 13, y + 7, 6, 3, '#ffd080'); });
      R(0, GROUND, BG_W, BG_H - GROUND, '#232730');
      noise(R, r, GROUND, BG_H, ['#2c313a', '#1a1d24', '#343a44'], 1600);
      for (let x = 0; x < BG_W; x += 2) R(x, GROUND, 1, 1, '#3a404a');
      R(0, 226, BG_W, 3, '#3e3e44'); R(0, 244, BG_W, 3, '#3e3e44'); for (let x = 6; x < BG_W; x += 16) R(x, 224, 5, 26, '#4a3a2a');
      R(380, 200, 40, 20, '#3a2e24'); R(382, 196, 36, 6, '#6a6a70'); R(386, 218, 6, 6, '#1a1a1e'); R(408, 218, 6, 6, '#1a1a1e');
    } else if (area === 2) { // Grafkelder
      R(0, 0, BG_W, BG_H, '#161214');
      for (let y = 0; y < GROUND; y += 12) for (let x = (y / 12) % 2 ? 0 : 12; x < BG_W; x += 24) { R(x, y, 23, 11, r() < 0.5 ? '#221c1e' : '#261e20'); R(x, y, 23, 1, '#2e2628'); }
      for (let i = 0; i < 6; i++) { const x = 30 + i * 80; R(x, 30, 36, 60, '#100c0e'); g.fillStyle = '#100c0e'; g.beginPath(); g.arc(x + 18, 30, 18, Math.PI, 0); g.fill(); R(x + 10, 70, 16, 20, '#3a3034'); R(x + 12, 72, 12, 3, '#4a4044'); }
      [[20, 60], [456, 60]].forEach(([x, y]) => { R(x, y, 4, 14, '#3a2a1e'); R(x - 2, y - 6, 8, 6, '#ffb040'); R(x, y - 9, 4, 4, '#fff0a0'); });
      R(0, GROUND, BG_W, BG_H - GROUND, '#2a2224');
      noise(R, r, GROUND, BG_H, ['#342a2c', '#1e1a1c', '#3a3034'], 1400);
      for (let i = 0; i < 18; i++) { const x = Math.floor(r() * BG_W), y = GROUND + 10 + Math.floor(r() * 110); R(x, y, 4, 3, '#cfc6b0'); R(x + 4, y + 1, 3, 1, '#cfc6b0'); }
    } else if (area === 3) { // Weefwoud
      sky(g, R, ['#0e1410', '#121a14', '#162018', '#1a261c', '#1e2c20', '#22321f']);
      for (let i = 0; i < 12; i++) { const x = Math.floor(r() * BG_W), w = 10 + Math.floor(r() * 14); R(x, 0, w, GROUND, i % 2 ? '#0e120e' : '#141a12'); R(x + 2, 20 + Math.floor(r() * 80), w - 4, 2, '#1e261c'); }
      g.strokeStyle = 'rgba(210,215,225,0.55)'; g.lineWidth = 1;
      for (let k = 0; k < 3; k++) { const cx = 60 + k * 170, cy = 50 + (k % 2) * 30; for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a * 0.785) * 40, cy + Math.sin(a * 0.785) * 40); g.stroke(); } for (let rr = 8; rr < 40; rr += 8) { g.beginPath(); for (let a = 0; a <= 8; a++) { const x = cx + Math.cos(a * 0.785) * rr, y = cy + Math.sin(a * 0.785) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }
      for (let i = 0; i < 26; i++) R(Math.floor(r() * BG_W), Math.floor(r() * GROUND), 1, 1, '#c8ff6a');
      R(0, GROUND, BG_W, BG_H - GROUND, '#1c2418');
      noise(R, r, GROUND, BG_H, ['#26301e', '#141a12', '#2e3a22'], 1600);
      for (let i = 0; i < 20; i++) { const x = Math.floor(r() * BG_W), y = GROUND + 8 + Math.floor(r() * 110); R(x, y, 5, 3, '#4a3a5a'); R(x + 1, y - 2, 3, 2, '#6a5a8a'); }
    } else { // Smidse
      R(0, 0, BG_W, BG_H, '#1a1210');
      for (let y = 0; y < GROUND; y += 10) for (let x = (y / 10) % 2 ? 0 : 10; x < BG_W; x += 20) R(x, y, 19, 9, r() < 0.5 ? '#2a1c16' : '#241812');
      R(170, 20, 140, 90, '#120c0a'); R(180, 60, 120, 50, '#3a1a0a'); for (let i = 0; i < 30; i++) R(185 + Math.floor(r() * 110), 70 + Math.floor(r() * 36), 3, 3, r() < 0.5 ? '#ff8a2a' : '#ffd060');
      [[40, 40], [420, 30]].forEach(([x, y]) => { R(x, y, 18, 100, '#2e2a2a'); R(x + 4, y, 10, 100, '#3a3434'); });
      R(90, 110, 40, 16, '#3a3a40'); R(96, 126, 28, 18, '#2a2a30'); R(84, 106, 52, 6, '#4a4a52');
      R(0, GROUND, BG_W, BG_H - GROUND, '#2a201c');
      noise(R, r, GROUND, BG_H, ['#34281e', '#1e1612', '#3e2e22'], 1500);
      for (let i = 0; i < 16; i++) { const x = Math.floor(r() * BG_W), y = GROUND + 10 + Math.floor(r() * 110); R(x, y, 6, 2, '#6a4a2e'); }
    }
    // vignette
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(0,0,0,${0.035})`; g.fillRect(0, 0, i, BG_H); g.fillRect(BG_W - i, 0, i, BG_H); g.fillRect(0, BG_H - i, BG_W, i); }
    return c;
  }
  const bgs = {};
  function bg(area) { return bgs[area] || (bgs[area] = background(area)); }
  const reset = () => { for (const k in bgs) delete bgs[k]; for (const k in cache) delete cache[k]; }; // sprites.js heal(): drawn again after a phone wiped them

  // icons
  function icon(W, H, fn) { const c = canvas(W, H), g = c.getContext('2d'); fn((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }); return c; }
  const ICONS = {
    crown: () => icon(16, 12, R => { R(2, 5, 12, 5, '#d9b45a'); R(2, 2, 2, 3, '#d9b45a'); R(7, 1, 2, 4, '#d9b45a'); R(12, 2, 2, 3, '#d9b45a'); R(2, 8, 12, 2, '#a8843a'); R(7, 6, 2, 2, '#c8402e'); R(4, 6, 1, 1, '#9af0ff'); R(11, 6, 1, 1, '#9af0ff'); }),
    coin: () => icon(10, 10, R => { R(2, 1, 6, 8, '#c8ccd4'); R(1, 2, 8, 6, '#c8ccd4'); R(3, 2, 3, 6, '#e8ecf0'); R(4, 3, 2, 4, '#9aa0aa'); }),
    shard: () => icon(10, 12, R => { R(4, 0, 2, 2, '#e8d8ff'); R(3, 2, 4, 3, '#b08aff'); R(2, 5, 6, 3, '#8a5ae8'); R(3, 8, 4, 2, '#6a3ac8'); R(4, 10, 2, 2, '#4a2a98'); R(4, 3, 1, 4, '#ffffff'); }),
    stone: () => icon(10, 10, R => { R(2, 2, 6, 6, '#e8743b'); R(1, 3, 8, 4, '#e8743b'); R(3, 1, 4, 8, '#c85a2a'); R(3, 3, 2, 2, '#ffd0a0'); R(6, 6, 2, 2, '#8a3a1a'); }),
  };
  const iconUrls = {};
  function iconUrl(name, k) { const key = name + k; if (iconUrls[key]) return iconUrls[key]; const s = ICONS[name](), c = canvas(s.width * k, s.height * k), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, c.width, c.height); return (iconUrls[key] = c.toDataURL()); }

  return { frame, get, url, bg, iconUrl, reset, BG_W, BG_H, GROUND, FRAMES, LOOK };
})();
