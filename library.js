/* OMAR CIRCUIT LAB — component definitions (symbols, pins, parameters, simulation builders) and the parts catalog */
'use strict';
(() => {
const NS = '—'; // not specified marker
const W = OCL.wave = {};
W.ecg = (t, bpm = 72) => { // synthetic ECG (sum of Gaussians, normalised so R ≈ 1)
  const ph = ((t * bpm / 60) % 1 + 1) % 1, g = (a, m, w) => a * Math.exp(-((ph - m) ** 2) / (2 * w * w));
  return g(0.12, 0.2, 0.025) + g(-0.14, 0.355, 0.009) + g(1.0, 0.38, 0.011) + g(-0.24, 0.41, 0.011) + g(0.3, 0.66, 0.045);
};
W.ppg = (t, bpm = 72) => { const ph = ((t * bpm / 60) % 1 + 1) % 1, g = (a, m, w) => a * Math.exp(-((ph - m) ** 2) / (2 * w * w)); return g(1, 0.22, 0.07) + g(0.38, 0.5, 0.06); };
W.fn = p => {
  const A = +p.amp, f = +p.freq, off = +(p.offset || 0), duty = (+p.duty || 50) / 100;
  switch (p.wave) {
    case 'square': return t => off + (((t * f) % 1) < 0.5 ? A : -A);
    case 'pulse': return t => off + (((t * f) % 1) < duty ? A : 0);
    case 'triangle': return t => { const ph = (t * f) % 1; return off + A * (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph); };
    case 'dc': return () => off + A;
    default: return t => off + A * Math.sin(2 * Math.PI * f * t);
  }
};
const sig = x => 1 / (1 + Math.exp(-Math.max(-60, Math.min(60, x))));

/* --- symbol primitives --- */
const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const T = (x, y, s, a = 'middle', cls = 'st') => `<text x="${x}" y="${y}" text-anchor="${a}" class="${cls}">${s}</text>`;
const zig = `<path d="M-40 0H-24L-21-7-15 7-9-7-3 7 3-7 9 7 15-7 21 7 24 0H40"/>`;
const box2 = (lbl) => `${L(-40, 0, -22, 0)}${L(22, 0, 40, 0)}<rect x="-22" y="-9" width="44" height="18" rx="2"/>${lbl ? T(0, 4, lbl) : ''}`;
const diodeBody = `${L(-40, 0, -10, 0)}${L(10, 0, 40, 0)}<path d="M-10-11V11L10 0Z" class="fillc"/>`;
const arrowsOut = `<path d="M2-14l8-9m-4 0h4v4M10-12l8-9m-4 0h4v4" class="thin"/>`;
const arrowsIn = `<path d="M18-24l-8 9m4 0h-4v-4M10-26l-8 9m4 0h-4v-4" class="thin"/>`;
const circle = (r = 20) => `<circle cx="0" cy="0" r="${r}"/>`;
const vleads = `${L(0, -40, 0, -20)}${L(0, 20, 0, 40)}`;
const hleads = `${L(-40, 0, -20, 0)}${L(20, 0, 40, 0)}`;
const triangle = `<path d="M-40-40V40L40 0Z"/>${L(-60, -20, -40, -20)}${L(-60, 20, -40, 20)}${L(40, 0, 60, 0)}`;
const blockSym = (w, h, pins, title) => `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4" class="ic"/>` +
  pins.map(p => {
    const inX = Math.max(-w / 2, Math.min(w / 2, p.x)), inY = Math.max(-h / 2, Math.min(h / 2, p.y));
    const lx = p.x < -w / 2 ? inX + 4 : p.x > w / 2 ? inX - 4 : p.x, ly = p.y < -h / 2 ? inY + 12 : p.y > h / 2 ? inY - 5 : p.y + 3;
    const an = p.x < -w / 2 ? 'start' : p.x > w / 2 ? 'end' : 'middle';
    return L(p.x, p.y, inX, inY) + T(lx, ly, p.name || p.id, an, 'pl');
  }).join('') + T(0, 4, title, 'middle', 'st b');
const autoPins = (names) => { // generic block: half left, half right
  const n = names.length, left = Math.ceil(n / 2), right = n - left, ys = k => Array.from({ length: k }, (_, i) => (i - Math.floor((k - 1) / 2)) * 20);
  const yl = ys(left), yr = ys(right), h = 2 * Math.max(...yl.map(Math.abs), ...yr.map(Math.abs), 0) + 40;
  return { h, pins: names.map((nm, i) => i < left ? { id: nm, name: nm, x: -60, y: yl[i] } : { id: nm, name: nm, x: 60, y: yr[i - left] }) };
};

/* --- prop helpers --- */
const num = (k, label, def, unit = '', extra = {}) => ({ k, label, def, unit, type: 'num', ...extra });
const sel = (k, label, def, opts) => ({ k, label, def, type: 'sel', opts });
const bool = (k, label, def) => ({ k, label, def, type: 'bool' });
const LEDV = { red: 1.9, green: 2.1, yellow: 2.0, blue: 3.0, white: 3.1, infrared: 1.3 };
const LEDC = { red: '#ff3b3b', green: '#36e27a', yellow: '#ffd23b', blue: '#3b8bff', white: '#f4f7ff', infrared: '#b14bff' };
const isFrom = (vf, i, n) => i / Math.exp(vf / (n * 0.025852));

const D = OCL.defs = {};
const def = (type, o) => { D[type] = Object.assign({ type, sim: 'full', props: [], fp: 'none', m3d: 'box', prefix: 'U', box: [80, 40] }, o); };

/* ===== PASSIVES ===== */
def('resistor', { name: 'Resistor', cat: 'Passive', prefix: 'R', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
  props: [num('R', 'Resistance', 1000, 'Ω'), num('P', 'Power rating', 0.25, 'W'), num('tol', 'Tolerance', 5, '%')],
  symbol: () => zig, value: c => OCL.fmt(c.props.R, 'Ω'), fp: 'axial', m3d: 'resistor',
  build: (c, N, P) => [P.R(N('1'), N('2'), Math.max(1e-3, c.props.R))] });
def('pot', { name: 'Potentiometer', cat: 'Passive', prefix: 'RV', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }, { id: 'W', x: 0, y: 40, name: 'wiper' }],
  props: [num('R', 'Total resistance', 10000, 'Ω'), num('pos', 'Wiper position (0–1)', 0.5), num('P', 'Power rating', 0.25, 'W')],
  symbol: () => zig + `${L(0, 40, 0, 14)}<path d="M-5 20L0 11 5 20Z" class="fillc"/>`, value: c => OCL.fmt(c.props.R, 'Ω') + ' @' + Math.round(c.props.pos * 100) + '%', fp: 'pot3', m3d: 'pot',
  build: (c, N, P) => { const p = OCL.clamp(+c.props.pos, 0, 1); return [P.R(N('1'), N('W'), Math.max(0.1, c.props.R * p)), P.R(N('W'), N('2'), Math.max(0.1, c.props.R * (1 - p)))]; } });
def('capacitor', { name: 'Capacitor (non-polarised)', cat: 'Passive', prefix: 'C', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
  props: [num('C', 'Capacitance', 100e-9, 'F'), num('Vmax', 'Voltage rating', 50, 'V')],
  symbol: () => `${L(-40, 0, -5, 0)}${L(5, 0, 40, 0)}${L(-5, -14, -5, 14)}${L(5, -14, 5, 14)}`, value: c => OCL.fmt(c.props.C, 'F'), fp: 'radial2', m3d: 'cap_ceramic',
  build: (c, N, P) => [P.C(N('1'), N('2'), c.props.C)] });
def('cap_e', { name: 'Electrolytic capacitor', cat: 'Passive', prefix: 'C', polar: true, pins: [{ id: '+', x: -40, y: 0 }, { id: '-', x: 40, y: 0 }],
  props: [num('C', 'Capacitance', 100e-6, 'F'), num('Vmax', 'Voltage rating', 25, 'V')],
  symbol: () => `${L(-40, 0, -5, 0)}${L(6, 0, 40, 0)}${L(-5, -14, -5, 14)}<path d="M10-14Q2 0 10 14"/>${T(-16, -10, '+')}`, value: c => OCL.fmt(c.props.C, 'F') + ' ' + c.props.Vmax + 'V', fp: 'radial5', m3d: 'cap_e',
  build: (c, N, P) => [P.C(N('+'), N('-'), c.props.C)] });
def('inductor', { name: 'Inductor', cat: 'Passive', prefix: 'L', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
  props: [num('L', 'Inductance', 10e-3, 'H'), num('Rdc', 'DC resistance', 0.5, 'Ω'), num('Imax', 'Current rating', 1, 'A')],
  symbol: () => `<path d="M-40 0H-24a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0H40"/>`, value: c => OCL.fmt(c.props.L, 'H'), fp: 'radial5', m3d: 'inductor',
  build: (c, N, P) => { const m = N.int(); return [P.L(N('1'), m, c.props.L), P.R(m, N('2'), Math.max(1e-3, c.props.Rdc))]; } });
def('transformer', { name: 'Transformer (ideal)', cat: 'Passive', prefix: 'T', box: [80, 80], pins: [{ id: 'P1', x: -40, y: -40 }, { id: 'P2', x: -40, y: 40 }, { id: 'S1', x: 40, y: -40 }, { id: 'S2', x: 40, y: 40 }],
  props: [num('ratio', 'Turns ratio Np:Ns', 19.2), num('VA', 'VA rating', 10, 'VA')],
  symbol: () => `<path d="M-40-40H-20V-24a8 8 0 0 1 0 16a8 8 0 0 1 0 16a8 8 0 0 1 0 16V40H-40M40-40H20V-24a8 8 0 0 0 0 16a8 8 0 0 0 0 16a8 8 0 0 0 0 16V40H40"/>${L(-4, -30, -4, 30)}${L(4, -30, 4, 30)}`,
  value: c => c.props.ratio + ':1', fp: 'xfmr', m3d: 'transformer', model: 'Ideal transformer: no magnetising inductance or losses — it will also pass DC, unlike a real transformer.',
  build: (c, N, P) => [P.X(N('P1'), N('P2'), N('S1'), N('S2'), Math.max(1e-6, c.props.ratio))] });
def('fuse', { name: 'Fuse', cat: 'Power', prefix: 'F', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
  props: [num('I', 'Current rating', 0.5, 'A'), num('R', 'Cold resistance', 0.1, 'Ω')],
  symbol: () => box2('') + L(-22, 0, 22, 0), value: c => OCL.fmt(c.props.I, 'A'), fp: 'axial', m3d: 'fuse',
  build: (c, N, P) => [P.R(N('1'), N('2'), Math.max(1e-3, c.props.R))] });
def('switch', { name: 'Switch (SPST)', cat: 'Passive', prefix: 'SW', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
  props: [bool('closed', 'Closed', true)], interactive: true,
  symbol: c => `${L(-40, 0, -16, 0)}${L(16, 0, 40, 0)}<circle cx="-16" cy="0" r="2.5" class="fillc"/><circle cx="16" cy="0" r="2.5" class="fillc"/>${c && c.props.closed ? L(-16, 0, 16, -2) : L(-16, 0, 14, -16)}`,
  value: c => c.props.closed ? 'closed' : 'open', fp: 'header2', m3d: 'switch',
  build: (c, N, P) => [P.R(N('1'), N('2'), c.props.closed ? 0.01 : 1e9)] });
def('lamp', { name: 'Lamp / resistive load', cat: 'Passive', prefix: 'LP', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
  props: [num('V', 'Rated voltage', 12, 'V'), num('P', 'Rated power', 5, 'W')],
  symbol: () => hleads + circle() + `<path d="M-14-14L14 14M14-14L-14 14" class="thin"/>`, value: c => c.props.V + 'V ' + c.props.P + 'W', fp: 'header2', m3d: 'box',
  build: (c, N, P) => [P.R(N('1'), N('2'), Math.max(0.01, c.props.V ** 2 / c.props.P))] });
def('ntc', { name: 'NTC thermistor', cat: 'Sensors', prefix: 'TH', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
  props: [num('R25', 'R at 25 °C', 10000, 'Ω'), num('B', 'Beta (B25/85)', 3950, 'K'), num('T', 'Temperature', 37, '°C'), num('P', 'Power rating', 0.1, 'W')],
  symbol: () => box2('') + `<path d="M-26 14L-14 14 18-14" class="thin"/>${T(-24, 26, 't°', 'middle', 'pl')}`, value: c => c.props.T + '°C', fp: 'radial2', m3d: 'cap_ceramic',
  rOf: c => c.props.R25 * Math.exp(c.props.B * (1 / (c.props.T + 273.15) - 1 / 298.15)),
  build: (c, N, P) => [P.R(N('1'), N('2'), D.ntc.rOf(c))] });
def('ldr', { name: 'Photoresistor (LDR)', cat: 'Sensors', prefix: 'LDR', pins: [{ id: '1', x: -40, y: 0 }, { id: '2', x: 40, y: 0 }],
  props: [num('R10', 'R at 10 lux', 20000, 'Ω'), num('gamma', 'Gamma', 0.7), num('lux', 'Illuminance', 100, 'lx')],
  symbol: () => box2('') + arrowsIn, value: c => c.props.lux + ' lx', fp: 'radial2', m3d: 'cap_ceramic', model: 'Power-law LDR: R = R10·(lux/10)^−γ (educational).',
  build: (c, N, P) => [P.R(N('1'), N('2'), c.props.R10 * Math.pow(Math.max(0.01, c.props.lux) / 10, -c.props.gamma))] });
def('motor', { name: 'DC motor (R–L model)', cat: 'Power', prefix: 'M', pins: [{ id: '+', x: -40, y: 0 }, { id: '-', x: 40, y: 0 }],
  props: [num('Ra', 'Armature resistance', 8, 'Ω'), num('La', 'Armature inductance', 2e-3, 'H'), num('Irated', 'Rated current', 0.5, 'A')],
  symbol: () => hleads + circle() + T(0, 5, 'M', 'middle', 'st b'), value: c => OCL.fmt(c.props.Ra, 'Ω'), fp: 'header2', m3d: 'motor', inductive: true, model: 'Stalled-rotor model (no back-EMF) — conservative for driver current sizing.',
  build: (c, N, P) => { const m = N.int(); return [P.R(N('+'), m, Math.max(0.01, c.props.Ra)), P.L(m, N('-'), c.props.La)]; } });

/* ===== SEMICONDUCTORS ===== */
const dModel = c => ({ Is: isFrom(+c.props.Vf || 0.7, 0.01, +c.props.n || 1.8), n: +c.props.n || 1.8, Bv: c.props.Vz ? +c.props.Vz : 0 });
def('diode', { name: 'Diode', cat: 'Semiconductors', prefix: 'D', polar: true, pins: [{ id: 'A', x: -40, y: 0 }, { id: 'K', x: 40, y: 0 }],
  props: [num('Vf', 'Forward voltage @10 mA', 0.75, 'V'), num('n', 'Ideality factor', 1.8), num('Imax', 'Max avg. forward current', 1, 'A'), num('Vrrm', 'Max reverse voltage', 1000, 'V')],
  symbol: () => diodeBody + L(10, -11, 10, 11), value: () => '', fp: 'axial', m3d: 'diode',
  build: (c, N, P) => [P.D(N('A'), N('K'), dModel(c))] });
def('zener', { name: 'Zener diode', cat: 'Semiconductors', prefix: 'D', polar: true, pins: [{ id: 'A', x: -40, y: 0 }, { id: 'K', x: 40, y: 0 }],
  props: [num('Vz', 'Zener voltage', 5.1, 'V'), num('Vf', 'Forward voltage @10 mA', 0.75, 'V'), num('n', 'Ideality factor', 1.8), num('Pmax', 'Power rating', 1, 'W'), num('Imax', 'Max current', 0.178, 'A')],
  symbol: () => diodeBody + `<path d="M6-11L10-11 10 11 14 11"/>`, value: c => c.props.Vz + 'V', fp: 'axial', m3d: 'diode',
  build: (c, N, P) => [P.D(N('A'), N('K'), dModel(c))] });
def('led', { name: 'LED', cat: 'Semiconductors', prefix: 'D', polar: true, pins: [{ id: 'A', x: -40, y: 0 }, { id: 'K', x: 40, y: 0 }],
  props: [sel('color', 'Colour', 'red', Object.keys(LEDV)), num('Imax', 'Max forward current', 0.02, 'A'), num('Vr', 'Max reverse voltage', 5, 'V')],
  symbol: c => `${L(-40, 0, -10, 0)}${L(10, 0, 40, 0)}<path d="M-10-11V11L10 0Z" style="fill:${LEDC[c ? c.props.color : 'red']};fill-opacity:.85"/>${L(10, -11, 10, 11)}${arrowsOut}`,
  value: c => c.props.color, fp: 'led5', m3d: 'led', ledColor: c => LEDC[c.props.color] || '#f33',
  build: (c, N, P) => [P.D(N('A'), N('K'), { Is: isFrom(LEDV[c.props.color] || 2, 0.01, 2), n: 2, Bv: 0 })] });
def('photodiode', { name: 'Photodiode', cat: 'Sensors', prefix: 'PD', polar: true, pins: [{ id: 'A', x: -40, y: 0 }, { id: 'K', x: 40, y: 0 }],
  props: [num('Iph', 'Mean photocurrent', 10e-6, 'A'), sel('mode', 'Light signal', 'ppg', ['dc', 'ppg']), num('pi', 'Pulsatile fraction (AC/DC)', 0.02), num('bpm', 'Heart rate', 72, 'bpm')],
  symbol: () => diodeBody + L(10, -11, 10, 11) + arrowsIn, value: c => OCL.fmt(c.props.Iph, 'A'), fp: 'led5', m3d: 'led', model: 'Photocurrent source (cathode→anode inside device) in parallel with a junction diode. PPG mode modulates light with a synthetic pulse wave.',
  build: (c, N, P) => { const p = c.props; const f = p.mode === 'ppg' ? t => p.Iph * (1 - p.pi / 2 + p.pi * W.ppg(t, p.bpm)) : () => p.Iph; return [P.I(N('K'), N('A'), f), P.D(N('A'), N('K'), { Is: 1e-12, n: 1.5, Bv: 0 })]; } });
const bjtSym = pnp => `<circle cx="6" cy="0" r="25" class="thin"/>${L(-40, 0, -8, 0)}${L(-8, -14, -8, 14)}` +
  (pnp ? `${L(-8, -7, 20, -24)}${L(20, -24, 20, -40)}${L(-8, 7, 20, 24)}${L(20, 24, 20, 40)}<path d="M-2-12L-8-7 0-6Z" class="fillc"/>`
       : `${L(-8, -7, 20, -24)}${L(20, -24, 20, -40)}${L(-8, 7, 20, 24)}${L(20, 24, 20, 40)}<path d="M20 24L11 23 15 17Z" class="fillc"/>`);
def('npn', { name: 'NPN transistor', cat: 'Semiconductors', prefix: 'Q', box: [60, 80], pins: [{ id: 'B', x: -40, y: 0 }, { id: 'C', x: 20, y: -40 }, { id: 'E', x: 20, y: 40 }],
  props: [num('bf', 'Current gain β (hFE)', 150), num('Is', 'Saturation current', 1e-14, 'A'), num('Vceo', 'Vceo max', 40, 'V'), num('Icmax', 'Ic max', 0.6, 'A'), num('Pd', 'Power dissipation', 0.625, 'W')],
  symbol: () => bjtSym(false), value: c => 'β=' + c.props.bf, fp: 'to92', m3d: 'to92', pinKind: { B: 'in' },
  build: (c, N, P) => [P.Q(N('C'), N('B'), N('E'), { Is: +c.props.Is, bf: +c.props.bf, br: 2 }, false)] });
def('pnp', { name: 'PNP transistor', cat: 'Semiconductors', prefix: 'Q', box: [60, 80], pins: [{ id: 'B', x: -40, y: 0 }, { id: 'E', x: 20, y: -40 }, { id: 'C', x: 20, y: 40 }],
  props: [num('bf', 'Current gain β (hFE)', 150), num('Is', 'Saturation current', 1e-14, 'A'), num('Vceo', '|Vceo| max', 40, 'V'), num('Icmax', '|Ic| max', 0.2, 'A'), num('Pd', 'Power dissipation', 0.625, 'W')],
  symbol: () => bjtSym(true), value: c => 'β=' + c.props.bf, fp: 'to92', m3d: 'to92', pinKind: { B: 'in' },
  build: (c, N, P) => [P.Q(N('C'), N('B'), N('E'), { Is: +c.props.Is, bf: +c.props.bf, br: 2 }, true)] });
const mosSym = p => `${L(-40, 0, -12, 0)}${L(-12, -16, -12, 16)}${L(-6, -18, -6, -8)}${L(-6, -5, -6, 5)}${L(-6, 8, -6, 18)}${L(-6, -13, 20, -13)}${L(20, -13, 20, -40)}${L(-6, 13, 20, 13)}${L(20, 13, 20, 40)}${L(-6, 0, 20, 0)}${L(20, 0, 20, 13)}` + (p ? `<path d="M6 0L-1-4V4Z" class="fillc"/>` : `<path d="M-6 0L2-4V4Z" class="fillc"/>`);
def('nmos', { name: 'N-channel MOSFET', cat: 'Semiconductors', prefix: 'Q', box: [60, 80], pins: [{ id: 'G', x: -40, y: 0 }, { id: 'D', x: 20, y: -40 }, { id: 'S', x: 20, y: 40 }],
  props: [num('vth', 'Threshold Vgs(th)', 2.5, 'V'), num('k', 'Transconductance k', 5, 'A/V²'), num('Vds', 'Vds max', 100, 'V'), num('Idmax', 'Id max', 10, 'A'), num('Pd', 'Power dissipation', 2, 'W')],
  symbol: () => mosSym(false), value: c => 'Vth=' + c.props.vth, fp: 'to220', m3d: 'to220', pinKind: { G: 'in' }, model: 'Square-law (Shichman–Hodges) model with λ = 0.01 V⁻¹ — educational, not SPICE-validated.',
  build: (c, N, P) => [P.M(N('D'), N('G'), N('S'), { vth: +c.props.vth, k: +c.props.k, lambda: 0.01 }, false)] });
def('pmos', { name: 'P-channel MOSFET', cat: 'Semiconductors', prefix: 'Q', box: [60, 80], pins: [{ id: 'G', x: -40, y: 0 }, { id: 'S', x: 20, y: -40 }, { id: 'D', x: 20, y: 40 }],
  props: [num('vth', '|Threshold| Vgs(th)', 2.5, 'V'), num('k', 'Transconductance k', 3, 'A/V²'), num('Vds', '|Vds| max', 55, 'V'), num('Idmax', '|Id| max', 10, 'A'), num('Pd', 'Power dissipation', 2, 'W')],
  symbol: () => mosSym(true), value: c => 'Vth=' + c.props.vth, fp: 'to220', m3d: 'to220', pinKind: { G: 'in' },
  build: (c, N, P) => [P.M(N('D'), N('G'), N('S'), { vth: +c.props.vth, k: +c.props.k, lambda: 0.01 }, true)] });
def('bridge', { name: 'Bridge rectifier', cat: 'Power', prefix: 'BR', box: [80, 80], pins: [{ id: 'AC1', x: -40, y: 0 }, { id: 'AC2', x: 40, y: 0 }, { id: '+', x: 0, y: -40 }, { id: '-', x: 0, y: 40 }],
  props: [num('Vf', 'Diode Vf @10 mA', 0.75, 'V'), num('Imax', 'Max output current', 1, 'A'), num('Vrrm', 'Max reverse voltage', 1000, 'V')],
  symbol: () => `<path d="M0-30L30 0 0 30-30 0Z" class="thin"/>${L(-40, 0, -30, 0)}${L(30, 0, 40, 0)}${L(0, -40, 0, -30)}${L(0, 30, 0, 40)}${T(0, -12, '+', 'middle', 'pl')}${T(0, 20, '−', 'middle', 'pl')}${T(0, 4, '~', 'middle', 'pl')}`,
  value: () => '', fp: 'bridge4', m3d: 'box',
  build: (c, N, P) => { const m = { Is: isFrom(+c.props.Vf, 0.01, 1.8), n: 1.8, Bv: 0 }; return [P.D(N('AC1'), N('+'), m), P.D(N('AC2'), N('+'), m), P.D(N('-'), N('AC1'), m), P.D(N('-'), N('AC2'), m)]; } });
['scr', 'triac', 'igbt'].forEach(t => def(t, {
  name: { scr: 'SCR (thyristor)', triac: 'TRIAC', igbt: 'IGBT' }[t], cat: 'Semiconductors', prefix: 'Q', sim: 'none', box: [60, 80],
  pins: t === 'igbt' ? [{ id: 'G', x: -40, y: 0 }, { id: 'C', x: 20, y: -40 }, { id: 'E', x: 20, y: 40 }] : t === 'scr' ? [{ id: 'A', x: 0, y: -40 }, { id: 'K', x: 0, y: 40 }, { id: 'G', x: -40, y: 20 }] : [{ id: 'MT2', x: 0, y: -40 }, { id: 'MT1', x: 0, y: 40 }, { id: 'G', x: -40, y: 20 }],
  symbol: () => t === 'igbt' ? bjtSym(false) : `${L(0, -40, 0, -10)}${L(0, 10, 0, 40)}<path d="M-11-10H11L0 10Z" class="fillc"/>${L(-11, 10, 11, 10)}${L(-40, 20, -6, 20)}${L(-6, 20, 0, 10)}` + (t === 'triac' ? `<path d="M-11 10H11L0-10Z" class="thin"/>` : ''),
  value: () => 'catalog', fp: 'to220', m3d: 'to220', model: 'No simulation model yet (planned). Placed parts are treated as open circuits.' }));

/* ===== INTEGRATED CIRCUITS ===== */
const opProps = [num('A', 'Open-loop gain', 1e5), num('vpos', 'Positive rail (implicit)', 12, 'V'), num('vneg', 'Negative rail (implicit)', -12, 'V'), num('swing', 'Output headroom from rails', 1.5, 'V'), num('Ro', 'Output resistance', 50, 'Ω')];
const opBuild = (c, N, P) => {
  const p = c.props, hi = p.vpos - p.swing, lo = p.vneg + p.swing, mid = (hi + lo) / 2, h = Math.max(0.01, (hi - lo) / 2), m = N.int();
  return [P.LIN(m, N.G, [N('IN+'), N('IN-')], [p.A, -p.A], 0, lo, hi), P.R(m, N('OUT'), Math.max(0.01, p.Ro))];
};
def('opamp', { name: 'Operational amplifier', cat: 'ICs', prefix: 'U', box: [100, 80], pins: [{ id: 'IN-', x: -60, y: -20, kind: 'in' }, { id: 'IN+', x: -60, y: 20, kind: 'in' }, { id: 'OUT', x: 60, y: 0 }],
  props: opProps, symbol: () => triangle + T(-30, -14, '−', 'middle', 'st b') + T(-30, 26, '+', 'middle', 'st b'), value: c => `±rails ${c.props.vpos}/${c.props.vneg}V`, fp: 'dip8', m3d: 'dip',
  model: 'Behavioural macro-model: finite open-loop gain, hard output limiting at (rails − headroom), output resistance. Supply pins are implicit (set rails in properties). No slew-rate or bandwidth limit.', build: opBuild });
def('comparator', { name: 'Comparator', cat: 'ICs', prefix: 'U', box: [100, 80], pins: [{ id: 'IN-', x: -60, y: -20, kind: 'in' }, { id: 'IN+', x: -60, y: 20, kind: 'in' }, { id: 'OUT', x: 60, y: 0 }],
  props: [num('A', 'Gain', 1e6), num('vpos', 'High output rail', 5, 'V'), num('vneg', 'Low output rail', 0, 'V'), num('swing', 'Headroom', 0.1, 'V'), num('Ro', 'Output resistance', 100, 'Ω')],
  symbol: () => triangle + T(-30, -14, '−', 'middle', 'st b') + T(-30, 26, '+', 'middle', 'st b') + `<path d="M-8-6h6v12h6" class="thin"/>`, value: c => `${c.props.vneg}…${c.props.vpos}V`, fp: 'dip8', m3d: 'dip', model: 'Push-pull behavioural comparator (no hysteresis, no propagation delay).', build: opBuild });
def('inamp', { name: 'Instrumentation amplifier', cat: 'ICs', prefix: 'U', box: [100, 80], pins: [{ id: 'IN-', x: -60, y: -20, kind: 'in' }, { id: 'IN+', x: -60, y: 20, kind: 'in' }, { id: 'OUT', x: 60, y: 0 }, { id: 'REF', x: 0, y: 40 }],
  props: [num('Rg', 'Gain resistor RG', 5000, 'Ω'), num('k', 'Gain constant (Ω)', 50000), num('cmrr', 'CMRR', 100, 'dB'), num('vpos', 'Positive rail (implicit)', 5, 'V'), num('vneg', 'Negative rail (implicit)', -5, 'V'), num('swing', 'Headroom', 1.2, 'V')],
  symbol: () => triangle + T(-30, -14, '−', 'middle', 'st b') + T(-30, 26, '+', 'middle', 'st b') + T(4, 4, 'INA', 'middle', 'pl') + L(0, 20, 0, 40),
  value: c => 'G=' + (1 + c.props.k / c.props.Rg).toFixed(1), fp: 'dip8', m3d: 'dip', model: 'G = 1 + k/RG, finite CMRR, rail limiting, output referred to REF. Supply pins implicit.',
  build: (c, N, P) => { const p = c.props, G = 1 + p.k / Math.max(1, p.Rg), Acm = G / Math.pow(10, p.cmrr / 20), hi = p.vpos - p.swing, lo = p.vneg + p.swing, mid = (hi + lo) / 2, h = (hi - lo) / 2, m = N.int();
    return [P.LIN(m, N.G, [N('IN+'), N('IN-'), N('REF')], [G + Acm / 2, -G + Acm / 2, 1], 0, lo, hi), P.R(m, N('OUT'), 20)]; } });
def('regulator', { name: 'Linear voltage regulator', cat: 'Power', prefix: 'U', box: [100, 60], pins: [{ id: 'IN', x: -60, y: 0 }, { id: 'OUT', x: 60, y: 0 }, { id: 'GND', x: 0, y: 40 }],
  props: [num('Vout', 'Output voltage', 5, 'V'), num('Vdo', 'Dropout voltage', 2, 'V'), num('Vinmax', 'Max input voltage', 35, 'V'), num('Imax', 'Max output current', 1.5, 'A'), num('theta', 'θJA (no heatsink)', 50, '°C/W')],
  symbol: c => blockSym(80, 40, [{ id: 'IN', x: -60, y: 0 }, { id: 'OUT', x: 60, y: 0 }, { id: 'GND', x: 0, y: 40 }], 'REG ' + (c ? c.props.Vout : 5) + 'V'), value: c => c.props.Vout + 'V', fp: 'to220', m3d: 'to220',
  model: 'Behavioural series regulator: Vout = smooth-min(Vset, Vin − Vdropout); input current = output current (quiescent current neglected).',
  build: (c, N, P) => { const p = c.props, s = 0.05; return [P.B(N('OUT'), N('GND'), [N('IN'), N('GND')], v => { const vin = v[0] - v[1], d = (p.Vout - vin + p.Vdo) / s; return Math.max(0, p.Vout - s * (d > 30 ? d : Math.log1p(Math.exp(d)))); }, [N('IN'), N('OUT')])]; } });
const t555pins = [{ id: 'TRIG', x: -60, y: -20, kind: 'in' }, { id: 'THR', x: -60, y: 0, kind: 'in' }, { id: 'DIS', x: -60, y: 20 }, { id: 'OUT', x: 60, y: 0 }, { id: 'VCC', x: 0, y: -60 }, { id: 'GND', x: 0, y: 60 }];
def('timer555', { name: '555 timer', cat: 'ICs', prefix: 'U', box: [80, 100], pins: t555pins, props: [num('Vmax', 'Max supply', 16, 'V')],
  symbol: () => blockSym(80, 80, t555pins, '555'), value: () => '', fp: 'dip8', m3d: 'dip', model: 'Event model: SR latch set when TRIG < Vcc/3, reset when THR > 2Vcc/3; discharge switch 10 Ω; OUT high = Vcc − 1.5 V. Updated once per time step (transient only).',
  build: (c, N, P) => {
    const st = { q: 0 }, nv = N('VCC'), ng = N('GND'), nt = N('TRIG'), nh = N('THR'), m = N.int();
    return [P.B(m, ng, [nv, ng], v => st.q ? Math.max(0, v[0] - v[1] - 1.5) : 0.1), P.R(m, N('OUT'), 10), P.R(N('DIS'), ng, () => st.q ? 1e9 : 10), P.R(nv, ng, 1500),
      P.HOOK(x => { const vcc = x(nv) - x(ng); if (x(nt) - x(ng) < vcc / 3) st.q = 1; else if (x(nh) - x(ng) > 2 * vcc / 3) st.q = 0; }, () => { st.q = 0; })];
  } });
const gate = (t, name, f, n) => {
  const pins = n === 1 ? [{ id: 'A', x: -60, y: 0, kind: 'in' }, { id: 'Y', x: 60, y: 0 }] : [{ id: 'A', x: -60, y: -20, kind: 'in' }, { id: 'B', x: -60, y: 20, kind: 'in' }, { id: 'Y', x: 60, y: 0 }];
  const body = { and: 'M-30-25H0a25 25 0 0 1 0 50H-30Z', nand: 'M-30-25H0a25 25 0 0 1 0 50H-30Z', or: 'M-34-25Q-20 0-34 25Q10 25 28 0Q10-25-34-25Z', nor: 'M-34-25Q-20 0-34 25Q10 25 26 0Q10-25-34-25Z', xor: 'M-30-25Q-16 0-30 25Q12 25 28 0Q12-25-30-25ZM-38-25Q-24 0-38 25', not: 'M-26-20V20L22 0Z' }[t];
  const bub = ['nand', 'nor', 'not'].includes(t);
  def('gate_' + t, { name: name + ' gate', cat: 'ICs', sub: 'Logic', prefix: 'U', box: [100, 60], pins, props: [num('vcc', 'Logic supply (implicit)', 5, 'V')],
    symbol: () => `<path d="${body}"/>` + (bub ? `<circle cx="${t === 'not' ? 26 : 30}" cy="0" r="4"/>` : '') + pins.map(p => L(p.x, p.y, p.x < 0 ? -28 : (bub ? 34 : 26), p.y)).join(''),
    value: () => name, fp: 'dip14', m3d: 'dip', model: 'Behavioural logic: threshold Vcc/2 with smooth transition, 50 Ω output. Supply implicit.',
    build: (c, N, P) => { const vcc = +c.props.vcc, m = N.int(), ins = pins.filter(p => p.kind).map(p => N(p.id)); return [P.B(m, N.G, ins, v => { const a = sig((v[0] - vcc / 2) / 0.08), b = n > 1 ? sig((v[1] - vcc / 2) / 0.08) : 0; return vcc * f(a, b); }), P.R(m, N('Y'), 50)]; } });
};
gate('and', 'AND', (a, b) => a * b, 2); gate('nand', 'NAND', (a, b) => 1 - a * b, 2); gate('or', 'OR', (a, b) => a + b - a * b, 2);
gate('nor', 'NOR', (a, b) => 1 - (a + b - a * b), 2); gate('xor', 'XOR', (a, b) => a + b - 2 * a * b, 2); gate('not', 'NOT', a => 1 - a, 1);
def('adc', { name: 'ADC readout probe', cat: 'ICs', sub: 'Data converters', prefix: 'ADC', box: [80, 40], pins: [{ id: 'IN', x: -60, y: 0, kind: 'in' }],
  props: [num('bits', 'Resolution', 10, 'bit'), num('vref', 'Reference voltage', 5, 'V'), sel('conv', 'Convert reading to', 'none', ['none', 'ntc-divider', 'lm35', 'mpx5010', 'o2-cell']), num('rfix', 'Divider fixed R (NTC high side)', 10000, 'Ω'), num('gain', 'Front-end gain (for O2 cell)', 1)],
  symbol: c => blockSym(80, 36, [{ id: 'IN', x: -60, y: 0 }], 'ADC ' + (c ? c.props.bits : 10) + 'b'), value: () => '', fp: 'none', offboard: true, m3d: 'box', instrument: true,
  build: (c, N, P) => [P.R(N('IN'), N.G, 1e8)] });
def('dac', { name: 'DAC (behavioural)', cat: 'ICs', sub: 'Data converters', prefix: 'DAC', box: [80, 40], pins: [{ id: 'OUT', x: 60, y: 0 }, { id: 'GND', x: 0, y: 40 }],
  props: [num('bits', 'Resolution', 8, 'bit'), num('code', 'Input code', 128), num('vref', 'Reference', 5, 'V')],
  symbol: c => blockSym(80, 36, [{ id: 'OUT', x: 60, y: 0 }, { id: 'GND', x: 0, y: 40 }], 'DAC'), value: c => 'code ' + c.props.code, fp: 'dip8', m3d: 'dip',
  build: (c, N, P) => { const m = N.int(); return [P.B(m, N('GND'), [], () => OCL.clamp(c.props.code, 0, 2 ** c.props.bits - 1) / 2 ** c.props.bits * c.props.vref), P.R(m, N('OUT'), 10)]; } });

/* sensors with behavioural models */
const lm35pins = [{ id: 'VS', x: 0, y: -40 }, { id: 'OUT', x: 60, y: 0 }, { id: 'GND', x: 0, y: 40 }];
def('lm35', { name: 'Analog temperature sensor', cat: 'Sensors', prefix: 'U', box: [80, 60], pins: lm35pins, props: [num('T', 'Temperature', 37, '°C')],
  symbol: () => blockSym(60, 40, lm35pins, 'TEMP'), value: c => c.props.T + '°C', fp: 'to92', m3d: 'to92', model: 'Vout = 10 mV/°C × T when VS ≥ ~4 V; quiescent current ≈ 60 µA (modelled as a resistor).',
  build: (c, N, P) => [P.B(N('OUT'), N('GND'), [N('VS'), N('GND')], v => 0.01 * c.props.T * sig((v[0] - v[1] - 4) / 0.1)), P.R(N('VS'), N('GND'), 83000)] });
const mpxpins = [{ id: 'VS', x: 0, y: -40 }, { id: 'OUT', x: 60, y: 0 }, { id: 'GND', x: 0, y: 40 }];
def('mpx5010', { name: 'Pressure sensor (0–10 kPa)', cat: 'Sensors', prefix: 'U', box: [80, 60], pins: mpxpins, props: [num('P', 'Applied pressure', 4, 'kPa')],
  symbol: () => blockSym(60, 40, mpxpins, 'kPa'), value: c => c.props.P + ' kPa', fp: 'sip6', m3d: 'box', model: 'Transfer function Vout = VS × (0.09·P + 0.04) (P in kPa); supply current modelled as 1 kΩ load.',
  build: (c, N, P) => [P.B(N('OUT'), N('GND'), [N('VS'), N('GND')], v => (v[0] - v[1]) * (0.09 * OCL.clamp(c.props.P, 0, 10) + 0.04)), P.R(N('VS'), N('GND'), 1000)] });
def('o2cell', { name: 'Oxygen sensor (galvanic cell)', cat: 'Sensors', prefix: 'OX', pins: [{ id: '+', x: 0, y: -40 }, { id: '-', x: 0, y: 40 }],
  props: [num('o2', 'O₂ concentration', 93, '%'), num('sens', 'Sensitivity', 0.5e-3, 'V/%'), num('Rint', 'Internal resistance', 100, 'Ω')],
  symbol: () => vleads + circle() + T(0, 5, 'O₂', 'middle', 'st b'), value: c => c.props.o2 + '%', fp: 'header2', m3d: 'box', model: 'Generic galvanic O₂ cell: linear mV output (sensitivity is user-set; real cells vary — calibrate in air and in 100% O₂).',
  build: (c, N, P) => { const m = N.int(); return [P.V(m, N('-'), () => c.props.sens * c.props.o2), P.R(m, N('+'), Math.max(1, c.props.Rint))]; } });
const flowpins = [{ id: 'VS', x: 0, y: -40 }, { id: 'OUT', x: 60, y: 0 }, { id: 'GND', x: 0, y: 40 }];
def('flowsensor', { name: 'Flow sensor (generic analog)', cat: 'Sensors', prefix: 'U', box: [80, 60], pins: flowpins, props: [num('flow', 'Flow', 5, 'L/min'), num('fmax', 'Full-scale flow', 10, 'L/min')],
  symbol: () => blockSym(60, 40, flowpins, 'FLOW'), value: c => c.props.flow + ' L/min', fp: 'header3', m3d: 'box', model: 'Generic ratiometric sensor: Vout = VS/5 × (0.5 + 4·flow/full-scale). Not a specific product.',
  build: (c, N, P) => [P.B(N('OUT'), N('GND'), [N('VS'), N('GND')], v => (v[0] - v[1]) / 5 * (0.5 + 4 * OCL.clamp(c.props.flow / c.props.fmax, 0, 1))), P.R(N('VS'), N('GND'), 2000)] });

/* microcontroller boards (partial electrical model) */
const mcuPins = [{ id: 'A0', x: -80, y: -20, kind: 'in' }, { id: 'A1', x: -80, y: 0, kind: 'in' }, { id: 'A2', x: -80, y: 20, kind: 'in' }, { id: 'D13', x: 80, y: -20 }, { id: 'D12', x: 80, y: 20 }, { id: 'VCC', x: 0, y: -80 }, { id: 'GND', x: 0, y: 80 }];
def('mcu', { name: 'Microcontroller board', cat: 'Microcontrollers', prefix: 'U', box: [120, 120], pins: mcuPins, sim: 'partial',
  props: [num('vcc', 'Logic / VCC pin voltage', 5, 'V'), num('bits', 'ADC resolution', 10, 'bit'), sel('d13', 'D13 output', 'blink', ['low', 'high', 'blink', 'pwm']), num('freq', 'Blink/PWM frequency', 2, 'Hz'), num('duty', 'PWM duty', 50, '%'), sel('d12', 'D12 output', 'low', ['low', 'high']), num('Ipin', 'Max pin current (recommended)', 0.02, 'A')],
  symbol: c => blockSym(120, 120, mcuPins, (c && c.label) || 'MCU'), value: () => '', fp: 'module', m3d: 'module',
  timeVarying: c => ['blink', 'pwm'].includes(c.props.d13),
  model: 'Partial model — no firmware execution. VCC pin = regulated supply; A0–A2 = high-impedance ADC inputs with live conversion; D13/D12 = driven outputs (25 Ω) following the selected pattern.',
  build: (c, N, P) => {
    const p = c.props, g = N('GND'), m1 = N.int(), m2 = N.int(), m3 = N.int();
    const d13 = p.d13 === 'high' ? () => p.vcc : p.d13 === 'low' ? () => 0 : p.d13 === 'blink' ? t => ((t * p.freq) % 1 < 0.5 ? p.vcc : 0) : t => ((t * p.freq) % 1 < p.duty / 100 ? p.vcc : 0);
    return [P.V(m1, g, () => p.vcc), P.R(m1, N('VCC'), 0.1), P.V(m2, g, d13), P.R(m2, N('D13'), 25), P.V(m3, g, () => p.d12 === 'high' ? p.vcc : 0), P.R(m3, N('D12'), 25),
      ...['A0', 'A1', 'A2'].map(a => P.R(N(a), g, 1e8))];
  } });
def('block', { name: 'Generic IC / module', cat: 'ICs', prefix: 'U', sim: 'none', pins: [], props: [], m3d: 'dip', fp: 'dip',
  symbol: c => { const pd = OCL.partPins(c); return blockSym(80, pd.h, pd.pins, (c && (c.label || c.part)) || 'IC'); }, value: () => '',
  model: 'Catalog part — no simulation model. Its pins are electrically open in simulation.' });

/* ===== SOURCES ===== */
def('vdc', { name: 'DC power supply', cat: 'Power', prefix: 'V', pins: [{ id: '+', x: 0, y: -40 }, { id: '-', x: 0, y: 40 }], props: [num('V', 'Voltage', 5, 'V'), num('Ilim', 'Current limit (for checks)', 1, 'A')],
  symbol: () => vleads + circle() + T(0, -5, '+', 'middle', 'st b') + T(0, 12, '−', 'middle', 'st b'), value: c => OCL.fmt(c.props.V, 'V'), fp: 'header2', m3d: 'header', source: true,
  build: (c, N, P) => [P.V(N('+'), N('-'), () => +c.props.V)] });
def('battery', { name: 'Battery', cat: 'Power', prefix: 'BT', pins: [{ id: '+', x: 0, y: -40 }, { id: '-', x: 0, y: 40 }], props: [num('V', 'EMF', 9, 'V'), num('Rint', 'Internal resistance', 1.5, 'Ω'), num('mAh', 'Capacity', 500, 'mAh'), num('Ilim', 'Max discharge current', 0.5, 'A')],
  symbol: () => `${L(0, -40, 0, -6)}${L(0, 6, 0, 40)}${L(-16, -6, 16, -6)}${L(-8, 2, 8, 2)}${L(-16, 8, 16, 8)}${L(-8, 14, 8, 14)}` + T(20, -10, '+', 'start', 'pl'), value: c => c.props.V + 'V', fp: 'header2', m3d: 'header', source: true,
  build: (c, N, P) => { const m = N.int(); return [P.V(m, N('-'), () => +c.props.V), P.R(m, N('+'), Math.max(0.001, c.props.Rint))]; } });
def('idc', { name: 'DC current source', cat: 'Power', prefix: 'I', pins: [{ id: '+', x: 0, y: -40 }, { id: '-', x: 0, y: 40 }], props: [num('I', 'Current (out of +)', 0.01, 'A')],
  symbol: () => vleads + circle() + `${L(0, 12, 0, -10)}<path d="M0-13L-5-4H5Z" class="fillc"/>`, value: c => OCL.fmt(c.props.I, 'A'), fp: 'header2', m3d: 'header', source: true,
  build: (c, N, P) => [P.I(N('-'), N('+'), () => +c.props.I)] });
def('vac', { name: 'Signal generator', cat: 'Instruments', prefix: 'VG', pins: [{ id: '+', x: 0, y: -40 }, { id: '-', x: 0, y: 40 }],
  props: [sel('wave', 'Waveform', 'sine', ['sine', 'square', 'pulse', 'triangle', 'dc']), num('amp', 'Amplitude (peak)', 1, 'V'), num('freq', 'Frequency', 1000, 'Hz'), num('offset', 'DC offset', 0, 'V'), num('duty', 'Duty cycle (pulse)', 50, '%')],
  symbol: c => vleads + circle() + (c && c.props.wave === 'square' ? `<path d="M-12 6V-6H0V6H12V-6" class="thin"/>` : c && c.props.wave === 'pulse' ? `<path d="M-12 6H-6V-6H0V6H12" class="thin"/>` : c && c.props.wave === 'triangle' ? `<path d="M-12 6L-6-6 0 6 6-6 12 6" class="thin"/>` : `<path d="M-12 0C-8-12-4-12 0 0S8 12 12 0" class="thin"/>`),
  value: c => c.props.wave === 'dc' ? c.props.amp + 'V' : `${OCL.fmt(c.props.amp, 'V')}p ${OCL.fmt(c.props.freq, 'Hz')}`, fp: 'none', offboard: true, m3d: 'box', source: true, timeVarying: c => c.props.wave !== 'dc',
  build: (c, N, P) => { const f = W.fn(c.props); return [P.V(N('+'), N('-'), f)]; } });
def('mains', { name: 'AC mains source', cat: 'Power', prefix: 'AC', pins: [{ id: 'L', x: 0, y: -40 }, { id: 'N', x: 0, y: 40 }], props: [num('Vrms', 'Voltage (RMS)', 230, 'V'), num('freq', 'Frequency', 50, 'Hz')],
  symbol: () => vleads + circle() + `<path d="M-12 0C-8-12-4-12 0 0S8 12 12 0" class="thin"/>` + T(26, 4, '~', 'start', 'pl'), value: c => c.props.Vrms + 'V ' + c.props.freq + 'Hz', fp: 'header2', m3d: 'header', source: true, timeVarying: () => true, hazard: true,
  build: (c, N, P) => [P.V(N('L'), N('N'), t => c.props.Vrms * Math.SQRT2 * Math.sin(2 * Math.PI * c.props.freq * t))] });
const ecgPins = [{ id: 'RA', x: 60, y: -20 }, { id: 'LA', x: 60, y: 20 }, { id: 'RL', x: 0, y: 40 }];
def('ecgsrc', { name: 'ECG electrode interface (simulated patient)', cat: 'Medical', prefix: 'ECG', box: [100, 80], pins: ecgPins,
  props: [num('mv', 'R-wave amplitude', 1, 'mV'), num('bpm', 'Heart rate', 72, 'bpm'), num('cm', '50 Hz common-mode interference', 0.2, 'V'), num('Rs', 'Electrode impedance', 10000, 'Ω')],
  symbol: () => blockSym(80, 60, ecgPins, '♥ ECG') , value: c => c.props.bpm + ' bpm', fp: 'header3', m3d: 'header', source: true, timeVarying: () => true,
  model: 'Synthetic Lead-I ECG (Gaussian P-QRS-T model) as a differential source between LA and RA, plus 50 Hz common-mode voltage, each electrode with series impedance. NOT a recording of a real patient.',
  build: (c, N, P) => { const p = c.props, a = N.int(), b = N.int(), rl = N('RL'); const cm = t => p.cm * Math.sin(2 * Math.PI * 50 * t), e = t => p.mv * 1e-3 * W.ecg(t, p.bpm);
    return [P.V(a, rl, t => cm(t) + e(t) / 2), P.R(a, N('LA'), p.Rs), P.V(b, rl, t => cm(t) - e(t) / 2), P.R(b, N('RA'), p.Rs)]; } });
def('ppgsrc', { name: 'Pulse sensor (PPG voltage)', cat: 'Medical', prefix: 'PS', pins: [{ id: '+', x: 0, y: -40 }, { id: '-', x: 0, y: 40 }], props: [num('dc', 'DC level', 1.5, 'V'), num('ac', 'Pulsatile amplitude', 0.05, 'V'), num('bpm', 'Heart rate', 72, 'bpm')],
  symbol: () => vleads + circle() + `<path d="M-13 3H-7L-3-9 2 10 6 0H13" class="thin"/>`, value: c => c.props.bpm + ' bpm', fp: 'header3', m3d: 'header', source: true, timeVarying: () => true,
  build: (c, N, P) => [P.V(N('+'), N('-'), t => c.props.dc + c.props.ac * W.ppg(t, c.props.bpm))] });

/* ===== INSTRUMENTS ===== */
def('voltmeter', { name: 'Digital voltmeter / DMM', cat: 'Instruments', prefix: 'VM', pins: [{ id: '+', x: -40, y: 0, kind: 'probe' }, { id: '-', x: 40, y: 0, kind: 'probe' }], props: [num('Rin', 'Input impedance', 10e6, 'Ω')],
  symbol: () => hleads + circle() + T(0, 6, 'V', 'middle', 'st b'), value: () => '', fp: 'none', offboard: true, m3d: 'box', instrument: true,
  build: (c, N, P) => [P.R(N('+'), N('-'), c.props.Rin)] });
def('ammeter', { name: 'Ammeter', cat: 'Instruments', prefix: 'AM', pins: [{ id: '+', x: -40, y: 0, kind: 'probe' }, { id: '-', x: 40, y: 0, kind: 'probe' }], props: [],
  symbol: () => hleads + circle() + T(0, 6, 'A', 'middle', 'st b'), value: () => '', fp: 'none', offboard: true, m3d: 'box', instrument: true, shorting: true,
  build: (c, N, P) => [P.V(N('+'), N('-'), () => 0)] });
def('scope', { name: 'Oscilloscope (2-channel)', cat: 'Instruments', prefix: 'OSC', box: [100, 80], pins: [{ id: 'A', x: -60, y: -20, kind: 'probe' }, { id: 'B', x: -60, y: 20, kind: 'probe' }],
  props: [num('Rin', 'Input impedance', 1e6, 'Ω')],
  symbol: () => `<rect x="-40" y="-30" width="80" height="60" rx="5" class="ic"/><rect x="-32" y="-22" width="64" height="38" rx="2" class="thin"/><path d="M-30 0C-24-14-18-14-12 0S0 14 6 0 18-14 24 0" class="trace"/>${L(-60, -20, -40, -20)}${L(-60, 20, -40, 20)}${T(-36, -14, 'A', 'start', 'pl')}${T(-36, 26, 'B', 'start', 'pl')}`,
  value: () => '', fp: 'none', offboard: true, m3d: 'box', instrument: true,
  build: (c, N, P) => [P.R(N('A'), N.G, c.props.Rin), P.R(N('B'), N.G, c.props.Rin)] });
def('freqcounter', { name: 'Frequency counter', cat: 'Instruments', prefix: 'FC', box: [80, 40], pins: [{ id: 'IN', x: -60, y: 0, kind: 'probe' }], props: [],
  symbol: () => blockSym(80, 36, [{ id: 'IN', x: -60, y: 0 }], 'Hz'), value: () => '', fp: 'none', offboard: true, m3d: 'box', instrument: true,
  build: (c, N, P) => [P.R(N('IN'), N.G, 1e6)] });

/* ===== NETS ===== */
def('ground', { name: 'Ground', cat: 'Basic', prefix: 'GND', pins: [{ id: 'G', x: 0, y: -20 }], props: [], box: [40, 40], symbol: () => `${L(0, -20, 0, 0)}${L(-14, 0, 14, 0)}${L(-9, 6, 9, 6)}${L(-4, 12, 4, 12)}`, value: () => '', offboard: true, build: () => [] });
def('label', { name: 'Net label', cat: 'Basic', prefix: 'NL', pins: [{ id: 'N', x: 0, y: 0 }], props: [{ k: 'net', label: 'Net name', def: 'VCC', type: 'text' }], box: [60, 20],
  symbol: c => { const t = OCL.esc(c ? c.props.net : 'VCC'), w = 18 + 6.6 * String(c ? c.props.net : 'VCC').length, r = c ? (c.rot || 0) : 0;
    return `<path d="M0 0L-8-9H${-w}V9H-8Z" class="ic lbl"/><text class="pl" transform="translate(${-w / 2 - 4},0) rotate(${-r * 90})" x="0" y="3.5" text-anchor="middle">${t}</text>`; }, value: () => '', offboard: true, build: () => [] });
def('vcc', { name: 'Power rail symbol', cat: 'Basic', prefix: 'PWR', pins: [{ id: 'N', x: 0, y: 20 }], props: [{ k: 'net', label: 'Rail name', def: '+5V', type: 'text' }], box: [40, 40],
  symbol: c => `${L(0, 20, 0, 0)}${L(-12, 0, 12, 0)}${T(0, -6, OCL.esc(c ? c.props.net : '+5V'), 'middle', 'pl')}`, value: () => '', offboard: true, build: () => [] });
def('junction', { name: 'Junction (wire node)', cat: 'Basic', prefix: 'J', pins: [{ id: 'J', x: 0, y: 0 }], props: [], box: [20, 20], symbol: () => `<circle r="4" class="fillc"/>`, value: () => '', offboard: true, build: () => [] });

/* pins for block-type parts and custom parts */
OCL.partPins = c => { const part = OCL.parts[c.part] || OCL.customParts[c.part]; const names = part && part.pinNames ? part.pinNames : ['1', '2', '3', '4']; return autoPins(names); };
OCL.pinsOf = c => D[c.type].type === 'block' || !D[c.type].pins.length ? OCL.partPins(c).pins : D[c.type].pins;
OCL.symbolOf = c => D[c.type].symbol(c);

/* ======================================================================
   PARTS CATALOG — each entry maps to a base model + preset parameters + datasheet information.
   Values are headline figures from manufacturer datasheets; anything not listed is shown as
   "Not specified — check the manufacturer datasheet". Always confirm against the current datasheet.
   ====================================================================== */
const P = OCL.parts = {};
const part = (key, base, name, o = {}) => { P[key] = Object.assign({ key, base, name, cat: (D[base] || {}).cat, props: {}, ds: {} }, o); };
const gen = 'Generic (multiple manufacturers)';
part('res', 'resistor', 'Resistor — carbon film ¼ W', { tags: 'resistor carbon film', ds: { desc: 'General-purpose axial carbon-film resistor.', mfr: gen, part: 'CF-1/4W series', pwr: '0.25 W @ 70 °C', tol: '±5 %', pkg: 'Axial, 10.16 mm (0.4") lead spacing', temp: NS, vmax: NS, apps: 'Current limiting, dividers, biasing, pull-ups.' } });
part('res_mf', 'resistor', 'Resistor — metal film ½ W 1 %', { props: { P: 0.5, tol: 1 }, tags: 'resistor metal film precision', ds: { desc: 'Precision metal-film resistor.', mfr: gen, part: 'MF-1/2W series', pwr: '0.5 W', tol: '±1 %', pkg: 'Axial', apps: 'Instrumentation, gain setting, filters.' } });
part('res_pwr', 'resistor', 'Resistor — wirewound 5 W', { props: { R: 10, P: 5 }, tags: 'resistor power wirewound', ds: { desc: 'Cement/wirewound power resistor.', mfr: gen, pwr: '5 W', tol: '±5 %', pkg: 'Ceramic body', apps: 'Load resistors, current sensing, bleeders.' } });
part('pot10k', 'pot', 'Potentiometer 10 kΩ linear', { tags: 'variable resistor trimmer', ds: { desc: 'Rotary/trimmer potentiometer, linear taper.', mfr: gen, pwr: NS, pkg: '3-pin through-hole', apps: 'Gain trim, offset nulling, user controls.' } });
part('cap_cer', 'capacitor', 'Ceramic capacitor 100 nF', { tags: 'ceramic decoupling mlcc', ds: { desc: 'Ceramic disc/MLCC capacitor (X7R typical).', mfr: gen, vmax: '50 V (typical rating)', tol: '±10 % (X7R typ.)', pkg: 'Radial, 2.54/5.08 mm', apps: 'Decoupling, filtering, timing.' } });
part('cap_film', 'capacitor', 'Film capacitor 1 µF', { props: { C: 1e-6, Vmax: 100 }, tags: 'polyester film', ds: { desc: 'Polyester (PET) film capacitor.', mfr: gen, vmax: '100 V', tol: '±10 %', pkg: 'Radial box', apps: 'Filters, coupling, low-distortion audio/biomedical paths.' } });
part('cap_el', 'cap_e', 'Electrolytic capacitor 100 µF 25 V', { tags: 'electrolytic polarised bulk', ds: { desc: 'Aluminium electrolytic capacitor — POLARISED.', mfr: gen, vmax: '25 V', tol: '±20 %', pkg: 'Radial can', temp: '−40 … +85 °C (typical grade)', apps: 'Bulk smoothing after rectifiers, supply reservoirs.' } });
part('cap_el1000', 'cap_e', 'Electrolytic capacitor 1000 µF 35 V', { props: { C: 1000e-6, Vmax: 35 }, tags: 'electrolytic reservoir', ds: { desc: 'Aluminium electrolytic reservoir capacitor — POLARISED.', mfr: gen, vmax: '35 V', tol: '±20 %', pkg: 'Radial can', apps: 'Rectifier reservoir capacitor.' } });
part('ind', 'inductor', 'Inductor 10 mH', { tags: 'choke coil', ds: { desc: 'Radial power/choke inductor.', mfr: gen, imax: 'Set in properties', pkg: 'Radial', apps: 'Filters, energy storage, EMI suppression.' } });
part('xfmr', 'transformer', 'Mains transformer 230 V : 12 V', { tags: 'step down transformer', ds: { desc: 'Step-down mains transformer (modelled as ideal).', mfr: gen, vop: '230 V AC primary, 12 V AC secondary', pwr: '10 VA', apps: 'Linear power supplies.', elec: ['Ratio ≈ 230/12 = 19.2'] } });
part('fuse', 'fuse', 'Fuse 500 mA (5×20 mm)', { tags: 'protection fuse', ds: { desc: 'Glass cartridge fuse.', mfr: gen, imax: '0.5 A rated', pkg: '5×20 mm with holder', apps: 'Over-current protection.' } });
part('sw', 'switch', 'Switch SPST', { tags: 'toggle push button', ds: { desc: 'Single-pole single-throw switch (click it on the canvas to toggle).', mfr: gen } });
part('lamp', 'lamp', 'Lamp 12 V 5 W', { tags: 'load bulb', ds: { desc: 'Resistive load (hot-filament resistance; cold resistance is lower).', mfr: gen } });
part('ntc10k', 'ntc', 'NTC thermistor 10 kΩ B3950', { tags: 'thermistor temperature', ds: { desc: 'Negative-temperature-coefficient thermistor.', mfr: gen, part: '10K B3950 class', tol: '±1 % (typ. for this class; varies)', temp: NS, elec: ['R25 = 10 kΩ', 'β = 3950 K'], apps: 'Digital thermometers, battery temperature monitoring.' } });
part('ldr', 'ldr', 'Photoresistor (CdS)', { tags: 'ldr light sensor optical', ds: { desc: 'Cadmium-sulphide light-dependent resistor. Note: CdS is restricted under RoHS in many markets.', mfr: gen, apps: 'Light sensing, night lamps.' } });
part('motor', 'motor', 'DC motor 12 V (small)', { tags: 'motor pump actuator', ds: { desc: 'Small brushed DC motor, e.g. for peristaltic/syringe pump demonstrators.', mfr: gen } });
part('1n4007', 'diode', '1N4007 rectifier diode', { props: { Vrrm: 1000, Imax: 1 }, tags: 'rectifier diode', ds: { desc: 'General-purpose silicon rectifier.', mfr: 'Multiple (e.g. onsemi, Diodes Inc., Vishay)', part: '1N4007', vmax: '1000 V (VRRM)', imax: '1 A average (IF(AV)); 30 A surge (IFSM)', elec: ['VF ≤ 1.1 V @ 1 A'], pkg: 'DO-41', temp: '−65 … +175 °C (junction, typical)', apps: 'Rectifiers, flyback/freewheel, reverse-polarity protection.' } });
part('1n4148', 'diode', '1N4148 small-signal diode', { props: { Vf: 0.65, n: 1.9, Vrrm: 100, Imax: 0.2 }, tags: 'signal switching diode', ds: { desc: 'Fast small-signal switching diode.', mfr: 'Multiple (e.g. onsemi, Vishay, Nexperia)', part: '1N4148', vmax: '100 V', imax: '200 mA average (typ. datasheet value; check grade)', pkg: 'DO-35', apps: 'Signal clamping, logic, protection.' } });
part('1n4733', 'zener', '1N4733A Zener 5.1 V 1 W', { tags: 'zener reference', ds: { desc: '1 W silicon Zener diode.', mfr: 'Multiple (e.g. onsemi, Vishay)', part: '1N4733A', vop: 'VZ = 5.1 V', pwr: '1 W', pkg: 'DO-41', apps: 'Voltage references, clamps, simple shunt regulators.' } });
part('led_red', 'led', 'LED 5 mm red', { tags: 'led indicator', ds: { desc: 'Standard 5 mm indicator LED.', mfr: gen, vop: 'VF ≈ 1.8–2.2 V', imax: '20 mA continuous (typical)', vmax: 'VR = 5 V (typical)', pkg: 'T-1¾ (5 mm)', apps: 'Status indication, alarms.' } });
part('led_grn', 'led', 'LED 5 mm green', { props: { color: 'green' }, tags: 'led indicator', ds: { desc: 'Standard 5 mm indicator LED.', mfr: gen, vop: 'VF ≈ 2.0–2.2 V', imax: '20 mA (typ.)', pkg: '5 mm' } });
part('led_ir', 'led', 'IR LED 940 nm', { props: { color: 'infrared', Imax: 0.05 }, tags: 'infrared emitter pulse oximeter', ds: { desc: 'Infrared emitter used in pulse oximetry (with a red LED, ~660 nm).', mfr: gen, vop: 'VF ≈ 1.2–1.5 V', imax: NS, apps: 'Pulse oximetry, proximity sensing.' } });
part('pd', 'photodiode', 'Photodiode (PIN, generic)', { tags: 'photodetector optical spo2', ds: { desc: 'Silicon PIN photodiode — use reverse-biased or with a transimpedance amplifier.', mfr: gen, apps: 'PPG/SpO₂ detection, light measurement.' } });
part('2n2222', 'npn', '2N2222A / PN2222A NPN', { props: { bf: 150, Vceo: 40, Icmax: 0.6, Pd: 0.625 }, tags: 'bjt npn switch', ds: { desc: 'General-purpose NPN switching/amplifier transistor.', mfr: 'Multiple (e.g. onsemi, STMicroelectronics)', part: 'PN2222A (TO-92)', vmax: 'VCEO = 40 V', imax: 'IC = 600 mA continuous', pwr: '625 mW (TO-92 @ 25 °C)', elec: ['hFE 100–300 @ IC = 150 mA'], pkg: 'TO-92', apps: 'Relay/LED/motor drivers, small-signal amps.' } });
part('bc547', 'npn', 'BC547 NPN', { props: { bf: 200, Vceo: 45, Icmax: 0.1, Pd: 0.5 }, tags: 'bjt npn small signal', ds: { desc: 'Low-noise small-signal NPN transistor.', mfr: 'Multiple (e.g. onsemi, Nexperia)', part: 'BC547', vmax: 'VCEO = 45 V', imax: 'IC = 100 mA', pwr: '500 mW', elec: ['hFE 110–800 depending on gain group (A/B/C)'], pkg: 'TO-92', apps: 'Pre-amplifiers, switching small loads.' } });
part('2n3906', 'pnp', '2N3906 PNP', { props: { bf: 150, Vceo: 40, Icmax: 0.2, Pd: 0.625 }, tags: 'bjt pnp', ds: { desc: 'General-purpose PNP transistor.', mfr: 'Multiple (e.g. onsemi)', part: '2N3906', vmax: 'VCEO = −40 V', imax: 'IC = −200 mA', pwr: '625 mW', pkg: 'TO-92', apps: 'High-side switching, complementary stages.' } });
part('irf540n', 'nmos', 'IRF540N N-MOSFET', { props: { vth: 3, k: 10, Vds: 100, Idmax: 33, Pd: 2 }, tags: 'mosfet power switch', ds: { desc: 'Power N-channel MOSFET (standard gate drive, not logic-level).', mfr: 'Infineon (International Rectifier)', part: 'IRF540N', vmax: 'VDS = 100 V', imax: 'ID = 33 A (TC = 25 °C, heatsinked)', elec: ['RDS(on) ≤ 44 mΩ @ VGS = 10 V', 'VGS(th) 2–4 V'], pkg: 'TO-220AB', apps: 'Motor/solenoid drivers, DC switching.', link: 'https://www.infineon.com/cms/en/product/power/mosfet/' , linkNote: 'Infineon MOSFET portal — search for IRF540N' } });
part('irlz44n', 'nmos', 'IRLZ44N logic-level N-MOSFET', { props: { vth: 1.5, k: 20, Vds: 55, Idmax: 47, Pd: 2 }, tags: 'mosfet logic level arduino', ds: { desc: 'Logic-level power MOSFET — fully enhanced at 5 V gate drive.', mfr: 'Infineon (International Rectifier)', part: 'IRLZ44N', vmax: 'VDS = 55 V', imax: 'ID = 47 A (TC = 25 °C)', elec: ['VGS(th) 1–2 V', 'RDS(on) ≤ 22 mΩ @ VGS = 10 V'], pkg: 'TO-220AB', apps: 'Microcontroller-driven loads, pump motors.' } });
part('bridge', 'bridge', 'Bridge rectifier 1 A', { tags: 'rectifier bridge', ds: { desc: 'Single-phase full-wave bridge (4 diodes).', mfr: gen, part: 'e.g. DB107 / W10M class', vmax: NS, imax: '1 A', apps: 'AC–DC power supplies.' } });
part('scr', 'scr', 'SCR (generic)', { tags: 'thyristor', ds: { desc: 'Silicon-controlled rectifier. Catalog only — no simulation model yet.', mfr: gen } });
part('bt136', 'triac', 'BT136 TRIAC', { tags: 'triac ac control', ds: { desc: 'TRIAC for AC load control. Catalog only — no simulation model yet.', mfr: 'WeEn Semiconductors (formerly NXP)', part: 'BT136', vmax: '600 V (VDRM, -600 grade)', imax: '4 A RMS', pkg: 'TO-220AB' } });
part('igbt', 'igbt', 'IGBT (generic)', { tags: 'igbt power', ds: { desc: 'Insulated-gate bipolar transistor. Catalog only — no simulation model yet.', mfr: gen } });
part('lm741', 'opamp', 'LM741 op-amp', { props: { A: 2e5, vpos: 12, vneg: -12, swing: 1.5 }, tags: 'opamp operational amplifier', ds: { desc: 'Classic general-purpose single op-amp (not rail-to-rail).', mfr: 'Texas Instruments (and others)', part: 'LM741', vop: '±5 … ±15 V typical use', vmax: '±18 V supply (LM741 grade)', elec: ['GBW ≈ 1 MHz', 'Slew rate ≈ 0.5 V/µs', 'Large-signal voltage gain ≈ 200 V/mV typ.'], pkg: 'DIP-8 / SOIC-8', apps: 'Teaching, amplifiers, filters, comparators.', link: 'https://www.ti.com/product/LM741' } });
part('lm358', 'opamp', 'LM358 dual op-amp (single supply)', { props: { A: 1e5, vpos: 5, vneg: 0, swing: 1.5 }, tags: 'opamp single supply dual', ds: { desc: 'Dual op-amp; input range includes ground; output swings near ground but not to V+.', mfr: 'Texas Instruments (and others)', part: 'LM358', vop: '3 … 32 V single (±1.5 … ±16 V)', elec: ['GBW ≈ 0.7–1 MHz', 'Output high ≈ V+ − 1.5 V'], pkg: 'DIP-8 / SOIC-8', apps: 'Battery-powered sensor conditioning.', link: 'https://www.ti.com/product/LM358' } });
part('tl081', 'opamp', 'TL081 JFET op-amp', { props: { A: 2e5, vpos: 12, vneg: -12, swing: 1.5 }, tags: 'opamp jfet low bias', ds: { desc: 'JFET-input op-amp — very low input bias current.', mfr: 'Texas Instruments', part: 'TL081', vmax: '±18 V', elec: ['GBW ≈ 3 MHz', 'Slew rate ≈ 13 V/µs'], pkg: 'DIP-8 / SOIC-8', apps: 'Transimpedance amps for photodiodes, active filters.', link: 'https://www.ti.com/product/TL081' } });
part('lm393', 'comparator', 'LM393 comparator', { tags: 'comparator alarm threshold', ds: { desc: 'Dual comparator with OPEN-COLLECTOR outputs (needs a pull-up resistor). Modelled here as push-pull for simplicity.', mfr: 'Texas Instruments (and others)', part: 'LM393', vop: '2 … 36 V', pkg: 'DIP-8 / SOIC-8', apps: 'Threshold alarms, window detectors.', link: 'https://www.ti.com/product/LM393' } });
part('ina128', 'inamp', 'INA128 instrumentation amp', { props: { k: 50000, Rg: 5000 }, tags: 'instrumentation amplifier ecg bio', ds: { desc: 'Precision low-power instrumentation amplifier.', mfr: 'Texas Instruments', part: 'INA128', vop: '±2.25 … ±18 V', elec: ['G = 1 + 50 kΩ / RG', 'High CMRR (gain-dependent; see datasheet)'], pkg: 'DIP-8 / SOIC-8', apps: 'ECG/EEG front ends, bridge sensors.', link: 'https://www.ti.com/product/INA128' } });
part('ad620', 'inamp', 'AD620 instrumentation amp', { props: { k: 49400, Rg: 5000 }, tags: 'instrumentation amplifier ecg', ds: { desc: 'Low-cost, low-power instrumentation amplifier.', mfr: 'Analog Devices', part: 'AD620', vop: '±2.3 … ±18 V', elec: ['G = 1 + 49.4 kΩ / RG'], pkg: 'DIP-8 / SOIC-8', apps: 'ECG and medical instrumentation, weigh scales.', link: 'https://www.analog.com/en/products/ad620.html' } });
part('ad8232', 'block', 'AD8232 heart-rate monitor front end', { pinNames: ['+IN', '-IN', 'RLD', 'OUT', 'REFOUT', 'LO+', 'LO-', 'SDN'], tags: 'ecg front end analog', ds: { desc: 'Integrated single-lead ECG signal-conditioning front end. Catalog only — use the INA + filter template to simulate the same chain.', mfr: 'Analog Devices', part: 'AD8232', vop: '2.0 … 3.5 V single supply', pkg: 'LFCSP-20', apps: 'Heart-rate monitors, fitness ECG.', link: 'https://www.analog.com/en/products/ad8232.html' } });
part('ne555', 'timer555', 'NE555 timer', { tags: '555 astable monostable oscillator', ds: { desc: 'Bipolar timer for monostable and astable circuits.', mfr: 'Texas Instruments (and others)', part: 'NE555', vop: '4.5 … 16 V', imax: '±200 mA output (source/sink)', elec: ['Astable f ≈ 1.44 / ((RA + 2RB)·C)'], pkg: 'DIP-8 / SOIC-8', apps: 'Alarm tone/flash generators, PWM, timers.', link: 'https://www.ti.com/product/NE555' } });
part('lm7805', 'regulator', 'LM7805 regulator 5 V', { tags: 'regulator 7805 linear', ds: { desc: 'Fixed +5 V three-terminal linear regulator.', mfr: 'Multiple (e.g. Texas Instruments, STMicroelectronics, onsemi)', part: 'LM7805 / L7805', vop: 'Vout = 5 V; Vin ≈ 7 … 25 V', vmax: '35 V input (abs. max, typical)', imax: '1.5 A (with adequate heatsinking)', elec: ['Dropout ≈ 2 V', 'Thermal + short-circuit protection'], pkg: 'TO-220', apps: 'Logic supplies, sensor rails.' } });
part('lm317', 'regulator', 'LM317 adjustable regulator', { props: { Vout: 3.3, Vdo: 2, Vinmax: 40 }, tags: 'regulator adjustable', ds: { desc: 'Adjustable positive regulator (set Vout here; real circuit uses R1/R2).', mfr: 'Texas Instruments (and others)', part: 'LM317', vop: '1.25 … 37 V output', imax: '1.5 A', elec: ['Vout = 1.25 V × (1 + R2/R1) + IADJ·R2'], pkg: 'TO-220', apps: 'Bench supplies, battery chargers.', link: 'https://www.ti.com/product/LM317' } });
part('ams1117', 'regulator', 'AMS1117-3.3 LDO', { props: { Vout: 3.3, Vdo: 1.1, Vinmax: 15, Imax: 1, theta: 90 }, tags: 'ldo regulator 3.3v esp32', ds: { desc: '1 A low-dropout regulator, 3.3 V fixed version.', mfr: 'Advanced Monolithic Systems (and clones)', part: 'AMS1117-3.3', vop: 'Vout = 3.3 V', elec: ['Dropout ≈ 1.1 V @ 800 mA'], imax: '1 A', vmax: '15 V input', pkg: 'SOT-223', apps: 'ESP32/3.3 V sensor rails.' } });
['and', 'nand', 'or', 'nor', 'xor', 'not'].forEach(g => part('g_' + g, 'gate_' + g, g.toUpperCase() + ' gate (74HC series)', { tags: 'logic gate digital ' + g, ds: { desc: `${g.toUpperCase()} logic function (74HC family: 74HC08 AND, 74HC00 NAND, 74HC32 OR, 74HC02 NOR, 74HC86 XOR, 74HC04 NOT).`, mfr: 'Multiple (e.g. Texas Instruments, Nexperia)', vop: '2 … 6 V (74HC)', pkg: 'DIP-14 / SOIC-14', apps: 'Alarm logic, interlocks.' } }));
part('adc', 'adc', 'ADC readout probe', { tags: 'adc analog digital converter', ds: { desc: 'Virtual ADC: shows the digital code and converted value for the voltage on its input (ideal quantiser).', mfr: 'Omar Circuit Lab virtual instrument' } });
part('dac', 'dac', 'DAC (behavioural)', { tags: 'dac digital analog', ds: { desc: 'Ideal N-bit DAC: Vout = code/2ᴺ × Vref.', mfr: 'Behavioural model' } });
part('pwmctl', 'block', 'PWM controller (TL494)', { pinNames: ['1IN+', '1IN-', 'FB', 'DTC', 'CT', 'RT', 'GND', 'C1', 'E1', 'E2', 'C2', 'VCC', 'OUTCTL', 'REF', '2IN-', '2IN+'], tags: 'pwm smps controller', ds: { desc: 'Fixed-frequency PWM control IC. Catalog only — use a pulse signal generator to emulate PWM.', mfr: 'Texas Instruments (and others)', part: 'TL494', vop: '7 … 40 V', pkg: 'DIP-16 / SOIC-16', link: 'https://www.ti.com/product/TL494' } });
part('buck', 'block', 'DC/DC buck converter module', { pinNames: ['VIN', 'GND', 'VOUT', 'GND2'], tags: 'switching converter smps buck', ds: { desc: 'Switching step-down module. Catalog only — switching converter simulation is planned.', mfr: gen } });
part('lm35', 'lm35', 'LM35 temperature sensor', { tags: 'temperature sensor analog thermometer', ds: { desc: 'Precision centigrade temperature sensor, linear 10 mV/°C.', mfr: 'Texas Instruments', part: 'LM35', vop: '4 … 30 V supply', elec: ['10 mV/°C scale factor', 'Range −55 … +150 °C (LM35/LM35A; other grades narrower)', 'Quiescent current ≈ 60 µA'], pkg: 'TO-92', apps: 'Thermometers, thermal alarms.', link: 'https://www.ti.com/product/LM35' } });
part('ds18b20', 'block', 'DS18B20 digital temperature sensor', { pinNames: ['GND', 'DQ', 'VDD'], tags: 'temperature digital one-wire', ds: { desc: '1-Wire digital thermometer. Catalog only (digital protocol not simulated).', mfr: 'Analog Devices (Maxim Integrated)', part: 'DS18B20', vop: '3.0 … 5.5 V', elec: ['±0.5 °C accuracy from −10 … +85 °C', 'Range −55 … +125 °C', '9–12 bit resolution'], pkg: 'TO-92 / SO-8', apps: 'Digital thermometers, incubator monitoring.' } });
part('mpx5010', 'mpx5010', 'MPX5010 pressure sensor', { tags: 'pressure sensor kpa', ds: { desc: 'Integrated silicon pressure sensor, on-chip signal conditioning and temperature compensation.', mfr: 'NXP Semiconductors', part: 'MPX5010', vop: '4.75 … 5.25 V', elec: ['0 … 10 kPa', 'Vout = VS × (0.09·P + 0.04)', 'Output ≈ 0.2 … 4.7 V'], pkg: 'Unibody 6-pin', apps: 'Occlusion detection, low-pressure monitoring, respiratory flow (differential).' } });
part('dht22', 'block', 'DHT22 humidity & temperature sensor', { pinNames: ['VCC', 'DATA', 'NC', 'GND'], tags: 'humidity sensor', ds: { desc: 'Digital humidity/temperature sensor. Catalog only.', mfr: 'Aosong Electronics', part: 'DHT22 / AM2302', vop: '3.3 … 6 V', elec: ['Humidity 0–100 % RH', 'Temperature −40 … +80 °C'], apps: 'Incubators, storage rooms.' } });
part('max30102', 'block', 'MAX30102 pulse-oximetry sensor', { pinNames: ['VIN', 'SDA', 'SCL', 'INT', 'GND', 'IRD', 'RD'], tags: 'spo2 pulse oximeter sensor', ds: { desc: 'Integrated red/IR LEDs, photodetector and AFE with I²C output. Catalog only — the Pulse Oximeter template simulates the analog chain with discrete parts.', mfr: 'Analog Devices (Maxim Integrated)', part: 'MAX30102', vop: '1.8 V core; LEDs 3.1 … 5.0 V (see datasheet)', pkg: '14-pin optical module', apps: 'Wearable SpO₂ / heart rate.', link: 'https://www.analog.com/en/products/max30102.html' } });
part('o2cell', 'o2cell', 'Oxygen sensor (galvanic, generic)', { tags: 'oxygen sensor o2 concentrator', ds: { desc: 'Galvanic oxygen cell — mV output proportional to O₂ partial pressure. Generic model; check your sensor’s datasheet for sensitivity, lifetime and response time.', mfr: gen, apps: 'Oxygen concentrators, ventilators, incubators.' } });
part('flow', 'flowsensor', 'Flow sensor (generic analog)', { tags: 'flow sensor', ds: { desc: 'Generic analog mass-flow sensor model (0.5–4.5 V). Not a specific product.', mfr: gen } });
part('mq2', 'block', 'MQ-2 gas sensor module', { pinNames: ['VCC', 'GND', 'DO', 'AO'], tags: 'gas sensor smoke', ds: { desc: 'Heated metal-oxide gas sensor module. Catalog only.', mfr: 'Zhengzhou Winsen (and module makers)', part: 'MQ-2', vop: '5 V (heater)', apps: 'Gas/smoke detection.' } });
part('ecgsrc', 'ecgsrc', 'ECG electrodes + simulated patient', { tags: 'ecg electrode patient medical', ds: { desc: 'Three-electrode (RA, LA, RL) interface driven by a synthetic ECG. For simulation only — never connect experimental circuits to people.', mfr: 'Omar Circuit Lab simulation source' } });
part('ppgsrc', 'ppgsrc', 'Pulse sensor (PPG output)', { tags: 'pulse sensor ppg heart', ds: { desc: 'Synthetic photoplethysmogram voltage source.', mfr: 'Simulation source' } });
part('uno', 'mcu', 'Arduino Uno R3 (ATmega328P)', { label: 'UNO', tags: 'arduino atmega328p microcontroller', ds: { desc: 'ATmega328P development board. Partial model: 5 V pin, ADC inputs A0–A2, outputs D13/D12.', mfr: 'Arduino (MCU: Microchip ATmega328P)', part: 'Arduino Uno Rev3', vop: '5 V logic; 7–12 V recommended on VIN', imax: '20 mA per I/O recommended (40 mA abs. max)', elec: ['16 MHz', '32 KB flash, 2 KB SRAM', '14 digital I/O, 6 analog inputs', '10-bit ADC'], pkg: 'Board 68.6 × 53.4 mm', apps: 'Prototyping, medical-device demonstrators.', link: 'https://docs.arduino.cc/hardware/uno-rev3/' } });
part('esp32', 'mcu', 'ESP32 DevKit (ESP32-WROOM-32)', { label: 'ESP32', props: { vcc: 3.3, bits: 12, Ipin: 0.02 }, tags: 'esp32 wifi bluetooth microcontroller', ds: { desc: 'Wi-Fi + Bluetooth microcontroller module. Partial model: 3.3 V pin, 12-bit ADC inputs, outputs. GPIO is NOT 5 V tolerant.', mfr: 'Espressif Systems', part: 'ESP32-WROOM-32', vop: '3.0 … 3.6 V', elec: ['Dual-core Xtensa LX6 up to 240 MHz', 'Wi-Fi 802.11 b/g/n + Bluetooth', '12-bit SAR ADC'], apps: 'Connected patient monitors, IoT.', link: 'https://www.espressif.com/en/products/socs/esp32' } });
part('pic16f877a', 'block', 'PIC16F877A microcontroller', { pinNames: ['MCLR', 'RA0', 'RA1', 'RA2', 'RA3', 'VDD', 'VSS', 'OSC1', 'OSC2', 'RB0', 'RB1', 'RC6', 'RC7', 'RD0'], tags: 'pic microchip microcontroller', ds: { desc: '8-bit PIC microcontroller (40-pin). Catalog only (selected pins shown).', mfr: 'Microchip Technology', part: 'PIC16F877A', vop: '2.0 … 5.5 V', elec: ['Up to 20 MHz', '14 KB flash (8K words)', '8-channel 10-bit ADC'], pkg: 'DIP-40', link: 'https://www.microchip.com/en-us/product/PIC16F877A' } });
part('mcu_gen', 'mcu', 'Generic programmable microcontroller', { label: 'MCU', tags: 'microcontroller generic', ds: { desc: 'Generic MCU with the same partial electrical model as the Arduino entry.', mfr: gen } });
part('pc817', 'block', 'PC817 optocoupler (isolation)', { pinNames: ['A', 'K', 'E', 'C'], tags: 'optocoupler isolation patient safety', ds: { desc: 'Phototransistor optocoupler for galvanic isolation concepts. Catalog only. Medical isolation barriers require certified components and creepage/clearance per IEC 60601-1.', mfr: 'Sharp (and second sources)', part: 'PC817', elec: ['Isolation 5000 Vrms (1 min)', 'CTR 50–600 % (grade dependent)'], pkg: 'DIP-4' } });
part('vdc', 'vdc', 'DC power supply (bench)', { cat: 'Power', tags: 'power supply dc source bench', ds: { desc: 'Ideal DC voltage source with a current-limit figure used by the validation checks.', mfr: 'Virtual instrument' } });
part('bat9', 'battery', 'Battery 9 V (PP3)', { tags: 'battery 9v', ds: { desc: '9 V alkaline battery with internal resistance.', mfr: gen, vop: '9 V nominal', elec: ['Capacity ≈ 500 mAh (alkaline, light load)'] } });
part('bat_li', 'battery', 'Li-ion cell 3.7 V 18650', { props: { V: 3.7, Rint: 0.05, mAh: 2500, Ilim: 5 }, tags: 'battery lithium 18650', ds: { desc: 'Single Li-ion cell — needs protection & charge control.', mfr: gen, vop: '3.0 … 4.2 V', elec: ['Capacity typically 2000–3500 mAh'] } });
part('idc', 'idc', 'DC current source', { tags: 'current source', ds: { desc: 'Ideal DC current source.', mfr: 'Virtual instrument' } });
part('mains', 'mains', 'AC mains 230 V 50 Hz', { tags: 'ac mains kenya supply', ds: { desc: 'Mains supply (Kenya: 240 V nominal, 50 Hz; set as needed). HAZARDOUS VOLTAGE in real life.', mfr: 'Virtual source' } });
part('siggen', 'vac', 'Signal generator', { cat: 'Instruments', tags: 'function generator sine square pulse ac', ds: { desc: 'Function generator: sine, square, pulse, triangle, DC.', mfr: 'Virtual instrument' } });
part('dmm', 'voltmeter', 'Digital multimeter (voltage)', { tags: 'voltmeter dmm multimeter', ds: { desc: 'Voltmeter with 10 MΩ input impedance.', mfr: 'Virtual instrument' } });
part('amm', 'ammeter', 'Ammeter', { tags: 'ammeter current meter', ds: { desc: 'Ideal ammeter (0 Ω) — insert it in series.', mfr: 'Virtual instrument' } });
part('osc', 'scope', 'Oscilloscope 2-ch', { tags: 'oscilloscope scope waveform', ds: { desc: 'Two-channel oscilloscope referenced to ground, 1 MΩ inputs.', mfr: 'Virtual instrument' } });
part('fc', 'freqcounter', 'Frequency counter', { tags: 'frequency counter', ds: { desc: 'Measures frequency from rising mean-crossings during transient simulation.', mfr: 'Virtual instrument' } });
part('gnd', 'ground', 'Ground', { tags: 'ground earth 0v reference', ds: { desc: 'Reference node (0 V). Every simulated circuit needs one.' } });
part('label', 'label', 'Net label', { tags: 'net label name connect sheets', ds: { desc: 'Pins with the same label are connected — also across sheets.' } });
part('vcc', 'vcc', 'Power rail symbol', { tags: 'vcc rail power symbol', ds: { desc: 'Named rail (connects to every label/rail with the same name).' } });
part('junc', 'junction', 'Junction', { tags: 'junction node tee', ds: { desc: 'A connection point for joining more than two wires.' } });

OCL.customParts = {};
OCL.CATS = ['Basic', 'Passive', 'Semiconductors', 'ICs', 'Microcontrollers', 'Sensors', 'Power', 'Medical', 'Instruments', 'Custom'];
OCL.partsList = () => [...Object.values(P), ...Object.values(OCL.customParts)];
OCL.partCat = p => p.cat || (D[p.base] || {}).cat || 'ICs';
})();
