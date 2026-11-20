/* OMAR CIRCUIT LAB — Prototype Validation & Circuit Health Checker
   Structural checks always run; electrical-stress checks use a DC operating point (or the latest simulation). */
'use strict';
(() => {
const SEV = ['critical', 'high', 'medium', 'low', 'info'];
const THETA = { to92: 200, to220: 62.5, dip8: 100, dip14: 80, axial: 100 }; // °C/W typical, still air, no heatsink (approximate)
OCL.SEV = SEV;
OCL.UNSUPPORTED_CHECKS = ['EMC / radiated and conducted emissions', 'Signal integrity, ringing and PCB parasitics', 'Timing and digital protocol correctness (I²C, 1-Wire, firmware)', 'Component tolerance / worst-case and Monte-Carlo analysis',
  'Transient over-voltage, ESD and surge immunity', 'Thermal coupling between parts and heatsink design', 'Leakage current and patient-isolation compliance (IEC 60601-1) — must be measured on real hardware', 'Ageing, derating curves and reliability (MTBF)'];

OCL.validate = (opts = {}) => {
  const issues = [], add = (sev, c, title, why, fix) => issues.push({ sev, comp: c ? c.id : null, ref: c ? c.ref : '—', title, why, fix });
  const comps = OCL.allComponents(), nl = OCL.netlist(), D = OCL.defs;
  const conn = new Map(); OCL.allWires().forEach(w => [w.a, w.b].forEach(e => { const k = e.c + ':' + e.p; conn.set(k, (conn.get(k) || 0) + 1); }));
  if (!comps.length) { add('info', null, 'Empty circuit', 'There is nothing to validate yet.', 'Place components from the library.'); return finish(issues, null); }

  /* 8. missing ground */
  if (!nl.hasGround) add('critical', null, 'Missing ground reference', 'Simulation needs a 0 V reference node; without it node voltages are undefined.', 'Add a Ground symbol and connect it to the negative terminal of your supply.');
  nl.badWires.forEach(() => add('medium', null, 'Dangling wire', 'A wire references a component that no longer exists.', 'Undo, or delete and redraw the wire.'));

  /* 13. unconnected terminals & 6. open nets */
  comps.forEach(c => {
    const d = D[c.type]; if (['label', 'vcc', 'junction'].includes(c.type)) { if (!conn.has(c.id + ':' + OCL.pinsOf(c)[0].id)) add('low', c, 'Unused ' + d.name.toLowerCase(), 'This symbol is not wired to anything.', 'Connect it or delete it.'); return; }
    OCL.pinsOf(c).forEach(p => {
      const k = c.id + ':' + p.id, net = nl.nodeOf[k], alone = net !== 0 && nl.nets[net].pins.length === 1;
      if (alone && !(c.type === 'mcu' && !['VCC', 'GND'].includes(p.id)) && d.sim !== 'none')
        add(['VCC', 'GND', 'IN', 'OUT', '+', '-'].includes(p.id) ? 'high' : 'medium', c, `Unconnected pin ${p.id}`, `${c.ref} pin “${p.id}” is not connected to anything (open circuit).`, 'Wire the pin, or remove the part if unused.');
    });
  });

  /* 7. floating inputs: input pins whose net has no DC path to anything but other inputs/capacitors */
  const pinKind = (c, pid) => { const p = OCL.pinsOf(c).find(x => x.id === pid); const d = D[c.type]; return (p && p.kind) || (d.pinKind && d.pinKind[pid]) || 'passive'; };
  nl.nets.forEach(n => {
    if (!n.id || n.pins.length < 2) return;
    const kinds = n.pins.map(k => { const [cid, pid] = k.split(':'); const c = comps.find(x => x.id === cid); return { c, pid, kind: c && ['capacitor', 'cap_e'].includes(c.type) ? 'cap' : c ? pinKind(c, pid) : 'passive' }; });
    const ins = kinds.filter(k => k.kind === 'in'), drivers = kinds.filter(k => !['in', 'cap', 'probe'].includes(k.kind));
    if (ins.length && !drivers.length) ins.forEach(k => add('high', k.c, `Floating input ${k.pid}`, `Net ${n.name} only connects to inputs${kinds.some(k => k.kind === 'cap') ? ' and capacitors' : ''} — there is no DC bias path, so its voltage is undefined in a real circuit.`, 'Add a bias/pull-up/pull-down resistor or connect the input to a defined source.'));
  });

  /* 5. short circuits: a source whose terminals are joined through zero-ohm elements */
  const parent = {}; const f = x => { while (parent[x] !== undefined && parent[x] !== x) x = parent[x]; return x; }; const u = (a, b) => { a = f(a); b = f(b); if (a !== b) parent[a] = b; };
  for (let i = 0; i < nl.nNodes; i++) parent[i] = i;
  comps.forEach(c => { const N = p => nl.nodeOf[c.id + ':' + p];
    if (c.type === 'ammeter' || (c.type === 'switch' && c.props.closed) || (c.type === 'fuse' && c.props.R < 0.5) || (c.type === 'inductor' && c.props.Rdc < 0.01)) { const ps = OCL.pinsOf(c); u(N(ps[0].id), N(ps[1].id)); } });
  comps.filter(c => ['vdc', 'mains', 'vac'].includes(c.type)).forEach(c => { const ps = OCL.pinsOf(c), a = nl.nodeOf[c.id + ':' + ps[0].id], b = nl.nodeOf[c.id + ':' + ps[1].id];
    if (a === b) add('critical', c, 'Source shorted', `Both terminals of ${c.ref} are on the same net — an ideal source into a short draws unlimited current.`, 'Remove the wire/ammeter across the source; insert a load.');
    else if (f(a) === f(b)) add('critical', c, 'Short circuit path', `${c.ref} is shorted through zero-ohm elements (ammeter, closed switch, fuse or wire).`, 'Ammeters must be placed in series with a load, never directly across a source.');
  });
  /* 10. incompatible: parallel voltage sources with different values */
  const vs = comps.filter(c => ['vdc', 'battery'].includes(c.type)).map(c => ({ c, a: nl.nodeOf[c.id + ':+'], b: nl.nodeOf[c.id + ':-'] }));
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const x = vs[i], y = vs[j];
    if ((x.a === y.a && x.b === y.b && x.c.props.V !== y.c.props.V) || (x.a === y.b && x.b === y.a)) add('critical', y.c, 'Conflicting parallel sources', `${x.c.ref} and ${y.c.ref} are connected directly in parallel with different or opposing voltages.`, 'Use one supply, or add series resistance / ORing diodes.'); }
  comps.filter(c => c.type === 'idc').forEach(c => { const a = nl.nodeOf[c.id + ':+'], b = nl.nodeOf[c.id + ':-']; if (nl.nets[a].pins.length < 2 || nl.nets[b].pins.length < 2) add('high', c, 'Current source with no return path', 'An ideal current source must always have a closed path.', 'Connect a load across it.'); });

  /* 9. pin assignment sanity */
  comps.forEach(c => { const ps = OCL.pinsOf(c); if (ps.length >= 2 && !['ground', 'label', 'vcc', 'junction', 'block'].includes(c.type)) { const ns = ps.map(p => nl.nodeOf[c.id + ':' + p.id]); if (new Set(ns).size === 1 && conn.size) add('medium', c, 'All pins on one net', `Every pin of ${c.ref} is connected to the same net, so it does nothing.`, 'Check the wiring of this part.'); } });

  /* 12. missing protection (structural) */
  const hasFuse = comps.some(c => c.type === 'fuse');
  if (comps.some(c => c.type === 'mains') && !hasFuse) add('medium', comps.find(c => c.type === 'mains'), 'No fuse on mains input', 'Mains-connected equipment needs over-current protection on the live conductor.', 'Add a fuse in series with L before the transformer.');
  comps.filter(c => ['npn', 'nmos'].includes(c.type)).forEach(q => {
    const out = nl.nodeOf[q.id + ':' + (q.type === 'npn' ? 'C' : 'D')];
    comps.filter(l => D[l.type].inductive || l.type === 'inductor').forEach(l => { const ps = OCL.pinsOf(l), n1 = nl.nodeOf[l.id + ':' + ps[0].id], n2 = nl.nodeOf[l.id + ':' + ps[1].id];
      if (n1 === out || n2 === out) { const other = n1 === out ? n2 : n1; const hasFly = comps.some(d => ['diode', 'zener'].includes(d.type) && ((nl.nodeOf[d.id + ':A'] === out && nl.nodeOf[d.id + ':K'] === other)));
        if (!hasFly) add('high', l, 'Missing flyback diode', `${l.ref} is an inductive load switched by ${q.ref}; switching it off creates a large voltage spike that can destroy the transistor.`, `Add a diode across ${l.ref} (anode to ${q.ref} side, cathode to supply side).`); } });
  });

  /* electrical stress checks need an operating point */
  let R = null, src = 'none';
  if (nl.hasGround && !issues.some(i => i.sev === 'critical')) {
    if (OCL.sim.readings && OCL.sim.circuit && (OCL.sim.status === 'done' || OCL.sim.status === 'paused') && !opts.forceDC) { R = OCL.sim.readings; src = 'latest simulation'; }
    else { try { const c = new OCL.Circuit(nl); if (c.dc()) { R = c.readings(); src = 'DC operating point'; } } catch (e) { add('high', null, 'Operating point failed', 'Could not compute a DC operating point: ' + e.message, 'Fix structural errors first.'); } }
  }
  if (R) comps.forEach(c => {
    const r = R[c.id]; if (!r) return; const p = c.props, aI = Math.abs(r.I), aV = Math.abs(r.V);
    switch (c.type) {
      case 'resistor': case 'pot': case 'ntc': { const P = Math.abs(r.P); if (P > p.P) add('critical', c, 'Power rating exceeded', `${c.ref} dissipates ${OCL.fmt(P, 'W')} but is rated ${OCL.fmt(p.P, 'W')} — it will overheat or burn.`, `Use a resistor rated ≥ ${OCL.fmt(P * 2, 'W')} (2× derating) or increase resistance.`);
        else if (P > p.P * 0.6) add('low', c, 'Little power margin', `${c.ref} runs at ${Math.round(P / p.P * 100)} % of its power rating.`, 'Good practice is ≤ 50–60 % of rating for reliability.'); break; }
      case 'capacitor': case 'cap_e': { if (aV > p.Vmax) add('critical', c, 'Voltage rating exceeded', `${c.ref} sees ${OCL.fmt(aV, 'V')} but is rated ${p.Vmax} V.`, `Choose a capacitor rated ≥ ${Math.ceil(aV * 1.5)} V.`); else if (aV > p.Vmax * 0.8) add('medium', c, 'Capacitor near voltage rating', `${c.ref} runs at ${Math.round(aV / p.Vmax * 100)} % of rated voltage.`, 'Derate electrolytics to ≤ 80 % of rated voltage.');
        if (c.type === 'cap_e' && r.V < -0.5) add('critical', c, 'Reverse-polarity electrolytic', `${c.ref} has ${OCL.fmt(r.V, 'V')} across it (+ terminal negative). Electrolytics can vent or explode when reversed.`, 'Swap the capacitor orientation or use a non-polarised type.'); break; }
      case 'diode': case 'zener': { if (aI > p.Imax) add('critical', c, 'Forward current exceeded', `${c.ref} conducts ${OCL.fmt(aI, 'A')}, rating ${OCL.fmt(p.Imax, 'A')}.`, 'Add series resistance or choose a higher-current diode.');
        if (c.type === 'diode' && -r.V > p.Vrrm) add('critical', c, 'Reverse voltage exceeded', `${c.ref} blocks ${OCL.fmt(-r.V, 'V')} > VRRM ${p.Vrrm} V.`, 'Choose a diode with higher VRRM.');
        if (c.type === 'zener') { const Pz = Math.abs(r.P); if (Pz > p.Pmax) add('critical', c, 'Zener power exceeded', `${c.ref} dissipates ${OCL.fmt(Pz, 'W')} > ${p.Pmax} W.`, 'Increase the series resistor.'); } break; }
      case 'led': { if (aI > p.Imax) add('critical', c, 'LED over-current', `${c.ref} draws ${OCL.fmt(aI, 'A')} (max ${OCL.fmt(p.Imax, 'A')}). ${aI > 5 * p.Imax ? 'This usually means there is no current-limiting resistor.' : ''}`, `Add/increase the series resistor: R ≈ (Vsupply − Vf) / ${OCL.fmt(p.Imax * 0.75, 'A')}.`);
        if (r.V < -p.Vr) add('high', c, 'LED reverse voltage exceeded', `${c.ref} is reverse-biased by ${OCL.fmt(-r.V, 'V')} (max ${p.Vr} V).`, 'Check polarity or add an anti-parallel diode.');
        else if (r.V < -0.5) add('info', c, 'LED reverse-biased', `${c.ref} is reverse-biased and will stay dark.`, 'Swap anode/cathode if it should light.'); break; }
      case 'npn': case 'pnp': { const vce = Math.abs(r.x.Vce), ic = Math.abs(r.x.Ic), P = Math.abs(r.P);
        if (vce > p.Vceo) add('critical', c, 'Vce rating exceeded', `${c.ref}: |Vce| = ${OCL.fmt(vce, 'V')} > Vceo ${p.Vceo} V.`, 'Choose a higher-voltage transistor.');
        if (ic > p.Icmax) add('critical', c, 'Collector current exceeded', `${c.ref}: |Ic| = ${OCL.fmt(ic, 'A')} > ${OCL.fmt(p.Icmax, 'A')}.`, 'Limit load current or use a MOSFET/power BJT.');
        thermal(c, P, p.Pd, 'to92'); break; }
      case 'nmos': case 'pmos': { if (Math.abs(r.x.Vds) > p.Vds) add('critical', c, 'Vds rating exceeded', `${c.ref}: |Vds| = ${OCL.fmt(Math.abs(r.x.Vds), 'V')} > ${p.Vds} V.`, 'Choose a higher-voltage MOSFET.');
        if (Math.abs(r.x.Id) > p.Idmax) add('critical', c, 'Drain current exceeded', `${c.ref}: |Id| = ${OCL.fmt(Math.abs(r.x.Id), 'A')}.`, 'Reduce load current.');
        if (r.x.region === 'saturation' && Math.abs(r.x.Id) > 0.05) add('medium', c, 'MOSFET not fully enhanced', `${c.ref} is conducting ${OCL.fmt(Math.abs(r.x.Id), 'A')} in saturation (not as a closed switch) — it dissipates ${OCL.fmt(Math.abs(r.P), 'W')}.`, 'Increase gate drive or use a logic-level MOSFET.');
        thermal(c, Math.abs(r.P), p.Pd, 'to220'); break; }
      case 'regulator': { const x = r.x; if (x.Vin > p.Vinmax) add('critical', c, 'Input voltage exceeded', `${c.ref} input ${OCL.fmt(x.Vin, 'V')} > ${p.Vinmax} V.`, 'Lower the input voltage.');
        if (x.Vout - 0.5 > x.Vin) add('high', c, 'IN/OUT likely swapped', `${c.ref} output (${OCL.fmt(x.Vout, 'V')}) is above its input.`, 'Check the IN and OUT pin connections.');
        if (x.dropout && x.Vin > 0.5) add('high', c, 'Regulator in dropout', `${c.ref} needs Vin ≥ ${p.Vout + p.Vdo} V but has ${OCL.fmt(x.Vin, 'V')} — output is not regulated.`, 'Raise the input voltage or use an LDO.');
        if (Math.abs(x.Iout) > p.Imax) add('critical', c, 'Output current exceeded', `${c.ref} supplies ${OCL.fmt(x.Iout, 'A')} > ${p.Imax} A.`, 'Reduce load or use a switching converter.');
        const Tj = 25 + x.Pdiss * p.theta; if (Tj > 125) add('critical', c, 'Regulator will overheat', `${c.ref} dissipates ${OCL.fmt(x.Pdiss, 'W')} → Tj ≈ ${Tj.toFixed(0)} °C without heatsink (θJA ${p.theta} °C/W).`, 'Add a heatsink, pre-drop the input, or use a buck converter.');
        else if (x.Pdiss > 1) add('medium', c, 'Regulator needs heatsinking', `${c.ref} dissipates ${OCL.fmt(x.Pdiss, 'W')} (Tj ≈ ${Tj.toFixed(0)} °C).`, 'Fit a small heatsink.'); break; }
      case 'inductor': if (aI > p.Imax) add('high', c, 'Inductor current exceeded', `${c.ref} carries ${OCL.fmt(aI, 'A')} > ${p.Imax} A (saturation/overheating).`, 'Use a higher-current inductor.'); break;
      case 'fuse': if (aI > p.I) add('critical', c, 'Fuse would blow', `${c.ref} carries ${OCL.fmt(aI, 'A')} > ${p.I} A rating.`, 'Find the over-current cause, or re-size the fuse for the real load.'); break;
      case 'vdc': case 'battery': if (aI > p.Ilim) add('high', c, 'Supply current limit exceeded', `${c.ref} delivers ${OCL.fmt(aI, 'A')}, above its ${OCL.fmt(p.Ilim, 'A')} limit.`, 'Reduce load or use a bigger supply.'); break;
      case 'mcu': { [['Id13', 'D13'], ['Id12', 'D12']].forEach(([k, pin]) => { if (Math.abs(r.x[k]) > p.Ipin) add('high', c, `Pin ${pin} over-current`, `${c.ref} pin ${pin} sources/sinks ${OCL.fmt(Math.abs(r.x[k]), 'A')} (> ${OCL.fmt(p.Ipin, 'A')} recommended).`, 'Drive the load through a transistor or add a series resistor.'); });
        ['A0', 'A1', 'A2'].forEach(a => { const v = r.pins[a] - r.pins.GND; if (v > p.vcc + 0.3 || v < -0.3) add(p.vcc < 4 ? 'critical' : 'high', c, `Pin ${a} outside supply range`, `${a} sees ${OCL.fmt(v, 'V')} on a ${p.vcc} V device${p.vcc < 4 ? ' (not 5 V tolerant)' : ''}.`, 'Use a voltage divider or level shifter.'); }); break; }
      case 'opamp': case 'inamp': case 'comparator': {
        ['IN+', 'IN-'].forEach(pin => { const v = r.pins[pin]; if (v > p.vpos + 0.3 || v < p.vneg - 0.3) add('high', c, `Input ${pin} beyond rails`, `${c.ref} ${pin} is at ${OCL.fmt(v, 'V')}, outside its ${p.vneg}…${p.vpos} V rails.`, 'Clamp or attenuate the input.'); });
        if (r.x.saturated && c.type !== 'comparator') add('medium', c, 'Amplifier saturated', `${c.ref} output is stuck at the ${r.x.saturated} (${OCL.fmt(r.x.Vout, 'V')}).`, 'Reduce gain or input amplitude, check feedback wiring and input offset.'); break; }
      case 'timer555': { const vcc = r.pins.VCC - r.pins.GND; if (vcc > p.Vmax) add('critical', c, '555 supply exceeded', `${c.ref} VCC = ${OCL.fmt(vcc, 'V')} > ${p.Vmax} V.`, 'Lower the supply.'); break; }
    }
  });
  function thermal(c, P, Pmax, pkg) {
    if (P > Pmax) add('critical', c, 'Power dissipation exceeded', `${c.ref} dissipates ${OCL.fmt(P, 'W')} > ${OCL.fmt(Pmax, 'W')} rating.`, 'Reduce current/voltage, add heatsink or choose a power device.');
    const Tj = 25 + P * (THETA[pkg] || 100); if (Tj > 125 && P <= Pmax) add('high', c, 'High junction temperature', `Estimated Tj ≈ ${Tj.toFixed(0)} °C (θJA ≈ ${THETA[pkg]} °C/W, 25 °C ambient).`, 'Add heatsinking or reduce dissipation.');
  }
  /* 11. supply mismatch */
  const supplies = comps.filter(c => ['vdc', 'battery'].includes(c.type)).map(c => +c.props.V);
  if (supplies.length) comps.filter(c => ['opamp', 'inamp'].includes(c.type)).forEach(c => { const span = c.props.vpos - c.props.vneg, maxS = Math.max(...supplies.map(Math.abs));
    if (span > 2 * maxS + 1 && !comps.some(x => x.type === 'mains')) add('medium', c, 'Implicit op-amp rails vs. circuit supply', `${c.ref} assumes rails ${c.props.vneg}/${c.props.vpos} V but the largest supply in the circuit is ${maxS} V.`, 'Set the rails in Properties to match the real supply.'); });
  if (comps.some(c => D[c.type].sim === 'none')) add('info', comps.find(c => D[c.type].sim === 'none'), 'Catalog-only parts present', 'Parts without simulation models are open circuits during simulation and are not stress-checked.', 'Replace with modelled parts where electrical behaviour matters.');
  if (comps.some(c => c.type === 'ecgsrc' || c.type === 'ppgsrc' || c.type === 'photodiode')) add('info', null, 'Medical prototype — educational only', 'Simulation cannot verify patient isolation, leakage current, EMC or IEC 60601-1 compliance.', 'Never connect an experimental circuit to a person. Use certified isolated equipment for any human testing.');
  if (comps.some(c => c.type === 'mains')) add('info', comps.find(c => c.type === 'mains'), 'Hazardous voltage', 'Mains voltages can kill. This model ignores insulation, creepage and earthing.', 'Build mains stages only under qualified supervision with proper enclosures.');
  return finish(issues, src);
};
function finish(issues, src) {
  issues.sort((a, b) => SEV.indexOf(a.sev) - SEV.indexOf(b.sev));
  const counts = Object.fromEntries(SEV.map(s => [s, issues.filter(i => i.sev === s).length]));
  const score = Math.max(0, 100 - counts.critical * 25 - counts.high * 10 - counts.medium * 4 - counts.low * 1);
  OCL.state.flagged = new Map(); issues.forEach(i => { if (i.comp && !OCL.state.flagged.has(i.comp) && i.sev !== 'info') OCL.state.flagged.set(i.comp, i.sev); });
  const rep = { issues, counts, score, src, at: Date.now() }; OCL.state.lastValidation = rep; return rep;
}
})();
