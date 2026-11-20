/* OMAR CIRCUIT LAB — Medical Engineering Lab: sample projects, templates and engineering documentation.
   ALL medical projects are EDUCATIONAL PROTOTYPES. They are not clinically validated medical devices. */
'use strict';
(() => {
function builder() {
  const comps = [], wires = [], ids = {}, cnt = {};
  const add = (ref, key, x, y, rot = 0, props = {}) => {
    const part = OCL.parts[key], def = OCL.defs[part.base], p = {};
    def.props.forEach(q => p[q.k] = q.def); Object.assign(p, OCL.clone(part.props || {}), props);
    if (!ref) { const pre = def.prefix; cnt[pre] = (cnt[pre] || 0) + 1; ref = pre + cnt[pre]; while (ids[ref]) { cnt[pre]++; ref = pre + cnt[pre]; } }
    const c = { id: OCL.uid('c'), type: part.base, part: key, ref, x, y, rot, props: p, label: part.label || '' };
    comps.push(c); ids[ref] = c.id; return ref;
  };
  const sp = s => { const i = s.indexOf('.'); return { c: ids[s.slice(0, i)], p: s.slice(i + 1) }; };
  const w = (a, b, pts = []) => { wires.push({ id: OCL.uid('w'), a: sp(a), b: sp(b), pts }); };
  const G = (from, x, yPin) => { const r = add(null, 'gnd', x, yPin + 20); w(from, r + '.G'); return r; };
  const RAIL = (from, name, x, yPin) => { const r = add(null, 'vcc', x, yPin - 20, 0, { net: name }); w(from, r + '.N'); return r; };
  const LB = (from, name, x, y, rot = 0) => { const r = add(null, 'label', x, y, rot, { net: name }); w(from, r + '.N'); return r; };
  return { add, w, G, RAIL, LB, done: () => ({ components: comps, wires }) };
}

const SAFETY = `<div class="safety"><b>⚠ Educational prototype — not a medical device.</b> This design has not been clinically validated, calibrated, or tested for electrical safety. Never connect experimental circuits to a person or patient. A real device must address:
<ul><li><b>Patient isolation</b> — galvanic isolation barrier (isolated DC/DC + isolation amplifier/optocoupler), means of protection (2 MOPP) between mains and applied parts.</li>
<li><b>Leakage current</b> — patient and touch leakage limits (e.g. 10 µA DC/AC patient leakage for CF-type cardiac applied parts under normal condition) measured on the real hardware.</li>
<li><b>Electrical safety</b> — creepage/clearance distances, insulation, protective earth, fusing, defibrillation-proof inputs for ECG.</li>
<li><b>EMC</b> — immunity and emissions testing (IEC 60601-1-2).</li>
<li><b>Calibration & accuracy</b> — traceable calibration against reference instruments/simulators (e.g. SpO₂ per ISO 80601-2-61, thermometers per ISO 80601-2-56).</li>
<li><b>Biocompatibility</b> of patient-contact materials (ISO 10993).</li>
<li>Applicable <b>IEC 60601-1</b> general standard and the particular standards for the device type, plus risk management (ISO 14971) and software lifecycle (IEC 62304).</li></ul></div>`;

const T = OCL.templates = {};
const tpl = (key, o) => T[key] = Object.assign({ key, medical: false }, o);

tpl('psu', { title: 'DC Regulated Power Supply (5 V)', icon: 'power', tag: 'Power electronics',
  summary: 'Mains → fuse → step-down transformer → bridge rectifier → reservoir capacitor → LM7805 → 5 V rail.',
  blocks: ['AC mains 240 V', 'Fuse', 'Transformer 20:1', 'Bridge rectifier', 'Reservoir C', '7805 regulator', '5 V load'],
  principle: 'The transformer steps 240 V RMS down to 12 V RMS (≈17 V peak). The bridge rectifies both half-cycles, and the 1000 µF capacitor holds the peak between charging pulses. The 7805 removes the remaining ripple and holds the output at 5 V as long as its input stays above ≈7 V (5 V + 2 V dropout).',
  calcs: ['Secondary peak: 12 V × √2 ≈ 16.97 V', 'After two diode drops: ≈ 16.97 − 2 × 0.8 ≈ 15.4 V', 'Load current: 5 V / 100 Ω = 50 mA (+ LED ≈ 9 mA)', 'Ripple ΔV ≈ I/(2fC) = 0.059/(2 × 50 × 1000 µF) ≈ 0.59 V', 'Regulator dissipation ≈ (15.1 − 5) V × 0.059 A ≈ 0.6 W → Tj ≈ 25 + 0.6 × 50 ≈ 55 °C'],
  trouble: ['Output < 5 V: input below 7 V (dropout) — check transformer ratio and capacitor value.', 'Large ripple: reservoir capacitor too small for the load current.', 'Regulator hot: too much voltage headroom — use a lower secondary voltage or a buck converter.', 'Fuse blowing: shorted capacitor or reversed electrolytic.'],
  improve: ['Add a 0.33 µF input capacitor at the 7805 as the datasheet recommends.', 'Add a bleeder resistor across the reservoir capacitor.', 'Use a switching regulator for >300 mA loads.'],
  build(b) {
    b.add('AC1', 'mains', 100, 300, 0, { Vrms: 240 }); b.add('F1', 'fuse', 180, 220); b.add('T1', 'xfmr', 300, 260, 0, { ratio: 20 }); b.add('BR1', 'bridge', 440, 260);
    b.add('C1', 'cap_el1000', 560, 260, 1); b.add('U1', 'lm7805', 680, 220); b.add('C2', 'cap_cer', 800, 260, 1); b.add('RL', 'res', 900, 260, 1, { R: 100, P: 0.5 });
    b.add('R2', 'res', 1000, 200, 1, { R: 330 }); b.add('D1', 'led_grn', 1000, 280, 1); b.add('OSC1', 'osc', 1180, 300);
    b.w('AC1.L', 'F1.1'); b.w('F1.2', 'T1.P1'); b.w('AC1.N', 'T1.P2'); b.G('AC1.N', 100, 360);
    b.w('T1.S1', 'BR1.AC1'); b.w('T1.S2', 'BR1.AC2', [[340, 380], [480, 380]]); b.G('BR1.-', 440, 320);
    b.w('BR1.+', 'C1.+'); b.G('C1.-', 560, 320); b.w('C1.+', 'U1.IN'); b.G('U1.GND', 680, 280);
    b.w('U1.OUT', 'C2.1'); b.G('C2.2', 800, 320); b.w('C2.1', 'RL.1'); b.G('RL.2', 900, 320); b.w('RL.1', 'R2.1', [[900, 160], [1000, 160]]); b.w('R2.2', 'D1.A'); b.G('D1.K', 1000, 340);
    b.LB('C1.+', 'VRECT', 560, 180); b.LB('U1.OUT', 'VOUT', 760, 180); b.LB('OSC1.A', 'VRECT', 1080, 280); b.LB('OSC1.B', 'VOUT', 1080, 320);
  } });

tpl('opamp', { title: 'Operational Amplifier (non-inverting, G = 11)', icon: 'opamp', tag: 'Analog',
  summary: 'LM741 non-inverting amplifier: 0.5 V peak, 1 kHz in → 5.5 V peak out.',
  blocks: ['Signal generator', 'Non-inverting amplifier', 'Load', 'Oscilloscope'],
  principle: 'Negative feedback through Rf and Rg forces the inverting input to follow the non-inverting input. The output must therefore be Vin × (1 + Rf/Rg).',
  calcs: ['Gain G = 1 + Rf/Rg = 1 + 10 k/1 k = 11 (20.8 dB)', 'Vout(peak) = 0.5 V × 11 = 5.5 V', 'Maximum undistorted output ≈ ±(12 − 1.5) V = ±10.5 V → max input ≈ 0.95 V peak', 'GBW-limited bandwidth (real LM741, not modelled): ≈ 1 MHz / 11 ≈ 90 kHz'],
  trouble: ['Clipped output: input × gain exceeds rails − headroom.', 'Output stuck at a rail: feedback path open or IN+/IN− swapped.', 'Gain wrong: check Rf/Rg values and that Rg goes to ground.'],
  improve: ['Add 100 nF decoupling on each supply pin (real circuit).', 'Use a rail-to-rail op-amp for single-supply designs.'],
  build(b) {
    b.add('VG1', 'siggen', 100, 300, 0, { amp: 0.5, freq: 1000 }); b.add('U1', 'lm741', 300, 240); b.add('RG', 'res', 160, 160, 0, { R: 1000 }); b.add('RF', 'res', 300, 160, 0, { R: 10000 });
    b.add('RL', 'res', 440, 300, 1, { R: 10000 }); b.add('OSC1', 'osc', 620, 260);
    b.w('VG1.+', 'U1.IN+'); b.G('VG1.-', 100, 360); b.w('U1.IN-', 'RG.2'); b.w('RG.2', 'RF.1'); b.G('RG.1', 120, 180); b.w('RF.2', 'U1.OUT', [[380, 160], [380, 240]]);
    b.w('U1.OUT', 'RL.1'); b.G('RL.2', 440, 360); b.LB('VG1.+', 'VIN', 100, 220); b.LB('RL.1', 'VOUT', 440, 200); b.LB('OSC1.A', 'VIN', 520, 240); b.LB('OSC1.B', 'VOUT', 520, 280);
  } });

tpl('ecg', { title: 'ECG Monitoring Front End', icon: 'heart', tag: 'Medical', medical: true,
  summary: 'Simulated 3-electrode patient → INA128 (G = 101) → 48 Hz low-pass → gain stage (×11) → ≈1.1 V ECG.',
  blocks: ['Electrodes RA/LA/RL', 'Instrumentation amp (CMRR)', 'Low-pass filter 48 Hz', 'Gain stage ×11', 'ADC / display', 'Isolation barrier (concept)'],
  principle: 'The heart produces ≈1 mV between the arms, buried under volts of 50 Hz common-mode interference picked up by the body. The instrumentation amplifier amplifies only the DIFFERENCE between LA and RA and rejects the common-mode signal (CMRR). The RC low-pass removes high-frequency noise, and the second stage brings the signal to ADC level. In a real device the whole patient side sits behind an isolation barrier and the right-leg electrode is driven (RLD) to further reduce interference.',
  calcs: ['INA gain G₁ = 1 + 50 kΩ / RG = 1 + 50 k/500 = 101', 'Low-pass fc = 1/(2πRC) = 1/(2π × 10 k × 330 n) ≈ 48 Hz', 'Stage-2 gain G₂ = 1 + 100 k/10 k = 11 → total ≈ 1111 (61 dB)', 'R-wave out ≈ 1 mV × 1111 ≈ 1.1 V', 'Residual 50 Hz with CMRR = 100 dB: 0.2 V × 101 / 10⁵ ≈ 0.2 mV at INA output'],
  trouble: ['Heavy 50 Hz on output: low CMRR, unbalanced electrode impedance, or RL not connected.', 'Output saturated: electrode DC offset (up to ±300 mV in reality) amplified by the INA — real designs use AC coupling/high-pass after a modest first-stage gain.', 'Flat line: electrode lead off — real designs add lead-off detection.', 'Baseline wander: needs a 0.5 Hz high-pass.'],
  improve: ['Add a 0.5 Hz high-pass (diagnostic band 0.05–150 Hz; monitoring 0.5–40 Hz).', 'Add a driven-right-leg circuit.', 'Add a 50 Hz notch only if needed (it distorts ST segments).', 'Isolated supply + isolation amplifier before the MCU.'],
  live(R, sim) { const raw = chM(sim, 'OSC1.A'), out = chM(sim, 'OSC1.B'); if (!out) return ''; return kv([['R-wave peak (out)', OCL.fmt(out.max, 'V')], ['Peak-to-peak (out)', OCL.fmt(out.pp, 'V')], ['Measured heart rate', isFinite(out.f) ? (out.f * 60).toFixed(0) + ' bpm' : '—'], ['INA output p-p', raw ? OCL.fmt(raw.pp, 'V') : '—']]); },
  build(b) {
    b.add('ECG1', 'ecgsrc', 140, 260); b.add('U1', 'ina128', 360, 260, 0, { Rg: 500 }); b.add('R1', 'res', 480, 260, 0, { R: 10000 }); b.add('C1', 'cap_film', 560, 300, 1, { C: 330e-9 });
    b.add('U2', 'lm741', 700, 240, 0, { vpos: 5, vneg: -5, swing: 1.2 }); b.add('RG2', 'res', 600, 160, 0, { R: 10000 }); b.add('RF2', 'res', 700, 160, 0, { R: 100000 }); b.add('OSC1', 'osc', 920, 260);
    b.w('ECG1.RA', 'U1.IN-'); b.w('ECG1.LA', 'U1.IN+'); b.G('ECG1.RL', 140, 320); b.G('U1.REF', 360, 320); b.w('U1.OUT', 'R1.1'); b.w('R1.2', 'C1.1'); b.G('C1.2', 560, 360);
    b.w('R1.2', 'U2.IN+'); b.w('U2.IN-', 'RG2.2'); b.G('RG2.1', 560, 180); b.w('RG2.2', 'RF2.1'); b.w('RF2.2', 'U2.OUT', [[780, 160], [780, 240]]);
    b.LB('U1.OUT', 'RAW', 420, 200); b.LB('U2.OUT', 'ECG', 800, 200); b.LB('OSC1.A', 'RAW', 820, 240); b.LB('OSC1.B', 'ECG', 820, 280);
  } });

tpl('pulseox', { title: 'Pulse Oximeter (analog front end)', icon: 'drop', tag: 'Medical', medical: true,
  summary: 'Red/IR LED drive from an Arduino, two photodiode transimpedance amplifiers, PPG waveforms and an illustrative SpO₂ estimate.',
  blocks: ['MCU LED drivers', 'Red 660 nm + IR 940 nm LEDs', 'Tissue / finger', 'Photodiodes', 'Transimpedance amps', 'ADC (A0/A1)', 'Ratio-of-ratios → SpO₂'],
  principle: 'Oxygenated and deoxygenated haemoglobin absorb red and infrared light differently. Each heartbeat adds arterial blood, so the detected light has a small pulsatile (AC) part on a large steady (DC) part. The “ratio of ratios” R = (AC/DC)red ÷ (AC/DC)IR maps to SpO₂ through an EMPIRICAL calibration curve obtained from human studies — the linear formula used here (SpO₂ ≈ 110 − 25R) is a textbook approximation for illustration only.',
  calcs: ['LED currents: red (5 − 1.9)/180 ≈ 17 mA, IR (5 − 1.3)/220 ≈ 17 mA (each < 20 mA pin limit)', 'TIA output V = Iph × Rf = 10 µA × 100 kΩ = 1.0 V (red), 12 µA × 100 kΩ = 1.2 V (IR)', 'TIA bandwidth fc = 1/(2π × 100 k × 1 n) ≈ 1.6 kHz', 'Perfusion: red 2 %, IR 3 % → R = 0.02/0.03 ≈ 0.67 → SpO₂ ≈ 110 − 25 × 0.67 ≈ 93 % (illustrative)'],
  trouble: ['Output stuck at a rail: photodiode reversed or Rf too large for ambient light.', 'Tiny AC component: poor perfusion or LED current too low.', 'Noisy waveform: ambient light — real devices sample with LEDs off and subtract.', 'Implausible SpO₂: calibration curve not valid for this hardware.'],
  improve: ['Time-multiplex the LEDs from one photodiode (as real oximeters do).', 'Add ambient-light cancellation and digital filtering.', 'Calibrate against a certified SpO₂ simulator/reference oximeter.'],
  live(R, sim) { const a = chM(sim, 'OSC1.A'), b = chM(sim, 'OSC1.B'); if (!a || !b || !a.mean || !b.mean) return ''; const Rr = (a.pp / a.mean) / (b.pp / b.mean);
    return kv([['Red AC/DC', (a.pp / a.mean * 100).toFixed(2) + ' %'], ['IR AC/DC', (b.pp / b.mean * 100).toFixed(2) + ' %'], ['Ratio R', Rr.toFixed(3)], ['Illustrative SpO₂ (110 − 25R)', (110 - 25 * Rr).toFixed(1) + ' %'], ['Pulse rate', isFinite(a.f) ? (a.f * 60).toFixed(0) + ' bpm' : '—']]) + '<p class="muted small">Illustrative only — not a calibrated SpO₂ measurement.</p>'; },
  build(b) {
    b.add('U1', 'uno', 200, 300, 0, { d13: 'high', d12: 'high' }); b.add('R1', 'res', 340, 280, 0, { R: 180 }); b.add('D1', 'led_red', 440, 280); b.add('R2', 'res', 340, 360, 0, { R: 220 }); b.add('D2', 'led_ir', 440, 360);
    b.add('U2', 'tl081', 760, 220, 0, { vpos: 5, vneg: -5 }); b.add('PD1', 'pd', 640, 240, 3, { Iph: 10e-6, pi: 0.02 }); b.add('RF1', 'res', 760, 140, 0, { R: 100000 }); b.add('CF1', 'cap_cer', 760, 100, 0, { C: 1e-9 });
    b.add('U3', 'tl081', 760, 480, 0, { vpos: 5, vneg: -5 }); b.add('PD2', 'pd', 640, 500, 3, { Iph: 12e-6, pi: 0.03 }); b.add('RF2', 'res', 760, 400, 0, { R: 100000 }); b.add('CF2', 'cap_cer', 760, 360, 0, { C: 1e-9 });
    b.add('OSC1', 'osc', 1020, 320);
    b.RAIL('U1.VCC', '+5V', 200, 200); b.G('U1.GND', 200, 400); b.w('U1.D13', 'R1.1'); b.w('R1.2', 'D1.A'); b.G('D1.K', 480, 320); b.w('U1.D12', 'R2.1'); b.w('R2.2', 'D2.A'); b.G('D2.K', 480, 400);
    b.G('U2.IN+', 700, 280); b.w('PD1.K', 'U2.IN-'); b.G('PD1.A', 640, 300); b.w('U2.IN-', 'RF1.1'); b.w('RF1.2', 'U2.OUT'); b.w('CF1.1', 'RF1.1'); b.w('CF1.2', 'RF1.2');
    b.G('U3.IN+', 700, 540); b.w('PD2.K', 'U3.IN-'); b.G('PD2.A', 640, 560); b.w('U3.IN-', 'RF2.1'); b.w('RF2.2', 'U3.OUT'); b.w('CF2.1', 'RF2.1'); b.w('CF2.2', 'RF2.2');
    b.LB('U2.OUT', 'RED', 880, 220, 2); b.LB('U3.OUT', 'IR', 880, 480, 2); b.LB('U1.A0', 'RED', 80, 280); b.LB('U1.A1', 'IR', 80, 300);
    b.LB('OSC1.A', 'RED', 920, 300); b.LB('OSC1.B', 'IR', 920, 340);
  } });

tpl('thermo', { title: 'Digital Thermometer', icon: 'thermo', tag: 'Medical', medical: true,
  summary: 'NTC divider and LM35 read by an Arduino ADC, with live temperature conversion and a heartbeat LED.',
  blocks: ['NTC thermistor / LM35', 'Signal conditioning (divider)', '10-bit ADC', 'Microcontroller', 'Display (readout)'],
  principle: 'The NTC’s resistance falls as temperature rises; in a divider with a fixed 10 kΩ resistor this becomes a voltage the ADC can read. The β-equation converts resistance to temperature: 1/T = 1/T₂₅ + ln(R/R₂₅)/β. The LM35 instead outputs a linear 10 mV/°C, so T = V/0.01.',
  calcs: ['At 37 °C: R_NTC = 10 k × e^{3950(1/310.15 − 1/298.15)} ≈ 5.98 kΩ', 'V_A0 = 5 × 5.98/(10 + 5.98) ≈ 1.87 V → code ≈ 383 (10-bit)', 'Resolution near 37 °C ≈ 0.11 °C per LSB (4.9 mV/LSB ÷ ≈44 mV/°C)', 'LM35 at 37 °C: 0.37 V → code ≈ 76 → resolution 0.49 °C/LSB (use a 1.1 V reference to improve)', 'NTC self-heating: P = V²/R ≈ 1.87²/5.98 k ≈ 0.58 mW'],
  trouble: ['Reading too high/low by a constant: wrong β or R₂₅ in the firmware.', 'Noisy reading: average several samples.', 'Reading pinned at 0 or 1023: open/short sensor — add range checking and a fault alarm.'],
  improve: ['Use the Arduino 1.1 V internal reference for the LM35.', 'Two-point calibration in a stirred water bath against a reference thermometer.', 'Add an LCD/OLED display and fever alarm.'],
  live(R) { const a = Object.values(R).find(r => r.x && r.x.conv && r.x.conv.label.startsWith('Temperature (β')), l = Object.values(R).find(r => r.x && r.x.conv && r.x.conv.label === 'Temperature');
    return kv([['NTC channel', a && isFinite(a.x.conv.value) ? a.x.conv.value.toFixed(2) + ' °C' : '—'], ['LM35 channel', l ? l.x.conv.value.toFixed(2) + ' °C' : '—']]); },
  build(b) {
    b.add('U1', 'uno', 400, 300, 0, { d13: 'blink', freq: 1 }); b.add('R1', 'res', 200, 200, 1, { R: 10000 }); b.add('TH1', 'ntc10k', 200, 320, 1); b.add('U2', 'lm35', 200, 520);
    b.add('R2', 'res', 540, 280, 0, { R: 330 }); b.add('D1', 'led_grn', 640, 280); b.add('ADC1', 'adc', 680, 120, 0, { conv: 'ntc-divider', rfix: 10000 }); b.add('ADC2', 'adc', 680, 180, 0, { conv: 'lm35' });
    b.RAIL('U1.VCC', '+5V', 400, 200); b.G('U1.GND', 400, 400); b.RAIL('R1.1', '+5V', 200, 140); b.w('R1.2', 'TH1.1'); b.G('TH1.2', 200, 380);
    b.RAIL('U2.VS', '+5V', 200, 460); b.G('U2.GND', 200, 580); b.LB('TH1.1', 'VNTC', 260, 280, 2); b.LB('U2.OUT', 'VLM35', 320, 520, 2);
    b.LB('U1.A0', 'VNTC', 280, 280); b.LB('U1.A1', 'VLM35', 280, 300); b.LB('ADC1.IN', 'VNTC', 580, 120); b.LB('ADC2.IN', 'VLM35', 580, 180);
    b.w('U1.D13', 'R2.1'); b.w('R2.2', 'D1.A'); b.G('D1.K', 680, 300);
  } });

tpl('o2', { title: 'Oxygen Concentrator Monitor', icon: 'lungs', tag: 'Medical', medical: true,
  summary: 'O₂-cell amplifier with low-purity alarm comparator, plus pressure and flow monitoring channels.',
  blocks: ['O₂ sensor (galvanic)', 'Amplifier ×50', 'Threshold comparator', 'Low-O₂ alarm LED', 'Pressure sensor', 'Flow sensor', 'ADC / controller'],
  principle: 'A galvanic cell produces a few tens of mV proportional to oxygen partial pressure. A ×50 amplifier scales it for the ADC; a comparator raises the alarm when purity falls below ≈81 % (concentrators typically alarm somewhere around 82–85 %; follow the device standard). The LED is wired from +5 V into the comparator output, so it lights when the output goes LOW (signal below threshold). Pressure and flow channels let the controller verify sieve-bed cycling and delivery.',
  calcs: ['Cell at 93 % O₂: 0.5 mV/% × 93 = 46.5 mV', 'Amplified: 46.5 mV × (1 + 49 k/1 k) = 2.33 V', 'Threshold: 5 × 6.8 k/(10 k + 6.8 k) = 2.02 V ≡ 2.02/(0.5 mV × 50) ≈ 81 % O₂', 'MPX5010 at 4 kPa: 5 × (0.09 × 4 + 0.04) = 2.0 V', 'Alarm LED: (5 − 1.9 − 0.1)/330 ≈ 9 mA'],
  trouble: ['Alarm always on: cell disconnected/expired or gain too low.', 'Alarm never triggers: threshold too low; check divider.', 'Reading drifts: galvanic cells age — schedule calibration in ambient air (20.9 %).'],
  improve: ['Add comparator hysteresis to stop alarm chatter.', 'Add an audible alarm with silence/escalation logic (IEC 60601-1-8).', 'Temperature-compensate the O₂ cell.'],
  live(R) { const o = Object.values(R).find(r => r.x && r.x.conv && r.x.conv.label.startsWith('O₂')), p = Object.values(R).find(r => r.x && r.x.conv && r.x.conv.label.startsWith('Pressure'));
    return kv([['O₂ purity (ADC)', o ? o.x.conv.value.toFixed(1) + ' %' : '—'], ['Pressure (ADC)', p ? p.x.conv.value.toFixed(2) + ' kPa' : '—']]); },
  build(b) {
    b.add('V1', 'vdc', 100, 300, 0, { V: 5 }); b.add('OX1', 'o2cell', 240, 320); b.add('U1', 'lm358', 400, 280); b.add('RG', 'res', 280, 200, 0, { R: 1000 }); b.add('RF', 'res', 400, 200, 0, { R: 49000 });
    b.add('R1', 'res', 600, 200, 1, { R: 10000 }); b.add('R2', 'res', 600, 280, 1, { R: 6800 }); b.add('U2', 'lm393', 760, 300); b.add('R3', 'res', 900, 220, 1, { R: 330 }); b.add('D1', 'led_red', 900, 340, 1);
    b.add('ADC1', 'adc', 380, 440, 0, { conv: 'o2-cell', gain: 50 }); b.add('U3', 'mpx5010', 200, 560); b.add('ADC2', 'adc', 380, 560, 0, { conv: 'mpx5010' }); b.add('U4', 'flow', 560, 560); b.add('ADC3', 'adc', 740, 560);
    b.RAIL('V1.+', '+5V', 100, 220); b.G('V1.-', 100, 360); b.G('OX1.-', 240, 380); b.w('OX1.+', 'U1.IN+', [[300, 280], [300, 300]]); b.G('RG.1', 240, 220);
    b.w('U1.IN-', 'RG.2'); b.w('RG.2', 'RF.1'); b.w('RF.2', 'U1.OUT'); b.LB('U1.OUT', 'O2SIG', 520, 280, 2);
    b.RAIL('R1.1', '+5V', 600, 140); b.w('R1.2', 'R2.1'); b.G('R2.2', 600, 340); b.w('R1.2', 'U2.IN-'); b.LB('U2.IN+', 'O2SIG', 660, 320);
    b.RAIL('R3.1', '+5V', 900, 160); b.w('R3.2', 'D1.A'); b.w('D1.K', 'U2.OUT');
    b.LB('ADC1.IN', 'O2SIG', 280, 440); b.RAIL('U3.VS', '+5V', 200, 500); b.G('U3.GND', 200, 620); b.w('U3.OUT', 'ADC2.IN');
    b.RAIL('U4.VS', '+5V', 560, 500); b.G('U4.GND', 560, 620); b.w('U4.OUT', 'ADC3.IN');
  } });

tpl('infusion', { title: 'Infusion Pump Control', icon: 'syringe', tag: 'Medical', medical: true,
  summary: 'PWM motor drive through a logic-level MOSFET with flyback diode, line-pressure sensing and an occlusion alarm.',
  blocks: ['Microcontroller (PWM)', 'Gate resistor + pull-down', 'MOSFET driver', 'Pump motor + flyback diode', 'Line pressure sensor', 'Occlusion comparator', 'Alarm'],
  principle: 'The MCU sets motor speed (and so flow) by PWM duty cycle. The MOSFET switches the motor; the flyback diode clamps the inductive spike at turn-off. If the infusion line is blocked, downstream pressure rises; the comparator trips above ≈5 kPa and lights the occlusion alarm. Real pumps close the loop with encoder/drop sensors and use redundant safety processors.',
  calcs: ['Motor stall current: 12 V / 8 Ω = 1.5 A peak; average ≈ 60 % duty × 1.5 A ≈ 0.9 A (stall model, conservative)', 'Gate: 5 V drive on IRLZ44N (VGS(th) 1–2 V) → fully enhanced', 'Pull-down 100 kΩ keeps the motor OFF while the MCU resets', 'Occlusion threshold: 2.5 V → P = (2.5/5 − 0.04)/0.09 ≈ 5.1 kPa', 'Motor L/R = 2 mH / 8 Ω = 0.25 ms (current ripple at 200 Hz PWM)'],
  trouble: ['MOSFET hot: not fully on (gate drive too low) or PWM too fast for gate charge.', 'MCU resets when motor starts: supply dip — add bulk capacitance/separate rails.', 'Voltage spikes at drain: flyback diode missing or reversed.', 'False occlusion alarms: add hysteresis and filtering.'],
  improve: ['Closed-loop flow control using drop or volume sensing.', 'Air-in-line detector, door sensor, battery backup.', 'Independent watchdog and safety shut-off (IEC 60601-2-24).'],
  build(b) {
    b.add('V1', 'vdc', 100, 200, 0, { V: 12, Ilim: 3 }); b.add('U1', 'uno', 240, 420, 0, { d13: 'pwm', freq: 200, duty: 60 }); b.add('R1', 'res', 380, 400, 0, { R: 220 }); b.add('R2', 'res', 440, 480, 1, { R: 100000 });
    b.add('Q1', 'irlz44n', 500, 400); b.add('M1', 'motor', 520, 280, 1); b.add('D1', '1n4007', 600, 280, 3); b.add('U2', 'mpx5010', 760, 420); b.add('R3', 'res', 560, 560, 1, { R: 10000 }); b.add('R4', 'res', 560, 640, 1, { R: 10000 });
    b.add('U3', 'lm393', 760, 600); b.add('R5', 'res', 880, 600, 0, { R: 330 }); b.add('D2', 'led_red', 960, 640, 1); b.add('OSC1', 'osc', 1100, 380);
    b.RAIL('V1.+', '+12V', 100, 140); b.G('V1.-', 100, 260); b.RAIL('U1.VCC', '+5V', 240, 320); b.G('U1.GND', 240, 520); b.LB('U1.A0', 'PRESS', 120, 400);
    b.w('U1.D13', 'R1.1'); b.w('R1.2', 'Q1.G'); b.w('R2.1', 'Q1.G'); b.G('R2.2', 440, 540); b.G('Q1.S', 520, 460); b.w('M1.-', 'Q1.D'); b.RAIL('M1.+', '+12V', 520, 220);
    b.w('D1.K', 'M1.+'); b.w('D1.A', 'M1.-'); b.RAIL('U2.VS', '+5V', 760, 360); b.G('U2.GND', 760, 480); b.LB('U2.OUT', 'PRESS', 860, 420, 2);
    b.RAIL('R3.1', '+5V', 560, 500); b.w('R3.2', 'R4.1'); b.G('R4.2', 560, 700); b.w('R3.2', 'U3.IN-'); b.LB('U3.IN+', 'PRESS', 660, 620);
    b.w('U3.OUT', 'R5.1'); b.w('R5.2', 'D2.A'); b.G('D2.K', 960, 700); b.LB('Q1.D', 'DRAIN', 600, 360, 2); b.LB('OSC1.A', 'DRAIN', 1000, 360); b.LB('OSC1.B', 'PWM', 1000, 400); b.LB('R1.1', 'PWM', 380, 360, 2);
  } });

tpl('patient', { title: 'Patient Monitoring System', icon: 'monitor', tag: 'Medical', medical: true,
  summary: 'ECG channel, pulse (PPG) channel, NTC temperature to an MCU, and a 555-based visual alarm.',
  blocks: ['ECG front end', 'Pulse sensor', 'Temperature sensor', 'Microcontroller + ADC', 'Alarm generator (555)', 'Display'],
  principle: 'Each physiological channel is conditioned to 0–5 V and digitised. The MCU would compare readings with alarm limits; the 555 astable here demonstrates the alarm signal generator (≈1 Hz flash). Multi-parameter monitors must prioritise alarms (IEC 60601-1-8) and isolate each applied part.',
  calcs: ['ECG INA gain = 1 + 50 k/50 = 1001 → 1 mV → ≈1 V', '555 f = 1.44/((RA + 2RB)C) = 1.44/((10 k + 136 k) × 10 µF) ≈ 0.99 Hz', 'Duty = (RA + RB)/(RA + 2RB) ≈ 53 %', 'NTC at 37 °C → ≈1.87 V on A0'],
  trouble: ['Alarm LED never flashes: 555 THR/TRIG not tied together or capacitor missing.', 'ECG saturates: gain too high for electrode offsets — split the gain over two stages.', 'Temperature wrong: check divider orientation (NTC on the low side).'],
  improve: ['Add SpO₂ and NIBP channels.', 'Central-station networking (ESP32) with secure protocols.', 'Alarm priority, latching and audio per IEC 60601-1-8.'],
  live(R, sim) { const e = chM(sim, 'OSC1.A'), p = chM(sim, 'OSC1.B'), t = Object.values(R).find(r => r.x && r.x.conv);
    return kv([['ECG rate', e && isFinite(e.f) ? (e.f * 60).toFixed(0) + ' bpm' : '—'], ['Pulse rate', p && isFinite(p.f) ? (p.f * 60).toFixed(0) + ' bpm' : '—'], ['Temperature', t && isFinite(t.x.conv.value) ? t.x.conv.value.toFixed(1) + ' °C' : '—']]); },
  build(b) {
    b.add('ECG1', 'ecgsrc', 140, 200); b.add('U1', 'ina128', 340, 200, 0, { Rg: 50 }); b.add('PS1', 'ppgsrc', 140, 420); b.add('OSC1', 'osc', 920, 220);
    b.add('U2', 'uno', 560, 440, 0, { d13: 'low' }); b.add('R1', 'res', 320, 360, 1, { R: 10000 }); b.add('TH1', 'ntc10k', 320, 440, 1); b.add('ADC1', 'adc', 800, 360, 0, { conv: 'ntc-divider' });
    b.add('U3', 'ne555', 780, 580); b.add('RA', 'res', 660, 540, 1, { R: 10000 }); b.add('RB', 'res', 620, 640, 1, { R: 68000 }); b.add('C1', 'cap_el', 580, 740, 1, { C: 10e-6 });
    b.add('R2', 'res', 900, 580, 0, { R: 330 }); b.add('D1', 'led_red', 980, 620, 1);
    b.w('ECG1.RA', 'U1.IN-'); b.w('ECG1.LA', 'U1.IN+'); b.G('ECG1.RL', 140, 260); b.G('U1.REF', 340, 260); b.LB('U1.OUT', 'ECG', 440, 200, 2);
    b.LB('OSC1.A', 'ECG', 820, 200); b.LB('OSC1.B', 'PULSE', 820, 240); b.LB('PS1.+', 'PULSE', 200, 380, 2); b.G('PS1.-', 140, 480);
    b.RAIL('U2.VCC', '+5V', 560, 340); b.G('U2.GND', 560, 540); b.LB('U2.A0', 'VNTC', 440, 420); b.LB('U2.A1', 'PULSE', 440, 440);
    b.RAIL('R1.1', '+5V', 320, 300); b.w('R1.2', 'TH1.1'); b.G('TH1.2', 320, 500); b.LB('R1.2', 'VNTC', 380, 400, 2); b.LB('ADC1.IN', 'VNTC', 700, 360);
    b.RAIL('U3.VCC', '+5V', 780, 500); b.G('U3.GND', 780, 660); b.RAIL('RA.1', '+5V', 660, 480); b.w('RA.2', 'U3.DIS', [[660, 600]]); b.w('RB.1', 'RA.2');
    b.w('RB.2', 'U3.THR', [[620, 700], [700, 700], [700, 580]]); b.w('U3.TRIG', 'U3.THR'); b.w('C1.+', 'RB.2'); b.G('C1.-', 580, 800);
    b.w('U3.OUT', 'R2.1'); b.w('R2.2', 'D1.A'); b.G('D1.K', 980, 680);
  } });

tpl('battery', { title: 'Battery Monitoring Circuit', icon: 'battery', tag: 'Power',
  summary: '9 V battery voltage divider for an ADC, Zener reference and low-battery comparator alarm (trips below ≈6.9 V).',
  blocks: ['Battery', 'Divider ÷2', 'Zener reference 5.1 V', 'Reference divider', 'Comparator', 'Low-battery LED', 'ADC'],
  principle: 'Half the battery voltage is compared with a fixed reference derived from a Zener diode. When the battery sags, the divided voltage falls below the reference and the comparator output goes high, lighting the warning LED. Lower the battery EMF in Properties to see it trip.',
  calcs: ['VDIV = VBAT/2 = 4.5 V at 9 V', 'VREF = 5.1 × 10 k/(4.7 k + 10 k) ≈ 3.47 V', 'Trip point: VBAT = 2 × 3.47 ≈ 6.94 V', 'Zener current ≈ (9 − 5.1)/1 k − 0.35 mA ≈ 3.5 mA', 'Divider drain: 9 V/20 kΩ = 0.45 mA (use 100 k/100 k to reduce battery drain)'],
  trouble: ['LED always on: comparator inputs swapped.', 'Trip point drifts: Zener current too low — keep it above a few mA.', 'Battery drains quickly: divider resistance too low.'],
  improve: ['Add hysteresis (positive feedback resistor).', 'Use a precision reference (e.g. TL431) instead of a Zener.'],
  build(b) {
    b.add('BT1', 'bat9', 100, 300); b.add('VM1', 'dmm', 180, 300, 1); b.add('R1', 'res', 260, 240, 1, { R: 10000 }); b.add('R2', 'res', 260, 320, 1, { R: 10000 }); b.add('R3', 'res', 420, 240, 1, { R: 1000 });
    b.add('DZ1', '1n4733', 420, 320, 3); b.add('R4', 'res', 500, 280, 0, { R: 4700 }); b.add('R5', 'res', 580, 320, 1, { R: 10000 }); b.add('U1', 'lm393', 900, 300); b.add('R6', 'res', 1020, 300, 0, { R: 330 }); b.add('D1', 'led_red', 1100, 340, 1);
    b.add('ADC1', 'adc', 380, 480, 0, { vref: 5 });
    b.RAIL('BT1.+', 'VBAT', 100, 220); b.G('BT1.-', 100, 360); b.w('VM1.+', 'BT1.+'); b.w('VM1.-', 'BT1.-');
    b.RAIL('R1.1', 'VBAT', 260, 200); b.w('R1.2', 'R2.1'); b.G('R2.2', 260, 380); b.LB('R1.2', 'VDIV', 320, 280, 2);
    b.RAIL('R3.1', 'VBAT', 420, 200); b.w('R3.2', 'DZ1.K'); b.G('DZ1.A', 420, 380); b.w('DZ1.K', 'R4.1'); b.w('R4.2', 'R5.1'); b.G('R5.2', 580, 380); b.LB('R5.1', 'VREF', 640, 280, 2);
    b.LB('U1.IN-', 'VDIV', 800, 280); b.LB('U1.IN+', 'VREF', 800, 320); b.w('U1.OUT', 'R6.1'); b.w('R6.2', 'D1.A'); b.G('D1.K', 1100, 400); b.LB('ADC1.IN', 'VDIV', 280, 480);
  } });

tpl('alarm', { title: 'Medical Equipment Alarm System', icon: 'bell', tag: 'Digital',
  summary: '555 astable (≈1.5 Hz) gated by an enable switch through an AND gate, driving a buzzer and LED through an NPN transistor.',
  blocks: ['555 astable oscillator', 'Enable / silence switch', 'AND gate', 'NPN driver', 'Buzzer + LED'],
  principle: 'The 555 produces a continuous pulse train. The AND gate passes it only when the alarm is enabled. The transistor acts as a low-side switch so the logic output never carries the buzzer current. Double-click SW1 to toggle the enable switch and re-run.',
  calcs: ['f = 1.44/((RA + 2RB)C) = 1.44/((4.7 k + 94 k) × 10 µF) ≈ 1.46 Hz', 'Buzzer (modelled as 9 V/0.5 W load): ≈ 56 mA', 'Base current ≈ (5 − 0.7)/4.7 k ≈ 0.9 mA → forced β ≈ 60 (saturated switch, Ic ≈ 56 mA + LED)', 'LED current ≈ (9 − 2 − 0.1)/1 k ≈ 7 mA'],
  trouble: ['No oscillation: TRIG and THR must both connect to the timing capacitor.', 'Transistor warm: not saturated — reduce base resistor.', 'Buzzer always on: switch wiring or gate input floating (keep the pull-down).'],
  improve: ['Use distinct tone patterns for high/medium/low priority alarms (IEC 60601-1-8).', 'Add alarm latching and a timed silence.'],
  build(b) {
    b.add('V1', 'vdc', 100, 300, 0, { V: 9 }); b.add('U1', 'ne555', 360, 320); b.add('RA', 'res', 240, 260, 1, { R: 4700 }); b.add('RB', 'res', 200, 380, 1, { R: 47000 }); b.add('C1', 'cap_el', 160, 480, 1, { C: 10e-6 });
    b.add('U2', 'g_and', 600, 340); b.add('SW1', 'sw', 300, 600, 0, { closed: true }); b.add('R1', 'res', 380, 640, 1, { R: 10000 }); b.add('RBQ', 'res', 720, 340, 0, { R: 4700 }); b.add('Q1', '2n2222', 840, 340);
    b.add('LS1', 'lamp', 860, 240, 1, { V: 9, P: 0.5 }); b.add('R2', 'res', 960, 200, 1, { R: 1000 }); b.add('D1', 'led_red', 960, 280, 1); b.add('OSC1', 'osc', 1120, 480);
    b.RAIL('V1.+', '+9V', 100, 220); b.G('V1.-', 100, 360); b.RAIL('U1.VCC', '+9V', 360, 240); b.G('U1.GND', 360, 400); b.RAIL('RA.1', '+9V', 240, 200);
    b.w('RA.2', 'U1.DIS', [[240, 340]]); b.w('RB.1', 'RA.2'); b.w('RB.2', 'U1.THR', [[200, 440], [280, 440], [280, 320]]); b.w('U1.TRIG', 'U1.THR'); b.w('C1.+', 'RB.2'); b.G('C1.-', 160, 540);
    b.w('U1.OUT', 'U2.A'); b.RAIL('SW1.1', '+9V', 260, 580); b.w('SW1.2', 'R1.1'); b.G('R1.2', 380, 700); b.LB('R1.1', 'ENABLE', 440, 600, 2); b.LB('U2.B', 'ENABLE', 500, 360);
    b.w('U2.Y', 'RBQ.1'); b.w('RBQ.2', 'Q1.B'); b.G('Q1.E', 860, 400); b.w('Q1.C', 'LS1.2'); b.RAIL('LS1.1', '+9V', 860, 180); b.RAIL('R2.1', '+9V', 960, 140); b.w('R2.2', 'D1.A'); b.w('D1.K', 'LS1.2', [[920, 320], [920, 280]]);
    b.LB('U1.OUT', 'OSC', 440, 280, 2); b.LB('U2.Y', 'GATED', 700, 300, 2); b.LB('OSC1.A', 'OSC', 1020, 460); b.LB('OSC1.B', 'GATED', 1020, 500);
  } });

/* learning starters */
tpl('divider', { title: 'Lesson: Voltage Divider & Ohm’s Law', icon: 'resistor', tag: 'Basics', summary: '12 V across 1 kΩ + 2 kΩ, with a voltmeter and an ammeter.',
  blocks: ['DC source', 'R1', 'R2', 'Meters'], principle: 'Series resistors share the same current; the voltage divides in proportion to resistance.',
  calcs: ['I = V/(R1 + R2) = 12/3 k = 4 mA', 'V(R2) = 12 × 2 k/3 k = 8 V', 'P(R1) = I²R = 16 mW, P(R2) = 32 mW'], trouble: ['Meter reads 0: ammeter must be in series, voltmeter in parallel.'], improve: ['Try loading the divider with a third resistor and observe the change.'],
  build(b) { b.add('V1', 'vdc', 100, 280, 0, { V: 12 }); b.add('AM1', 'amm', 200, 200); b.add('R1', 'res', 320, 200, 0, { R: 1000 }); b.add('R2', 'res', 420, 280, 1, { R: 2000 }); b.add('VM1', 'dmm', 520, 280, 1);
    b.w('V1.+', 'AM1.+'); b.w('AM1.-', 'R1.1'); b.w('R1.2', 'R2.1'); b.G('R2.2', 420, 340); b.G('V1.-', 100, 340); b.w('VM1.+', 'R2.1'); b.w('VM1.-', 'R2.2'); } });
tpl('ledres', { title: 'Lesson: LED Current Limiting', icon: 'led', tag: 'Basics', summary: '5 V supply, 220 Ω resistor and a red LED.',
  blocks: ['5 V', 'Resistor', 'LED'], principle: 'An LED needs its current limited; the resistor drops the voltage difference between the supply and the LED forward voltage.',
  calcs: ['R = (Vs − Vf)/I = (5 − 1.9)/0.014 ≈ 220 Ω', 'I ≈ 14 mA (below the 20 mA rating)', 'P(R) = I²R ≈ 43 mW'], trouble: ['LED dark: reversed (flat side = cathode).', 'LED burns out: no series resistor.'], improve: ['Change the resistor to 100 Ω and run validation to see the warnings.'],
  build(b) { b.add('V1', 'vdc', 100, 280, 0, { V: 5 }); b.add('R1', 'res', 220, 200, 0, { R: 220 }); b.add('D1', 'led_red', 340, 280, 1); b.w('V1.+', 'R1.1'); b.w('R1.2', 'D1.A'); b.G('D1.K', 340, 340); b.G('V1.-', 100, 340); } });
tpl('rc', { title: 'Lesson: RC Charging & Discharging', icon: 'cap', tag: 'Basics', summary: '0–5 V, 50 Hz square pulses into 1 kΩ + 1 µF (τ = 1 ms) with an oscilloscope.',
  blocks: ['Pulse generator', 'R', 'C', 'Oscilloscope'], principle: 'A capacitor charges through a resistor exponentially: v(t) = V(1 − e^{−t/τ}), τ = RC. After 5τ it is ≈ 99 % charged.',
  calcs: ['τ = RC = 1 kΩ × 1 µF = 1 ms', 'Half period = 10 ms = 10τ → fully charges and discharges each cycle', 'v(1 ms) ≈ 63 % of 5 V = 3.16 V'], trouble: ['Waveform looks like the input: τ much smaller than the period.'], improve: ['Increase C to 4.7 µF and watch the waveform become triangular.'],
  build(b) { b.add('VG1', 'siggen', 100, 280, 0, { wave: 'pulse', amp: 5, freq: 50, duty: 50 }); b.add('R1', 'res', 220, 200, 0, { R: 1000 }); b.add('C1', 'cap_film', 320, 280, 1, { C: 1e-6 }); b.add('OSC1', 'osc', 520, 260);
    b.w('VG1.+', 'R1.1'); b.w('R1.2', 'C1.1'); b.G('C1.2', 320, 340); b.G('VG1.-', 100, 340); b.LB('VG1.+', 'VIN', 100, 160); b.LB('C1.1', 'VC', 360, 200, 2); b.LB('OSC1.A', 'VIN', 420, 240); b.LB('OSC1.B', 'VC', 420, 280); } });
tpl('bjtsw', { title: 'Lesson: Transistor Switch', icon: 'bjt', tag: 'Basics', summary: 'NPN low-side switch driving an LED, controlled by a switch.',
  blocks: ['Control switch', 'Base resistor', 'NPN', 'LED load'], principle: 'A small base current turns on a much larger collector current. For switching, drive the base hard enough to saturate the transistor (forced β ≈ 10–20).',
  calcs: ['IB = (5 − 0.7)/4.7 k ≈ 0.9 mA', 'IC = (5 − 1.9 − 0.1)/330 ≈ 9 mA → forced β ≈ 10 → saturated', 'VCE(sat) ≈ 0.05–0.2 V'], trouble: ['LED dim: base resistor too large (transistor in active region).', 'LED never turns off: base floating — add a pull-down.'], improve: ['Open the switch (double-click) and re-run.'],
  build(b) { b.add('V1', 'vdc', 100, 300, 0, { V: 5 }); b.add('SW1', 'sw', 220, 340); b.add('RB', 'res', 340, 340, 0, { R: 4700 }); b.add('RPD', 'res', 380, 420, 1, { R: 100000 }); b.add('Q1', '2n2222', 440, 340); b.add('RC', 'res', 460, 160, 1, { R: 330 }); b.add('D1', 'led_red', 460, 240, 1);
    b.RAIL('V1.+', '+5V', 100, 220); b.G('V1.-', 100, 360); b.RAIL('SW1.1', '+5V', 180, 280); b.w('SW1.2', 'RB.1'); b.w('RB.2', 'Q1.B'); b.w('RPD.1', 'Q1.B'); b.G('RPD.2', 380, 480); b.G('Q1.E', 460, 400);
    b.RAIL('RC.1', '+5V', 460, 100); b.w('RC.2', 'D1.A'); b.w('D1.K', 'Q1.C'); } });
tpl('rlc', { title: 'Lesson: Series RLC Resonance', icon: 'coil', tag: 'Basics', summary: 'Sine source into a series RLC; the capacitor voltage peaks near f₀ = 1/(2π√LC).',
  blocks: ['Sine source', 'R', 'L', 'C', 'Oscilloscope'], principle: 'At resonance the inductive and capacitive reactances cancel; the current is limited only by R and the capacitor voltage is magnified by Q.',
  calcs: ['f₀ = 1/(2π√(10 mH × 1 µF)) ≈ 1.59 kHz', 'Q = (1/R)√(L/C) = (1/22)√(10 m/1 µ) ≈ 4.5 (plus inductor DCR)', 'V_C at resonance ≈ Q × 1 V ≈ 4 V peak'], trouble: ['Small response: source frequency far from f₀.'], improve: ['Change the generator frequency to 500 Hz and 5 kHz and compare amplitudes.'],
  build(b) { b.add('VG1', 'siggen', 100, 280, 0, { amp: 1, freq: 1590 }); b.add('R1', 'res', 220, 200, 0, { R: 22 }); b.add('L1', 'ind', 340, 200, 0, { L: 10e-3, Rdc: 0.5 }); b.add('C1', 'cap_film', 440, 280, 1, { C: 1e-6 }); b.add('OSC1', 'osc', 640, 260);
    b.w('VG1.+', 'R1.1'); b.w('R1.2', 'L1.1'); b.w('L1.2', 'C1.1'); b.G('C1.2', 440, 340); b.G('VG1.-', 100, 340); b.LB('VG1.+', 'VIN', 100, 160); b.LB('C1.1', 'VC', 480, 160, 2); b.LB('OSC1.A', 'VIN', 540, 240); b.LB('OSC1.B', 'VC', 540, 280); } });

/* helpers */
function chM(sim, key) { return sim && sim.history && sim.history.ch[key] ? sim.measure(sim.history.ch[key]) : null; }
function kv(rows) { return `<table class="kv">${rows.map(([k, v]) => `<tr><td>${OCL.esc(k)}</td><td><b>${v}</b></td></tr>`).join('')}</table>`; }
OCL.kvTable = kv;
OCL.SAFETY_HTML = SAFETY;
OCL.buildTemplate = key => { const t = T[key], b = builder(); t.build(b); return b.done(); };
OCL.loadTemplate = key => {
  const t = T[key], p = OCL.newProject(t.title), d = OCL.buildTemplate(key);
  p.sheets[0].components = d.components; p.sheets[0].wires = d.wires; p.template = key;
  p.doc = { title: t.title, problem: t.summary, objective: t.principle.split('. ')[0] + '.', requirements: t.blocks.join(' → '), calcs: t.calcs.join('\n'), limitations: t.medical ? 'Educational prototype. Not clinically validated. Behavioural models only.' : 'Simplified educational component models.', recommendations: (t.improve || []).join('\n') };
  return p;
};
OCL.blockDiagramSVG = blocks => {
  const w = 132, h = 50, gap = 26, rows = Math.ceil(blocks.length / 5);
  let out = ''; blocks.forEach((b, i) => { const r = Math.floor(i / 5), cI = i % 5, col = r % 2 ? 4 - cI : cI, x = 10 + col * (w + gap), y = 10 + r * (h + 40);
    const words = b.split(' '), lines = []; let cur = ''; words.forEach(wd => { if ((cur + ' ' + wd).trim().length > 17) { lines.push(cur.trim()); cur = wd; } else cur += ' ' + wd; }); lines.push(cur.trim());
    out += `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="bd-box"/>${lines.map((l, k) => `<text x="${x + w / 2}" y="${y + h / 2 + 4 + (k - (lines.length - 1) / 2) * 13}" text-anchor="middle" class="bd-t">${OCL.esc(l)}</text>`).join('')}</g>`;
    if (i < blocks.length - 1) { const nr = Math.floor((i + 1) / 5); if (nr === r) { const dir = r % 2 ? -1 : 1, x1 = dir > 0 ? x + w : x, x2 = x1 + dir * gap; out += `<path d="M${x1} ${y + h / 2}H${x2 - dir * 4}" class="bd-a"/><path d="M${x2} ${y + h / 2}l${-dir * 7}-5v10z" class="bd-ah"/>`; }
      else { out += `<path d="M${x + w / 2} ${y + h}V${y + h + 36}" class="bd-a"/><path d="M${x + w / 2} ${y + h + 40}l-5-7h10z" class="bd-ah"/>`; } }
  });
  return `<svg class="bd" viewBox="0 0 ${10 + 5 * (w + gap)} ${20 + rows * (h + 40) - 40}">${out}</svg>`;
};
OCL.MEDICAL_KEYS = ['ecg', 'pulseox', 'thermo', 'o2', 'infusion', 'patient'];
OCL.SAMPLE_KEYS = ['ecg', 'pulseox', 'thermo', 'o2', 'psu', 'opamp', 'battery', 'alarm'];
OCL.LESSON_KEYS = ['divider', 'ledres', 'rc', 'bjtsw', 'rlc', 'psu', 'opamp', 'ecg', 'pulseox', 'thermo'];
})();
