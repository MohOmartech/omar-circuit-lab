/* OMAR CIRCUIT LAB — SVG schematic editor: placement, wiring, selection, pan/zoom, live simulation overlay */
'use strict';
(() => {
const GRID = 20, snap = v => Math.round(v / GRID) * GRID;
const E = OCL.editor = { pan: { x: 0, y: 0 }, zoom: 1, svg: null, ghost: null, drag: null, mouse: { x: 0, y: 0 }, selWire: null, dashOff: 0 };
const rotP = (x, y, r) => { for (let i = 0; i < (r & 3); i++) [x, y] = [-y, x]; return [x, y]; };
E.pinPos = (c, pid) => { const p = OCL.pinsOf(c).find(q => q.id === pid); if (!p) return [c.x, c.y]; const [x, y] = rotP(p.x, p.y, c.rot || 0); return [c.x + x, c.y + y]; };
E.boxOf = c => { const d = OCL.defs[c.type]; let [w, h] = d.box || [80, 40]; if (d.type === 'block') h = OCL.partPins(c).h; if ((c.rot || 0) % 2) [w, h] = [h, w]; return { x: c.x - w / 2, y: c.y - h / 2, w, h }; };

OCL.makeComp = (key, x, y) => {
  const part = OCL.parts[key] || OCL.customParts[key]; if (!part) throw new Error('Unknown part ' + key);
  const def = OCL.defs[part.base], props = {};
  def.props.forEach(p => props[p.k] = p.def); Object.assign(props, OCL.clone(part.props || {}));
  return { id: OCL.uid('c'), type: part.base, part: key, ref: E.nextRef(def.prefix), x: snap(x), y: snap(y), rot: 0, props, label: part.label || '' };
};
E.nextRef = prefix => { const used = new Set(OCL.allComponents().map(c => c.ref)); let i = 1; while (used.has(prefix + i)) i++; return prefix + i; };

E.init = svg => {
  E.svg = svg;
  svg.innerHTML = `<defs><pattern id="g-minor" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="0.9" class="gdot"/></pattern>
    <pattern id="g-major" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#g-minor)"/><path d="M100 0H0V100" class="gline"/></pattern>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g id="vp"><rect id="gridbg" x="-20000" y="-20000" width="40000" height="40000" fill="url(#g-major)"/><g id="L-wires"></g><g id="L-comps"></g><g id="L-over"></g><g id="L-ghost"></g></g>`;
  E.vp = svg.querySelector('#vp');
  svg.addEventListener('mousedown', onDown); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  svg.addEventListener('wheel', onWheel, { passive: false }); svg.addEventListener('dblclick', onDbl);
  svg.addEventListener('contextmenu', e => { e.preventDefault(); if (OCL.state.wiring) cancelWire(); else if (OCL.state.placing) E.cancelPlace(); });
  svg.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  svg.addEventListener('drop', e => { e.preventDefault(); const key = e.dataTransfer.getData('text/ocl-part'); if (!key) return; const [x, y] = E.toWorld(e); E.place(key, x, y); });
  // touch: basic pan/tap support for tablets
  let tp = null;
  svg.addEventListener('touchstart', e => { if (e.touches.length === 1) { const t = e.touches[0]; tp = { x: t.clientX, y: t.clientY, px: E.pan.x, py: E.pan.y, moved: false }; } }, { passive: true });
  svg.addEventListener('touchmove', e => { if (tp && e.touches.length === 1 && !OCL.state.placing) { const t = e.touches[0]; E.pan.x = tp.px + t.clientX - tp.x; E.pan.y = tp.py + t.clientY - tp.y; tp.moved = true; E.applyView(); } }, { passive: true });
  OCL.on('circuit', () => E.render()); OCL.on('simframe', () => E.renderSim()); OCL.on('sim', () => E.renderSim()); OCL.on('trace', () => E.render());
  svg.addEventListener('mouseover', e => { const p = e.target.closest('.pin-hit'); if (p && !OCL.state.wiring && !E.drag) OCL.tip.show(OCL.pinInfoHTML(OCL.pinInfo(p.dataset.c, p.dataset.pin)), e.clientX, e.clientY); });
  svg.addEventListener('mouseout', e => { if (e.target.closest('.pin-hit')) OCL.tip.hide(); });
  requestAnimationFrame(animate);
  E.applyView();
};
E.applyView = () => { if (E.vp) E.vp.setAttribute('transform', `translate(${E.pan.x},${E.pan.y}) scale(${E.zoom})`); OCL.emit('zoom', E.zoom); };
E.toWorld = e => { const r = E.svg.getBoundingClientRect(); return [(e.clientX - r.left - E.pan.x) / E.zoom, (e.clientY - r.top - E.pan.y) / E.zoom]; };
E.zoomBy = (f, cx, cy) => { const r = E.svg.getBoundingClientRect(); cx = cx ?? r.width / 2; cy = cy ?? r.height / 2; const nz = OCL.clamp(E.zoom * f, 0.2, 5); E.pan.x = cx - (cx - E.pan.x) * nz / E.zoom; E.pan.y = cy - (cy - E.pan.y) * nz / E.zoom; E.zoom = nz; E.applyView(); };
E.fit = () => {
  const cs = OCL.sheet().components; const r = E.svg.getBoundingClientRect();
  if (!cs.length) { E.zoom = 1; E.pan = { x: r.width / 2, y: r.height / 2 }; return E.applyView(); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  cs.forEach(c => { const b = E.boxOf(c); x0 = Math.min(x0, b.x - 30); y0 = Math.min(y0, b.y - 30); x1 = Math.max(x1, b.x + b.w + 30); y1 = Math.max(y1, b.y + b.h + 30); });
  E.zoom = OCL.clamp(Math.min(r.width / (x1 - x0), r.height / (y1 - y0)), 0.25, 1.8);
  E.pan = { x: r.width / 2 - (x0 + x1) / 2 * E.zoom, y: r.height / 2 - (y0 + y1) / 2 * E.zoom }; E.applyView();
};

/* ---------- rendering ---------- */
const wirePath = (w, comps) => {
  const ca = comps[w.a.c], cb = comps[w.b.c]; if (!ca || !cb) return null;
  const pts = [E.pinPos(ca, w.a.p), ...(w.pts || []), E.pinPos(cb, w.b.p)];
  return orth(pts);
};
const orth = pts => { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if (x0 !== x1 && y0 !== y1) d += `H${x1}`; d += `V${y1}H${x1}`; } return d; };
E.connectedPins = () => { const s = new Map(); OCL.sheet().wires.forEach(w => [w.a, w.b].forEach(e => { const k = e.c + ':' + e.p; s.set(k, (s.get(k) || 0) + 1); })); return s; };
E.render = () => {
  if (!E.svg || !OCL.state.project) return;
  const sh = OCL.sheet(), comps = Object.fromEntries(sh.components.map(c => [c.id, c])), st = OCL.state;
  const conn = E.connectedPins(), netHL = st.highlight, tr = st.trace, nlT = tr ? OCL.netlist() : null;
  E.svg.classList.toggle('tracing', !!tr);
  E.vp.querySelector('#L-wires').innerHTML = sh.wires.map(w => { const d = wirePath(w, comps); if (!d) return ''; const hl = netHL.has(w.id) ? ' hl' : '', sel = E.selWire === w.id ? ' sel' : '', wn = tr ? nlT.nodeOf[w.a.c + ':' + w.a.p] : null, tc = tr && tr.nets.has(wn) ? (wn === tr.primary ? ' tprimary' : ' traced') : '';
    return `<g class="wire${hl}${sel}${tc}" data-wire="${w.id}"><path class="w-hit" d="${d}"/><path class="w-line" d="${d}"/><path class="w-flow" d="${d}"/></g>`; }).join('') +
    junctionDots(sh, comps);
  E.vp.querySelector('#L-comps').innerHTML = sh.components.map(c => {
    const def = OCL.defs[c.type]; const b = E.boxOf(c), pins = OCL.pinsOf(c);
    const flag = st.flagged.get(c.id), sel = st.sel === c.id;
    const showPad = st.settings.showPadNums !== false && !def.offboard && !['label', 'vcc', 'junction', 'ground'].includes(c.type);
    const pinDots = pins.map(p => { const [x, y] = rotP(p.x, p.y, c.rot || 0), k = c.id + ':' + p.id, un = !conn.has(k) && !['label', 'vcc', 'junction', 'ground'].includes(c.type), tp = tr && tr.pinKeys.has(k);
      let pn = ''; if (showPad) { const nums = OCL.padsOfPin(c, p.id); if (nums.length) { const horiz = Math.abs(x) >= Math.abs(y), tx = horiz ? x - Math.sign(x) * 11 : x + 6, ty = horiz ? y - 4 : y - Math.sign(y) * 11; pn = `<text class="padnum" x="${tx}" y="${ty}" text-anchor="middle">${nums.join(',')}</text>`; } }
      return pn + `<circle class="pin${un ? ' open' : ''}${tp ? ' tpin' : ''}" data-pin="${p.id}" data-c="${c.id}" cx="${x}" cy="${y}" r="${tp ? 4.6 : un ? 3.2 : 2.6}"/><circle class="pin-hit" data-pin="${p.id}" data-c="${c.id}" cx="${x}" cy="${y}" r="8"/>`; }).join('');
    const vert = (c.rot || 0) % 2 === 1 && def.box && def.box[0] > def.box[1] || ((c.rot || 0) % 2 === 0 && def.box && def.box[1] > def.box[0] && def.box[0] <= 60);
    const lx = vert ? b.w / 2 + 6 : 0, ly1 = vert ? -4 : -b.h / 2 - 8, ly2 = vert ? 10 : b.h / 2 + 15, an = vert ? 'start' : 'middle';
    const showRef = !['junction', 'label', 'vcc', 'ground'].includes(c.type), val = def.value ? def.value(c) : '';
    return `<g class="comp${sel ? ' sel' : ''}${tr ? (tr.comps.has(c.id) ? ' traced' : ' dimmed') : ''}${flag ? ' flag-' + flag : ''}${def.sim === 'none' ? ' nosim' : ''}" data-id="${c.id}" transform="translate(${c.x},${c.y})">
      <rect class="c-hit" x="${b.x - c.x - 4}" y="${b.y - c.y - 4}" width="${b.w + 8}" height="${b.h + 8}" rx="6"/>
      <g class="sym" transform="rotate(${(c.rot || 0) * 90})">${def.symbol(c)}</g>${pinDots}
      ${showRef ? `<text class="ref" x="${lx}" y="${ly1}" text-anchor="${an}">${OCL.esc(c.ref)}</text><text class="val" x="${lx}" y="${ly2}" text-anchor="${an}">${OCL.esc(val)}</text>` : ''}
      <text class="reading" x="${lx}" y="${vert ? 24 : b.h / 2 + 29}" text-anchor="${an}"></text></g>`;
  }).join('');
  E.renderSim(); OCL.emit('rendered');
};
function junctionDots(sh, comps) { // dots where 3+ wire ends meet at the same pin
  const cnt = {}; sh.wires.forEach(w => [w.a, w.b].forEach(e => { const k = e.c + ':' + e.p; cnt[k] = (cnt[k] || 0) + 1; }));
  return Object.entries(cnt).filter(([k, n]) => n >= 2).map(([k]) => { const [cid, pid] = k.split(':'); const c = comps[cid]; if (!c || c.type === 'junction') return ''; const [x, y] = E.pinPos(c, pid); return `<circle class="jdot" cx="${x}" cy="${y}" r="3.6"/>`; }).join('');
}
const vColor = (v, vmax) => { if (!isFinite(v)) return null; const f = OCL.clamp(Math.abs(v) / (vmax || 1), 0, 1); if (Math.abs(v) < 1e-3) return '#7d8aa3'; return v > 0 ? `hsl(${190 - 150 * f},90%,${55 + 5 * f}%)` : `hsl(${220 + 40 * f},85%,62%)`; };
E.renderSim = () => {
  if (!E.svg || !OCL.state.project) return;
  const sim = OCL.sim, nl = sim.nl, R = sim.readings, live = R && nl && (sim.status === 'running' || sim.status === 'done' || sim.status === 'paused');
  const over = E.vp.querySelector('#L-over'); let html = '';
  const sh = OCL.sheet(), comps = Object.fromEntries(sh.components.map(c => [c.id, c]));
  E.wireI = {};
  if (live) {
    const vmax = Math.max(1, ...sim.nodeV.map(Math.abs).filter(isFinite));
    const conn = E.connectedPins();
    E.vp.querySelectorAll('.wire').forEach(g => {
      const w = sh.wires.find(x => x.id === g.dataset.wire); if (!w) return;
      const net = nl.nodeOf[w.a.c + ':' + w.a.p], v = sim.nodeV[net];
      g.querySelector('.w-line').style.stroke = vColor(v, vmax) || '';
      let I = null; const ra = R[w.a.c], rb = R[w.b.c];
      if (conn.get(w.a.c + ':' + w.a.p) === 1 && ra && ra.pinI && ra.pinI[w.a.p] !== undefined) I = -ra.pinI[w.a.p];
      else if (conn.get(w.b.c + ':' + w.b.p) === 1 && rb && rb.pinI && rb.pinI[w.b.p] !== undefined) I = rb.pinI[w.b.p];
      E.wireI[w.id] = I; g.classList.toggle('flowing', OCL.state.settings.animateCurrent && I !== null && Math.abs(I) > 1e-6);
    });
    if (OCL.state.settings.showVolts) {
      const seen = new Set();
      sh.wires.forEach(w => { const net = nl.nodeOf[w.a.c + ':' + w.a.p]; if (!net || seen.has(net)) return; seen.add(net);
        const ca = comps[w.a.c], cb = comps[w.b.c]; if (!ca || !cb) return; const p = E.pinPos(ca, w.a.p), q = E.pinPos(cb, w.b.p);
        const x = (p[0] + q[0]) / 2, y = p[1] === q[1] ? p[1] : (p[1] + q[1]) / 2; const t = OCL.fmt(sim.nodeV[net], 'V');
        html += `<g class="vtag" transform="translate(${x},${y - 10})"><rect x="${-t.length * 3.3 - 5}" y="-9" width="${t.length * 6.6 + 10}" height="15" rx="7"/><text y="2" text-anchor="middle">${t}</text></g>`; });
    }
    E.vp.querySelectorAll('.comp').forEach(g => {
      const c = comps[g.dataset.id]; const r = R[g.dataset.id]; if (!c || !r) return; const tEl = g.querySelector('.reading'); let txt = '';
      switch (c.type) {
        case 'voltmeter': txt = OCL.fmt(r.V, 'V', 4); break;
        case 'ammeter': txt = OCL.fmt(r.I, 'A', 4); break;
        case 'adc': txt = 'code ' + r.x.code + (r.x.conv && isFinite(r.x.conv.value) ? ' → ' + r.x.conv.value.toFixed(1) + ' ' + r.x.conv.unit : ''); break;
        case 'freqcounter': { const m = sim.history && sim.history.ch[c.ref] ? sim.measure(sim.history.ch[c.ref]) : null; txt = m && isFinite(m.f) ? OCL.fmt(m.f, 'Hz', 4) : (sim.mode === 'dc' ? 'DC' : '…'); break; }
        case 'mcu': txt = `A0=${r.x.A0} A1=${r.x.A1} A2=${r.x.A2}`; break;
        case 'led': { const br = r.x.brightness || 0; g.querySelector('.sym').style.filter = br > 0.02 ? `drop-shadow(0 0 ${3 + 10 * Math.min(br, 1)}px ${OCL.defs.led.ledColor(c)})` : ''; txt = OCL.fmt(r.I, 'A'); break; }
        case 'vdc': case 'battery': txt = OCL.fmt(r.I, 'A'); break;
        case 'fuse': txt = r.x.blown ? 'OVER RATING' : ''; break;
        case 'opamp': case 'inamp': case 'comparator': txt = r.x.saturated ? 'SAT ' + (r.x.saturated[0] === 'p' ? '+' : '−') : ''; break;
      }
      tEl.textContent = txt;
    });
  } else {
    E.vp.querySelectorAll('.w-line').forEach(p => p.style.stroke = ''); E.vp.querySelectorAll('.wire').forEach(g => g.classList.remove('flowing'));
    E.vp.querySelectorAll('.reading').forEach(t => t.textContent = ''); E.vp.querySelectorAll('.sym').forEach(s => s.style.filter = '');
  }
  over.innerHTML = html;
};
function animate() {
  E.dashOff = (E.dashOff || 0);
  if (E.svg && OCL.sim.readings && E.wireI) {
    E.svg.querySelectorAll('.wire.flowing').forEach(g => { const I = E.wireI[g.dataset.wire]; if (I === null || I === undefined) return; const sp = OCL.clamp(Math.log10(Math.abs(I) / 1e-6) * 0.45, 0.15, 3.5) * Math.sign(I);
      const p = g.querySelector('.w-flow'); const o = (+(p.dataset.o || 0) - sp); p.dataset.o = o % 1000; p.style.strokeDashoffset = o; });
  }
  requestAnimationFrame(animate);
}

/* ---------- interaction ---------- */
const hit = e => {
  const t = e.target, pin = t.closest('[data-pin]'), comp = t.closest('.comp'), wire = t.closest('.wire');
  if (pin) return { kind: 'pin', c: pin.dataset.c, p: pin.dataset.pin };
  if (comp) return { kind: 'comp', id: comp.dataset.id };
  if (wire) return { kind: 'wire', id: wire.dataset.wire };
  return { kind: 'none' };
};
function onDown(e) {
  if (e.button === 1 || (e.button === 0 && e.altKey)) { E.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, px: E.pan.x, py: E.pan.y }; return; }
  if (e.button !== 0) return;
  const st = OCL.state, [wx, wy] = E.toWorld(e), h = hit(e);
  if (st.placing) { E.place(st.placing, wx, wy, e.shiftKey); return; }
  if (st.wiring) {
    if (h.kind === 'pin') return finishWire(h);
    if (h.kind === 'comp' && OCL.findComp(h.id).type === 'junction') return finishWire({ c: h.id, p: 'J' });
    st.wiring.pts.push([snap(wx), snap(wy)]); return drawWirePreview();
  }
  if (h.kind === 'pin' && st.traceMode) { OCL.tip.hide(); OCL.trace.start(h.c, h.p); E.select(h.c); return; }
  if (h.kind === 'comp' && st.traceMode) { E.select(h.id); return; }
  if (h.kind === 'pin' && (st.mode === 'wire' || st.mode === 'select')) { st.wiring = { a: { c: h.c, p: h.p }, pts: [] }; drawWirePreview(); return; }
  if (h.kind === 'comp') {
    const c = OCL.findComp(h.id);
    E.select(h.id); E.drag = { kind: 'move', id: h.id, ox: wx - c.x, oy: wy - c.y, sx: c.x, sy: c.y, moved: false, snap: JSON.stringify(OCL.state.project.sheets) };
    if (c.type === 'junction' && st.mode === 'wire') { st.wiring = { a: { c: c.id, p: 'J' }, pts: [] }; E.drag = null; }
    return;
  }
  if (h.kind === 'wire') { E.selectWire(h.id); return; }
  E.select(null); E.selWire = null; st.highlight.clear(); E.render();
  E.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, px: E.pan.x, py: E.pan.y };
}
function onMove(e) {
  if (!E.svg) return; const [wx, wy] = E.toWorld(e); E.mouse = { x: wx, y: wy };
  OCL.emit('cursor', { x: snap(wx), y: snap(wy) });
  const d = E.drag;
  if (d && d.kind === 'pan') { E.pan.x = d.px + e.clientX - d.sx; E.pan.y = d.py + e.clientY - d.sy; E.applyView(); return; }
  if (d && d.kind === 'move') {
    const c = OCL.findComp(d.id); if (!c) return; const nx = snap(wx - d.ox), ny = snap(wy - d.oy);
    if (nx !== c.x || ny !== c.y) { c.x = nx; c.y = ny; d.moved = true; OCL.sheet().wires.forEach(w => { if (w.a.c === c.id || w.b.c === c.id) w.pts = []; }); E.render(); }
    return;
  }
  if (OCL.state.placing) drawGhost(wx, wy);
  if (OCL.state.wiring) drawWirePreview();
}
function onUp() {
  const d = E.drag; E.drag = null;
  if (d && d.kind === 'move' && d.moved) { OCL.history.undo.push(d.snap); OCL.history.redo = []; OCL.state.project.modified = Date.now(); OCL.emit('dirty'); OCL.emit('selection'); }
}
function onWheel(e) { e.preventDefault(); const r = E.svg.getBoundingClientRect(); E.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }
function onDbl(e) { const h = hit(e); if (h.kind === 'comp') { const c = OCL.findComp(h.id); if (c.type === 'switch') { OCL.history.push(); c.props.closed = !c.props.closed; OCL.emit('circuit'); if (OCL.sim.status === 'done' || OCL.sim.status === 'running') OCL.sim.run(); } else OCL.emit('focusProps'); } }

E.select = id => { OCL.state.sel = id; E.selWire = null; E.svg && E.svg.querySelectorAll('.comp').forEach(g => g.classList.toggle('sel', g.dataset.id === id)); OCL.emit('selection'); };
E.selectWire = id => {
  E.selWire = id; OCL.state.sel = null; const nl = OCL.netlist(), w = OCL.sheet().wires.find(x => x.id === id);
  const net = nl.nodeOf[w.a.c + ':' + w.a.p]; OCL.state.highlight = new Set(OCL.allWires().filter(x => nl.nodeOf[x.a.c + ':' + x.a.p] === net).map(x => x.id));
  OCL.state.selNet = { net, name: nl.nets[net].name, pins: nl.nets[net].pins }; E.render(); OCL.emit('selection');
};
E.startPlace = key => { E.cancelWireIfAny(); OCL.state.placing = key; OCL.state.placeRot = 0; OCL.emit('mode'); drawGhost(E.mouse.x, E.mouse.y); };
E.cancelPlace = () => { OCL.state.placing = null; E.vp.querySelector('#L-ghost').innerHTML = ''; OCL.emit('mode'); };
E.place = (key, x, y, keep) => {
  OCL.history.push(); const c = OCL.makeComp(key, x, y); c.rot = OCL.state.placeRot || 0;
  OCL.sheet().components.push(c); if (!keep) E.cancelPlace(); E.select(c.id); OCL.emit('circuit'); OCL.emit('placed', c); return c;
};
function drawGhost(x, y) {
  const key = OCL.state.placing; if (!key) return; const part = OCL.parts[key] || OCL.customParts[key]; const fake = OCL.makeComp(key, x, y); fake.ref = '';
  fake.rot = OCL.state.placeRot || 0;
  E.vp.querySelector('#L-ghost').innerHTML = `<g class="ghost" transform="translate(${snap(x)},${snap(y)})"><g transform="rotate(${fake.rot * 90})">${OCL.defs[part.base].symbol(fake)}</g></g>`;
}
function drawWirePreview() {
  const w = OCL.state.wiring; if (!w) return; const c = OCL.findComp(w.a.c); const p0 = E.pinPos(c, w.a.p);
  E.vp.querySelector('#L-ghost').innerHTML = `<path class="wire-preview" d="${orth([p0, ...w.pts, [snap(E.mouse.x), snap(E.mouse.y)]])}"/>`;
}
function finishWire(h) {
  const st = OCL.state, w = st.wiring; if (h.c === w.a.c && h.p === w.a.p) return;
  const dup = OCL.sheet().wires.some(x => (x.a.c === w.a.c && x.a.p === w.a.p && x.b.c === h.c && x.b.p === h.p) || (x.b.c === w.a.c && x.b.p === w.a.p && x.a.c === h.c && x.a.p === h.p));
  if (dup) { OCL.toast('Those pins are already connected', 'warn'); return cancelWire(); }
  OCL.history.push(); OCL.sheet().wires.push({ id: OCL.uid('w'), a: w.a, b: { c: h.c, p: h.p }, pts: w.pts });
  st.wiring = null; E.vp.querySelector('#L-ghost').innerHTML = ''; OCL.emit('circuit'); OCL.emit('wired');
}
function cancelWire() { OCL.state.wiring = null; E.vp.querySelector('#L-ghost').innerHTML = ''; }
E.cancelWireIfAny = () => { if (OCL.state.wiring) cancelWire(); };

/* ---------- editing commands ---------- */
E.rotate = () => {
  if (OCL.state.placing) { OCL.state.placeRot = ((OCL.state.placeRot || 0) + 1) % 4; drawGhost(E.mouse.x, E.mouse.y); return; }
  const c = OCL.findComp(OCL.state.sel); if (!c) return OCL.toast('Select a component to rotate');
  OCL.history.push(); c.rot = ((c.rot || 0) + 1) % 4; OCL.sheet().wires.forEach(w => { if (w.a.c === c.id || w.b.c === c.id) w.pts = []; }); OCL.emit('circuit');
};
E.del = () => {
  const st = OCL.state, sh = OCL.sheet();
  if (E.selWire) { OCL.history.push(); sh.wires = sh.wires.filter(w => w.id !== E.selWire); E.selWire = null; st.highlight.clear(); OCL.emit('circuit'); return; }
  if (!st.sel) return; OCL.history.push();
  sh.components = sh.components.filter(c => c.id !== st.sel); sh.wires = sh.wires.filter(w => w.a.c !== st.sel && w.b.c !== st.sel);
  st.sel = null; OCL.emit('circuit'); OCL.emit('selection');
};
E.duplicate = () => {
  const c = OCL.findComp(OCL.state.sel); if (!c) return OCL.toast('Select a component to duplicate');
  OCL.history.push(); const n = OCL.clone(c); n.id = OCL.uid('c'); n.ref = E.nextRef(OCL.defs[c.type].prefix); n.x += 40; n.y += 40;
  OCL.sheet().components.push(n); E.select(n.id); OCL.emit('circuit');
};
E.keys = e => {
  if (OCL.state.view !== 'designer') return;
  const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? OCL.history.doRedo() : OCL.history.doUndo(); }
  else if (mod && k === 'y') { e.preventDefault(); OCL.history.doRedo(); }
  else if (mod && k === 'd') { e.preventDefault(); E.duplicate(); }
  else if (mod) return;
  else if (k === 'r') E.rotate();
  else if (k === 'delete' || k === 'backspace') { e.preventDefault(); E.del(); }
  else if (k === 'escape') { E.cancelWireIfAny(); if (OCL.state.placing) E.cancelPlace(); OCL.state.mode = 'select'; if (OCL.state.trace) OCL.trace.clear(); OCL.emit('mode'); }
  else if (k === 't') { OCL.state.traceMode = !OCL.state.traceMode; if (!OCL.state.traceMode) OCL.trace.clear(); OCL.emit('mode'); }
  else if (k === 'w') { OCL.state.mode = OCL.state.mode === 'wire' ? 'select' : 'wire'; OCL.emit('mode'); }
  else if (k === 'f') E.fit();
  else if (k === '+' || k === '=') E.zoomBy(1.2); else if (k === '-') E.zoomBy(1 / 1.2);
};
/* SVG snapshot of the current sheet (for reports) */
E.snapshotSVG = () => {
  const sh = OCL.sheet(); if (!sh.components.length) return '<p><i>Empty schematic</i></p>';
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  sh.components.forEach(c => { const b = E.boxOf(c); x0 = Math.min(x0, b.x - 40); y0 = Math.min(y0, b.y - 40); x1 = Math.max(x1, b.x + b.w + 40); y1 = Math.max(y1, b.y + b.h + 40); });
  const comps = Object.fromEntries(sh.components.map(c => [c.id, c]));
  const wires = sh.wires.map(w => { const d = wirePath(w, comps); return d ? `<path d="${d}" fill="none" stroke="#0b6b8a" stroke-width="2"/>` : ''; }).join('');
  const parts = sh.components.map(c => { const def = OCL.defs[c.type], b = E.boxOf(c); return `<g transform="translate(${c.x},${c.y})"><g transform="rotate(${(c.rot || 0) * 90})" fill="none" stroke="#1a2333" stroke-width="2">${def.symbol(c)}</g><text x="0" y="${-b.h / 2 - 6}" font-size="11" text-anchor="middle" font-family="sans-serif" fill="#1a2333">${OCL.esc(['junction', 'ground', 'label', 'vcc'].includes(c.type) ? '' : c.ref + ' ' + (def.value ? def.value(c) : ''))}</text></g>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" style="max-width:100%;background:#fff;border:1px solid #ccd"><style>text{font-family:sans-serif}.st,.pl{font-size:10px;fill:#1a2333;stroke:none}.fillc{fill:#1a2333}.thin{stroke-width:1.2}.ic{fill:#f3f6fa}.trace{stroke:#0b6b8a}</style>${wires}${parts}</svg>`;
};
})();
