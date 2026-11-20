/* OMAR CIRCUIT LAB — AI Engineering Copilot
   LOCAL RULE-BASED ENGINE: deterministic calculators + circuit-aware diagnostics using the real netlist,
   simulation results and validation report. No external AI service is connected in this build. */
'use strict';
(() => {
const C = OCL.copilot = { history: [] };
const f = OCL.fmt, esc = OCL.esc;
const nums = s => { const out = []; const re = /([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*([pnuµmkKMG]?)\s*(ohms?|Ω|v|volts?|a|amps?|f|farads?|h|henr\w*|hz|w|watts?|%)?/gi; let m;
  while ((m = re.exec(s))) { const v = parseFloat(m[1]) * ({ p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 }[m[2]] || 1); let u = (m[3] || '').toLowerCase();
    u = u.startsWith('ohm') || u === 'ω' ? 'Ω' : u.startsWith('v') ? 'V' : u.startsWith('a') ? 'A' : u.startsWith('f') ? 'F' : u.startsWith('hz') ? 'Hz' : u.startsWith('h') ? 'H' : u.startsWith('w') ? 'W' : u === '%' ? '%' : '';
    if (m[2] === 'M' && !u) u = ''; out.push({ v, u, raw: m[0] }); } return out; };
const pick = (ns, u) => ns.filter(n => n.u === u).map(n => n.v);
const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
const e24 = (r, up = true) => { const d = 10 ** Math.floor(Math.log10(r)); const m = r / d; const c = up ? E24.find(x => x >= m - 1e-9) || 10 : [...E24].reverse().find(x => x <= m + 1e-9) || 1; return c * d; };
const lvl = () => OCL.state.settings.level;
const say = (html, actions = []) => ({ html, actions });
const explain = (b, d, a) => ({ beginner: b, diploma: d, advanced: a }[lvl()] || d);

const intents = [
  { re: /(led).*(resistor|series|limit)|(resistor).*(led)/i, fn: q => { const n = nums(q); const vs = pick(n, 'V')[0] ?? 5; const col = (q.match(/red|green|blue|white|yellow|ir|infrared/i) || ['red'])[0].toLowerCase(); const vf = { red: 1.9, green: 2.1, yellow: 2.0, blue: 3.0, white: 3.1, ir: 1.3, infrared: 1.3 }[col]; const i = pick(n, 'A')[0] ?? 0.015;
    const R = (vs - vf) / i, Rs = e24(R), Ia = (vs - vf) / Rs, P = Ia * Ia * Rs;
    return say(`<b>LED series resistor</b><br>R = (V<sub>s</sub> − V<sub>f</sub>) / I = (${f(vs, 'V')} − ${vf} V) / ${f(i, 'A')} = <b>${f(R, 'Ω')}</b><br>Nearest E24 above: <b>${f(Rs, 'Ω')}</b> → I ≈ ${f(Ia, 'A')}, P<sub>R</sub> ≈ ${f(P, 'W')} → a ${P > 0.125 ? '½ W' : '¼ W'} resistor is fine.<br><span class="muted">${explain('The resistor “uses up” the extra voltage so the LED gets a safe current.', 'Assumes a typical ' + col + ' LED forward voltage of ' + vf + ' V; check your LED datasheet.', 'Vf varies with current and temperature (≈ −2 mV/°C); for precise brightness use a constant-current driver.')}</span>`); } },
  { re: /divider|divide/i, fn: q => { const n = nums(q), v = pick(n, 'V'); const vin = v[0] ?? 12, vout = v[1] ?? 5; const rs = pick(n, 'Ω');
    if (rs.length >= 2) { const vo = vin * rs[1] / (rs[0] + rs[1]); return say(`<b>Voltage divider</b><br>V<sub>out</sub> = V<sub>in</sub> × R2/(R1 + R2) = ${f(vin, 'V')} × ${f(rs[1], 'Ω')}/${f(rs[0] + rs[1], 'Ω')} = <b>${f(vo, 'V')}</b><br>Divider current: ${f(vin / (rs[0] + rs[1]), 'A')}`); }
    const r2 = 10000, r1 = r2 * (vin / vout - 1), r1s = e24(r1, false), vo = vin * r2 / (r1s + r2);
    return say(`<b>Voltage divider ${f(vin, 'V')} → ${f(vout, 'V')}</b><br>Choose R2 = 10 kΩ → R1 = R2 (V<sub>in</sub>/V<sub>out</sub> − 1) = <b>${f(r1, 'Ω')}</b><br>E24: R1 = ${f(r1s, 'Ω')} → V<sub>out</sub> = ${f(vo, 'V')}. Current ≈ ${f(vin / (r1s + r2), 'A')}.<br><span class="muted">A divider is not a power supply — the output sags under load. For loads, use a regulator or buffer it with an op-amp.</span>`, [{ label: 'Insert divider lesson', act: () => OCL.ui.openTemplate('divider') }]); } },
  { re: /(cut-?off|corner|filter|rc)\b.*|low.?pass|high.?pass/i, fn: q => { const n = nums(q), R = pick(n, 'Ω')[0], Cc = pick(n, 'F')[0], fc = pick(n, 'Hz')[0];
    if (R && Cc) return say(`<b>RC filter</b><br>f<sub>c</sub> = 1/(2πRC) = 1/(2π × ${f(R, 'Ω')} × ${f(Cc, 'F')}) = <b>${f(1 / (2 * Math.PI * R * Cc), 'Hz')}</b><br>τ = RC = ${f(R * Cc, 's')} · roll-off 20 dB/decade (first order).`);
    if (fc) { const Rr = 10000, Cn = 1 / (2 * Math.PI * Rr * fc); return say(`<b>RC filter for ${f(fc, 'Hz')}</b><br>With R = 10 kΩ → C = 1/(2πRf<sub>c</sub>) = <b>${f(Cn, 'F')}</b>. Pick the nearest standard capacitor and recompute f<sub>c</sub>.<br><span class="muted">ECG monitoring band is typically 0.5–40 Hz; diagnostic 0.05–150 Hz.</span>`); }
    return say('Give me R and C (e.g. “RC cutoff 10k 100n”) or a target frequency (e.g. “low-pass 40 Hz”).'); } },
  { re: /gain|amplif|non.?invert|inverting/i, fn: q => { const n = nums(q), rs = pick(n, 'Ω'), inv = /\binverting\b/i.test(q) && !/non/i.test(q);
    if (/instrument|ina|ad620|ecg/i.test(q)) { const G = n.find(x => !x.u) ? n.find(x => !x.u).v : 100; const Rg = 50000 / (G - 1); return say(`<b>Instrumentation amplifier (INA128-type)</b><br>G = 1 + 50 kΩ/R<sub>G</sub> → for G = ${G}: R<sub>G</sub> = 50 k/(G − 1) = <b>${f(Rg, 'Ω')}</b> (AD620: 49.4 kΩ/(G − 1) = ${f(49400 / (G - 1), 'Ω')}).<br><span class="muted">${explain('It amplifies the tiny difference between two electrodes and ignores what is common to both.', 'Keep first-stage ECG gain modest (≈10–100) because electrode DC offsets can saturate the output.', 'Total CMRR also depends on electrode-impedance mismatch; use a driven right leg and shielded leads.')}</span>`, [{ label: 'Open ECG front-end template', act: () => OCL.ui.openTemplate('ecg') }]); }
    if (rs.length >= 2) { const [rf, rg] = rs; const G = inv ? -rf / rg : 1 + rf / rg; return say(`<b>${inv ? 'Inverting' : 'Non-inverting'} amplifier</b><br>G = ${inv ? '−Rf/Rin' : '1 + Rf/Rg'} = <b>${G.toFixed(3)}</b> (${(20 * Math.log10(Math.abs(G))).toFixed(1)} dB)`); }
    return say('Tell me the resistors, e.g. “non-inverting gain Rf 10k Rg 1k”, or a target gain for an instrumentation amp: “INA gain 100”.', [{ label: 'Open op-amp template', act: () => OCL.ui.openTemplate('opamp') }]); } },
  { re: /power|dissipat|watt/i, fn: q => { const n = nums(q), V = pick(n, 'V')[0], I = pick(n, 'A')[0], R = pick(n, 'Ω')[0]; let out = '';
    if (V !== undefined && R) out = `P = V²/R = ${f(V * V / R, 'W')}, I = ${f(V / R, 'A')}`; else if (I !== undefined && R) out = `P = I²R = ${f(I * I * R, 'W')}, V = ${f(I * R, 'V')}`; else if (V !== undefined && I !== undefined) out = `P = VI = ${f(V * I, 'W')}, R = ${f(V / I, 'Ω')}`;
    return say(out ? `<b>Power</b><br>${out}<br><span class="muted">Choose components rated at ≥ 2× the calculated dissipation.</span>` : 'Give two of V, I, R — e.g. “power 12V 100 ohm”.'); } },
  { re: /ohm'?s?\s*law|current through|voltage across|calculate (the )?(current|voltage|resistance)/i, fn: q => { const n = nums(q), V = pick(n, 'V')[0], I = pick(n, 'A')[0], R = pick(n, 'Ω')[0];
    if (V !== undefined && R) return say(`I = V/R = ${f(V, 'V')}/${f(R, 'Ω')} = <b>${f(V / R, 'A')}</b>`); if (I !== undefined && R) return say(`V = IR = <b>${f(I * R, 'V')}</b>`); if (V !== undefined && I) return say(`R = V/I = <b>${f(V / I, 'Ω')}</b>`);
    return say('Ohm’s law: V = I × R. Give me any two values (e.g. “current through 220 ohm at 5V”).'); } },
  { re: /555|astable|blink|flash|timer/i, fn: q => { const n = nums(q), rs = pick(n, 'Ω'), c = pick(n, 'F')[0]; if (rs.length >= 2 && c) { const fr = 1.44 / ((rs[0] + 2 * rs[1]) * c); return say(`<b>555 astable</b><br>f = 1.44/((R<sub>A</sub> + 2R<sub>B</sub>)C) = <b>${f(fr, 'Hz')}</b>, duty = ${((rs[0] + rs[1]) / (rs[0] + 2 * rs[1]) * 100).toFixed(1)} %`); }
    return say('555 astable: f = 1.44/((RA + 2RB)·C). Example: “555 RA 10k RB 68k C 10u”.', [{ label: 'Open alarm template', act: () => OCL.ui.openTemplate('alarm') }]); } },
  { re: /5\s*v.*(supply|regulat)|regulated (power )?supply|power supply design/i, fn: () => say(`<b>Design: 5 V regulated supply</b><ol><li>Transformer 240 V → 12 V AC (≈17 V peak).</li><li>Bridge rectifier (1 A).</li><li>Reservoir C ≈ I/(2fΔV): for 100 mA and 1 V ripple → 1000 µF, 25–35 V rated.</li><li>LM7805 (needs V<sub>in</sub> ≥ 7 V); 0.33 µF in, 0.1 µF out.</li><li>Fuse on the primary; heatsink if (V<sub>in</sub> − 5) × I > ≈1 W.</li></ol>`, [{ label: 'Insert 5 V PSU template', act: () => OCL.ui.openTemplate('psu') }]) },
  { re: /ecg|electrocardio/i, fn: () => say(`<b>ECG signal conditioning chain</b><br>Electrodes → protection/RFI filter → instrumentation amp (G ≈ 10–100) → high-pass 0.5 Hz → gain → low-pass 40–150 Hz → (optional notch) → ADC, all behind an isolation barrier with a driven right leg.`, [{ label: 'Open ECG template', act: () => OCL.ui.openTemplate('ecg') }]) },
  { re: /spo2|oximet|ppg/i, fn: () => say(`<b>Pulse oximetry</b><br>R = (AC/DC)<sub>red</sub> / (AC/DC)<sub>IR</sub>; SpO₂ comes from an empirical calibration curve (≈110 − 25R is a textbook illustration only). Real devices need calibration against reference data.`, [{ label: 'Open pulse-oximeter template', act: () => OCL.ui.openTemplate('pulseox') }]) },
  { re: /instrumentation amplifier|suggest.*(amp|ina)/i, fn: () => say(`<b>Suggested instrumentation amplifiers</b><ul><li><b>INA128</b> (TI): G = 1 + 50 kΩ/R<sub>G</sub>, ±2.25 … ±18 V.</li><li><b>AD620</b> (ADI): G = 1 + 49.4 kΩ/R<sub>G</sub>, ±2.3 … ±18 V.</li><li><b>AD8232</b> (ADI): integrated single-lead ECG front end, 2.0–3.5 V.</li></ul>Check CMRR at your gain and supply in the datasheet.`) },
  { re: /review|improve|check my|design review|suggest improvements/i, fn: () => review() },
  { re: /why|not switching|saturat|wrong|incorrect|short|floating|excess|too (much|high)|error|fault|troubleshoot|not working|doesn'?t work/i, fn: q => troubleshoot(q) },
  { re: /explain.*(each|every|all|component|circuit)|what does (each|this)/i, fn: () => explainCircuit() },
  { re: /^(hi|hello|help|what can you do)/i, fn: () => capabilities() }
];
function capabilities() { return say(`I’m the <b>local rule-based Engineering Copilot</b> — I run entirely in your browser and read your actual circuit, simulation results and validation report. Try:<ul>
<li>“LED resistor 9V red” · “divider 12V to 3.3V” · “RC cutoff 10k 100n” · “INA gain 100” · “555 RA 10k RB 68k C 10u”</li>
<li>“Review my circuit” · “Why is my transistor not switching?” · “Why is my amplifier saturating?” · “Find short circuits” · “Explain each component”</li>
<li>“Design a 5V regulated power supply” · “Help me build an ECG front end”</li></ul><span class="muted">No external AI model is connected in this build — answers come from engineering formulas and rule checks.</span>`); }
function ensureSim() { if (!OCL.sim.readings || OCL.sim.status === 'error') { try { const { nl, circ } = OCL.sim.prepare(); if (circ.dc()) return { R: circ.readings(), nl }; } catch (e) { return { err: e.message }; } return { err: 'DC operating point did not converge.' }; } return { R: OCL.sim.readings, nl: OCL.sim.nl || OCL.netlist() }; }
function review() {
  const comps = OCL.allComponents(); if (!comps.length) return say('Your circuit is empty — place some components first, or open a template.');
  const rep = OCL.validate(); OCL.emit('validated', rep);
  const groups = OCL.SEV.map(s => [s, rep.issues.filter(i => i.sev === s)]).filter(([, l]) => l.length);
  const obs = []; const t = c => comps.filter(x => x.type === c).length;
  obs.push(`${comps.length} parts, ${OCL.allWires().length} wires, ${OCL.netlist().nNodes - 1} nets (+ ground).`);
  if (t('opamp') + t('inamp')) obs.push('Contains amplifier stages — confirm the implicit supply rails in each op-amp’s properties match your real supply.');
  if (comps.some(c => OCL.defs[c.type].sim === 'none')) obs.push('Some catalog-only parts are not simulated.');
  if (t('cap_e') && !t('capacitor')) obs.push('Electrolytics are present without small ceramic decoupling capacitors — add 100 nF near each IC supply pin in hardware.');
  return say(`<b>Design review</b> <span class="pill">health ${rep.score}/100</span> <span class="muted small">(${rep.src || 'structural only'})</span><br><b>Observations</b><ul>${obs.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` +
    (groups.length ? groups.map(([s, l]) => `<b class="sev-${s}">${s.toUpperCase()} (${l.length})</b><ul>${l.slice(0, 8).map(i => `<li><b>${esc(i.ref)}</b> — ${esc(i.title)}: ${esc(i.why)} <i>Fix:</i> ${esc(i.fix)}</li>`).join('')}</ul>`).join('') : '<p>No issues found by the implemented checks.</p>') +
    `<b>Recommended next steps</b><ol><li>Fix critical/high items, then re-run simulation.</li><li>Probe key nodes with the oscilloscope.</li><li>Document assumptions in the Engineering Notebook.</li><li>Move to PCB layout once the health score is ≥ 90.</li></ol>`, [{ label: 'Open validation report', act: () => OCL.ui.showBottom('validation') }]);
}
function troubleshoot(q) {
  const s = ensureSim(); if (s.err) return say(`I couldn’t analyse the circuit: ${esc(s.err)}`, [{ label: 'Run validation', act: () => OCL.ui.runValidation() }]);
  const { R } = s, comps = OCL.allComponents(), out = [];
  if (/transistor|bjt|mosfet|switch/i.test(q)) {
    comps.filter(c => ['npn', 'pnp'].includes(c.type)).forEach(c => { const r = R[c.id].x, sg = c.type === 'pnp' ? -1 : 1;
      if (sg * r.Vbe < 0.55) out.push(`<b>${c.ref}</b> is OFF: V<sub>BE</sub> = ${f(r.Vbe, 'V')} (needs ≈ 0.6–0.7 V). Check the base drive/connection and that the emitter goes to the right rail.`);
      else if (r.region === 'active' && Math.abs(r.Ic) > 1e-3) out.push(`<b>${c.ref}</b> is in the ACTIVE region (V<sub>CE</sub> = ${f(r.Vce, 'V')}), not saturated. For switching, reduce the base resistor so I<sub>B</sub> ≥ I<sub>C</sub>/10 (I<sub>C</sub> = ${f(r.Ic, 'A')}, I<sub>B</sub> = ${f(r.Ib, 'A')}, forced β = ${(r.Ic / r.Ib).toFixed(0)}).`);
      else out.push(`<b>${c.ref}</b> is ${r.region}: I<sub>C</sub> = ${f(r.Ic, 'A')}, V<sub>CE</sub> = ${f(r.Vce, 'V')}, I<sub>B</sub> = ${f(r.Ib, 'A')}.`); });
    comps.filter(c => ['nmos', 'pmos'].includes(c.type)).forEach(c => { const r = R[c.id].x; out.push(`<b>${c.ref}</b>: V<sub>GS</sub> = ${f(r.Vgs, 'V')} vs V<sub>th</sub> ${c.props.vth} V → ${r.region}. ${r.region === 'cut-off' ? 'Gate drive too low or gate floating.' : r.region === 'saturation' && Math.abs(r.Id) > 0.05 ? 'Not fully enhanced — use more gate voltage or a logic-level MOSFET.' : ''}`); });
  }
  if (/amp|saturat|op.?amp|output/i.test(q)) comps.filter(c => ['opamp', 'inamp'].includes(c.type)).forEach(c => { const r = R[c.id].x, p = c.props;
    if (r.saturated) out.push(`<b>${c.ref}</b> output is at the ${r.saturated} (${f(r.Vout, 'V')}). Causes: gain × input exceeds (rails − ${p.swing} V headroom); feedback path open; IN+ and IN− swapped (positive feedback); input offset amplified by very high gain.`);
    else out.push(`<b>${c.ref}</b> is linear: V<sub>out</sub> = ${f(r.Vout, 'V')}, V<sub>d</sub> = ${f(r.Vd, 'V')}. Allowed swing ${p.vneg + p.swing}…${p.vpos - p.swing} V.`); });
  if (/short|excess|current|too (much|high)|hot|burn/i.test(q)) { const rep = OCL.validate(); rep.issues.filter(i => /short|current|power|over/i.test(i.title)).slice(0, 8).forEach(i => out.push(`<b>${esc(i.ref)}</b> — ${esc(i.title)}: ${esc(i.why)}`));
    const big = comps.map(c => ({ c, I: Math.abs(R[c.id] ? R[c.id].I : 0) })).filter(x => !['ground', 'label', 'vcc', 'junction', 'voltmeter', 'scope'].includes(x.c.type)).sort((a, b) => b.I - a.I).slice(0, 3);
    out.push('Highest currents: ' + big.map(x => `${x.c.ref} ${f(x.I, 'A')}`).join(', ')); }
  if (/float/i.test(q)) { const rep = OCL.validate(); const fl = rep.issues.filter(i => /Floating|Unconnected/.test(i.title)); out.push(fl.length ? fl.map(i => `<b>${esc(i.ref)}</b> — ${esc(i.title)}`).join('<br>') : 'No floating inputs or unconnected pins detected.'); }
  if (/output voltage|incorrect|wrong/i.test(q)) comps.filter(c => c.type === 'regulator').forEach(c => { const x = R[c.id].x; out.push(`<b>${c.ref}</b>: V<sub>in</sub> ${f(x.Vin, 'V')} → V<sub>out</sub> ${f(x.Vout, 'V')}${x.dropout ? ' — in DROPOUT (input too low).' : '.'}`); });
  if (/error|simulat/i.test(q)) out.push(OCL.sim.error ? `Last simulation error: ${esc(OCL.sim.error)}` : 'The last simulation completed without errors.');
  if (!out.length) { const rep = OCL.validate(); out.push(rep.issues.length ? 'Here are the validation findings:<br>' + rep.issues.slice(0, 6).map(i => `<b>${esc(i.ref)}</b> — ${esc(i.title)}: ${esc(i.fix)}`).join('<br>') : 'I found no problems with the implemented checks. Describe the symptom (e.g. “LED doesn’t light”, “output is 0 V”).'); }
  return say('<b>Troubleshooting (based on your circuit’s operating point)</b><br>' + out.map(o => `<p>${o}</p>`).join(''), [{ label: 'Highlight issues', act: () => OCL.ui.runValidation() }]);
}
function explainCircuit() {
  const comps = OCL.allComponents().filter(c => !['ground', 'label', 'vcc', 'junction'].includes(c.type)); if (!comps.length) return say('Nothing to explain yet.');
  const role = c => ({ resistor: explain('limits current / sets voltages', 'current limiting, biasing, dividers or gain setting', 'sets operating points; contributes thermal noise √(4kTRB)'), capacitor: 'filtering, coupling, decoupling or timing', cap_e: 'bulk energy storage / smoothing (polarised)', inductor: 'energy storage, filtering', diode: 'one-way valve: rectification or protection', zener: 'voltage reference / clamp', led: 'indicator light', npn: 'current-controlled switch or amplifier', pnp: 'high-side switch / complementary stage', nmos: 'voltage-controlled low-side switch', pmos: 'high-side switch', opamp: 'amplifier / filter / buffer', comparator: 'threshold detector', inamp: 'differential amplifier with high CMRR (biopotentials, bridges)', regulator: 'holds a fixed output voltage', timer555: 'oscillator / timer', vdc: 'power source', battery: 'portable power source', vac: 'test signal source', mains: 'AC power input (hazardous)', transformer: 'voltage step-down + isolation', bridge: 'full-wave rectifier', fuse: 'over-current protection', ntc: 'temperature sensor (resistance falls with heat)', lm35: 'linear temperature sensor', mpx5010: 'pressure sensor', o2cell: 'oxygen concentration sensor', photodiode: 'light detector', mcu: 'controller: reads ADC inputs, drives outputs', adc: 'virtual ADC readout', scope: 'measures waveforms', voltmeter: 'measures voltage', ammeter: 'measures current', ecgsrc: 'simulated patient ECG electrodes', motor: 'actuator (pump)', switch: 'user control' }[c.type] || OCL.defs[c.type].name);
  return say(`<b>What each component does</b><ul>${comps.map(c => `<li><b>${esc(c.ref)}</b> (${esc((OCL.parts[c.part] || {}).name || OCL.defs[c.type].name)}) — ${esc(role(c))}</li>`).join('')}</ul>`);
}
C.ask = q => {
  q = q.trim(); if (!q) return null; const it = intents.find(i => i.re.test(q)); let r;
  try { r = it ? it.fn(q) : say(`I don’t have a rule for that yet. ${capabilities().html}`); } catch (e) { r = say('Sorry — that calculation failed: ' + esc(e.message)); }
  C.history.push({ q, r }); return r;
};
C.hints = c => {
  if (!c) return ''; const R = OCL.sim.readings && OCL.sim.readings[c.id]; const out = [];
  const iss = (OCL.state.lastValidation ? OCL.state.lastValidation.issues : []).filter(i => i.comp === c.id); iss.forEach(i => out.push(`<div class="hint sev-${i.sev}"><b>${esc(i.title)}</b><br>${esc(i.fix)}</div>`));
  if (R) { if (c.type === 'resistor' && Math.abs(R.P) > c.props.P * 0.5) out.push(`<div class="hint">Dissipating ${f(Math.abs(R.P), 'W')} of ${f(c.props.P, 'W')} — consider a higher rating.</div>`);
    if (c.type === 'led' && R.I < 1e-4) out.push('<div class="hint">LED is dark: check polarity and that it has a complete path to ground.</div>');
    if ((c.type === 'npn' || c.type === 'pnp') && R.x.region === 'active') out.push('<div class="hint">Transistor is in the active region — fine for amplifiers; for switching drive the base harder.</div>'); }
  return out.join('') || '<p class="muted small">No issues for this part. Ask the Copilot for deeper analysis.</p>';
};
C.API_ARCH = `<h4>Optional external-AI architecture (planned — not active)</h4>
<ol><li><b>Browser</b> sends a <i>sanitised circuit summary</i> (netlist JSON, operating point, validation report — no personal data) to <b>your own backend</b> over HTTPS.</li>
<li><b>Backend proxy</b> (e.g. Node/Express or a serverless function) holds the API key in server-side secrets, authenticates the user session, rate-limits, logs, and calls the AI provider.</li>
<li>The model is instructed to answer only from the supplied circuit data and to return structured JSON (findings, calculations, suggested edits).</li>
<li>The app <b>validates every suggested edit</b> with the local simulator and validation engine before showing it.</li></ol>
<p><b>Never</b> put API keys in front-end JavaScript — anyone can read them. This build ships with no external connection; all answers are produced locally.</p>`;
})();
