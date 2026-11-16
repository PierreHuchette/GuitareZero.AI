// Générateur de morceaux originaux pour Guitare Zero.
// Usage : node gen.js <index.html> <sortie.js>
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const js = src.match(/<script>([\s\S]*?)<\/script>/)[1];
const cut = (a, b) => js.slice(js.indexOf(a), js.indexOf(b));
// On réutilise exactement le code de l'appli pour lire une tab et mesurer la difficulté.
(0, eval)('(() => {' + cut('const TAB_BODY', '// ---------- État du jeu') + cut('const clamp01', 'function renderDifficulty') + cut('const ckey', 'function textToGrid') +
  '\nglobalThis.APP = {parseTab, analyzeDifficulty, gridToText};})()');
const {parseTab, analyzeDifficulty, gridToText} = globalThis.APP;

function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const pc = m => ((m % 12) + 12) % 12;
const TUN = {standard: [64, 59, 55, 50, 45, 40], dropd: [64, 59, 55, 50, 45, 38], dropc: [62, 57, 53, 48, 43, 36]};
const TUN_IDS = ['standard', 'dropd', 'halfdown', 'dropc'];
const PENT = [0, 3, 5, 7, 10], BLUES = [0, 3, 5, 6, 7, 10], MIN = [0, 2, 3, 5, 7, 8, 10], PHR = [0, 1, 3, 5, 7, 8, 10], HARM = [0, 2, 3, 5, 7, 8, 11];
const ALL16 = [...Array(16).keys()], EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const RH = [
  [[0, 4, 8, 12], [0, 8, 12], [0, 4, 8], [0, 4, 12], [0, 4, 8, 10], [0, 2, 4, 8]],
  [[0, 2, 4, 8, 10, 12], [0, 4, 6, 8, 12, 14], [0, 2, 4, 6, 8, 12], [0, 4, 8, 10, 12, 14], EIGHTHS, [0, 2, 4, 8, 12, 14], [0, 4, 6, 8, 12]],
  [[0, 2, 3, 4, 6, 8, 10, 11, 12, 14], [0, 1, 2, 4, 6, 7, 8, 10, 12, 14], [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], [0, 2, 4, 6, 8, 9, 10, 11, 12, 14], [0, 3, 6, 8, 11, 14], [0, 2, 4, 5, 6, 8, 10, 12, 13, 14], EIGHTHS],
  [ALL16, [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 14, 15], [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15], [0, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]],
];

// ----- Outils mélodiques -----
function box(tun, root, iv, f0, strings){
  const need = iv.length >= 7 ? 3 : 2, out = [], seen = new Set();
  for(const s of strings){
    const fr = [];
    for(let f = f0; f <= f0 + 3; f++) if(iv.includes(pc(tun[s] + f - root))) fr.push(f);
    for(const f of [f0 - 1, f0 + 4]) if(fr.length < need && f >= 0 && iv.includes(pc(tun[s] + f - root))) fr.push(f);
    for(const f of fr) out.push({s, f, m: tun[s] + f});
  }
  return out.sort((a, b) => a.m - b.m || b.s - a.s).filter(n => !seen.has(n.m) && seen.add(n.m));
}
function stringScale(tun, root, iv, s, lo, hi){
  const out = [];
  for(let f = lo; f <= hi; f++) if(iv.includes(pc(tun[s] + f - root))) out.push({s, f, m: tun[s] + f});
  return out;
}
function walk(r, len, idx, n, maxStep){
  const out = [], steps = maxStep > 1 ? [-2, -1, -1, 1, 1, 2] : [-1, -1, 1, 1, 0];
  for(let i = 0; i < n; i++){ out.push(idx); idx = Math.max(0, Math.min(len - 1, idx + pick(r, steps))); }
  return out;
}
function sequence(r, len, n){
  // Motifs « par trois » ou « par quatre », montants ou descendants : le vocabulaire classique des solos.
  const grp = pick(r, [3, 4]), dir = pick(r, [1, -1]), out = [];
  let base = dir > 0 ? Math.floor(r() * 3) : len - 1 - Math.floor(r() * 3);
  while(out.length < n){
    for(let k = 0; k < grp && out.length < n; k++) out.push(Math.max(0, Math.min(len - 1, base + dir * k)));
    base += dir; if(base < 0 || base > len - 1){ base = dir > 0 ? 0 : len - 1; }
    if(base + dir * (grp - 1) > len - 1 || base + dir * (grp - 1) < 0) base = dir > 0 ? Math.floor(r() * 2) : len - 1 - Math.floor(r() * 2);
  }
  return out;
}
const nearestRoot = (bx, root, from) => { let best = from, bd = 99; bx.forEach((n, i) => { if(pc(n.m - root) === 0 && Math.abs(i - from) < bd){ bd = Math.abs(i - from); best = i; } }); return best; };
const layout = (r, A, A2, B, C, measures) => measures === 4 ? [A, A2, A, B] : [A, A2, A, B, C, A2, C, B];

// Mélodie / riff dans une position (ou le long d'une corde), avec répétition de chaque note en option (trémolo).
function melodic(r, o){
  const bx = o.single != null ? stringScale(o.tun, o.root, o.iv, o.single, 0, o.hi || 12) : box(o.tun, o.root, o.iv, o.f0, o.strings);
  if(bx.length < 4) return null;
  const rep = o.rep || 1;
  const mk = () => {
    const on = rep === 4 ? ALL16 : rep === 2 ? EIGHTHS : pick(r, RH[o.tier]);
    const n = on.length / rep, start = Math.floor(r() * Math.max(1, Math.ceil(bx.length / 2)));
    const ids = (o.tier === 3 && rep === 1 && r() < 0.6) ? sequence(r, bx.length, n) : walk(r, bx.length, start, n, o.maxStep || 2);
    return {on, ids};
  };
  const vary = m => { const ids = m.ids.slice(), k = Math.max(1, Math.round(ids.length / 4)); const re = walk(r, bx.length, ids[ids.length - k], k, 2); for(let i = 0; i < k; i++) ids[ids.length - k + i] = re[i]; return {on: m.on, ids}; };
  const A = mk(), B = mk(), C = mk(), A2 = vary(A);
  const ms = layout(r, A, A2, B, C, o.measures).map(m => ({on: m.on, ids: m.ids.slice()}));
  const last = ms[ms.length - 1]; last.ids[last.ids.length - 1] = nearestRoot(bx, o.root, last.ids[last.ids.length - 1]);
  const notes = [];
  ms.forEach((m, mi) => m.on.forEach((c, j) => { const n = bx[m.ids[Math.floor(j / rep)]]; notes.push({c: mi * 16 + c, s: n.s, f: n.f}); }));
  return notes;
}
// Note pédale sur la corde grave à vide, mélodie sur les cordes au-dessus.
function pedal(r, o){
  const bx = box(o.tun, o.root, o.iv, o.f0, o.mstrings); if(bx.length < 4) return null;
  const masks = o.tier >= 3 ? ['m00m00m0m00m00m0', 'm0m0m0m0m0m0m0m0', 'm00m0m00m00m0m00', 'mm00mm00mm00mm00'] : o.tier === 2 ? ['m0m0m0m0m0m0m0m0', 'm00m00m0m00m00m0', 'm.0.m.0.m.0.m.0.'.replace(/\./g, '0')] : ['m.0.m.0.m.0.m.0.', 'm.0.0.m.0.0.m.0.', 'm.0.m.0.0.m.0.0.'];
  const mk = () => { const mask = pick(r, masks), n = (mask.match(/m/g) || []).length; return {mask, ids: walk(r, bx.length, Math.floor(r() * bx.length), n, 2)}; };
  const vary = m => { const ids = m.ids.slice(); ids[ids.length - 1] = Math.max(0, Math.min(bx.length - 1, ids[ids.length - 1] + pick(r, [-2, -1, 1, 2]))); return {mask: m.mask, ids}; };
  const A = mk(), B = {mask: A.mask, ids: mk().ids.slice(0, A.ids.length)}, C = mk(), A2 = vary(A);
  while(B.ids.length < A.ids.length) B.ids.push(B.ids[B.ids.length - 1] || 0);
  const ms = layout(r, A, A2, B, C, o.measures).map(m => ({mask: m.mask, ids: m.ids.slice()}));
  const last = ms[ms.length - 1]; last.ids[last.ids.length - 1] = nearestRoot(bx, o.root, last.ids[last.ids.length - 1]);
  const notes = [];
  ms.forEach((m, mi) => { let k = 0; [...m.mask].forEach((ch, c) => { if(ch === 'm'){ const n = bx[m.ids[k++]]; notes.push({c: mi * 16 + c, s: n.s, f: n.f}); } else if(ch === '0') notes.push({c: mi * 16 + c, s: 5, f: 0}); }); });
  return notes;
}
// Chug sur la corde grave à vide avec accents en power chords.
function chug(r, o){
  const chord = f => o.drop ? [[5, f], [4, f]] : [[5, f], [4, f + 2]];
  const mk = () => {
    const on = pick(r, RH[o.tier]), nacc = o.tier === 0 ? 1 : o.tier === 1 ? pick(r, [1, 2]) : pick(r, [2, 3]);
    const cand = on.map((_, i) => i).slice(1), acc = new Map();
    for(let k = 0; k < nacc && cand.length; k++){ const i = cand.splice(Math.floor(r() * cand.length), 1)[0]; acc.set(i, pick(r, o.frets)); }
    return {on, acc};
  };
  const vary = m => { const acc = new Map(); for(const [i, f] of m.acc) acc.set(i, pick(r, o.frets.filter(x => x !== f))); return {on: m.on, acc}; };
  const A = mk(), B = mk(), C = mk(), A2 = vary(A), notes = [];
  layout(r, A, A2, B, C, o.measures).forEach((m, mi, arr) => m.on.forEach((c, i) => {
    const lastNote = mi === arr.length - 1 && i === m.on.length - 1;
    if(m.acc.has(i) && !lastNote) for(const [s, f] of chord(m.acc.get(i))) notes.push({c: mi * 16 + c, s, f}); else notes.push({c: mi * 16 + c, s: 5, f: 0});
  }));
  return notes;
}
// Galop : une croche puis deux doubles, la fondamentale change à chaque mesure.
function gallop(r, o){
  const on = o.tier <= 1 ? [0, 2, 3, 4, 8, 10, 11, 12] : [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15];
  const progs = [[0, 0, 3, 5], [0, 3, 0, 1], [0, 5, 3, 1], [0, 0, 1, 3], [0, 3, 5, 3], [0, 1, 0, 5], [0, 7, 5, 3], [0, 5, 7, 8]];
  let p = pick(r, progs); if(o.measures === 8) p = [...p, ...pick(r, progs)];
  const notes = [];
  p.forEach((f, mi) => on.forEach(c => {
    const strong = o.tier >= 2 && c % 4 === 0 && f > 0;
    notes.push({c: mi * 16 + c, s: 5, f}); if(strong) notes.push({c: mi * 16 + c, s: 4, f: o.drop ? f : f + 2});
  }));
  notes.push({c: (p.length - 1) * 16 + 15 + 0, s: 5, f: 0}); // retombe sur la tonique
  const seen = new Set(); return notes.filter(n => { const k = n.c + ',' + n.s; if(seen.has(k)) return false; seen.add(k); return true; }).map(n => n.c === (p.length - 1) * 16 + 15 ? {c: n.c, s: n.s, f: n.s === 5 ? 0 : n.f} : n).filter(n => !(n.c === (p.length - 1) * 16 + 15 && n.s !== 5));
}
// Ligne de basse blues : fondamentale, tierce, quinte, sixte.
function bassWalk(r, o){
  const K = pick(r, [{I: [4, 0], IV: [3, 0], V: [5, 0]}, {I: [5, 0], IV: [4, 0], V: [4, 2]}, {I: [5, 3], IV: [4, 3], V: [4, 5]}]);
  const deg = ([s, f]) => ({R: [s, f], 3: f >= 1 ? [s - 1, f - 1] : [s, f + 4], 5: [s - 1, f + 2], 6: [s - 1, f + 4]});
  const pats = o.tier === 0 ? [['R', '3', '5', '6'], ['R', '5', '6', '5'], ['R', 'R', '5', '5'], ['R', '3', '5', '3']] : [['R', '3', '5', '6', '5', '6', '5', '3'], ['R', 'R', '3', '3', '5', '5', '6', '5'], ['R', '5', '6', '5', 'R', '5', '6', '5']];
  const pat = pick(r, pats), step = o.tier === 0 ? 4 : 2;
  const prog = o.measures === 4 ? pick(r, [['I', 'IV', 'I', 'V'], ['I', 'I', 'IV', 'V'], ['I', 'IV', 'V', 'I']]) : pick(r, [['I', 'I', 'IV', 'I', 'V', 'IV', 'I', 'V'], ['I', 'IV', 'I', 'I', 'IV', 'IV', 'V', 'I']]);
  const notes = [];
  prog.forEach((ch, mi) => pat.forEach((d, i) => { const [s, f] = deg(K[ch])[d]; notes.push({c: mi * 16 + i * step, s, f}); }));
  const l = notes[notes.length - 1]; l.s = K.I[0]; l.f = K.I[1];
  return notes;
}
// Boogie : fondamentale + quinte / sixte en double corde.
function boogie(r, o){
  const K = pick(r, [{I: [4, 0], IV: [3, 0], V: [5, 0]}, {I: [5, 0], IV: [4, 0], V: [4, 2]}, {I: [5, 3], IV: [4, 3], V: [4, 5]}]);
  const pats = o.tier <= 1 ? [[2, 2, 4, 2, 2, 2, 4, 2], [2, 2, 4, 4, 2, 2, 4, 4], [2, 4, 2, 4, 2, 4, 2, 4]] : [[2, 2, 4, 4, 5, 5, 4, 4], [2, 2, 4, 2, 5, 2, 4, 2], [2, 4, 5, 4, 2, 4, 5, 4]];
  const pat = pick(r, pats), on = o.tier === 0 ? [0, 4, 8, 12] : EIGHTHS;
  const prog = o.measures === 4 ? pick(r, [['I', 'IV', 'I', 'V'], ['I', 'I', 'IV', 'V']]) : pick(r, [['I', 'I', 'IV', 'I', 'V', 'IV', 'I', 'V'], ['I', 'IV', 'I', 'I', 'IV', 'IV', 'V', 'I']]);
  const notes = [];
  prog.forEach((ch, mi) => on.forEach((c, i) => { const [s, f] = K[ch]; notes.push({c: mi * 16 + c, s, f}, {c: mi * 16 + c, s: s - 1, f: f + pat[i % pat.length]}); }));
  return notes;
}
// Suite de power chords.
function power(r, o){
  const K = pick(r, [
    {ch: {A: [4, 0], C: [4, 3], D: [4, 5], E: [5, 0], F: [5, 1], G: [5, 3]}, progs: [['A', 'G', 'F', 'G'], ['A', 'C', 'D', 'A'], ['A', 'F', 'G', 'A'], ['A', 'C', 'G', 'D'], ['A', 'G', 'D', 'A']], home: 'A'},
    {ch: {E: [5, 0], G: [5, 3], A: [5, 5], B: [4, 2], C: [4, 3], D: [4, 5]}, progs: [['E', 'G', 'A', 'E'], ['E', 'C', 'D', 'E'], ['E', 'D', 'C', 'B'], ['E', 'G', 'D', 'A'], ['E', 'A', 'B', 'E']], home: 'E'},
    {ch: {G: [5, 3], B: [5, 6], C: [4, 3], D: [4, 5], F: [5, 1], E: [4, 7]}, progs: [['G', 'F', 'C', 'G'], ['G', 'C', 'D', 'G'], ['G', 'B', 'C', 'D'], ['G', 'D', 'C', 'G']], home: 'G'}]);
  let prog = pick(r, K.progs); if(o.measures === 8) prog = [...prog, ...pick(r, K.progs)];
  const on = pick(r, RH[o.tier]), on2 = pick(r, RH[o.tier]), notes = [];
  prog.forEach((name, mi) => (mi % 2 ? on2 : on).forEach((c, i, arr) => {
    const lastNote = mi === prog.length - 1 && i === arr.length - 1;
    const [s, f] = K.ch[lastNote ? K.home : name]; notes.push({c: mi * 16 + c, s, f}, {c: mi * 16 + c, s: s - 1, f: f + 2});
  }));
  return notes;
}
// Deux voix à la tierce, sur deux cordes voisines (accordage Drop C : cordes Do et Fa).
function harmony(r, o){
  const sc = stringScale(o.tun, o.root, o.iv, 3, 0, 12), all = [];
  for(let m = o.tun[3]; m <= o.tun[3] + 24; m++) if(o.iv.includes(pc(m - o.root))) all.push(m);
  const mk = () => { const on = pick(r, RH[o.tier]); return {on, ids: walk(r, sc.length, 1 + Math.floor(r() * 3), on.length, 1)}; };
  const vary = m => { const ids = m.ids.slice(); ids[ids.length - 1] = Math.max(0, Math.min(sc.length - 1, ids[ids.length - 1] + pick(r, [-1, 1, 2]))); return {on: m.on, ids}; };
  const A = mk(), B = mk(), C = mk(), A2 = vary(A), notes = [];
  const ms = layout(r, A, A2, B, C, o.measures).map(m => ({on: m.on, ids: m.ids.slice()}));
  const last = ms[ms.length - 1]; last.ids[last.ids.length - 1] = nearestRoot(sc, o.root, last.ids[last.ids.length - 1]);
  ms.forEach((m, mi) => m.on.forEach((c, j) => {
    const n = sc[m.ids[j]], third = all[all.indexOf(n.m) + 2], f2 = third - o.tun[2];
    notes.push({c: mi * 16 + c, s: 3, f: n.f}); if(f2 >= 0 && f2 <= 12) notes.push({c: mi * 16 + c, s: 2, f: f2});
  }));
  return notes;
}

// ----- Répertoire par genre -----
const E = 4, A_ = 9, G_ = 7, D_ = 2, C_ = 0;
const GENRES = [
  {style: 0, code: 'rb', suffix: ['du garage', 'de minuit', 'du bitume', 'du comptoir', 'du vieux pick-up', 'de la route 9', 'du juke-box', 'de la station-service', 'du dimanche', 'des docks', 'du bayou', 'de la voie ferrée', 'du motel', 'de l\'atelier', 'du samedi soir', 'de la dernière séance', 'du parking', 'des grands lacs', 'de la plaine', 'du delta', 'du vieux port', 'de l\'usine', 'du néon rouge', 'de la pluie', 'du diner', 'de la caravane', 'du terrain vague', 'de la casse', 'du ferry', 'de la poussière', 'de l\'autoroute', 'du petit matin', 'du zinc', 'de la fumée', 'du canal', 'de la grande roue', 'du dernier train', 'des faubourgs'],
    tpl: [
      {names: ['Walking', 'Balade'], tiers: [0, 1], tuning: 'standard', make: (r, t, m) => bassWalk(r, {tier: t, measures: m})},
      {names: ['Boogie', 'Shuffle'], tiers: [0, 1, 2], tuning: 'standard', make: (r, t, m) => boogie(r, {tier: t, measures: m})},
      {names: ['Riff', 'Rock'], tiers: [0, 1, 2, 3], tuning: 'standard', make: (r, t, m) => { const k = pick(r, [[A_, 5], [E, 0], [G_, 3], [E, 12]]); return melodic(r, {tun: TUN.standard, root: k[0], iv: pick(r, [PENT, PENT, BLUES]), f0: k[1], strings: t <= 1 ? [5, 4, 3] : [5, 4, 3, 2], tier: t, measures: m, maxStep: t <= 1 ? 1 : 2}); }},
      {names: ['Refrain', 'Cavalcade'], tiers: [0, 1, 2], tuning: 'standard', make: (r, t, m) => power(r, {tier: t, measures: m})},
      {names: ['Solo', 'Blues'], tiers: [1, 2, 3], tuning: 'standard', make: (r, t, m) => { const k = pick(r, [[A_, 5], [A_, 8], [E, 12], [G_, 3], [D_, 10]]); return melodic(r, {tun: TUN.standard, root: k[0], iv: pick(r, [PENT, BLUES]), f0: k[1], strings: [3, 2, 1, 0], tier: t, measures: m}); }},
    ]},
  {style: 1, code: 'mt', suffix: ['d\'acier', 'de fer', 'des forges', 'de plomb', 'du tonnerre', 'du titan', 'des ruines', 'du bourreau', 'de la fonderie', 'du haut fourneau', 'des enfers', 'de minuit', 'du blindé', 'des catacombes', 'du volcan', 'de la tempête', 'du colosse', 'de l\'arène', 'des damnés', 'du bûcher', 'de bronze', 'du rempart', 'de la meute', 'du brasier', 'de l\'abîme', 'du minotaure', 'des légions', 'du cyclope', 'de la horde', 'du donjon', 'de soufre', 'de l\'orage', 'du cratère', 'des titans', 'de granit', 'du bélier', 'de la citadelle', 'du fléau'],
    tpl: [
      {names: ['Marche', 'Procession'], tiers: [0, 1], tun: r => pick(r, ['standard', 'dropd']), make: (r, t, m, tn) => melodic(r, {tun: TUN[tn], root: pc(TUN[tn][5]), iv: pick(r, [PHR, MIN]), f0: 0, strings: [5, 4], tier: t, measures: m, maxStep: 1})},
      {names: ['Marteau', 'Enclume'], tiers: [0, 1, 2], tun: r => pick(r, ['standard', 'dropd']), make: (r, t, m, tn) => chug(r, {tier: t, measures: m, drop: tn === 'dropd', frets: [1, 3, 5, 7, 8]})},
      {names: ['Galop', 'Charge'], tiers: [1, 2, 3], tun: r => pick(r, ['standard', 'dropd']), make: (r, t, m, tn) => gallop(r, {tier: t, measures: m, drop: tn === 'dropd'})},
      {names: ['Lame', 'Scie'], tiers: [1, 2, 3], tun: r => pick(r, ['standard', 'dropd']), make: (r, t, m, tn) => melodic(r, {tun: TUN[tn], root: pc(TUN[tn][5]), iv: pick(r, [PHR, MIN, HARM]), single: pick(r, [5, 5, 4]), hi: 12, tier: t, measures: m, rep: t === 1 ? 2 : 4, maxStep: 1})},
      {names: ['Engrenage', 'Mécanique'], tiers: [1, 2, 3], tun: () => 'standard', make: (r, t, m) => pedal(r, {tun: TUN.standard, root: E, iv: pick(r, [MIN, PHR, HARM]), f0: pick(r, [2, 5, 7]), mstrings: [4, 3], tier: t, measures: m})},
      {names: ['Éclair', 'Foudre'], tiers: [2, 3], tun: () => 'standard', make: (r, t, m) => melodic(r, {tun: TUN.standard, root: E, iv: pick(r, [MIN, HARM, PHR]), f0: pick(r, [7, 12, 5]), strings: [3, 2, 1, 0], tier: t, measures: m})},
    ]},
  {style: 2, code: 'md', suffix: ['du nord', 'des cendres', 'du fjord', 'de givre', 'des corbeaux', 'du dernier hiver', 'des abysses', 'de l\'exil', 'du crépuscule', 'des loups', 'de la toundra', 'des runes', 'du solstice', 'de la mer gelée', 'des âmes perdues', 'du glacier', 'de l\'aube pâle', 'des ombres', 'du néant', 'de la forêt noire', 'des étoiles mortes', 'du brouillard', 'de l\'hiver sans fin', 'des marées', 'du drakkar', 'de la lande', 'des neiges', 'du vent du nord', 'de la nuit polaire', 'des falaises', 'du royaume oublié', 'de la lune rouge', 'des brumes', 'du grand froid', 'de l\'île déserte', 'des tertres', 'du rivage gris', 'de la dernière aurore'],
    tpl: [
      {names: ['Chant', 'Complainte'], tiers: [0, 1, 2], tun: () => 'dropc', make: (r, t, m) => r() < 0.5 ? melodic(r, {tun: TUN.dropc, root: C_, iv: pick(r, [MIN, HARM]), single: 3, hi: 10, tier: t, measures: m, maxStep: 1}) : melodic(r, {tun: TUN.dropc, root: C_, iv: MIN, f0: pick(r, [0, 2, 5]), strings: [3, 2], tier: t, measures: m, maxStep: 1})},
      {names: ['Hymne', 'Chœur'], tiers: [0, 1, 2], tun: () => 'dropc', make: (r, t, m) => harmony(r, {tun: TUN.dropc, root: C_, iv: pick(r, [MIN, HARM]), tier: t, measures: m})},
      {names: ['Assaut', 'Marche'], tiers: [0, 1, 2], tun: () => 'dropc', make: (r, t, m) => chug(r, {tier: t, measures: m, drop: true, frets: [2, 3, 5, 7, 8, 10]})},
      {names: ['Tempête', 'Tourmente'], tiers: [1, 2, 3], tun: () => 'dropc', make: (r, t, m) => pedal(r, {tun: TUN.dropc, root: C_, iv: pick(r, [MIN, HARM]), f0: pick(r, [0, 3, 5, 7]), mstrings: [4, 3], tier: t, measures: m})},
      {names: ['Blizzard', 'Requiem'], tiers: [1, 2, 3], tun: () => 'dropc', make: (r, t, m) => melodic(r, {tun: TUN.dropc, root: C_, iv: pick(r, [MIN, HARM]), single: pick(r, [3, 3, 4]), hi: 12, tier: t, measures: m, rep: t === 1 ? 2 : 4, maxStep: 1})},
      {names: ['Chevauchée'], tiers: [1, 2, 3], tun: () => 'dropc', make: (r, t, m) => gallop(r, {tier: t, measures: m, drop: true})},
      {names: ['Aurore', 'Comète'], tiers: [2, 3], tun: () => 'dropc', make: (r, t, m) => melodic(r, {tun: TUN.dropc, root: C_, iv: pick(r, [MIN, HARM]), f0: pick(r, [5, 7, 10]), strings: [3, 2, 1, 0], tier: t, measures: m})},
    ]},
];
const QUOTA = [20, 10, 10, 10], BPM = [[60, 110], [70, 130], [80, 160], [100, 200]];
const bucket = s => s <= 2 ? 0 : s <= 4 ? 1 : s <= 6 ? 2 : 3;
const b36 = (n, w) => n.toString(36).padStart(w, '0');
const out = [], titles = new Set(), sigs = new Set(), stats = [];
for(const g of GENRES){
  for(let lvl = 0; lvl < 4; lvl++){
    let made = 0, tries = 0, ti = lvl;
    while(made < QUOTA[lvl] && tries++ < 6000){
      const seed = (g.style + 1) * 100000 + lvl * 10000 + tries, r = rng(seed);
      const cands = g.tpl.filter(t => t.tiers.includes(lvl) || (r() < 0.25 && t.tiers.includes(lvl - 1)));
      if(!cands.length) continue;
      const tp = cands[(ti++) % cands.length];
      const tier = tp.tiers.includes(lvl) ? lvl : lvl - 1;
      const tn = tp.tun ? tp.tun(r) : tp.tuning, measures = tier >= 2 ? pick(r, [4, 8, 8]) : 4;
      let notes = tp.make(r, tier, measures, tn); if(!notes || notes.length < 6) continue;
      if(notes.some(n => n.f < 0 || n.f > 24 || n.s < 0 || n.s > 5)) continue;
      const cells = {}; for(const n of notes) cells[n.s + ',' + n.c] = n.f;
      const sig = Object.keys(cells).sort().map(k => k + '=' + cells[k]).join(';'); if(sigs.has(sig)) continue;
      const low = notes.filter(n => n.s === 5).sort((a, b) => a.c - b.c).map(n => n.f).join(','); if(low.includes('0,3,5,0,3,6,5')) continue;
      const gt = gridToText({cpb: 4, measures, cells}), parsed = parseTab(gt.text);
      const ok = [];
      for(let bpm = BPM[lvl][0]; bpm <= BPM[lvl][1]; bpm += 5){ const d = analyzeDifficulty(parsed, bpm, gt.cpb); if(d && bucket(d.score) === lvl) ok.push([bpm, d.score]); }
      if(!ok.length) continue;
      const [bpm, score] = ok[Math.floor(r() * ok.length)];
      let title = null; for(let k = 0; k < 60 && !title; k++){ const c = pick(r, tp.names) + ' ' + pick(r, g.suffix); if(!titles.has(c)) title = c; } if(!title) continue;
      titles.add(title); sigs.add(sig); made++;
      const enc = Object.keys(cells).map(k => { const [s, c] = k.split(',').map(Number); return [c, s, cells[k]]; }).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([c, s, f]) => b36(c, 2) + s + b36(f, 1)).join('');
      out.push(['g' + g.code + lvl + '-' + String(made).padStart(2, '0'), title, g.style, bpm, TUN_IDS.indexOf(tn), measures, enc].join('|'));
      stats.push({g: g.code, lvl, score, bpm, n: notes.length, title});
    }
    if(made < QUOTA[lvl]) console.error('MANQUE', g.code, lvl, made);
  }
}
fs.writeFileSync(process.argv[3], '// 150 morceaux originaux générés pour Guitare Zero : id|titre|style|bpm|accordage|mesures|notes (colonne sur 2, corde, frette en base 36)\nconst GEN = [\n' + out.map(l => '  ' + JSON.stringify(l) + ',').join('\n') + '\n];\n');
const sum = {}; for(const s of stats){ const k = s.g + s.lvl; (sum[k] = sum[k] || []).push(s.score + '@' + s.bpm); }
console.log(Object.entries(sum).map(([k, v]) => k + ' (' + v.length + '): ' + v.join(' ')).join('\n'));
console.log('octets', fs.statSync(process.argv[3]).size, '| ex:', stats.filter((_, i) => i % 17 === 0).map(s => s.title).join(' ; '));
