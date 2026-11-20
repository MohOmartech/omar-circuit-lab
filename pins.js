/* OMAR CIRCUIT LAB v2.1 — authoritative pin definitions, pin inspector, TRACE MY CIRCUIT engine, schematic split pane.
   ONE pin map per part+footprint drives the schematic pad labels, PCB footprint, 3D model and the netlist used by the simulator. */
'use strict';
(() => {
const { esc, fmt } = OCL, PCB = OCL.pcb, FP = PCB.footprints;

/* ---------------- footprints: corrected THT orders + SMD packages ---------------- */
FP.pot3 = { ...FP.pot3, pads: [[-2.54, 2.54], [0, -2.54], [2.54, 2.54]] };
FP.bridge4 = { ...FP.bridge4, pads: [[0, -3.81], [3.81, 0], [0, 3.81], [-3.81, 0]] };
FP.sip6 = { pads: Array.from({ length: 6 }, (_, i) => [(i - 2.5) * 2.54, 0]), body: [16.5, 6.5], pad: 1.7, drill: 1, h: 11, name: 'Unibody SIP-6 (2.54 mm)' };
const smd = (o) => ({ smd: true, drill: 0, ...o });
FP.r0805 = smd({ pads: [[-0.95, 0, 1.0, 1.3], [0.95, 0, 1.0, 1.3]], body: [2.0, 1.25], h: 0.5, name: '0805 (2012 metric) SMD' });
FP.led0805 = smd({ pads: [[-0.95, 0, 1.0, 1.3], [0.95, 0, 1.0, 1.3]], body: [2.0, 1.25], h: 0.8, name: 'LED 0805 SMD' });
FP.sod123 = smd({ pads: [[-1.65, 0, 0.9, 1.2], [1.65, 0, 0.9, 1.2]], body: [2.7, 1.6], h: 1.1, name: 'SOD-123 SMD' });
FP.sot23 = smd({ pads: [[-0.95, 1.1, 0.6, 0.8], [0.95, 1.1, 0.6, 0.8], [0, -1.1, 0.6, 0.8]], body: [2.9, 1.3], h: 1.0, name: 'SOT-23 SMD' });
FP.soic8 = smd({ pads: [...[0, 1, 2, 3].map(i => [-2.7, -1.905 + i * 1.27, 1.55, 0.6]), ...[0, 1, 2, 3].map(i => [2.7, 1.905 - i * 1.27, 1.55, 0.6])], body: [3.9, 4.9], h: 1.5, name: 'SOIC-8 SMD (1.27 mm)' });
FP.soic14 = smd({ pads: [...Array.from({ length: 7 }, (_, i) => [-2.7, -3.81 + i * 1.27, 1.55, 0.6]), ...Array.from({ length: 7 }, (_, i) => [2.7, 3.81 - i * 1.27, 1.55, 0.6])], body: [3.9, 8.7], h: 1.5, name: 'SOIC-14 SMD (1.27 mm)' });
FP.sot223 = smd({ pads: [[-2.3, 3.15, 1.2, 2.0], [0, 3.15, 1.2, 2.0], [2.3, 3.15, 1.2, 2.0], [0, -3.15, 3.6, 2.0]], body: [6.5, 3.5], h: 1.7, name: 'SOT-223 SMD' });
const ALT = { resistor: ['axial', 'r0805'], capacitor: ['radial2', 'r0805'], ntc: ['radial2', 'r0805'], diode: ['axial', 'sod123'], zener: ['axial', 'sod123'], led: ['led5', 'led0805'],
  npn: ['to92', 'sot23'], pnp: ['to92', 'sot23'], nmos: ['to220', 'sot23'], pmos: ['to220', 'sot23'], opamp: ['dip8', 'soic8'], comparator: ['dip8', 'soic8'], inamp: ['dip8', 'soic8'], timer555: ['dip8', 'soic8'],
  gate_and: ['dip14', 'soic14'], gate_or: ['dip14', 'soic14'], gate_nand: ['dip14', 'soic14'], gate_nor: ['dip14', 'soic14'], gate_xor: ['dip14', 'soic14'], gate_not: ['dip14', 'soic14'], regulator: ['to220', 'sot223'], mpx5010: ['sip6'] };
OCL.fpOptions = c => { const d = OCL.defs[c.type]; const base = d.type === 'mpx5010' ? 'sip6' : (c.part === 'ams1117' ? 'sot223' : d.fp); return [...new Set([base, ...(ALT[c.type] || [])])].filter(k => FP[k] || k === 'dip'); };
OCL.fpKey = (c, pt) => { const opts = OCL.fpOptions(c); if (pt && pt.fp && opts.includes(pt.fp)) return pt.fp; return opts[0]; };
PCB.fpFor = (c, pt) => {
  const d = OCL.defs[c.type]; if (!d || d.offboard || d.fp === 'none') return null; const k = OCL.fpKey(c, pt || (PCB.ensure && OCL.state.project && (OCL.state.project.pcb || { parts: [] }).parts.find(p => p.cid === c.id)));
  if (k === 'dip' || k === 'dipN') { const n = OCL.pinsOf(c).length, m = n + (n % 2), s = m / 2, pads = []; for (let i = 0; i < s; i++) pads.push([-3.81, (i - (s - 1) / 2) * 2.54]); for (let i = 0; i < s; i++) pads.push([3.81, ((s - 1) / 2 - i) * 2.54]);
    return { ...FP.dip8, key: 'dip', pads, body: [6.4, s * 2.54 + 1], name: `Generic ${m}-pin breakout (listed signals — not the device’s own package numbering)` }; }
  const f = FP[k] || FP.header2;
  if (f.auto) { const pins = OCL.pinsOf(c); return { ...f, key: k, pads: pins.map(p => [p.x * f.auto * 0.5, p.y * f.auto * 0.5]) }; }
  return { ...f, key: k };
};

/* ---------------- pinout tables (pad number order). [schematic pin | null, pad name, function?] ----------------
   Sources: manufacturer datasheets for the named parts (PN2222A/2N3906 TO-92 = E-B-C, BC547 = C-B-E, IRF540N/IRLZ44N TO-220 = G-D-S,
   78xx TO-220 = IN-GND-OUT, LM317 = ADJ-OUT-IN, AMS1117 SOT-223 = ADJ/GND-OUT-IN(+tab OUT), LM35 TO-92 = +VS-VOUT-GND,
   MPX5010 = VOUT-GND-VS, LM741/TL081 DIP-8 single op-amp, LM358/LM393 dual, INA128/AD620, NE555, 74HC00/02/04/08/32/86).
   Generic parts use the most common industry pinout and are flagged “generic — verify”. Diodes/LEDs follow the IPC/KiCad convention pad 1 = cathode. */
const N = (n) => [null, n];
const OPA_SINGLE = [N('NULL1'), ['IN-', '−IN'], ['IN+', '+IN'], N('V−'), N('NULL2'), ['OUT', 'OUT'], N('V+'), N('NC')];
const OPA_DUAL = [['OUT', 'OUT A'], ['IN-', '−IN A'], ['IN+', '+IN A'], N('GND/V−'), N('+IN B'), N('−IN B'), N('OUT B'), N('V+')];
const G4 = [['A', '1A'], ['B', '1B'], ['Y', '1Y'], N('2A'), N('2B'), N('2Y'), N('GND'), N('3Y'), N('3A'), N('3B'), N('4Y'), N('4A'), N('4B'), N('VCC')];
const PO = {
  diode: [['K', 'K'], ['A', 'A']], zener: [['K', 'K'], ['A', 'A']], led: [['K', 'K'], ['A', 'A']], photodiode: [['K', 'K'], ['A', 'A']],
  'npn|to92': { generic: true, pads: [['E', 'E'], ['B', 'B'], ['C', 'C']] }, 'pnp|to92': { generic: true, pads: [['E', 'E'], ['B', 'B'], ['C', 'C']] },
  '2n2222|to92': [['E', 'E'], ['B', 'B'], ['C', 'C']], '2n3906|to92': [['E', 'E'], ['B', 'B'], ['C', 'C']], 'bc547|to92': [['C', 'C'], ['B', 'B'], ['E', 'E']],
  'npn|sot23': { generic: true, pads: [['B', 'B'], ['E', 'E'], ['C', 'C']] }, 'pnp|sot23': { generic: true, pads: [['B', 'B'], ['E', 'E'], ['C', 'C']] },
  'nmos|to220': [['G', 'G'], ['D', 'D'], ['S', 'S']], 'pmos|to220': { generic: true, pads: [['G', 'G'], ['D', 'D'], ['S', 'S']] },
  'nmos|sot23': { generic: true, pads: [['G', 'G'], ['S', 'S'], ['D', 'D']] }, 'pmos|sot23': { generic: true, pads: [['G', 'G'], ['S', 'S'], ['D', 'D']] },
  opamp: OPA_SINGLE, lm358: OPA_DUAL, lm393: OPA_DUAL, comparator: OPA_DUAL,
  inamp: [N('RG'), ['IN-', '−IN'], ['IN+', '+IN'], N('−VS'), ['REF', 'REF'], ['OUT', 'OUT'], N('+VS'), N('RG')],
  timer555: [['GND', 'GND'], ['TRIG', 'TRIG'], ['OUT', 'OUT'], N('RESET'), N('CTRL'), ['THR', 'THR'], ['DIS', 'DIS'], ['VCC', 'VCC']],
  gate_and: G4, gate_or: G4, gate_nand: G4, gate_xor: G4,
  gate_nor: [['Y', '1Y'], ['A', '1A'], ['B', '1B'], N('2Y'), N('2A'), N('2B'), N('GND'), N('3A'), N('3B'), N('3Y'), N('4A'), N('4B'), N('4Y'), N('VCC')],
  gate_not: [['A', '1A'], ['Y', '1Y'], N('2A'), N('2Y'), N('3A'), N('3Y'), N('GND'), N('4Y'), N('4A'), N('5Y'), N('5A'), N('6Y'), N('6A'), N('VCC')],
  'regulator|to220': [['IN', 'IN'], ['GND', 'GND'], ['OUT', 'OUT']], 'lm317|to220': [['GND', 'ADJ'], ['OUT', 'OUT'], ['IN', 'IN']],
  'regulator|sot223': [['GND', 'GND/ADJ'], ['OUT', 'OUT'], ['IN', 'IN'], ['OUT', 'TAB (OUT)']],
  lm35: [['VS', '+VS'], ['OUT', 'VOUT'], ['GND', 'GND']], mpx5010: [['OUT', 'VOUT'], ['GND', 'GND'], ['VS', 'VS'], N('NC'), N('NC'), N('NC')],
  bridge: [['+', '+'], ['AC2', '~'], ['-', '−'], ['AC1', '~']], pot: [['1', '1'], ['W', 'W'], ['2', '3']], dac: [['OUT', 'VOUT'], ['GND', 'GND']]
};
const FUNC = [
  [/^(VCC|V\+|\+VS|VS|VIN|VDD|5V|3V3)$/i, 'Power supply input'], [/^(GND|V−|V-|−VS|GND\/V−|VSS)$/i, 'Ground / negative supply'], [/^(−IN|-IN|IN-|−IN A)$/i, 'Inverting input'], [/^(\+IN|IN\+|\+IN A)$/i, 'Non-inverting input'],
  [/^OUT( A)?$|^VOUT$|^TAB/i, 'Output'], [/^K$/, 'Cathode'], [/^A$/, 'Anode'], [/^B$/, 'Base'], [/^C$/, 'Collector'], [/^E$/, 'Emitter'], [/^G$/, 'Gate'], [/^D$/, 'Drain'], [/^S$/, 'Source'],
  [/^TRIG$/, 'Trigger input (sets latch below VCC/3)'], [/^THR$/, 'Threshold input (resets latch above 2VCC/3)'], [/^DIS$/, 'Discharge (open-collector to GND when output low)'], [/^RESET$/, 'Active-low reset — tie to VCC (implicit in the model)'], [/^CTRL$/, 'Control voltage — decouple with 10 nF'],
  [/^RG$/, 'Gain-setting resistor terminal'], [/^REF$/, 'Output reference'], [/^ADJ$|GND\/ADJ/, 'Adjust / reference terminal'], [/^NULL/, 'Offset null (leave open)'], [/^NC$/, 'Not connected'], [/^~$/, 'AC input'], [/^\+$/, 'Positive terminal'], [/^−$|^-$/, 'Negative terminal'],
  [/^W$/, 'Wiper'], [/^A\d$/, 'Analog input (ADC)'], [/^D\d+$/, 'Digital I/O'], [/^[1-6][ABY]$/, 'Logic gate terminal'], [/^(RA|LA|RL)$/, 'Electrode (right arm / left arm / right leg)'], [/^(P1|P2)$/, 'Primary winding'], [/^(S1|S2)$/, 'Secondary winding'], [/^(AC1|AC2)$/, 'AC input'], [/^(1|2|3)$/, 'Terminal']
];
const SUPPLY = /^(V\+|V−|\+VS|−VS|VCC|GND|GND\/V−)$/;
OCL.pinFunction = name => { for (const [re, f] of FUNC) if (re.test(name)) return f; return 'Signal'; };
OCL.pinout = (c, fpKey) => {
  const d = OCL.defs[c.type], k = fpKey || OCL.fpKey(c), pins = OCL.pinsOf(c), f = PCB.fpFor(c, { fp: k }); const n = f ? f.pads.length : pins.length;
  let tab = PO[c.part + '|' + k] || PO[c.part] || PO[c.type + '|' + k] || PO[c.type], generic = false;
  if (tab && !Array.isArray(tab)) { generic = tab.generic; tab = tab.pads; }
  let pads;
  if (tab) pads = tab.map((t, i) => ({ num: i + 1, pin: t[0], name: t[1] || t[0] }));
  else pads = pins.map((p, i) => ({ num: i + 1, pin: p.id, name: c.type === 'mcu' && p.id === 'VCC' ? (c.props.vcc < 4 ? '3V3' : '5V') : (p.name || p.id) }));
  while (pads.length < n) pads.push({ num: pads.length + 1, pin: null, name: 'NC' });
  pads = pads.slice(0, n);
  pads.forEach(p => { p.func = OCL.pinFunction(p.name); p.implicit = !p.pin && SUPPLY.test(p.name); if (p.implicit) p.func += ' — implicit in the simulation model; wire it in hardware'; });
  return { key: k, generic, pads };
};
OCL.padsOfPin = (c, pinId) => OCL.pinout(c, OCL.fpKey(c, (OCL.state.project.pcb || { parts: [] }).parts.find(p => p.cid === c.id))).pads.filter(p => p.pin === pinId).map(p => p.num);

/* ---------------- pin inspector (tooltip + panel) ---------------- */
OCL.pinInfo = (cid, pinId, padNum) => {
  const c = OCL.findComp(cid); if (!c) return null; const d = OCL.defs[c.type], nl = OCL.netlist(), pt = (OCL.state.project.pcb || { parts: [] }).parts.find(p => p.cid === cid);
  const po = d.offboard ? null : OCL.pinout(c, OCL.fpKey(c, pt)); let pad = po && padNum ? po.pads.find(p => p.num === padNum) : null;
  if (!pinId && pad) pinId = pad.pin; const pinDef = OCL.pinsOf(c).find(p => p.id === pinId);
  const pads = po ? po.pads.filter(p => p.pin === pinId) : []; if (!pad && pads.length) pad = pads[0];
  const name = pad ? pad.name : (pinDef ? pinDef.name || pinDef.id : '—'), net = pinId !== undefined && pinId !== null ? nl.nodeOf[cid + ':' + pinId] : null, netObj = net !== null && net !== undefined ? nl.nets[net] : null;
  const R = OCL.sim.readings && OCL.sim.readings[cid], v = netObj && OCL.sim.nodeV ? OCL.sim.nodeV[net] : null, iIn = R && R.pinI && pinId ? R.pinI[pinId] : null;
  let status = '—';
  if (pad && pad.implicit) status = 'Supply pin — not in schematic (implicit rails)';
  else if (!pinId) status = 'Not connected (NC)';
  else if (netObj && netObj.pins.length < 2 && net !== 0) status = 'Unconnected in schematic';
  else if (netObj) { const others = netObj.pins.filter(k => k !== cid + ':' + pinId && !['label', 'vcc', 'junction', 'ground'].includes((OCL.findComp(k.split(':')[0]) || {}).type)); status = `Connected to ${others.length} pin(s)` + (net === 0 ? ' · ground' : '');
    if (PCB.drc && pt) { const myPads = PCB.drc.pads.filter(p => p.cid === cid && p.pin === pinId), rat = PCB.drc.rats.some(r => myPads.some(m => (r.a.id === m.id || r.b.id === m.id))); status += rat ? ' · PCB: unrouted' : ' · PCB: routed'; } }
  return { c, ref: c.ref, pinId, pad, pads: pads.map(p => p.num), name, func: pad ? pad.func : OCL.pinFunction(name), net, netName: netObj ? netObj.name : '—', v, iIn, status, fp: po ? (PCB.fpFor(c, { fp: po.key }) || {}).name : 'off-board', generic: po && po.generic };
};
OCL.pinInfoHTML = info => !info ? '' : `<div class="tt-h"><b>${esc(info.ref)}</b> · pin ${info.pads.length ? info.pads.join('/') : '—'} <span class="tt-n">${esc(info.name)}</span></div>
  <table class="tt-t"><tr><td>Function</td><td>${esc(info.func)}</td></tr><tr><td>Schematic pin</td><td class="mono">${esc(info.pinId || '—')}</td></tr><tr><td>Net</td><td class="mono">${esc(info.netName)}</td></tr>
  ${info.v !== null && info.v !== undefined ? `<tr><td>Voltage</td><td class="mono">${fmt(info.v, 'V')}</td></tr>` : ''}${info.iIn !== null && info.iIn !== undefined ? `<tr><td>Current into pin</td><td class="mono">${fmt(info.iIn, 'A')}</td></tr>` : ''}
  <tr><td>Status</td><td>${esc(info.status)}</td></tr><tr><td>Footprint</td><td>${esc(info.fp || '—')}${info.generic ? ' <i>(generic pinout — verify against your part’s datasheet)</i>' : ''}</td></tr></table>`;
const tip = OCL.tip = { el: null };
tip.show = (html, x, y) => { if (!tip.el) { tip.el = document.createElement('div'); tip.el.className = 'pin-tip'; document.body.appendChild(tip.el); } tip.el.innerHTML = html; tip.el.style.display = 'block';
  const w = tip.el.offsetWidth, h = tip.el.offsetHeight; tip.el.style.left = Math.min(x + 14, innerWidth - w - 8) + 'px'; tip.el.style.top = Math.min(y + 14, innerHeight - h - 8) + 'px'; };
tip.hide = () => { if (tip.el) tip.el.style.display = 'none'; };

/* ---------------- TRACE MY CIRCUIT ---------------- */
const NETSYM = ['label', 'vcc', 'junction', 'ground'];
const T = OCL.trace = {};
T.start = (cid, pinId, dir = 'forward') => {
  const nl = OCL.netlist(), c = OCL.findComp(cid); if (!c) return;
  const res = { cid, pin: pinId, dir, nets: new Set(), comps: new Set([cid]), pinKeys: new Set([cid + ':' + pinId]), primary: nl.nodeOf[cid + ':' + pinId], steps: null, nl };
  let budget = 80;
  const pinLabel = (cc, pid) => { const pads = OCL.defs[cc.type].offboard ? [] : OCL.padsOfPin(cc, pid); return `${cc.ref}·${pid}${pads.length ? ' (pad ' + pads.join('/') + ')' : ''}`; };
  const through = (cc, pid) => { const ps = OCL.pinsOf(cc); if (NETSYM.includes(cc.type)) return null; if (ps.length === 2) return ps.find(p => p.id !== pid).id; if (cc.type === 'pot') return pid === 'W' ? null : (pid === '1' ? '2' : '1');
    if (['npn', 'pnp'].includes(cc.type) && pid !== 'B') return pid === 'C' ? 'E' : 'C'; if (['nmos', 'pmos'].includes(cc.type) && pid !== 'G') return pid === 'D' ? 'S' : 'D'; return null; };
  const walk = (cc, pid, depth, seenNets) => {
    const net = nl.nodeOf[cc.id + ':' + pid]; res.nets.add(net); const netObj = nl.nets[net]; const out = { kind: 'net', net, name: netObj.name, ground: net === 0, from: pinLabel(cc, pid), dests: [] };
    if (net === 0 || seenNets.has(net) || depth > 8 || budget-- <= 0) { out.stop = net === 0 ? 'ground' : seenNets.has(net) ? 'loop' : 'depth'; return out; }
    const seen = new Set(seenNets); seen.add(net);
    netObj.pins.filter(k => k !== cc.id + ':' + pid).forEach(k => { const [id, p] = k.split(':'), dc = OCL.findComp(id); if (!dc || NETSYM.includes(dc.type)) return;
      res.comps.add(id); res.pinKeys.add(k); const d = { comp: dc, pin: p, label: pinLabel(dc, p), func: OCL.pinFunction(p), value: OCL.defs[dc.type].value ? OCL.defs[dc.type].value(dc) : '' };
      const nx = through(dc, p); if (nx && budget > 0) { res.pinKeys.add(id + ':' + nx); d.exit = pinLabel(dc, nx); d.next = walk(dc, nx, depth + 1, seen); }
      else d.end = OCL.defs[dc.type].instrument ? 'instrument' : OCL.pinsOf(dc).length > 2 ? 'multi-terminal part' : 'end';
      out.dests.push(d); });
    return out;
  };
  let start = { comp: c, pin: pinId };
  if (dir === 'reverse') { const o = through(c, pinId); if (o) { start = { comp: c, pin: o }; res.pinKeys.add(cid + ':' + o); res.reverseVia = `${pinLabel(c, pinId)} → through ${c.ref} → ${pinLabel(c, o)}`; } }
  res.steps = walk(start.comp, start.pin, 0, new Set());
  res.info = OCL.pinInfo(cid, pinId);
  OCL.state.trace = res; OCL.emit('trace', res); return res;
};
T.clear = () => { OCL.state.trace = null; OCL.emit('trace', null); };
T.text = (s, depth = 0) => { if (!s) return ''; const pad = '  '.repeat(depth);
  let t = `${pad}${s.from} → net ${s.name}${s.ground ? ' (GND)' : ''}`; if (s.stop === 'loop') t += ' (already visited)'; t += '\n';
  s.dests.forEach(d => { t += `${pad}  → ${d.label}${d.value ? ' [' + d.value + ']' : ''}${d.end ? ' — ' + d.end : ''}\n`; if (d.next) t += T.text(d.next, depth + 2); }); return t; };
T.html = (s, depth = 0) => { if (!s) return '';
  return `<div class="tr-net${s.ground ? ' gnd' : ''}" style="margin-left:${depth * 14}px"><span class="tr-pin">${esc(s.from)}</span> <span class="tr-arrow">→</span> <span class="tr-netname" data-net="${s.net}">net ${esc(s.name)}</span>${s.ground ? ' <span class="pill">GND</span>' : ''}${s.stop === 'loop' ? ' <i class="muted small">(loop)</i>' : ''}</div>` +
    s.dests.map(d => `<div class="tr-dest" style="margin-left:${depth * 14 + 14}px"><span class="tr-arrow">↳</span> <a href="#" class="tr-comp" data-cid="${d.comp.id}">${esc(d.label)}</a> <span class="muted small">${esc(d.func)}${d.value ? ' · ' + esc(d.value) : ''}</span>${d.end ? ` <span class="pill">${esc(d.end)}</span>` : ''}</div>${d.next ? `<div class="tr-through" style="margin-left:${depth * 14 + 28}px"><span class="muted small">through ${esc(d.comp.ref)} → ${esc(d.exit)}</span></div>` + T.html(d.next, depth + 2) : ''}`).join(''); };
/* netlist verification: schematic net ⇄ PCB pads ⇄ copper connectivity (3D uses the same PCB pads) */
T.verify = () => {
  const tr = OCL.state.trace; if (!tr) return null; const nl = OCL.netlist(), hasPcb = OCL.state.project.pcb && OCL.state.project.pcb.parts.length; const drc = hasPcb ? PCB.analyze() : null;
  return [...tr.nets].map(n => { const net = nl.nets[n]; const sch = net.pins.filter(k => !NETSYM.includes((OCL.findComp(k.split(':')[0]) || {}).type));
    const pads = drc ? drc.pads.filter(p => p.net === n) : []; const rats = drc ? drc.rats.filter(r => r.net === n).length : 0;
    const offboard = sch.filter(k => { const cc = OCL.findComp(k.split(':')[0]); return OCL.defs[cc.type].offboard; }).length;
    const padPins = new Set(pads.map(p => p.cid + ':' + p.pin)), missing = sch.filter(k => { const cc = OCL.findComp(k.split(':')[0]); return !OCL.defs[cc.type].offboard && hasPcb && !padPins.has(k); });
    return { net: n, name: net.name, schPins: sch.length, offboard, pads: pads.length, unrouted: rats, missing, ok: !missing.length && !rats }; });
};
T.panelHTML = () => {
  const tr = OCL.state.trace; if (!tr) return `<div class="empty small">TRACE MY CIRCUIT: click any pin (schematic), pad (PCB) or pad/part (3D) with Trace mode on to follow its connections.</div>`;
  const v = T.verify();
  return `<div class="trace-panel"><div class="row"><b class="grow">${I_('route')} Trace: ${esc(tr.info ? tr.info.ref : '')}·${esc(tr.pin)}</b><div class="seg" id="tr-dir"><button data-d="forward" class="${tr.dir === 'forward' ? 'on' : ''}">Forward</button><button data-d="reverse" class="${tr.dir === 'reverse' ? 'on' : ''}">Reverse</button></div><button class="btn sm" id="tr-clear">Clear</button></div>
    ${tr.info ? `<div class="note-box small" style="margin:8px 0">${OCL.pinInfoHTML(tr.info)}</div>` : ''}${tr.reverseVia ? `<p class="small muted">${esc(tr.reverseVia)}</p>` : ''}
    <h4>Connection path</h4><div class="trace-path">${T.html(tr.steps)}</div>
    <h4 style="margin-top:10px">Netlist verification</h4><table class="ptable"><tr><th>Net</th><th>Schematic pins</th><th>PCB pads</th><th>Copper</th></tr>${v.map(r => `<tr><td class="mono">${esc(r.name)}</td><td>${r.schPins}${r.offboard ? ` <span class="muted small">(${r.offboard} off-board)</span>` : ''}</td><td>${OCL.state.project.pcb && OCL.state.project.pcb.parts.length ? r.pads + (r.missing.length ? ` <span class="sev sev-high">${r.missing.length} missing</span>` : '') : '<span class="muted">no layout</span>'}</td><td>${r.unrouted ? `<span class="sev sev-medium">${r.unrouted} unrouted</span>` : OCL.state.project.pcb && OCL.state.project.pcb.parts.length ? '<span class="sev sev-low">connected</span>' : '—'}</td></tr>`).join('')}</table>
    <p class="muted small">All three views read the same netlist: schematic wires, PCB pads (from the pin map) and 3D pads/tracks (from the PCB). Copy: <a href="#" id="tr-copy">path as text</a>.</p></div>`;
};
const I_ = n => OCL.ui && OCL.ui.icon ? OCL.ui.icon(n) : '';
T.bindPanel = root => { if (!root) return; const tr = OCL.state.trace;
  root.querySelectorAll('#tr-dir button').forEach(b => b.onclick = () => T.start(tr.cid, tr.pin, b.dataset.d)); const cl = root.querySelector('#tr-clear'); if (cl) cl.onclick = () => T.clear();
  root.querySelectorAll('.tr-comp').forEach(a => a.onclick = e => { e.preventDefault(); OCL.ui.selectComp(a.dataset.cid); });
  const cp = root.querySelector('#tr-copy'); if (cp) cp.onclick = e => { e.preventDefault(); navigator.clipboard.writeText(T.text(tr.steps)).then(() => OCL.toast('Path copied', 'ok'), () => OCL.toast('Clipboard blocked', 'warn')); }; };

/* ---------------- schematic split pane (read-only view, synchronized selection & trace) ---------------- */
OCL.SchPane = class {
  constructor(host) {
    this.host = host; host.innerHTML = `<svg class="schpane"><g class="vp"><g class="w"></g><g class="c"></g></g></svg><div class="pane-badge">Schematic · click a part to select · click a pin to trace</div>`;
    this.svg = host.querySelector('svg'); this.vp = this.svg.querySelector('.vp'); this.z = 1; this.px = 0; this.py = 0; let drag = null;
    this.svg.addEventListener('wheel', e => { e.preventDefault(); const r = this.svg.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top, f = e.deltaY < 0 ? 1.12 : 1 / 1.12, nz = OCL.clamp(this.z * f, 0.15, 4); this.px = cx - (cx - this.px) * nz / this.z; this.py = cy - (cy - this.py) * nz / this.z; this.z = nz; this.apply(); }, { passive: false });
    this.svg.addEventListener('mousedown', e => { const pin = e.target.closest('[data-pin]'), comp = e.target.closest('.comp');
      if (pin) { OCL.trace.start(pin.dataset.c, pin.dataset.pin); OCL.ui.selectComp(pin.dataset.c); return; } if (comp) { OCL.ui.selectComp(comp.dataset.id); return; } drag = { x: e.clientX, y: e.clientY, px: this.px, py: this.py }; });
    window.addEventListener('mousemove', this._mm = e => { if (drag) { this.px = drag.px + e.clientX - drag.x; this.py = drag.py + e.clientY - drag.y; this.apply(); } });
    window.addEventListener('mouseup', this._mu = () => drag = null);
    this.svg.addEventListener('mouseover', e => { const pin = e.target.closest('[data-pin]'); if (pin) OCL.tip.show(OCL.pinInfoHTML(OCL.pinInfo(pin.dataset.c, pin.dataset.pin)), e.clientX, e.clientY); });
    this.svg.addEventListener('mouseout', e => { if (e.target.closest('[data-pin]')) OCL.tip.hide(); });
    this.h = [OCL.on('selection', () => this.alive() && this.render()), OCL.on('trace', () => this.alive() && this.render()), OCL.on('circuit', () => this.alive() && this.render())];
    this.render(); setTimeout(() => this.fit(), 20);
  }
  alive() { return this.svg.isConnected; }
  apply() { this.vp.setAttribute('transform', `translate(${this.px},${this.py}) scale(${this.z})`); }
  fit() { const cs = OCL.sheet().components, r = this.svg.getBoundingClientRect(); if (!cs.length || !r.width) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    cs.forEach(c => { const b = OCL.editor.boxOf(c); x0 = Math.min(x0, b.x - 30); y0 = Math.min(y0, b.y - 30); x1 = Math.max(x1, b.x + b.w + 30); y1 = Math.max(y1, b.y + b.h + 30); });
    this.z = Math.min(r.width / (x1 - x0), r.height / (y1 - y0), 1.6); this.px = r.width / 2 - (x0 + x1) / 2 * this.z; this.py = r.height / 2 - (y0 + y1) / 2 * this.z; this.apply(); }
  render() {
    const sh = OCL.sheet(), comps = Object.fromEntries(sh.components.map(c => [c.id, c])), tr = OCL.state.trace, nl = OCL.netlist(), sel = OCL.state.sel;
    this.svg.classList.toggle('tracing', !!tr);
    this.vp.querySelector('.w').innerHTML = sh.wires.map(w => { const a = comps[w.a.c], b = comps[w.b.c]; if (!a || !b) return ''; const pts = [OCL.editor.pinPos(a, w.a.p), ...(w.pts || []), OCL.editor.pinPos(b, w.b.p)];
      let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { if (pts[i - 1][0] !== pts[i][0] && pts[i - 1][1] !== pts[i][1]) d += `H${pts[i][0]}`; d += `V${pts[i][1]}H${pts[i][0]}`; }
      const net = nl.nodeOf[w.a.c + ':' + w.a.p], cls = tr && tr.nets.has(net) ? (net === tr.primary ? ' tprimary' : ' traced') : ''; return `<g class="wire${cls}"><path class="w-line" d="${d}"/></g>`; }).join('');
    this.vp.querySelector('.c').innerHTML = sh.components.map(c => { const d = OCL.defs[c.type], b = OCL.editor.boxOf(c), cls = (sel === c.id ? ' sel' : '') + (tr ? (tr.comps.has(c.id) ? ' traced' : ' dimmed') : '');
      return `<g class="comp${cls}" data-id="${c.id}" transform="translate(${c.x},${c.y})"><rect class="c-hit" x="${b.x - c.x - 4}" y="${b.y - c.y - 4}" width="${b.w + 8}" height="${b.h + 8}" rx="6"/><g class="sym" transform="rotate(${(c.rot || 0) * 90})">${d.symbol(c)}</g>` +
        OCL.pinsOf(c).map(p => { let [x, y] = [p.x, p.y]; for (let i = 0; i < (c.rot || 0); i++) [x, y] = [-y, x]; const k = c.id + ':' + p.id, t = tr && tr.pinKeys.has(k); return `<circle class="pin${t ? ' tpin' : ''}" cx="${x}" cy="${y}" r="${t ? 4.5 : 2.6}"/><circle class="pin-hit" data-pin="${p.id}" data-c="${c.id}" cx="${x}" cy="${y}" r="8"/>`; }).join('') +
        (NETSYM.includes(c.type) ? '' : `<text class="ref" x="0" y="${-b.h / 2 - 8}" text-anchor="middle">${esc(c.ref)}</text>`) + '</g>'; }).join('');
  }
};
})();
