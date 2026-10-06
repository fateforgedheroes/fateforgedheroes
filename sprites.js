// ================= SPRITES: 32x32 pixel art (v1 style) with simple pose frames =================
const SPR = (function () {
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function outline(g, w, h) {
    const img = g.getImageData(0, 0, w, h), d = img.data, src = new Uint8ClampedArray(d);
    const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] === 0 && (a(x - 1, y) > 90 || a(x + 1, y) > 90 || a(x, y - 1) > 90 || a(x, y + 1) > 90)) { d[i] = 18; d[i + 1] = 12; d[i + 2] = 16; d[i + 3] = 255; }
    }
    g.putImageData(img, 0, 0);
  }
  function paint(w, h, fn, noOutline) {
    const c = canvas(w, h), g = c.getContext('2d');
    const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    fn(R, g);
    if (!noOutline) outline(g, w, h);
    return c;
  }
  function shade(hex, f) {
    f = f || 0.72;
    const n = parseInt(hex.slice(1), 16);
    const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return '#' + ((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0');
  }

  // ---------- humanoid 32x32, facing right, feet at y=30 ----------
  function human(o) {
    return paint(32, 32, R => {
      const b = o.bulk || 0, dy = o.dy || 0;
      const skin = o.skin, skinS = o.skinS || shade(o.skin), arm = o.armor, armS = o.armorS || shade(o.armor);
      if (o.cape) { R(9 - b, 13 + dy, 4, 15 - dy, o.cape); R(9 - b, 13 + dy, 2, 15 - dy, shade(o.cape)); }
      R(9 - b, 15 + dy, 2, 6, armS); R(9 - b, 21 + dy, 2, 2, skinS);
      const lh = 5 - Math.max(0, dy - 1);
      R(12, 28 - lh, 3, lh, o.legs || armS); R(17, 28 - lh, 3, lh, o.legs || armS);
      if (o.robe) { R(11 - b, 22 + dy, 10 + 2 * b, 6 - dy, arm); R(11 - b, 22 + dy, 2, 6 - dy, armS); }
      R(12, 28, 4, 2, o.boots || '#3a2e28'); R(17, 28, 4, 2, o.boots || '#3a2e28');
      R(11 - b, 14 + dy, 10 + 2 * b, 9, arm); R(11 - b, 14 + dy, 2, 9, armS);
      if (o.ribs) { R(13, 16 + dy, 6, 1, o.ribs); R(13, 18 + dy, 6, 1, o.ribs); R(13, 20 + dy, 5, 1, o.ribs); }
      if (o.trim) R(15, 14 + dy, 2, 8, o.trim);
      if (o.strap) { for (let i = 0; i < 7; i++) R(12 + i, 14 + dy + i, 2, 1, o.strap); }
      if (o.buttons) { R(16, 15 + dy, 1, 1, o.buttons); R(16, 17 + dy, 1, 1, o.buttons); R(16, 19 + dy, 1, 1, o.buttons); }
      R(11 - b, 21 + dy, 10 + 2 * b, 2, o.belt || armS);
      if (o.buckle) R(16, 21 + dy, 2, 2, o.buckle);
      const hx = 12, hy = 6 + dy;
      R(hx, hy, 8, 8, skin); R(hx, hy, 2, 8, skinS);
      R(hx + 6, hy + 3, 1, 2, o.eye || '#1a1418');
      if (o.jaw) R(hx + 3, hy + 6, 5, 1, o.jaw);
      if (o.tusk) R(hx + 6, hy + 5, 1, 2, '#efe6cf');
      if (o.ears === 'elf') { R(hx - 1, hy + 2, 1, 2, skin); R(hx - 2, hy + 1, 1, 1, skin); }
      const hc = o.hair;
      if (o.hairStyle === 'short') { R(hx, hy - 1, 8, 2, hc); R(hx, hy - 1, 3, 5, hc); }
      if (o.hairStyle === 'long') { R(hx - 1, hy - 1, 9, 2, hc); R(hx - 1, hy - 1, 3, 11, hc); R(hx - 2, hy + 4, 2, 6, hc); }
      if (o.hairStyle === 'spiky') { R(hx, hy - 1, 8, 2, hc); R(hx, hy - 1, 3, 5, hc); R(hx + 1, hy - 2, 1, 1, hc); R(hx + 3, hy - 3, 1, 2, hc); R(hx + 5, hy - 2, 1, 1, hc); }
      if (o.hairStyle === 'topknot') { R(hx + 1, hy - 1, 5, 1, hc); R(hx + 2, hy - 4, 2, 3, hc); }
      if (o.hairStyle === 'bun') { R(hx, hy - 1, 8, 2, hc); R(hx, hy - 1, 3, 5, hc); R(hx - 2, hy, 2, 3, hc); }
      if (o.hairStyle === 'mohawk') { R(hx + 2, hy - 3, 4, 3, hc); }
      if (o.beard) { R(hx + 3, hy + 5, 5, 3, o.beard); R(hx + 5, hy + 8, 3, 1, o.beard); R(hx + 4, hy + 4, 4, 1, o.beard); }
      const c = o.headCol;
      if (o.head === 'helm') { R(hx - 1, hy - 2, 10, 4, c); R(hx - 1, hy - 2, 3, 9, c); R(hx + 1, hy - 3, 6, 1, c); if (o.plume) { R(hx + 1, hy - 5, 4, 2, o.plume); R(hx - 1, hy - 4, 2, 2, o.plume); } }
      if (o.head === 'greathelm') { R(hx - 1, hy - 2, 10, 10, c); R(hx + 4, hy + 3, 5, 1, '#1a1418'); R(hx + 6, hy + 4, 1, 3, '#1a1418'); }
      if (o.head === 'hood') { R(hx - 1, hy - 2, 10, 3, c); R(hx - 1, hy - 2, 3, 11, c); R(hx + 7, hy - 1, 2, 2, c); R(hx - 1, hy - 2, 1, 11, shade(c)); }
      if (o.head === 'hat') { R(hx - 3, hy - 1, 14, 2, c); R(hx, hy - 5, 8, 4, c); R(hx + 2, hy - 4, 2, 2, o.hatMark || '#d9b45a'); }
      if (o.head === 'witch') { R(hx - 3, hy - 1, 14, 2, c); R(hx, hy - 4, 7, 3, c); R(hx - 1, hy - 7, 5, 3, c); R(hx - 3, hy - 9, 3, 2, c); R(hx, hy - 2, 7, 1, o.hatBand || '#8a5aa8'); }
      if (o.head === 'wreath') { R(hx, hy - 1, 8, 1, '#4f8a3a'); R(hx + 1, hy - 2, 1, 1, '#e79ac0'); R(hx + 4, hy - 2, 1, 1, '#f0e08a'); R(hx + 7, hy - 1, 1, 1, '#e79ac0'); }
      if (o.head === 'circlet') { R(hx, hy + 1, 8, 1, c); R(hx + 6, hy, 2, 2, o.gem || '#ff9a4a'); }
      if (o.head === 'crown') { R(hx + 1, hy - 2, 7, 2, c); R(hx + 1, hy - 4, 1, 2, c); R(hx + 4, hy - 4, 1, 2, c); R(hx + 7, hy - 4, 1, 2, c); R(hx + 4, hy - 1, 1, 1, o.gem || '#c8402e'); }
      if (o.head === 'horns') { const hcol = o.hornCol || '#d8cfb8'; R(hx, hy - 3, 2, 3, hcol); R(hx - 1, hy - 5, 2, 2, hcol); R(hx + 6, hy - 3, 2, 3, hcol); R(hx + 7, hy - 5, 2, 2, hcol); }
      const x = 21 + b, y = 21 + dy, m = o.metal || '#c8cdd6', w = o.wood || '#7a5234', gl = o.glow || '#ffe89a';
      const wp = o.weapon;
      if (wp === 'sword') { R(x + 1, y - 13, 2, 13, m); R(x + 1, y - 13, 1, 13, shade(m, 0.85)); R(x + 1, y - 14, 1, 1, m); R(x - 1, y - 1, 6, 1, o.guard || '#d9b45a'); }
      if (wp === 'hammer') { R(x + 1, y - 11, 1, 15, w); R(x - 2, y - 15, 7, 5, m); R(x - 2, y - 15, 7, 1, '#e8ecf0'); R(x - 2, y - 11, 7, 1, shade(m)); }
      if (wp === 'bow') { R(x + 3, y - 11, 1, 2, w); R(x + 4, y - 9, 1, 3, w); R(x + 5, y - 6, 1, 10, w); R(x + 4, y + 4, 1, 3, w); R(x + 3, y + 7, 1, 2, w); R(x + 2, y - 10, 1, 18, '#e6e0d0'); }
      if (wp === 'staff') { R(x + 1, y - 17, 1, 26, w); R(x, y - 20, 3, 3, gl); R(x + 1, y - 21, 1, 1, gl); }
      if (wp === 'spear') { R(x + 1, y - 18, 1, 26, w); R(x, y - 21, 3, 3, m); R(x + 1, y - 23, 1, 2, m); R(x, y - 17, 3, 1, o.guard || '#d9b45a'); }
      if (wp === 'dagger') { R(x + 1, y - 5, 1, 5, m); R(x, y, 3, 1, o.guard || '#d9b45a'); }
      if (wp === 'sabre') { R(x + 1, y - 9, 1, 9, m); R(x + 2, y - 12, 1, 4, m); R(x + 3, y - 14, 1, 3, m); R(x - 1, y, 4, 1, o.guard || '#d9b45a'); }
      if (wp === 'axe') { R(x + 1, y - 12, 1, 16, w); R(x + 2, y - 13, 4, 6, m); R(x + 5, y - 14, 1, 8, m); R(x + 2, y - 13, 1, 6, shade(m)); }
      if (wp === 'club') { R(x + 1, y - 10, 2, 13, w); R(x, y - 13, 4, 5, shade(w, 0.8)); R(x + 3, y - 12, 1, 1, '#c8cdd6'); }
      if (wp === 'greatsword') { R(x + 1, y - 16, 3, 16, m); R(x + 1, y - 16, 1, 16, shade(m, 0.8)); R(x + 2, y - 17, 1, 1, m); R(x - 1, y - 1, 7, 1, o.guard || '#d9b45a'); }
      R(20 + b, 15 + dy, 2, 6, o.sleeve || arm); R(20 + b, 21 + dy, 3, 2, o.glove || skin);
      if (wp === 'claws') { R(x + 2, y - 1, 3, 1, '#e8e0d0'); R(x + 2, y + 1, 3, 1, '#e8e0d0'); }
      if (wp === 'orb') { R(x, y - 3, 3, 3, gl); R(x + 1, y - 4, 1, 1, gl); }
      if (o.shield) { R(18 + b, 15 + dy, 6, 9, o.shield); R(19 + b, 16 + dy, 4, 7, o.shield2 || shade(o.shield, 1.25)); R(20 + b, 18 + dy, 2, 3, o.emblem || '#d9b45a'); }
    });
  }

  const LOOK = {
    aldric: { skin: '#e0b08a', hair: '#6b6b6b', hairStyle: 'short', armor: '#9aa3b0', legs: '#4a4f5a', belt: '#7a5a3a', head: 'helm', headCol: '#b8c0cc', plume: '#b0453a', weapon: 'sword', shield: '#8a2f2a', cape: '#6b2a2a' },
    lyra: { skin: '#f0c9a0', hair: '#d6c46a', hairStyle: 'long', armor: '#4f7a3a', legs: '#5a4630', belt: '#8a6a3a', head: 'hood', headCol: '#3f6630', weapon: 'bow', cape: '#35552a' },
    grolm: { skin: '#d9a07a', hair: '#b5542a', hairStyle: 'short', beard: '#b5542a', armor: '#7a6a5a', legs: '#4a3a30', belt: '#3a2a20', buckle: '#d9b45a', bulk: 1, dy: 3, weapon: 'hammer', head: 'helm', headCol: '#8a8f99' },
    maren: { skin: '#e8bf9a', hair: '#8a5a3a', hairStyle: 'long', armor: '#e6e0d0', robe: true, legs: '#cfc8b6', trim: '#d9b45a', head: 'hood', headCol: '#d8d0c0', weapon: 'orb', glow: '#fff0a8', boots: '#8a7a60' },
    vex: { skin: '#d8a888', hair: '#2a2a3a', hairStyle: 'spiky', armor: '#3a3a4a', legs: '#2a2a36', belt: '#6a3a5a', head: 'hood', headCol: '#4a3a5a', weapon: 'dagger', metal: '#9aff6a', cape: '#5a2a4a' },
    wachter: { skin: '#d8d0bc', armor: '#d8d0bc', ribs: '#6a6254', legs: '#bdb4a0', eye: '#5ad0ff', head: 'helm', headCol: '#6a5a4e', weapon: 'sword', metal: '#9a8a7a', shield: '#4a4a52', emblem: '#5ad0ff', jaw: '#8a8270' },
    kira: { skin: '#c8d0d8', hair: '#e8e8f0', hairStyle: 'long', armor: '#2a2438', legs: '#1c1828', robe: true, eye: '#b08aff', weapon: 'staff', glow: '#b08aff', cape: '#3a2a5a' },
    baelzor: { skin: '#b8403a', armor: '#2a1a1a', legs: '#1a1010', head: 'horns', eye: '#ffd040', bulk: 1, weapon: 'greatsword', metal: '#ff8a3a', guard: '#5a1a1a', cape: '#5a1a1a', belt: '#5a1a1a', buckle: '#ffd040' },
    nixa: { skin: '#8ac8c0', hair: '#2a6a8a', hairStyle: 'long', armor: '#3a7a8a', legs: '#2f6470', robe: true, eye: '#10283a', weapon: 'orb', glow: '#9af0ff', boots: '#2a4a5a' },
    drenk: { skin: '#c89a7a', hair: '#3a2a20', hairStyle: 'short', beard: '#3a2a20', head: 'hat', headCol: '#2a2a30', armor: '#8a2a2a', legs: '#3a3a44', belt: '#2a2020', buckle: '#d9b45a', weapon: 'sabre' },
    urgha: { skin: '#6a9a4a', hair: '#2a2a2a', hairStyle: 'topknot', armor: '#6a4a30', legs: '#4a3420', belt: '#3a2a1a', bulk: 2, eye: '#ffdd33', tusk: true, weapon: 'axe' },
    thessa: { skin: '#e8c0a0', hair: '#e0e0d0', hairStyle: 'long', head: 'wreath', armor: '#5a8a4a', robe: true, legs: '#4a7a3e', trim: '#aef08a', weapon: 'staff', glow: '#aef08a', cape: '#3a5a2a' },
    sera: { skin: '#f0c49e', hair: '#f0d890', hairStyle: 'bun', armor: '#e6e0cc', legs: '#b8b0a0', belt: '#d9b45a', head: 'circlet', headCol: '#d9b45a', weapon: 'spear', metal: '#f0f0e6', cape: '#e8c060', trim: '#e8743b' },
    bram: { skin: '#d8986e', hair: '#3a2a22', hairStyle: 'short', beard: '#5a3a2a', armor: '#6a6e78', legs: '#4a4a52', belt: '#3a2a20', buckle: '#d9b45a', bulk: 1, dy: 3, head: 'greathelm', headCol: '#7a7e88', shield: '#5a4a3a', emblem: '#e8743b', weapon: 'hammer' },
    elwin: { skin: '#e8c8a8', hair: '#5a8ac0', hairStyle: 'long', ears: 'elf', armor: '#4a6aa0', robe: true, legs: '#3e5a88', trim: '#c8e0ff', weapon: 'staff', glow: '#9ad0ff', wood: '#8a6a4a' },
    mira: { skin: '#d0a080', hair: '#1a1a22', hairStyle: 'bun', armor: '#2e3440', legs: '#22262e', belt: '#4a2a3a', head: 'hood', headCol: '#22262e', weapon: 'dagger', metal: '#e0e4ea', cape: '#3a1e2a' },
    morvin: { skin: '#d8dce6', hair: '#1a1420', hairStyle: 'short', armor: '#3a1420', legs: '#1a1418', buttons: '#c8a050', eye: '#ff3a4a', head: 'crown', headCol: '#8a7a5a', weapon: 'claws', cape: '#6a1024', boots: '#1a1418' },
    zhar: { skin: '#a84a3a', armor: '#3a2020', robe: true, legs: '#2a1818', trim: '#ff8a3a', head: 'horns', hornCol: '#2a1a1a', eye: '#ffb040', weapon: 'orb', glow: '#ff8a3a', cape: '#5a2a1a' },
    kaalvoet: { skin: '#8ab0a8', armor: '#4a6a6a', legs: '#3a5454', head: 'greathelm', headCol: '#5a7a74', weapon: 'hammer', metal: '#7a9a94', shield: '#3a5a5a', emblem: '#9af0ff', cape: '#2a4a4a', boots: '#2a3a3a' },
    rogh: { skin: '#6a5a58', hair: '#4a3e3c', hairStyle: 'mohawk', armor: '#6a5a58', strap: '#8a2a2a', legs: '#4a3a30', belt: '#3a2a1a', bulk: 2, eye: '#ffdd33', tusk: true, ears: 'elf', weapon: 'claws' },
    skelet: { skin: '#d8d0bc', armor: '#d8d0bc', ribs: '#6a6254', legs: '#bdb4a0', eye: '#ff5a3a', jaw: '#8a8270', weapon: 'sword', metal: '#9a7a5a', guard: '#5a4a3a' },
    boogskelet: { skin: '#d8d0bc', armor: '#d8d0bc', ribs: '#6a6254', legs: '#bdb4a0', eye: '#ff5a3a', jaw: '#8a8270', head: 'hood', headCol: '#3a3436', weapon: 'bow', wood: '#5a4a3a' },
    ork: { skin: '#7aa04a', armor: '#5a5a60', legs: '#4a3a2a', belt: '#3a2a1a', bulk: 2, eye: '#ffdd33', tusk: true, head: 'helm', headCol: '#5a5a60', weapon: 'club' },
    sjamaan: { skin: '#7aa04a', armor: '#6a3a6a', robe: true, legs: '#5a2e5a', bulk: 1, eye: '#ffdd33', tusk: true, head: 'hood', headCol: '#4a2a4a', weapon: 'staff', glow: '#9aff6a', wood: '#5a3a2a' },
    grak: { skin: '#6a9040', armor: '#4a4a50', legs: '#3a2a20', belt: '#8a2a20', buckle: '#d9b45a', bulk: 2, eye: '#ff4a2a', tusk: true, head: 'horns', hornCol: '#e6dcc0', weapon: 'hammer', metal: '#8a8f99', cape: '#7a2a20' },
    morwenna: { skin: '#b8c8a8', hair: '#2a2a2a', hairStyle: 'long', armor: '#2a2230', robe: true, legs: '#221c28', trim: '#8a5aa8', head: 'witch', headCol: '#221c28', eye: '#c8ff6a', weapon: 'staff', glow: '#c8ff6a', wood: '#3a2a2a', cape: '#3a2a48' },
  };

  function imp() {
    return paint(32, 32, R => {
      const r = '#c8402e', rs = '#8a2a20';
      R(6, 12, 6, 7, '#5a1a2a'); R(4, 10, 3, 3, '#5a1a2a'); R(7, 19, 3, 2, '#5a1a2a');
      R(8, 22, 5, 1, rs); R(6, 21, 2, 1, rs); R(5, 19, 1, 2, rs);
      R(13, 18, 8, 7, r); R(13, 18, 2, 7, rs); R(13, 10, 9, 8, r); R(13, 10, 2, 8, rs);
      R(14, 7, 2, 3, '#efe6cf'); R(20, 7, 2, 3, '#efe6cf'); R(14, 6, 1, 1, '#efe6cf'); R(21, 6, 1, 1, '#efe6cf');
      R(19, 13, 2, 1, '#ffdd33'); R(17, 16, 4, 1, '#3a0a0a');
      R(14, 25, 2, 5, rs); R(18, 25, 2, 5, rs); R(14, 29, 3, 1, '#2a0a0a'); R(18, 29, 3, 1, '#2a0a0a');
      R(21, 19, 2, 4, r); R(22, 15, 4, 4, '#ffb040'); R(23, 16, 2, 2, '#fff0a0');
    });
  }
  function wolf() {
    return paint(32, 32, R => {
      const c = '#5a5a66', s = '#3e3e4a', l = '#7a7a86';
      R(2, 14, 4, 3, c); R(1, 12, 2, 3, c); R(4, 16, 3, 2, c);
      R(6, 16, 17, 8, c); R(6, 21, 17, 3, s); R(8, 15, 12, 2, l);
      R(20, 11, 8, 8, c); R(26, 15, 5, 3, c); R(26, 17, 5, 2, s); R(30, 15, 1, 1, '#1a1418');
      R(21, 8, 2, 4, c); R(24, 9, 2, 3, c); R(22, 9, 1, 2, s);
      R(25, 13, 2, 1, '#ffb040'); R(27, 18, 1, 1, '#efe6cf'); R(29, 18, 1, 1, '#efe6cf');
      R(8, 24, 3, 6, s); R(12, 24, 3, 5, c); R(18, 24, 3, 6, s); R(21, 24, 3, 6, c);
      R(8, 29, 4, 1, '#2a2a30'); R(21, 29, 4, 1, '#2a2a30');
    });
  }
  function ghost() {
    return paint(32, 32, R => {
      const c = 'rgba(150,210,228,0.9)', s = 'rgba(96,160,190,0.9)';
      R(12, 5, 9, 9, c); R(12, 5, 2, 9, s); R(10, 14, 13, 8, c); R(10, 14, 3, 8, s);
      R(11, 22, 11, 3, c); R(11, 25, 2, 3, c); R(15, 25, 2, 5, c); R(19, 25, 2, 3, c); R(13, 27, 1, 2, s); R(17, 28, 1, 2, s);
      R(7, 15, 3, 6, s); R(23, 14, 4, 3, c); R(26, 12, 2, 3, c);
      R(18, 8, 2, 3, '#0e2030'); R(15, 8, 2, 3, '#0e2030'); R(16, 12, 3, 1, '#0e2030');
    });
  }
  function larva() {
    return paint(32, 32, R => {
      const c = '#c8a0a0', s = '#9a7070';
      R(4, 24, 5, 5, c); R(9, 23, 5, 6, s); R(14, 22, 5, 7, c); R(18, 18, 5, 8, s);
      R(21, 13, 8, 8, c); R(21, 13, 2, 8, s); R(27, 17, 2, 2, '#3a1418'); R(25, 14, 1, 1, '#1a0a0a'); R(26, 20, 1, 1, '#efe6cf');
    });
  }
  function doll() {
    return paint(32, 32, R => {
      const cl = '#b89a78', pt = '#8a6a8a';
      R(15, 0, 1, 9, '#d8d8e0');
      R(12, 9, 9, 8, cl); R(12, 9, 2, 8, shade(cl));
      R(17, 11, 1, 1, '#1a1418'); R(19, 11, 1, 1, '#1a1418'); R(18, 12, 1, 1, '#1a1418'); R(17, 13, 1, 1, '#1a1418'); R(19, 13, 1, 1, '#1a1418');
      R(13, 12, 2, 2, '#1a1418'); R(14, 15, 6, 1, '#3a2a2a');
      R(12, 17, 8, 8, pt); R(12, 17, 2, 8, shade(pt)); R(14, 19, 4, 1, '#e8e0d0');
      R(9, 18, 3, 2, cl); R(20, 18, 3, 2, cl); R(13, 25, 2, 4, cl); R(17, 25, 2, 4, cl);
    });
  }
  function golem() {
    return paint(48, 48, R => {
      const c = '#8a5a36', s = '#5e3a22', l = '#a0683e', rv = '#d8a060', dk = '#3e2616';
      R(3, 16, 8, 14, s); R(2, 29, 10, 9, s); R(3, 30, 3, 2, dk);
      R(14, 33, 8, 11, s); R(27, 33, 8, 11, c); R(13, 42, 10, 4, dk); R(26, 42, 10, 4, dk);
      R(9, 13, 30, 22, c); R(9, 13, 5, 22, s);
      R(15, 16, 10, 9, l); R(27, 16, 9, 9, l);
      R(16, 17, 1, 1, rv); R(23, 17, 1, 1, rv); R(16, 23, 1, 1, rv); R(23, 23, 1, 1, rv); R(28, 17, 1, 1, rv); R(34, 17, 1, 1, rv); R(28, 23, 1, 1, rv); R(34, 23, 1, 1, rv);
      R(12, 28, 26, 3, dk); R(20, 28, 6, 3, '#6a6a70');
      R(19, 26, 3, 2, '#4a7a4a'); R(33, 29, 2, 3, '#4a7a4a'); R(11, 20, 2, 3, dk);
      R(18, 3, 14, 11, c); R(18, 3, 3, 11, s); R(21, 1, 3, 3, dk); R(20, 0, 5, 1, dk);
      R(26, 7, 5, 2, '#ffb040'); R(22, 11, 8, 1, dk);
      R(38, 14, 8, 15, c); R(38, 14, 3, 15, s); R(36, 28, 11, 10, l); R(36, 35, 11, 1, s);
    });
  }
  function worm(burrow) {
    return paint(48, 48, R => {
      const c = '#b8868a', s = '#8a5a60', l = '#dcb0b0';
      R(6, 42, 36, 4, '#3a2a22'); R(10, 40, 28, 3, '#4a382c');
      if (burrow) { R(14, 36, 20, 5, s); for (let i = 0; i < 6; i++) R(12 + i * 4, 34 + (i % 2), 2, 2, '#6a5040'); return; }
      R(14, 34, 12, 7, c); R(14, 34, 3, 7, s);
      R(17, 27, 11, 8, s); R(20, 20, 10, 8, c); R(20, 20, 3, 8, s); R(24, 14, 10, 7, s);
      R(26, 5, 14, 11, c); R(26, 5, 3, 11, s); R(28, 6, 4, 1, l);
      R(35, 9, 5, 5, '#3a0e14'); R(35, 9, 1, 1, '#efe6cf'); R(39, 9, 1, 1, '#efe6cf'); R(35, 13, 1, 1, '#efe6cf'); R(39, 13, 1, 1, '#efe6cf');
      R(30, 7, 2, 1, '#ffdd33'); R(33, 6, 1, 1, '#ffdd33');
      for (let i = 0; i < 4; i++) R(15 + i * 3, 36 - i * 7, 8, 1, shade(c, 0.75));
    });
  }
  const CUSTOM = { imp, wolf, nevelgeest: ghost, larve: larva, pop: doll, roestreus: golem, uthrak: () => worm(false) };
  const WAIST = 22;

  // the own hero's art (pc_<class>_<m|f>, see engine PC_CLASSES): borrowed from existing heroes until its own art is drawn
  const PC_ART_FROM = { pc_tank_m: 'vorlund', pc_tank_f: 'draelyn', pc_warrior_m: 'karnok', pc_warrior_f: 'astraea', pc_mage_m: 'celesthyr', pc_mage_f: 'ithyra', pc_ranger_m: 'bloodsnarl', pc_ranger_f: 'valkessa',
    pc_rogue_m: 'skavren', pc_rogue_f: 'zephara', pc_healer_m: 'zulgroth', pc_healer_f: 'liora' };
  // heroes with an animated sheet (sheets.js HERO_SHEET): its first idle frame and first portrait are their picture everywhere
  if (typeof HERO_SHEET !== 'undefined') for (const id in HERO_SHEET) {
    const sh = HERO_SHEET[id]; if (typeof HERO_ART !== 'undefined') HERO_ART[id] = { body: sh.idle[0], full: sh.idle[0], face: sh.por[0] };
    if (typeof HERO_POR !== 'undefined') HERO_POR[id] = sh.por[0];
    delete PC_ART_FROM[id]; // its own art: never borrowed (nor mirrored like a borrowed orc)
  }
  for (const [id, src] of Object.entries(PC_ART_FROM)) {
    if (typeof HERO_ART !== 'undefined' && !HERO_ART[id]) { const a = HERO_ART[src] || (typeof ENEMY_ART !== 'undefined' && ENEMY_ART[src]); if (a) HERO_ART[id] = a; }
    if (typeof HERO_POR !== 'undefined' && !HERO_POR[id] && HERO_POR[src]) HERO_POR[id] = HERO_POR[src];
  }
  const cache = {};
  const ART = Object.assign({}, typeof HERO_ART !== 'undefined' ? HERO_ART : {}, typeof ENEMY_ART !== 'undefined' ? ENEMY_ART : {}, typeof BOSS_ART !== 'undefined' ? BOSS_ART : {});
  const heroCv = {};
  const isHero = id => !!ART[id];
  function up2(s) { const c = canvas(s.width * 2, s.height * 2), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, c.width, c.height); return c; }
  // The battle art comes from different sources: some figures have much less local contrast than others and look
  // blurry next to them on the battlefield. sharpen() lifts a soft figure towards the common crispness (CRISP = mean
  // colour step between neighbouring opaque pixels) with an unsharp mask that ignores transparent pixels (no halos).
  const CRISP = 110;
  function crispness(d, w, h) {
    let s = 0, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) {
      const p = (y * w + x) * 4, q = p + 4;
      if (d[p + 3] > 200 && d[q + 3] > 200) { s += Math.abs(d[p] - d[q]) + Math.abs(d[p + 1] - d[q + 1]) + Math.abs(d[p + 2] - d[q + 2]); n++; }
    }
    return n ? s / n : CRISP;
  }
  function unsharp(src, w, h, a) {
    const out = new Uint8ClampedArray(src);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4; if (src[p + 3] < 8) continue;
      for (let ch = 0; ch < 3; ch++) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = (yy * w + xx) * 4; if (src[q + 3] < 8) continue; s += src[q + ch]; n++;
        }
        out[p + ch] = src[p + ch] + a * (src[p + ch] - s / n);
      }
    }
    return out;
  }
  function sharpen(c) {
    const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), w = c.width, h = c.height, g0 = crispness(im.data, w, h);
    if (g0 >= CRISP * 0.9) return;
    const g1 = crispness(unsharp(im.data, w, h, 1), w, h);
    const a = Math.min(2, Math.max(0, (CRISP - g0) / Math.max(1, g1 - g0)));
    im.data.set(unsharp(im.data, w, h, a)); g.putImageData(im, 0, 0);
  }
  // chapter backgrounds (CHAPTER_BG): each painted panorama cover-cropped into a 480x270 canvas, centred, once at load
  const chBg = [];
  function loadChapterBgs() {
    if (typeof CHAPTER_BG === 'undefined') return Promise.resolve();
    return Promise.all(CHAPTER_BG.map((src, k) => new Promise(res => {
      const img = new Image();
      img.onload = () => { const c = canvas(480, 270), g = c.getContext('2d'), s = Math.max(480 / img.width, 270 / img.height), w = img.width * s, h = img.height * s;
        g.imageSmoothingQuality = 'high'; g.drawImage(img, (480 - w) / 2, 270 - h, w, h); chBg[k] = c; res(); };
      img.onerror = () => res();
      img.src = src;
    })));
  }
  // figures painted facing left (the orc cards); mirrored at load so every figure faces right like the rest
  const FACES_LEFT = new Set(['grimtar', 'krogash', 'zulgroth', 'bloodsnarl']);
  // their big picture (SPR.url at scale 2: starter hall, hero details, summons) is mirrored too, once at load
  const fullFlip = {};
  const loadFlipped = () => Promise.all([...FACES_LEFT, ...Object.keys(PC_ART_FROM).filter(id => FACES_LEFT.has(PC_ART_FROM[id]))].filter(id => ART[id] && ART[id].full).map(id => new Promise(res => {
    const img = new Image();
    img.onload = () => { const c = canvas(img.width, img.height), g = c.getContext('2d'); g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0); fullFlip[id] = c.toDataURL(); res(); };
    img.onerror = () => res();
    img.src = ART[id].full;
  })));
  // animated heroes (sheets.js): the picture everywhere comes from the inline idle frame (k times finer, scaled down for the
  // battle grid), fullCrop is that frame cropped square for big pictures; every move is loaded from sheets/<id>.js the first
  // time the battle asks for the hero (sheet(id) answers null until then, so the still picture is drawn meanwhile)
  const SHEETS = {}, fullCrop = {}, sheetWant = {};
  const SHEET_K = id => (typeof HERO_SHEET !== 'undefined' && HERO_SHEET[id] && HERO_SHEET[id].k) || 1;
  const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  window.FFH_SHEET = async (id, sh) => {
    const out = { w: sh.w, h: sh.h, k: sh.k || 1 };
    for (const k of ['idle', 'atk1', 'atk2', 'block', 'skill', 'hurt', 'dead']) if (sh[k]) out[k] = await Promise.all(sh[k].map(loadImg)); // block and skill are optional
    if (out.idle && out.idle[0] && out.atk1 && out.atk2 && out.hurt && out.dead) SHEETS[id] = out;
  };
  function loadSheet(id) {
    if (typeof HERO_SHEET === 'undefined' || !HERO_SHEET[id]) return Promise.resolve(null);
    return (sheetWant[id] = sheetWant[id] || new Promise(res => {
      const s = document.createElement('script'); s.src = `sheets/${id}.js`; s.async = true;
      const done = () => { const t = setInterval(() => { if (SHEETS[id]) { clearInterval(t); res(SHEETS[id]); } }, 50); setTimeout(() => { clearInterval(t); res(SHEETS[id] || null); }, 8000); };
      s.onload = done; s.onerror = () => res(null); document.head.appendChild(s);
    }));
  }
  const cropSheets = () => Promise.all(Object.keys(typeof HERO_SHEET !== 'undefined' ? HERO_SHEET : {}).map(async id => {
    const im = await loadImg(HERO_SHEET[id].idle[0]); if (!im) return;
    const c = canvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 20) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const s = Math.max(x1 - x0, y1 - y0) + 4, o = canvas(s, s), og = o.getContext('2d'); og.imageSmoothingQuality = 'high';
    og.drawImage(c, x0 - (s - (x1 - x0)) / 2, y0 - (s - (y1 - y0)), s, s, 0, 0, s, s); fullCrop[id] = o.toDataURL('image/webp', 0.92);
  }));
  function preload() {
    return Promise.all([loadChapterBgs(), loadFlipped(), cropSheets(), ...Object.keys(ART).map(id => new Promise(res => {
      const img = new Image();
      img.onload = () => {
        // an animated hero's frame is k times finer than the battle grid: scaled down smoothly (and not sharpened)
        const k = SHEET_K(id), c = canvas(Math.round(img.width / k), Math.round(img.height / k)), g = c.getContext('2d');
        if (FACES_LEFT.has(id) || FACES_LEFT.has(PC_ART_FROM[id])) { g.translate(c.width, 0); g.scale(-1, 1); }
        g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height); if (k === 1) sharpen(c); heroCv[id] = c; res();
      };
      img.onerror = () => res();
      img.src = ART[id].body;
    }))]);
  }
  function base(id) {
    const k = id + ':base'; if (cache[k]) return cache[k];
    if (isHero(id)) return (cache[k] = heroCv[id] || canvas(8, 8));
    return (cache[k] = up2(CUSTOM[id] ? CUSTOM[id]() : human(LOOK[id] || LOOK.aldric)));
  }
  // pose frames: shift the upper body (drawn humanoids) or the whole figure (heroes, monsters)
  function derive(id, f) {
    const s = base(id), c = canvas(s.width, s.height), g = c.getContext('2d');
    const hum = !CUSTOM[id] && !isHero(id);
    const shift = { idle1: [0, 1], atk: [4, 0], cast: [0, -2], hit: [-4, 2] }[f] || [0, 0];
    if (isHero(id) && f === 'idle1') {
      // breathing: squash the top 60% by one pixel
      const cut = Math.round(s.height * 0.6);
      g.drawImage(s, 0, cut, s.width, s.height - cut, 0, cut, s.width, s.height - cut);
      g.drawImage(s, 0, 0, s.width, cut, 0, 1, s.width, cut - 1);
      return c;
    }
    if (!hum) { g.drawImage(s, shift[0], f === 'idle1' ? 2 : shift[1]); return c; }
    const cut = WAIST * 2;
    g.drawImage(s, 0, cut, s.width, s.height - cut, 0, cut, s.width, s.height - cut);
    g.drawImage(s, 0, 0, s.width, cut, shift[0], shift[1] * (f === 'idle1' ? 2 : 1), s.width, cut);
    return c;
  }
  function frame(id, f, kind) {
    f = f || 'idle0';
    const key = id + ':' + f + ':' + (kind || '');
    if (cache[key]) return cache[key];
    let c;
    if (!kind) {
      if (f === 'idle0') c = base(id);
      else if (f === 'burrow') c = id === 'uthrak' ? up2(worm(true)) : base(id);
      else if (f === 'dim') { // darkened figure, blended in as a fallen unit settles (app.js pose())
        const s = base(id); c = canvas(s.width, s.height); const g = c.getContext('2d'); g.drawImage(s, 0, 0);
        const oi = g.getImageData(0, 0, c.width, c.height); for (let i = 0; i < oi.data.length; i += 4) { oi.data[i] *= 0.45; oi.data[i + 1] *= 0.42; oi.data[i + 2] *= 0.48; } g.putImageData(oi, 0, 0);
      }
      else if (f === 'dead') {
        const s = base(id); c = canvas(s.width, s.height); const g = c.getContext('2d');
        if (CUSTOM[id] && id !== 'pop') {
          const h = Math.round(s.height * 0.5);
          g.drawImage(s, 0, 0, s.width, s.height, -Math.round(s.width * 0.08), s.height - h, Math.round(s.width * 1.16), h);
        } else {
          const D = Math.max(s.width, s.height), t = canvas(D, D), tg = t.getContext('2d');
          tg.translate(0, D); tg.rotate(-Math.PI / 2); tg.drawImage(s, 0, 0);
          const img = tg.getImageData(0, 0, D, D); let maxY = 0, minX = D, maxX = 0;
          for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) if (img.data[(y * D + x) * 4 + 3]) { if (y > maxY) maxY = y; if (x < minX) minX = x; if (x > maxX) maxX = x; }
          c = canvas(Math.max(s.width, maxX - minX + 4), s.height); const g2 = c.getContext('2d');
          g2.drawImage(t, Math.round((c.width - (maxX - minX)) / 2 - minX), s.height - 2 - maxY);
        }
        const g3 = c.getContext('2d'), oi = g3.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < oi.data.length; i += 4) { oi.data[i] *= 0.6; oi.data[i + 1] *= 0.58; oi.data[i + 2] *= 0.62; }
        g3.putImageData(oi, 0, 0);
      } else c = derive(id, f);
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
    if (typeof HERO_POR !== 'undefined' && HERO_POR[id] && (scale || 1) < 2) return HERO_POR[id];
    if (isHero(id)) return (scale || 1) >= 2 ? fullFlip[id] || fullCrop[id] || ART[id].full : ART[id].face;
    const k = scale || 1, key = id + '@' + k + (flip ? 'f' : '');
    if (urls[key]) return urls[key];
    const s = frame(id, 'idle0', flip ? 'flip' : '');
    const d = s.getContext('2d').getImageData(0, 0, s.width, s.height).data;
    let x0 = s.width, y0 = s.height, x1 = 0, y1 = 0;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (d[(y * s.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const side = Math.max(x1 - x0, y1 - y0) + 6, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const c = canvas(side * k, side * k), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(s, Math.round(cx - side / 2), Math.round(cy - side / 2), side, side, 0, 0, side * k, side * k);
    return (urls[key] = c.toDataURL());
  }
  // ---------- backgrounds 320x180 ----------
  function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  const BG_W = 320, BG_H = 180;
  function background(area) {
    const W = BG_W, H = BG_H;
    return paint(W, H, (R, g) => {
      const r = rng([77, 13, 41, 59, 23][area] || 7);
      if (area === 0) {
        const bands = ['#171220', '#1d1526', '#26182a', '#34202e', '#4a2a30', '#5e3430'];
        bands.forEach((col, i) => R(0, i * 16, W, 16, col));
        for (let i = 0; i < bands.length - 1; i++) for (let x = 0; x < W; x += 2) R(x + (i % 2), i * 16 + 15, 1, 1, bands[i + 1]);
        R(0, 96, W, 84, '#5e3430');
        g.fillStyle = '#d9c7a8'; g.beginPath(); g.arc(248, 34, 11, 0, 7); g.fill();
        R(240, 30, 6, 2, '#bba98c'); R(250, 38, 4, 2, '#bba98c');
        let x = 0; while (x < W) { const w = 6 + Math.floor(r() * 18), h = 10 + Math.floor(r() * 26); R(x, 88 - h, w, h + 10, '#2a1c26'); if (r() < 0.4) R(x + 2, 88 - h - 6, 2, 6, '#2a1c26'); if (r() < 0.3) R(x + 2, 88 - h + 5, 2, 3, '#e8a050'); x += w + Math.floor(r() * 6); }
        for (let x2 = 0; x2 < W; x2++) { const h = 8 + Math.round(Math.sin(x2 / 23) * 4 + Math.sin(x2 / 9) * 2); R(x2, 96 - h, 1, h, '#1e1520'); }
        R(0, 96, W, 84, '#2e2226');
        for (let i = 0; i < 700; i++) R(Math.floor(r() * W), 96 + Math.floor(r() * 84), 1 + Math.floor(r() * 2), 1, r() < 0.5 ? '#3a2c2e' : '#241a1e');
        for (let y = 100; y < 180; y += 3) { const w = 60 + (y - 100) * 1.3; R(160 - w / 2 + Math.round(Math.sin(y) * 3), y, w, 2, '#382a2a'); }
        [[20, 104], [296, 110], [150, 102]].forEach(([dx, dy]) => { R(dx, dy - 12, 2, 12, '#1a1216'); R(dx - 4, dy - 9, 10, 2, '#1a1216'); });
      } else if (area === 1) {
        R(0, 0, W, H, '#14161c');
        for (let i = 0; i < 26; i++) { const x = Math.floor(r() * W), h = 6 + Math.floor(r() * 30), w = 3 + Math.floor(r() * 8); R(x, 0, w, h, '#1c2028'); R(x + 1, h, Math.max(1, w - 2), 3, '#1c2028'); }
        for (let i = 0; i < 9; i++) { const x = 10 + Math.floor(r() * 300), y = 50 + Math.floor(r() * 36); R(x, y, 2, 6, '#9ab8c8'); R(x + 2, y + 2, 2, 4, '#c8dce6'); R(x - 2, y + 3, 2, 3, '#7a98a8'); }
        R(40, 30, 3, 66, '#3a2a1e'); R(36, 30, 11, 3, '#3a2a1e'); R(274, 26, 3, 70, '#3a2a1e'); R(270, 26, 11, 3, '#3a2a1e');
        R(52, 42, 2, 3, '#e8a050'); R(51, 40, 4, 2, '#ffd080'); R(262, 40, 2, 3, '#e8a050'); R(261, 38, 4, 2, '#ffd080');
        R(0, 96, W, 84, '#22262e');
        for (let i = 0; i < 700; i++) R(Math.floor(r() * W), 96 + Math.floor(r() * 84), 1 + Math.floor(r() * 2), 1, r() < 0.5 ? '#2c313a' : '#1a1d24');
        for (let x = 0; x < W; x += 2) R(x, 96, 1, 1, '#3a404a');
        R(0, 150, W, 2, '#3a3a3e'); R(0, 162, W, 2, '#3a3a3e'); for (let x = 4; x < W; x += 12) R(x, 150, 3, 14, '#4a3a2a');
      } else if (area === 2) {
        R(0, 0, W, H, '#161214');
        for (let y = 0; y < 96; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) R(x, y, 15, 7, r() < 0.5 ? '#221c1e' : '#261e20');
        for (let i = 0; i < 5; i++) { const x = 20 + i * 64; R(x, 24, 24, 42, '#100c0e'); R(x + 4, 18, 16, 6, '#100c0e'); R(x + 7, 50, 10, 16, '#3a3034'); }
        [[12, 40], [304, 40]].forEach(([x, y]) => { R(x, y, 3, 10, '#3a2a1e'); R(x - 1, y - 4, 5, 4, '#ffb040'); R(x, y - 6, 3, 2, '#fff0a0'); });
        R(0, 96, W, 84, '#2a2224');
        for (let i = 0; i < 700; i++) R(Math.floor(r() * W), 96 + Math.floor(r() * 84), 1 + Math.floor(r() * 2), 1, r() < 0.5 ? '#342a2c' : '#1e1a1c');
        for (let i = 0; i < 14; i++) { const x = Math.floor(r() * W), y = 104 + Math.floor(r() * 70); R(x, y, 3, 2, '#cfc6b0'); R(x + 3, y + 1, 2, 1, '#cfc6b0'); }
      } else if (area === 3) {
        const bands = ['#0e1410', '#121a14', '#162018', '#1a261c', '#1e2c20', '#22321f'];
        bands.forEach((col, i) => R(0, i * 16, W, 16, col));
        for (let i = 0; i < 10; i++) { const x = Math.floor(r() * W), w = 7 + Math.floor(r() * 9); R(x, 0, w, 96, i % 2 ? '#0e120e' : '#141a12'); }
        g.strokeStyle = 'rgba(210,215,225,0.55)'; g.lineWidth = 1;
        for (let k = 0; k < 3; k++) { const cx = 40 + k * 120, cy = 30 + (k % 2) * 20; for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a * 0.785) * 26, cy + Math.sin(a * 0.785) * 26); g.stroke(); } for (let rr = 7; rr < 26; rr += 7) { g.beginPath(); for (let a = 0; a <= 8; a++) { const x = cx + Math.cos(a * 0.785) * rr, y = cy + Math.sin(a * 0.785) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }
        for (let i = 0; i < 20; i++) R(Math.floor(r() * W), Math.floor(r() * 96), 1, 1, '#c8ff6a');
        R(0, 96, W, 84, '#1c2418');
        for (let i = 0; i < 700; i++) R(Math.floor(r() * W), 96 + Math.floor(r() * 84), 1 + Math.floor(r() * 2), 1, r() < 0.5 ? '#26301e' : '#141a12');
        for (let i = 0; i < 14; i++) { const x = Math.floor(r() * W), y = 104 + Math.floor(r() * 70); R(x, y, 4, 2, '#4a3a5a'); R(x + 1, y - 1, 2, 1, '#6a5a8a'); }
      } else {
        R(0, 0, W, H, '#1a1210');
        for (let y = 0; y < 96; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) R(x, y, 15, 7, r() < 0.5 ? '#2a1c16' : '#241812');
        R(115, 14, 90, 60, '#120c0a'); R(122, 40, 76, 34, '#3a1a0a');
        for (let i = 0; i < 24; i++) R(124 + Math.floor(r() * 70), 46 + Math.floor(r() * 24), 2, 2, r() < 0.5 ? '#ff8a2a' : '#ffd060');
        [[26, 26], [282, 20]].forEach(([x, y]) => { R(x, y, 12, 70, '#2e2a2a'); R(x + 3, y, 6, 70, '#3a3434'); });
        R(60, 74, 26, 10, '#3a3a40'); R(64, 84, 18, 12, '#2a2a30'); R(56, 70, 34, 4, '#4a4a52');
        R(0, 96, W, 84, '#2a201c');
        for (let i = 0; i < 700; i++) R(Math.floor(r() * W), 96 + Math.floor(r() * 84), 1 + Math.floor(r() * 2), 1, r() < 0.5 ? '#34281e' : '#1e1612');
      }
    }, true);
  }
  const bgs = {};
  // a number is one of the drawn areas; 'c3' is chapter background 3 (CHAPTER_BG)
  function bg(area) { if (typeof area === 'string' && area[0] === 'c' && chBg[+area.slice(1)]) return chBg[+area.slice(1)]; if (typeof area === 'string') area = 0; return typeof SPR_BG !== 'undefined' ? SPR_BG.bg(area) : (bgs[area] || (bgs[area] = up2(background(area)))); }

  function icon(W, H, fn) { const c = canvas(W, H), g = c.getContext('2d'); fn((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }); return c; }
  const ICONS = {
    crown: () => icon(16, 12, R => { R(2, 5, 12, 5, '#d9b45a'); R(2, 2, 2, 3, '#d9b45a'); R(7, 1, 2, 4, '#d9b45a'); R(12, 2, 2, 3, '#d9b45a'); R(2, 8, 12, 2, '#a8843a'); R(7, 6, 2, 2, '#c8402e'); R(4, 6, 1, 1, '#9af0ff'); R(11, 6, 1, 1, '#9af0ff'); }),
    coin: () => icon(10, 10, R => { R(2, 1, 6, 8, '#c8ccd4'); R(1, 2, 8, 6, '#c8ccd4'); R(3, 2, 3, 6, '#e8ecf0'); R(4, 3, 2, 4, '#9aa0aa'); }),
    shard: () => icon(10, 12, R => { R(4, 0, 2, 2, '#e8d8ff'); R(3, 2, 4, 3, '#b08aff'); R(2, 5, 6, 3, '#8a5ae8'); R(3, 8, 4, 2, '#6a3ac8'); R(4, 10, 2, 2, '#4a2a98'); R(4, 3, 1, 4, '#ffffff'); }),
    stone: () => icon(10, 10, R => { R(2, 2, 6, 6, '#e8743b'); R(1, 3, 8, 4, '#e8743b'); R(3, 1, 4, 8, '#c85a2a'); R(3, 3, 2, 2, '#ffd0a0'); R(6, 6, 2, 2, '#8a3a1a'); }),
  };
  const iconUrls = {};
  function iconUrl(name, k) { const key = name + k; if (iconUrls[key]) return iconUrls[key]; const s = ICONS[name](), c = canvas(s.width * k, s.height * k), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, c.width, c.height); return (iconUrls[key] = c.toDataURL()); }

  return { frame, get, url, bg, iconUrl, preload, isHero, sheet: id => SHEETS[id] || (loadSheet(id), null), loadSheet, BG_W: 480, BG_H: 270, LOOK };
})();
