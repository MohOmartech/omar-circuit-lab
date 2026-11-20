/* OMAR CIRCUIT LAB — PCB Design Studio: footprints, placement, interactive routing, vias, DRC and fabrication exports.
   Exports are UNVERIFIED educational outputs — check in a Gerber viewer and with your fabricator before ordering. */
'use strict';
(() => {
const PCB = OCL.pcb = { scale: 8, ox: 40, oy: 40, tool: 'select', layer: 'top', route: null, drag: null, hover: null, sel: null, drc: null };
const G = 0.635; const snapMM = v => Math.round(v / G) * G;
const row = (n, pitch) => Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * pitch, 0]);
const dip = n => { const s = Math.ceil(n / 2), p = []; for (let i = 0; i < s; i++) p.push([-3.81, (i - (s - 1) / 2) * 2.54]); for (let i = 0; i < s; i++) p.push([3.81, ((s - 1) / 2 - i) * 2.54]); return p; };
const FP = PCB.footprints = {
  axial: { pads: row(2, 10.16), body: [7, 2.6], pad: 1.8, drill: 0.8, h: 2.6, name: 'Axial THT, 10.16 mm' },
  radial2: { pads: row(2, 2.54), body: [5, 5], round: true, pad: 1.6, drill: 0.8, h: 6, name: 'Radial 2.54 mm' },
  radial5: { pads: row(2, 5.08), body: [8, 8], round: true, pad: 1.8, drill: 0.9, h: 12, name: 'Radial 5.08 mm, Ø8' },
  led5: { pads: row(2, 2.54), body: [5.8, 5.8], round: true, pad: 1.6, drill: 0.8, h: 8.6, name: 'LED 5 mm' },
  pot3: { pads: [[-2.54, 2.54], [2.54, 2.54], [0, -2.54]], body: [9.5, 9.5], pad: 1.8, drill: 1, h: 5, name: 'Trimmer 3-pin' },
  to92: { pads: row(3, 1.27), body: [4.8, 3.8], pad: 1.1, drill: 0.6, h: 4.8, name: 'TO-92 (inline)' },
  to220: { pads: row(3, 2.54), body: [10.2, 4.6], pad: 1.9, drill: 1.1, h: 15, name: 'TO-220 vertical' },
  dip8: { pads: dip(8), body: [6.4, 9.8], pad: 1.6, drill: 0.8, h: 3.3, name: 'DIP-8 (7.62 mm)' },
  dip14: { pads: dip(14), body: [6.4, 19.2], pad: 1.6, drill: 0.8, h: 3.3, name: 'DIP-14 (7.62 mm)' },
  header2: { pads: row(2, 2.54), body: [5.1, 2.5], pad: 1.7, drill: 1, h: 8.5, name: 'Pin header 1×2' },
  header3: { pads: row(3, 2.54), body: [7.6, 2.5], pad: 1.7, drill: 1, h: 8.5, name: 'Pin header 1×3' },
  xfmr: { pads: [[-10, -7.5], [-10, 7.5], [10, -7.5], [10, 7.5]], body: [28, 24], pad: 2.4, drill: 1.3, h: 22, name: 'PCB transformer (generic)' },
  bridge4: { pads: [[-3.81, 0], [3.81, 0], [0, -3.81], [0, 3.81]], body: [9, 9], round: true, pad: 1.8, drill: 1, h: 5, name: 'Round bridge 4-pin' },
  module: { auto: 0.25, body: [26, 26], pad: 1.7, drill: 1, h: 12, name: 'MCU board on headers' }
};
PCB.fpFor = c => { const d = OCL.defs[c.type]; if (d.offboard || d.fp === 'none') return null; let k = d.fp;
  if (k === 'dip' || k === 'dipN') { const n = OCL.pinsOf(c).length; return { ...FP.dip8, pads: dip(n + (n % 2)), body: [6.4, Math.ceil(n / 2) * 2.54 + 1], name: `DIP-${n + (n % 2)}` }; }
  if (k === 'sip6') k = 'header3';
  const f = FP[k] || FP.header2; if (f.auto) { const pins = OCL.pinsOf(c); return { ...f, pads: pins.map(p => [p.x * f.auto * 0.5, p.y * f.auto * 0.5]) }; } return f; };
const rot = (x, y, r) => { for (let i = 0; i < (r & 3); i++) [x, y] = [-y, x]; return [x, y]; };

/* ---------- model ---------- */
PCB.ensure = () => { const p = OCL.state.project; if (!p.pcb) p.pcb = { w: 100, h: 70, parts: [], tracks: [], vias: [], settings: { clearance: 0.3, minWidth: 0.25, width: 0.6, gndPour: false } }; return p.pcb; };
PCB.sync = (relayout) => {
  const pcb = PCB.ensure(), comps = OCL.allComponents().filter(c => PCB.fpFor(c));
  const have = new Map(pcb.parts.map(p => [p.cid, p])); const out = [];
  const xs = comps.map(c => c.x), ys = comps.map(c => c.y), minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  const k = 0.127 * (relayout || !pcb.parts.length ? 1.15 : Math.min(1, (pcb.w - 20) / Math.max(1, (maxX - minX) * 0.127), (pcb.h - 20) / Math.max(1, (maxY - minY) * 0.127)));
  comps.forEach(c => { let p = have.get(c.id); if (!p || relayout) p = { cid: c.id, x: snapMM(10 + (c.x - minX) * k), y: snapMM(10 + (c.y - minY) * k), rot: (c.rot || 0) % 2 }; out.push(p); });
  pcb.parts = out;
  if (relayout) { // greedy overlap removal: nudge parts until courtyards are clear
    const placed = []; out.sort((a, b) => a.y - b.y || a.x - b.x).forEach(pt => { let tries = 0;
      const hit = () => { const r = PCB.courtyard(pt); return placed.some(q => { const s = PCB.courtyard(q); return r.x0 < s.x1 + 0.5 && r.x1 > s.x0 - 0.5 && r.y0 < s.y1 + 0.5 && r.y1 > s.y0 - 0.5; }); };
      while (hit() && tries < 400) { if (tries % 2) pt.y = snapMM(pt.y + 1.27); else pt.x = snapMM(pt.x + 1.27); tries++; }
      placed.push(pt); });
    let x0 = Infinity, y0 = Infinity; out.forEach(pt => { const r = PCB.courtyard(pt); x0 = Math.min(x0, r.x0); y0 = Math.min(y0, r.y0); });
    out.forEach(pt => { pt.x = snapMM(pt.x - x0 + 5); pt.y = snapMM(pt.y - y0 + 5); }); }
  if (relayout && out.length) { let x1 = 0, y1 = 0; out.forEach(pt => { const r = PCB.courtyard(pt); x1 = Math.max(x1, r.x1); y1 = Math.max(y1, r.y1); }); pcb.w = Math.max(30, Math.ceil((x1 + 8) / 5) * 5); pcb.h = Math.max(25, Math.ceil((y1 + 8) / 5) * 5); }
  return pcb;
};
PCB.pads = () => {
  const pcb = PCB.ensure(), nl = OCL.netlist(), res = [];
  pcb.parts.forEach(pt => { const c = OCL.findComp(pt.cid); if (!c) return; const f = PCB.fpFor(c, pt); if (!f) return; const po = OCL.pinout(c, f.key);
    f.pads.forEach((pd, i) => { const [dx, dy] = rot(pd[0], pd[1], pt.rot); const map = po.pads[i] || { num: i + 1, pin: null, name: 'NC', func: 'Not connected' }; const net = map.pin ? nl.nodeOf[c.id + ':' + map.pin] : -1;
      let w = f.smd ? pd[2] : f.pad, h = f.smd ? pd[3] : f.pad; if (f.smd && pt.rot % 2) [w, h] = [h, w];
      res.push({ id: pt.cid + ':' + i, cid: pt.cid, ref: c.ref, num: map.num, pin: map.pin, name: map.name, func: map.func, implicit: map.implicit, x: pt.x + dx, y: pt.y + dy, d: Math.max(w, h), w, h, smd: !!f.smd, drill: f.smd ? 0 : f.drill, net: net ?? -1, netName: net >= 0 ? nl.nets[net].name : (map.implicit ? 'supply (implicit)' : 'NC'), first: i === 0, rot: pt.rot }); }); });
  return { pads: res, nl };
};
PCB.courtyard = pt => { const c = OCL.findComp(pt.cid), f = PCB.fpFor(c, pt); let [w, h] = f.body; if (pt.rot % 2) [w, h] = [h, w];
  let x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
  f.pads.forEach(p => { const [x, y] = rot(p[0], p[1], pt.rot); let pw = f.smd ? p[2] : f.pad, ph = f.smd ? p[3] : f.pad; if (f.smd && pt.rot % 2) [pw, ph] = [ph, pw]; x0 = Math.min(x0, x - pw / 2); x1 = Math.max(x1, x + pw / 2); y0 = Math.min(y0, y - ph / 2); y1 = Math.max(y1, y + ph / 2); });
  return { x0: pt.x + x0 - 0.25, x1: pt.x + x1 + 0.25, y0: pt.y + y0 - 0.25, y1: pt.y + y1 + 0.25 }; };
PCB.padItem = p => { if (!p.smd) return { kind: 'pad', layers: ['top', 'bottom'], p, r: p.d / 2, net: p.net, isPad: true };
  const L = Math.max(p.w, p.h), S = Math.min(p.w, p.h), e = (L - S) / 2, horiz = p.w >= p.h;
  return { kind: 'seg', layers: ['top'], s: horiz ? [[p.x - e, p.y], [p.x + e, p.y]] : [[p.x, p.y - e], [p.x, p.y + e]], r: S / 2, net: p.net, p, isPad: true }; };

/* ---------- geometry ---------- */
const dPS = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
const segs = t => t.pts.slice(1).map((p, i) => [t.pts[i], p]);
const dSS = (a, b) => { const [[ax, ay], [bx, by]] = a, [[cx, cy], [dx, dy]] = b;
  const inter = (() => { const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (!d) return false; const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d; return u >= 0 && u <= 1 && v >= 0 && v <= 1; })();
  return inter ? 0 : Math.min(dPS(ax, ay, cx, cy, dx, dy), dPS(bx, by, cx, cy, dx, dy), dPS(cx, cy, ax, ay, bx, by), dPS(dx, dy, ax, ay, bx, by)); };

/* ---------- connectivity & DRC ---------- */
PCB.analyze = () => {
  const pcb = PCB.ensure(), { pads, nl } = PCB.pads(), S = pcb.settings, items = [];
  pads.forEach(p => items.push(PCB.padItem(p)));
  pcb.vias.forEach(v => items.push({ kind: 'via', layers: ['top', 'bottom'], p: v, r: 0.6, net: v.net }));
  pcb.tracks.forEach(t => segs(t).forEach(s => items.push({ kind: 'seg', layers: [t.layer], s, r: t.w / 2, net: t.net, t })));
  const par = items.map((_, i) => i), f = i => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
  const dist = (a, b) => {
    if (a.kind !== 'seg' && b.kind !== 'seg') return Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) - a.r - b.r;
    if (a.kind === 'seg' && b.kind === 'seg') return dSS(a.s, b.s) - a.r - b.r;
    const [s, q] = a.kind === 'seg' ? [a, b] : [b, a]; return dPS(q.p.x, q.p.y, s.s[0][0], s.s[0][1], s.s[1][0], s.s[1][1]) - s.r - q.r;
  };
  const issues = [], add = (sev, msg, x, y) => issues.push({ sev, msg, x, y });
  const gndPour = S.gndPour;
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (!a.layers.some(l => b.layers.includes(l))) continue;
    if (a.isPad && b.isPad && a.p.cid === b.p.cid) { if (a.net !== b.net || a.net < 0) { const d = dist(a, b); if (d < Math.min(0.15, S.clearance * 0.5)) add('high', `${a.p.ref}: pads ${a.p.num}/${b.p.num} closer than allowed`, a.p.x, a.p.y); } continue; }
    const d = dist(a, b);
    if (d <= 0.001) { if (a.net === b.net || a.net < 0 || b.net < 0) par[f(i)] = f(j); else { const at = a.kind === 'seg' ? a.s[0] : [a.p.x, a.p.y]; add('critical', `Short: net ${nl.nets[a.net].name} touches ${nl.nets[b.net].name}`, at[0], at[1]); par[f(i)] = f(j); } }
    else if (d < S.clearance && a.net !== b.net && a.net >= 0 && b.net >= 0) { const at = a.kind === 'seg' ? a.s[0] : [a.p.x, a.p.y]; add('high', `Clearance ${d.toFixed(2)} mm < ${S.clearance} mm between ${nl.nets[a.net].name} and ${nl.nets[b.net].name}`, at[0], at[1]); }
  }
  // unrouted
  const byNet = {}; items.forEach((it, i) => { if (it.isPad && it.net >= 0) (byNet[it.net] = byNet[it.net] || []).push(i); });
  const rats = []; let unrouted = 0, totalConn = 0;
  Object.entries(byNet).forEach(([net, idx]) => {
    if (idx.length < 2) return; totalConn += idx.length - 1;
    if (gndPour && +net === 0) return;
    const groups = {}; idx.forEach(i => (groups[f(i)] = groups[f(i)] || []).push(items[i].p)); const gs = Object.values(groups);
    if (gs.length > 1) { unrouted += gs.length - 1; add('high', `Net ${nl.nets[net].name}: ${gs.length - 1} unrouted connection(s)`, gs[0][0].x, gs[0][0].y);
      // MST between groups (Prim)
      const inT = [gs[0]], rest = gs.slice(1);
      while (rest.length) { let best = null; inT.forEach(g => g.forEach(a => rest.forEach((h, hi) => h.forEach(b => { const d = Math.hypot(a.x - b.x, a.y - b.y); if (!best || d < best.d) best = { d, a, b, hi }; })))); rats.push({ a: best.a, b: best.b, net: +net }); inT.push(rest.splice(best.hi, 1)[0]); } }
  });
  pcb.tracks.forEach(t => { if (t.w < S.minWidth) add('medium', `Track width ${t.w} mm below minimum ${S.minWidth} mm`, t.pts[0][0], t.pts[0][1]); });
  const cy = pcb.parts.map(pt => ({ pt, r: PCB.courtyard(pt) }));
  for (let i = 0; i < cy.length; i++) { const a = cy[i].r; for (let j = i + 1; j < cy.length; j++) { const b = cy[j].r; if (a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0) add('medium', `Courtyard overlap: ${OCL.findComp(cy[i].pt.cid).ref} / ${OCL.findComp(cy[j].pt.cid).ref}`, (a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2); }
    if (a.x0 < 0.5 || a.y0 < 0.5 || a.x1 > pcb.w - 0.5 || a.y1 > pcb.h - 0.5) add('high', `${OCL.findComp(cy[i].pt.cid).ref} outside / too close to the board edge`, (a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2); }
  pcb.tracks.forEach(t => t.pts.forEach(([x, y]) => { if (x < t.w || y < t.w || x > pcb.w - t.w || y > pcb.h - t.w) add('high', 'Track too close to the board edge', x, y); }));
  const order = ['critical', 'high', 'medium', 'low', 'info']; issues.sort((a, b) => order.indexOf(a.sev) - order.indexOf(b.sev));
  if (gndPour) issues.push({ sev: 'info', msg: 'Ground pour assumed to connect all GND pads (bottom layer). Pour is not included in Gerber export yet — route GND or add the pour in a full CAD tool.' });
  PCB.drc = { issues, rats, unrouted, totalConn, pads, nl }; return PCB.drc;
};

/* ---------- auto tools ---------- */
PCB.autoRoute = () => { const pcb = PCB.ensure(); let n = 0, clean = 0, failed = 0;
  for (let pass = 0; pass < 3; pass++) { const a = PCB.analyze(); if (!a.rats.length) break; const { pads } = a;
    a.rats.forEach(r => { const A = [r.a.x, r.a.y], B = [r.b.x, r.b.y], mx = snapMM((A[0] + B[0]) / 2), my = snapMM((A[1] + B[1]) / 2), w = pcb.settings.width, cl = pcb.settings.clearance;
      const shapes = [[A, [B[0], A[1]], B], [A, [A[0], B[1]], B], [A, [mx, A[1]], [mx, B[1]], B], [A, [A[0], my], [B[0], my], B]];
      for (let off = 2.54; off <= 12.7; off += 2.54) for (const s of [1, -1]) { const y = snapMM(Math.min(A[1], B[1]) - s * off), x = snapMM(Math.min(A[0], B[0]) - s * off); shapes.push([A, [A[0], y], [B[0], y], B], [A, [x, A[1]], [x, B[1]], B]); }
      const ok = (pts, layer) => { const ss = pts.slice(1).map((p, i) => [pts[i], p]);
        if (pts.some(([x, y]) => x < 1 || y < 1 || x > pcb.w - 1 || y > pcb.h - 1)) return false;
        if (pads.some(pd => pd.net !== r.net && ss.some(([p, q]) => dPS(pd.x, pd.y, p[0], p[1], q[0], q[1]) - pd.d / 2 - w / 2 < cl))) return false;
        if (pcb.vias.some(v => v.net !== r.net && ss.some(([p, q]) => dPS(v.x, v.y, p[0], p[1], q[0], q[1]) - 0.6 - w / 2 < cl))) return false;
        return !pcb.tracks.some(t => t.layer === layer && t.net !== r.net && segs(t).some(s2 => ss.some(s1 => dSS(s1, s2) - (t.w + w) / 2 < cl))); };
      let pick = null; for (const layer of ['top', 'bottom']) { for (const sh of shapes) if (ok(sh, layer)) { pick = { pts: sh, layer }; break; } if (pick) break; }
      if (!pick) { if (pass === 2) failed++; return; } clean++;
      pcb.tracks.push({ id: OCL.uid('t'), layer: pick.layer, w, net: r.net, pts: pick.pts.filter((p, i, arr) => !i || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]) }); n++; }); }
  const d = PCB.analyze(); PCB.draw(); OCL.emit('dirty'); OCL.emit('pcbchange');
  OCL.toast(`Simple router placed ${n} clearance-checked track(s).${d.unrouted ? ` ${d.unrouted} connection(s) left unrouted (yellow ratsnest) — route them by hand or move parts and retry.` : ' All connections routed.'}`, d.unrouted ? 'warn' : 'ok', 6000); };

/* ---------- canvas UI ---------- */
PCB.layers = { top: true, bottom: true, silk: true, mask: false, drill: true, fab: true, rats: true, padnums: true, pinnames: true };
PCB.changed = () => { PCB.analyze(); PCB.draw(); OCL.emit('dirty'); OCL.emit('pcbchange'); };
PCB.mount = (canvas) => {
  PCB.cv = canvas; PCB.ctx = canvas.getContext('2d');
  const toMM = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left - PCB.ox) / PCB.scale, (e.clientY - r.top - PCB.oy) / PCB.scale]; };
  canvas.addEventListener('mousedown', e => {
    const [x, y] = toMM(e), pcb = PCB.ensure(); OCL.tip.hide();
    if (e.button === 1 || e.altKey) { PCB.drag = { pan: true, sx: e.clientX, sy: e.clientY, ox: PCB.ox, oy: PCB.oy }; return; }
    if (e.button === 2) { if (PCB.route) PCB.finishRoute(null); return; }
    const pad = PCB.hitPad(x, y);
    if (PCB.tool === 'route') {
      if (!PCB.route) { const start = pad || PCB.hitTrackEnd(x, y); if (!start) return OCL.toast('Start a track on a pad or a track end'); if (pad && pad.smd && PCB.layer === 'bottom') return OCL.toast('SMD pads are on the top layer — switch layer (L)', 'warn'); PCB.route = { net: start.net, pts: [[start.x, start.y]], layer: PCB.layer }; }
      else if (pad) { if (pad.net !== PCB.route.net) OCL.toast(`Warning: connecting net ${PCB.route.net} to a different net — DRC will flag a short`, 'warn'); PCB.route.pts.push(PCB.corner(PCB.route.pts.at(-1), [pad.x, pad.y])); PCB.route.pts.push([pad.x, pad.y]); PCB.finishRoute(); }
      else { const last = PCB.route.pts.at(-1); PCB.route.pts.push(PCB.snap45(last, [snapMM(x), snapMM(y)])); }
      return PCB.draw();
    }
    if (PCB.tool === 'via') { const t = PCB.hitTrack(x, y); if (!t) return OCL.toast('Place vias on a track'); pcb.vias.push({ x: snapMM(x), y: snapMM(y), net: t.net }); return PCB.changed(); }
    if (PCB.tool === 'delete') { const t = PCB.hitTrack(x, y); if (t) { pcb.tracks = pcb.tracks.filter(z => z !== t); } else { const vi = pcb.vias.findIndex(v => Math.hypot(v.x - x, v.y - y) < 1); if (vi >= 0) pcb.vias.splice(vi, 1); } return PCB.changed(); }
    if (pad) { PCB.selPad = pad.id; PCB.sel = pad.cid; if (pad.pin) OCL.trace.start(pad.cid, pad.pin); OCL.ui.selectComp(pad.cid, true); PCB.draw(); OCL.emit('pcbsel'); return; }
    const part = PCB.hitPart(x, y); PCB.sel = part ? part.cid : null; PCB.selPad = null; if (part) OCL.ui.selectComp(part.cid, true);
    if (part) PCB.drag = { part, dx: x - part.x, dy: y - part.y }; else PCB.drag = { pan: true, sx: e.clientX, sy: e.clientY, ox: PCB.ox, oy: PCB.oy };
    PCB.draw(); OCL.emit('pcbsel');
  });
  canvas.addEventListener('mousemove', e => { const [x, y] = toMM(e); PCB.mouse = [x, y]; const d = PCB.drag;
    if (d && d.pan) { PCB.ox = d.ox + e.clientX - d.sx; PCB.oy = d.oy + e.clientY - d.sy; PCB.draw(); }
    else if (d && d.part) { const nx = snapMM(x - d.dx), ny = snapMM(y - d.dy); if (nx !== d.part.x || ny !== d.part.y) { d.part.x = nx; d.part.y = ny; d.moved = true; PCB.draw(); } }
    else { if (PCB.route) PCB.draw(); const pad = PCB.hitPad(x, y), id = pad ? pad.id : null;
      if (pad) OCL.tip.show(OCL.pinInfoHTML(OCL.pinInfo(pad.cid, pad.pin, pad.num)), e.clientX, e.clientY); else OCL.tip.hide();
      if (id !== PCB.hover) { PCB.hover = id; PCB.draw(); } }
    OCL.emit('pcbcursor', [x, y]);
  });
  canvas.addEventListener('mouseleave', () => { OCL.tip.hide(); PCB.hover = null; PCB.draw(); });
  if (!PCB._win) { PCB._win = true; window.addEventListener('mouseup', () => { if (PCB.drag && PCB.drag.moved) PCB.changed(); PCB.drag = null; }); }
  canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top, f = e.deltaY < 0 ? 1.15 : 1 / 1.15, ns = OCL.clamp(PCB.scale * f, 2, 80);
    PCB.ox = cx - (cx - PCB.ox) * ns / PCB.scale; PCB.oy = cy - (cy - PCB.oy) * ns / PCB.scale; PCB.scale = ns; PCB.draw(); }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  new ResizeObserver(() => PCB.draw()).observe(canvas.parentElement);
};
PCB.keys = e => { if (!PCB.cv || !PCB.cv.isConnected || !(OCL.state.view === 'pcb' || OCL.state.view === 'workbench')) return; const k = e.key.toLowerCase(); if ((e.target.tagName || '').match(/INPUT|SELECT|TEXTAREA/)) return;
  if (OCL.state.view === 'workbench' && !PCB.cv.matches(':hover')) return;
  if (k === 'escape') { PCB.route = null; if (OCL.state.trace) OCL.trace.clear(); PCB.draw(); }
  if (k === 'r' && PCB.sel) { const pt = PCB.ensure().parts.find(p => p.cid === PCB.sel); if (pt) { pt.rot = (pt.rot + 1) % 4; PCB.changed(); } }
  if (k === 'l') { PCB.layer = PCB.layer === 'top' ? 'bottom' : 'top'; if (PCB.route) { const last = PCB.route.pts.at(-1); PCB.finishRoute(); const pcb = PCB.ensure(); pcb.vias.push({ x: last[0], y: last[1], net: pcb.tracks.at(-1).net }); PCB.route = { net: pcb.tracks.at(-1).net, pts: [last], layer: PCB.layer }; } OCL.emit('pcblayer'); PCB.draw(); }
};
PCB.snap45 = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; if (Math.abs(dx) > 2 * Math.abs(dy)) return [b[0], a[1]]; if (Math.abs(dy) > 2 * Math.abs(dx)) return [a[0], b[1]]; const m = Math.max(Math.abs(dx), Math.abs(dy)); return [a[0] + Math.sign(dx) * m, a[1] + Math.sign(dy) * m]; };
PCB.corner = (a, b) => [b[0], a[1]];
PCB.finishRoute = () => { const r = PCB.route; if (r && r.pts.length > 1) { const pts = r.pts.filter((p, i) => i === 0 || p[0] !== r.pts[i - 1][0] || p[1] !== r.pts[i - 1][1]); if (pts.length > 1) PCB.ensure().tracks.push({ id: OCL.uid('t'), layer: r.layer, w: PCB.ensure().settings.width, net: r.net, pts }); }
  PCB.route = null; PCB.changed(); };
PCB.hitPad = (x, y) => { const { pads } = PCB.pads(); return pads.find(p => p.smd ? Math.abs(p.x - x) <= p.w / 2 + 0.15 && Math.abs(p.y - y) <= p.h / 2 + 0.15 : Math.hypot(p.x - x, p.y - y) < p.d / 2 + 0.3); };
PCB.hitPart = (x, y) => PCB.ensure().parts.slice().reverse().find(pt => { const r = PCB.courtyard(pt); return x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1; });
PCB.hitTrack = (x, y) => PCB.ensure().tracks.find(t => t.layer === PCB.layer && segs(t).some(([a, b]) => dPS(x, y, a[0], a[1], b[0], b[1]) < t.w / 2 + 0.3)) || PCB.ensure().tracks.find(t => segs(t).some(([a, b]) => dPS(x, y, a[0], a[1], b[0], b[1]) < t.w / 2 + 0.3));
PCB.hitTrackEnd = (x, y) => { for (const t of PCB.ensure().tracks) for (const p of [t.pts[0], t.pts.at(-1)]) if (Math.hypot(p[0] - x, p[1] - y) < 1) return { x: p[0], y: p[1], net: t.net }; return null; };
PCB.fit = () => { const pcb = PCB.ensure(), r = PCB.cv.parentElement.getBoundingClientRect(); PCB.scale = Math.min((r.width - 60) / pcb.w, (r.height - 60) / pcb.h); PCB.ox = (r.width - pcb.w * PCB.scale) / 2; PCB.oy = (r.height - pcb.h * PCB.scale) / 2; PCB.draw(); };
PCB.draw = () => {
  const cv = PCB.cv; if (!cv || !cv.isConnected || !OCL.state.project) return; const par = cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(par.width * dpr) || cv.height !== Math.round(par.height * dpr)) { cv.width = Math.round(par.width * dpr); cv.height = Math.round(par.height * dpr); cv.style.width = par.width + 'px'; cv.style.height = par.height + 'px'; }
  const g = PCB.ctx, pcb = PCB.ensure(), s = PCB.scale, L = PCB.layers, tr = OCL.state.trace, TN = tr ? tr.nets : null, inT = n => !TN || TN.has(n);
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#0a0f17'; g.fillRect(0, 0, par.width, par.height);
  g.save(); g.translate(PCB.ox, PCB.oy); g.scale(s, s);
  g.fillStyle = '#0f3d2e'; g.fillRect(0, 0, pcb.w, pcb.h); g.strokeStyle = '#e8d36a'; g.lineWidth = 0.25; g.strokeRect(0, 0, pcb.w, pcb.h);
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 0.05; for (let x = 0; x <= pcb.w; x += 2.54) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, pcb.h); g.stroke(); } for (let y = 0; y <= pcb.h; y += 2.54) { g.beginPath(); g.moveTo(0, y); g.lineTo(pcb.w, y); g.stroke(); }
  if (pcb.settings.gndPour && L.bottom) { g.fillStyle = 'rgba(80,140,255,0.12)'; g.fillRect(1, 1, pcb.w - 2, pcb.h - 2); }
  const drawTracks = (layer, col, alpha) => { if (!L[layer]) return; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    pcb.tracks.filter(t => t.layer === layer).forEach(t => { const hot = TN && TN.has(t.net); g.globalAlpha = TN ? (hot ? 1 : 0.15) : alpha; g.strokeStyle = hot ? (t.net === tr.primary ? '#ffe14d' : '#ffb84d') : col; g.lineWidth = t.w; g.beginPath(); t.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }); g.globalAlpha = 1; };
  drawTracks(PCB.layer === 'top' ? 'bottom' : 'top', PCB.layer === 'top' ? '#3d7bff' : '#e05a3a', 0.45); drawTracks(PCB.layer, PCB.layer === 'top' ? '#e05a3a' : '#3d7bff', 0.95);
  if (L.mask) { g.fillStyle = 'rgba(6,70,40,0.45)'; g.fillRect(0, 0, pcb.w, pcb.h); }
  const { pads } = PCB.pads(), labels = [];
  // fabrication + silkscreen
  pcb.parts.forEach(pt => { const c = OCL.findComp(pt.cid); if (!c) return; const f = PCB.fpFor(c, pt), cr = PCB.courtyard(pt); let [w, h] = f.body; if (pt.rot % 2) [w, h] = [h, w];
    const dim = TN && !tr.comps.has(c.id); g.globalAlpha = dim ? 0.3 : 1;
    if (L.fab) { g.setLineDash([0.4, 0.4]); g.strokeStyle = 'rgba(255,200,120,0.35)'; g.lineWidth = 0.05; g.strokeRect(cr.x0, cr.y0, cr.x1 - cr.x0, cr.y1 - cr.y0); g.setLineDash([]); }
    if (L.silk) { g.strokeStyle = PCB.sel === pt.cid ? '#39d0ff' : '#f2f2f2'; g.lineWidth = 0.15; if (f.round) { g.beginPath(); g.arc(pt.x, pt.y, w / 2, 0, 7); g.stroke(); } else g.strokeRect(pt.x - w / 2, pt.y - h / 2, w, h);
      const p1 = pads.find(p => p.cid === c.id && p.num === 1); if (p1) { const dx = p1.x - pt.x, dy = p1.y - pt.y, l = Math.hypot(dx, dy) || 1, off = p1.d / 2 + 0.6; g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(p1.x + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx || -1) * off : 0), p1.y + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) * off : (Math.abs(dx) < 0.01 ? -off : 0)), 0.3, 0, 7); g.fill(); }
      const pol = polMark(c, pads.filter(p => p.cid === c.id)); if (pol) labels.push({ x: pol.x, y: pol.y, t: pol.t, silk: true, min: 0, col: '#f2f2f2', size: 1.2 });
      if (['diode', 'zener', 'led', 'photodiode'].includes(c.type)) { const k = pads.find(p => p.cid === c.id && p.pin === 'K'), a = pads.find(p => p.cid === c.id && p.pin === 'A'); if (k && a) { const bx = k.x + (a.x - k.x) * 0.3, by = k.y + (a.y - k.y) * 0.3, nx = -(a.y - k.y), ny = a.x - k.x, nl = Math.hypot(nx, ny) || 1, hl = Math.min(w, h) / 2 + 0.3; g.lineWidth = 0.3; g.beginPath(); g.moveTo(bx - nx / nl * hl, by - ny / nl * hl); g.lineTo(bx + nx / nl * hl, by + ny / nl * hl); g.stroke(); } } }
    g.globalAlpha = 1;
    labels.push({ x: pt.x, y: cr.y0 - 0.4, t: c.ref, ref: true, col: PCB.sel === pt.cid ? '#39d0ff' : '#f2f2f2', size: 1.4, dim });
    if (L.fab && s > 9) labels.push({ x: pt.x, y: cr.y1 + 1.2, t: OCL.defs[c.type].value ? OCL.defs[c.type].value(c) : '', col: 'rgba(255,200,120,0.75)', size: 1.0, dim }); });
  // pads
  pads.forEach(p => { const vis = p.smd ? L.top : (L.top || L.bottom); if (!vis) return; const hot = TN && TN.has(p.net) && p.net >= 0, dim = TN && !hot;
    g.globalAlpha = dim ? 0.3 : 1; g.fillStyle = hot ? (p.net === tr.primary ? '#ffe14d' : '#ffb84d') : p.smd ? '#e2c26a' : '#d6b45c';
    if (p.smd) { g.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h); } else if (p.first) g.fillRect(p.x - p.d / 2, p.y - p.d / 2, p.d, p.d); else { g.beginPath(); g.arc(p.x, p.y, p.d / 2, 0, 7); g.fill(); }
    if (L.drill && !p.smd) { g.fillStyle = '#0a0f17'; g.beginPath(); g.arc(p.x, p.y, p.drill / 2, 0, 7); g.fill(); }
    if (p.implicit) { g.setLineDash([0.25, 0.2]); g.strokeStyle = '#ff9f43'; g.lineWidth = 0.12; g.strokeRect(p.x - p.d / 2 - 0.2, p.y - p.d / 2 - 0.2, p.d + 0.4, p.d + 0.4); g.setLineDash([]); }
    const sel = PCB.selPad === p.id, hov = PCB.hover === p.id; if (sel || hov) { g.strokeStyle = sel ? '#39d0ff' : '#ffffff'; g.lineWidth = sel ? 0.3 : 0.18; if (p.smd) g.strokeRect(p.x - p.w / 2 - 0.25, p.y - p.h / 2 - 0.25, p.w + 0.5, p.h + 0.5); else { g.beginPath(); g.arc(p.x, p.y, p.d / 2 + 0.3, 0, 7); g.stroke(); } }
    g.globalAlpha = 1;
    if (L.padnums) labels.push({ x: p.x, y: p.y, t: String(p.num), pad: p, inPad: true, col: '#1a1206', size: Math.min(p.w, p.h) * 0.6, dim });
    if (L.pinnames && p.name && p.name !== 'NC' && p.name !== String(p.num)) { const c = pcb.parts.find(q => q.cid === p.cid), dx = p.x - c.x, dy = p.y - c.y, l = Math.hypot(dx, dy) || 1, off = p.d / 2 + 0.9;
      labels.push({ x: p.x + dx / l * off, y: p.y + dy / l * off, t: p.name, col: '#9cf0ff', size: 0.9, pin: true, dim }); } });
  pcb.vias.forEach(v => { if (!(L.top || L.bottom)) return; g.globalAlpha = TN && !TN.has(v.net) ? 0.3 : 1; g.fillStyle = TN && TN.has(v.net) ? '#ffe14d' : '#c8c8c8'; g.beginPath(); g.arc(v.x, v.y, 0.6, 0, 7); g.fill(); if (L.drill) { g.fillStyle = '#0a0f17'; g.beginPath(); g.arc(v.x, v.y, 0.3, 0, 7); g.fill(); } g.globalAlpha = 1; });
  const drc = PCB.drc; if (drc) { if (L.rats) { g.lineWidth = 0.12; g.setLineDash([0.6, 0.4]); drc.rats.forEach(r => { g.strokeStyle = TN && TN.has(r.net) ? '#ffe14d' : '#ffe14d99'; g.beginPath(); g.moveTo(r.a.x, r.a.y); g.lineTo(r.b.x, r.b.y); g.stroke(); }); g.setLineDash([]); }
    drc.issues.filter(i => i.x !== undefined && i.sev !== 'info').forEach(i => { g.strokeStyle = i.sev === 'critical' ? '#ff3b5c' : i.sev === 'high' ? '#ff9f43' : '#ffd166'; g.lineWidth = 0.25; g.beginPath(); g.arc(i.x, i.y, 1.6, 0, 7); g.stroke(); }); }
  if (PCB.route) { const r = PCB.route, m = PCB.mouse ? PCB.snap45(r.pts.at(-1), [snapMM(PCB.mouse[0]), snapMM(PCB.mouse[1])]) : null; g.strokeStyle = r.layer === 'top' ? '#ff7a59' : '#6b9bff'; g.lineWidth = pcb.settings.width; g.lineCap = 'round'; g.globalAlpha = 0.85; g.beginPath(); r.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); if (m) g.lineTo(m[0], m[1]); g.stroke(); g.globalAlpha = 1; }
  g.restore();
  // labels in screen space: zoom-dependent sizing + greedy overlap avoidance
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.textAlign = 'center'; g.textBaseline = 'middle'; const placed = [];
  const order = l => l.inPad ? 0 : l.ref ? 1 : l.silk ? 2 : 3;
  labels.sort((a, b) => order(a) - order(b)).forEach(l => {
    if (!l.t) return; const px = OCL.clamp(l.size * s, 0, l.ref ? 15 : 13); if (px < (l.inPad ? 6.5 : l.ref ? 7 : 7.5)) return;
    g.font = `${l.ref || l.inPad ? 700 : 500} ${px}px ${l.pin || l.inPad ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'}`;
    const X = PCB.ox + l.x * s, Y = PCB.oy + l.y * s, w = g.measureText(l.t).width, box = [X - w / 2 - 1, Y - px / 2 - 1, X + w / 2 + 1, Y + px / 2 + 1];
    if (l.inPad && w > Math.min(l.pad.w, l.pad.h) * s * 0.95) return;
    if (!l.inPad && placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return; if (!l.inPad) placed.push(box);
    g.globalAlpha = l.dim ? 0.45 : 1; if (l.pin) { g.fillStyle = 'rgba(8,14,22,0.75)'; g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]); }
    if (l.inPad) { g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineJoin = 'round'; g.strokeText(l.t, X, Y + 0.5); g.fillStyle = '#fff7d6'; } else g.fillStyle = l.col; g.fillText(l.t, X, Y + 0.5); g.globalAlpha = 1; });
};
function polMark(c, pads) { if (c.type === 'cap_e') { const p = pads.find(q => q.pin === '+'); if (p) return { x: p.x, y: p.y - p.d / 2 - 0.9, t: '+' }; }
  if (['vdc', 'battery', 'o2cell', 'ppgsrc'].includes(c.type)) { const p = pads.find(q => q.pin === '+'); if (p) return { x: p.x, y: p.y - p.d / 2 - 0.9, t: '+' }; } if (c.type === 'bridge') { const p = pads.find(q => q.pin === '+'); if (p) return { x: p.x + 1.4, y: p.y, t: '+' }; } return null; }

/* ---------- exports ---------- */
const gnum = v => Math.round(v * 1e6);
PCB.gerber = layer => {
  const pcb = PCB.ensure(), { pads } = PCB.pads(), H = pcb.h, ap = {}; let next = 10, body = '';
  const apt = (k) => { if (!ap[k]) ap[k] = next++; return ap[k]; }, C = d => apt('C,' + d.toFixed(3)), R = (w, h) => apt('R,' + w.toFixed(3) + 'X' + h.toFixed(3));
  const head = (name, fn) => `G04 Omar Circuit Lab ${OCL.VERSION} — ${name} — UNVERIFIED, NOT MANUFACTURING-READY*\nG04 ${OCL.SIGNATURE}*\n%TF.FileFunction,${fn}*%\n%FSLAX46Y46*%\n%MOMM*%\n%LPD*%\n`;
  const apDefs = () => Object.entries(ap).map(([k, n]) => `%ADD${n}${k}*%`).join('\n') + '\n';
  if (layer === 'outline') { const d = C(0.15); body += `D${d}*\nX0Y${gnum(H)}D02*\nX${gnum(pcb.w)}Y${gnum(H)}D01*\nX${gnum(pcb.w)}Y0D01*\nX0Y0D01*\nX0Y${gnum(H)}D01*\n`; return head('Board outline', 'Profile,NP') + apDefs() + body + 'M02*\n'; }
  if (layer === 'silk') { const d = C(0.15);
    pcb.parts.forEach(pt => { const c = OCL.findComp(pt.cid); if (!c) return; const f = PCB.fpFor(c, pt); let [w, h] = f.body; if (pt.rot % 2) [w, h] = [h, w]; const x0 = pt.x - w / 2, x1 = pt.x + w / 2, y0 = H - (pt.y - h / 2), y1 = H - (pt.y + h / 2);
      body += `D${d}*\nX${gnum(x0)}Y${gnum(y0)}D02*\nX${gnum(x1)}Y${gnum(y0)}D01*\nX${gnum(x1)}Y${gnum(y1)}D01*\nX${gnum(x0)}Y${gnum(y1)}D01*\nX${gnum(x0)}Y${gnum(y0)}D01*\n`;
      const p1 = pads.find(p => p.cid === c.id && p.num === 1); if (p1) body += `D${C(0.6)}*\nX${gnum(p1.x - p1.d / 2 - 0.6)}Y${gnum(H - p1.y)}D03*\n`; });
    return head('Top silkscreen (outlines + pin-1 dots; no text)', 'Legend,Top') + apDefs() + body + 'M02*\n'; }
  pads.filter(p => !p.smd || layer === 'top').forEach(p => { body += `D${p.smd ? R(p.w, p.h) : p.first ? R(p.d, p.d) : C(p.d)}*\nX${gnum(p.x)}Y${gnum(H - p.y)}D03*\n`; });
  pcb.vias.forEach(v => { body += `D${C(1.2)}*\nX${gnum(v.x)}Y${gnum(H - v.y)}D03*\n`; });
  pcb.tracks.filter(t => t.layer === layer).forEach(t => { body += `D${C(t.w)}*\n`; t.pts.forEach((p, i) => body += `X${gnum(p[0])}Y${gnum(H - p[1])}D0${i ? 1 : 2}*\n`); });
  return head(layer === 'top' ? 'Top copper' : 'Bottom copper', layer === 'top' ? 'Copper,L1,Top' : 'Copper,L2,Bot') + apDefs() + body + 'M02*\n';
};
PCB.drill = () => {
  const pcb = PCB.ensure(), { pads } = PCB.pads(), H = pcb.h, holes = [...pads.filter(p => !p.smd).map(p => ({ x: p.x, y: p.y, d: p.drill })), ...pcb.vias.map(v => ({ x: v.x, y: v.y, d: 0.6 }))];
  const sizes = [...new Set(holes.map(h => h.d.toFixed(2)))]; let s = `M48\n; Omar Circuit Lab ${OCL.VERSION} — Excellon drill — UNVERIFIED\nMETRIC,TZ\n`;
  sizes.forEach((d, i) => s += `T${i + 1}C${d}\n`); s += '%\nG90\nG05\n';
  sizes.forEach((d, i) => { s += `T${i + 1}\n`; holes.filter(h => h.d.toFixed(2) === d).forEach(h => s += `X${h.x.toFixed(3)}Y${(H - h.y).toFixed(3)}\n`); });
  return s + 'T0\nM30\n';
};
OCL.bomCSV = () => {
  const rows = {}; OCL.allComponents().forEach(c => { const d = OCL.defs[c.type]; if (d.offboard || ['ground', 'label', 'vcc', 'junction'].includes(c.type)) return; const part = OCL.parts[c.part] || OCL.customParts[c.part] || { name: d.name, ds: {} };
    const val = d.value ? d.value(c) : ''; const k = c.part + '|' + val; rows[k] = rows[k] || { refs: [], name: part.name, val, fp: (PCB.fpFor(c) || {}).name || '—', mfr: (part.ds && part.ds.mfr) || '', pn: (part.ds && part.ds.part) || '' }; rows[k].refs.push(c.ref); });
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  return 'Qty,References,Description,Value,Footprint,Manufacturer,Part number\n' + Object.values(rows).sort((a, b) => a.refs[0].localeCompare(b.refs[0], undefined, { numeric: true })).map(r => [r.refs.length, r.refs.join(' '), r.name, r.val, r.fp, r.mfr, r.pn].map(q).join(',')).join('\n') + `\n\n${q('Generated by Omar Circuit Lab — ' + OCL.SIGNATURE)}\n`;
};
})();
