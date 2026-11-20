/* OMAR CIRCUIT LAB — 3D Workbench: lightweight dependency-free 3D renderer (Canvas 2D, flat shading, painter's sort)
   Interactive orbit/pan/zoom, component picking, exploded assembly view, PCB layer separation and net-voltage animation. */
'use strict';
(() => {
const V3 = OCL.view3d = { yaw: -0.6, pitch: 0.75, dist: 180, tx: 0, ty: 0, tz: 0, explode: 0, labels: true, meshes: [], sel: null, anim: null, flow: true, t: 0, ortho: false, alpha: 1, tool: 'orbit', snap: true,
  show: { top: true, bottom: true, mask: true, silk: true, comps: true, leads: true, rats: true, padlabels: true, grid: true, axes: true } };
const BAND = ['#111', '#7b3f00', '#d0021b', '#f5871f', '#f8e71c', '#3bb54a', '#2d6cdf', '#8b4fd8', '#8f8f8f', '#f4f4f4'];
const hex2 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };

/* ---- primitives (local coordinates, Y up) ---- */
function box(w, h, d, x = 0, y = 0, z = 0) {
  const X = w / 2, Y = h / 2, Z = d / 2, v = [[-X, -Y, -Z], [X, -Y, -Z], [X, Y, -Z], [-X, Y, -Z], [-X, -Y, Z], [X, -Y, Z], [X, Y, Z], [-X, Y, Z]].map(p => [p[0] + x, p[1] + y, p[2] + z]);
  return { v, f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]] };
}
function cyl(r, h, axis = 'y', seg = 14, x = 0, y = 0, z = 0, r2) {
  r2 = r2 ?? r; const v = [], f = [];
  for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const P = (rr, t) => axis === 'y' ? [rr * c, t, rr * s] : axis === 'x' ? [t, rr * c, rr * s] : [rr * c, rr * s, t];
    v.push(P(r, -h / 2), P(r2, h / 2)); }
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; f.push([2 * i, 2 * j, 2 * j + 1, 2 * i + 1]); }
  f.push([...Array(seg).keys()].map(i => 2 * i).reverse()); f.push([...Array(seg).keys()].map(i => 2 * i + 1));
  return { v: v.map(p => [p[0] + x, p[1] + y, p[2] + z]), f };
}
const mesh = (geo, color, o = {}) => ({ ...geo, color: hex2(color), alpha: 1, ...o });

/* ---- scene construction from the PCB layout ---- */
V3.build = () => {
  const pcb = OCL.pcb.ensure(); if (!pcb.parts.length) OCL.pcb.sync(true);
  const W = pcb.w, H = pcb.h, M = [], X = x => x - W / 2, Z = y => y - H / 2, T = 1.6;
  const R = OCL.sim.readings || {};
  // board layers (layer index used by explode)
  M.push(mesh(box(W, 0.035, H, 0, -0.02, 0), '#b87333', { layer: -2, name: 'Bottom copper (B.Cu)', alpha: 0.9 }));
  M.push(mesh(box(W, T, H, 0, T / 2, 0), '#1d6b45', { layer: 0, name: 'FR-4 substrate (1.6 mm)' }));
  M.push(mesh(box(W, 0.035, H, 0, T + 0.02, 0), '#c98a4a', { layer: 1, name: 'Top copper (F.Cu)', alpha: 0.35 }));
  M.push(mesh(box(W, 0.03, H, 0, T + 0.06, 0), '#0f8a4a', { layer: 2, name: 'Solder mask', alpha: 0.35 }));
  [[3, 3], [W - 3, 3], [3, H - 3], [W - 3, H - 3]].forEach(([x, y]) => M.push(mesh(cyl(1.6, T + 0.2, 'y', 12, X(x), T / 2, Z(y)), '#d9d9d9', { layer: 0, name: 'Mounting hole (M3)' })));
  pcb.tracks.forEach(t => t.pts.slice(1).forEach((p, i) => { const a = t.pts[i], dx = p[0] - a[0], dy = p[1] - a[1], L = Math.hypot(dx, dy); if (!L) return;
    const g = box(L + t.w, 0.05, t.w, 0, 0, 0), ang = Math.atan2(dy, dx), c = Math.cos(ang), s = Math.sin(ang), cx = X((a[0] + p[0]) / 2), cz = Z((a[1] + p[1]) / 2), y = t.layer === 'top' ? T + 0.04 : -0.04;
    g.v = g.v.map(([x, yy, z]) => [cx + x * c - z * s, y + yy, cz + x * s + z * c]); M.push(mesh(g, t.layer === 'top' ? '#e08a4a' : '#d07a3a', { layer: t.layer === 'top' ? 1 : -2, name: `Track (${t.layer}, net ${t.net})`, track: { t, i }, net: t.net })); }));
  const { pads } = OCL.pcb.pads();
  pads.forEach(p => { const nm = `Pad ${p.num} · ${p.ref}.${p.name} (${p.netName})`;
    if (p.smd) M.push(mesh(box(p.w, 0.06, p.h, X(p.x), T + 0.05, Z(p.y)), '#e2c26a', { layer: 1, name: nm, pad: p, net: p.net, cid: p.cid, kind: 'pad' }));
    else M.push(mesh(cyl(p.d / 2, T + 0.1, 'y', p.first ? 4 : 10, X(p.x), T / 2, Z(p.y)), '#d6b45c', { layer: 0, name: nm, pad: p, net: p.net, cid: p.cid, kind: 'pad' })); });
  pcb.parts.forEach(pt => {
    const c = OCL.findComp(pt.cid); if (!c) return; const d = OCL.defs[c.type], f = OCL.pcb.fpFor(c, pt), my = pads.filter(p => p.cid === c.id), cx = X(pt.x), cz = Z(pt.y), rot = (pt.rot || 0) % 2;
    const info = { cid: c.id }, body = [], leads = [];
    const B = (g, col, o = {}) => body.push(mesh(g, col, { ...info, ...o })), Ld = (g, col = '#c9ccd1') => leads.push(mesh(g, col, { ...info, lead: true }));
    const vertLeads = (h, w = 0.5) => my.forEach(p => Ld(box(w, h, w, X(p.x), T + h / 2, Z(p.y))));
    const along = rot ? 'z' : 'x';
    // silkscreen: body outline + pin-1 dot (layer 2)
    { let [w, h] = f.body; if (rot) [w, h] = [h, w]; const y = T + 0.09, sw = 0.15, S = (bw, bd, x, z) => M.push(mesh(box(bw, 0.02, bd, x, y, z), '#f2f2f2', { layer: 2, silk: true, cid: c.id, name: `${c.ref} silkscreen` }));
      S(w, sw, cx, cz - h / 2); S(w, sw, cx, cz + h / 2); S(sw, h, cx - w / 2, cz); S(sw, h, cx + w / 2, cz);
      const p1 = my.find(p => p.num === 1); if (p1) { const dx = p1.x - pt.x, dy = p1.y - pt.y, off = p1.d / 2 + 0.6, ox = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx || -1) * off : 0, oz = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) * off : (Math.abs(dx) < 0.01 ? -off : 0);
        M.push(mesh(cyl(0.35, 0.03, 'y', 8, X(p1.x) + ox, y, Z(p1.y) + oz), '#ffffff', { layer: 2, silk: true, cid: c.id, name: `${c.ref} pin 1 marker` })); } }
    const kpad = my.find(p => p.pin === 'K'), bandAt = (len) => { if (!kpad) return 0; const v = rot ? Z(kpad.y) - cz : X(kpad.x) - cx; return Math.sign(v) * len; };
    const smdLeads = () => my.forEach(p => Ld(box(p.w * 0.7, 0.25, p.h * 0.7, X(p.x), T + 0.2, Z(p.y)), '#cfd3d8'));
    if (f.smd) { let [w, h] = f.body; if (rot) [w, h] = [h, w];
      if (f.key === 'r0805') { const col = ['capacitor', 'ntc'].includes(c.type) ? '#b9864a' : '#1c1c1c'; B(box(w, f.h, h, cx, T + 0.1 + f.h / 2, cz), col); my.forEach(p => B(box(rot ? w : 0.35, f.h + 0.02, rot ? 0.35 : h, X(p.x) * 0.8 + cx * 0.2, T + 0.1 + f.h / 2, Z(p.y) * 0.8 + cz * 0.2), '#d9d9d9')); }
      else if (f.key === 'led0805') { const col = d.ledColor ? d.ledColor(c) : '#ffd23b', r = R[c.id], br = r && r.x && r.x.brightness ? Math.min(1, r.x.brightness) : 0; B(box(w, 0.4, h, cx, T + 0.3, cz), '#f2f2f2'); B(box(w * 0.8, 0.45, h * 0.8, cx, T + 0.75, cz), col, { alpha: 0.85, glow: br > 0.02 ? br : 0 }); }
      else if (f.key === 'sod123') { B(box(w, f.h, h, cx, T + 0.1 + f.h / 2, cz), '#1b1b1b'); B(box(rot ? w : 0.35, f.h + 0.02, rot ? 0.35 : h, cx + (rot ? 0 : bandAt(w / 2 - 0.4)), T + 0.1 + f.h / 2, cz + (rot ? bandAt(h / 2 - 0.4) : 0)), '#c0c0c0'); smdLeads(); }
      else { B(box(w, f.h, h, cx, T + 0.15 + f.h / 2, cz), '#202226'); smdLeads(); my.forEach(p => { const dx = X(p.x) - cx, dz = Z(p.y) - cz, horiz = Math.abs(dx) > Math.abs(dz); Ld(box(horiz ? Math.abs(dx) - w / 2 + 0.3 : 0.35, 0.18, horiz ? 0.35 : Math.abs(dz) - h / 2 + 0.3, horiz ? cx + Math.sign(dx) * (w / 2 + (Math.abs(dx) - w / 2) / 2) : X(p.x), T + 0.35, horiz ? Z(p.y) : cz + Math.sign(dz) * (h / 2 + (Math.abs(dz) - h / 2) / 2)), '#cfd3d8'); }); }
    }
    else switch (c.type === 'switch' ? 'switch' : c.type === 'mpx5010' ? 'mpx' : d.m3d) {
      case 'switch': B(box(6, 3.5, 6, cx, T + 1.75, cz), '#1d1d1d'); B(cyl(1.7, 1.5, 'y', 14, cx, T + 4.2, cz), '#d0d4da'); vertLeads(0.8); break;
      case 'mpx': { let [w, h] = f.body; if (rot) [w, h] = [h, w]; B(box(w, 6, h, cx, T + 4, cz), '#2b2b2b'); B(cyl(1.2, 5, 'y', 12, cx + (rot ? 0 : w / 2 - 3), T + 9.5, cz + (rot ? h / 2 - 3 : 0)), '#3a3a3a'); vertLeads(1); break; }
      case 'resistor': { const len = 6.3, y = T + 2.2, digs = bands(c.props.R); B(cyl(1.25, len, along, 14, cx, y, cz), '#d8c29a');
        digs.forEach((col, i) => { const o = -2.2 + i * 1.2 + (i === 3 ? 0.9 : 0); B(cyl(1.3, 0.5, along, 14, cx + (rot ? 0 : o), y, cz + (rot ? o : 0)), col); });
        my.forEach(p => { Ld(box(0.5, y - T, 0.5, X(p.x), T + (y - T) / 2, Z(p.y))); const ex = rot ? 0 : (X(p.x) - cx), ez = rot ? (Z(p.y) - cz) : 0; Ld(box(rot ? 0.5 : Math.abs(ex), 0.5, rot ? Math.abs(ez) : 0.5, cx + ex / 2, y, cz + ez / 2)); }); break; }
      case 'diode': { const y = T + 2; B(cyl(1.35, 5, along, 12, cx, y, cz), '#1b1b1b'); B(cyl(1.4, 0.6, along, 12, cx + (rot ? 0 : bandAt(1.8)), y, cz + (rot ? bandAt(1.8) : 0)), '#c0c0c0');
        my.forEach(p => { Ld(box(0.5, y - T, 0.5, X(p.x), T + (y - T) / 2, Z(p.y))); const ex = rot ? 0 : (X(p.x) - cx), ez = rot ? (Z(p.y) - cz) : 0; Ld(box(rot ? 0.5 : Math.abs(ex), 0.5, rot ? Math.abs(ez) : 0.5, cx + ex / 2, y, cz + ez / 2)); }); break; }
      case 'cap_ceramic': B(cyl(2.5, 1.6, rot ? 'x' : 'z', 14, cx, T + 4.5, cz), c.type === 'ntc' ? '#2d2d2d' : '#d9822b'); vertLeads(2.5); break;
      case 'cap_e': { const r = (f.body[0]) / 2, h = Math.min(16, f.h); B(cyl(r, h, 'y', 18, cx, T + 0.5 + h / 2, cz), '#1d3f8a'); B(box(0.8, h * 0.95, 0.2, cx + (rot ? 0 : -r * 0.2), T + 0.5 + h / 2, cz - r + 0.05), '#cfd6e6'); B(cyl(r * 0.92, 0.25, 'y', 18, cx, T + 0.6 + h, cz), '#bfc6cf'); vertLeads(0.6); break; }
      case 'inductor': B(cyl(3.6, 6, 'y', 16, cx, T + 3.5, cz), '#3a3a3a'); B(cyl(3.7, 2, 'y', 16, cx, T + 3.5, cz), '#b8692e'); vertLeads(0.6); break;
      case 'led': { const col = d.ledColor ? d.ledColor(c) : '#a0e8ff', r = R[c.id], br = r && r.x && r.x.brightness ? Math.min(1, r.x.brightness) : 0;
        const lit = br > 0.02; B(cyl(2.9, 1, 'y', 16, cx, T + 3.5, cz), col, { alpha: 0.9, glow: lit ? br : 0 }); B(cyl(2.5, 4, 'y', 16, cx, T + 6, cz), col, { alpha: 0.75, glow: lit ? br : 0 }); B(cyl(2.5, 1.6, 'y', 16, cx, T + 8.8, cz, 1.0), col, { alpha: 0.75, glow: lit ? br : 0 }); vertLeads(3); break; }
      case 'to92': B(box(rot ? 3.8 : 4.8, 4.8, rot ? 4.8 : 3.8, cx, T + 5.4, cz), '#1a1a1a'); vertLeads(3); break;
      case 'to220': { const w = 10.2, h = 9, tab = 6.2; B(box(rot ? 4.5 : w, h, rot ? w : 4.5, cx, T + 4 + h / 2, cz), '#1a1a1a'); B(box(rot ? 1.3 : w, tab, rot ? w : 1.3, cx + (rot ? 1.6 : 0), T + 4 + h + tab / 2, cz + (rot ? 0 : 1.6)), '#c8ccd2'); B(cyl(1.8, 1.5, rot ? 'x' : 'z', 12, cx + (rot ? 1.6 : 0), T + 4 + h + tab / 2, cz + (rot ? 0 : 1.6)), '#2a2a2a'); vertLeads(4); break; }
      case 'dip': { let [w, h] = f.body; if (rot) [w, h] = [h, w]; B(box(w, 3.3, h, cx, T + 0.6 + 1.65, cz), '#202226'); B(cyl(0.6, 0.1, 'y', 10, cx + (rot ? -h / 2 + 1.5 : 0), T + 2.31, cz + (rot ? 0 : -h / 2 + 1.5)), '#3a3d44');
        my.forEach(p => { Ld(box(0.5, 2, 0.5, X(p.x), T + 1, Z(p.y))); const dx = X(p.x) - cx, dz = Z(p.y) - cz; Ld(box(Math.abs(dx) > Math.abs(dz) ? Math.abs(dx) - w / 2 + 0.6 : 0.5, 0.4, Math.abs(dx) > Math.abs(dz) ? 0.5 : Math.abs(dz) - h / 2 + 0.6, X(p.x) - Math.sign(dx) * (Math.abs(dx) > Math.abs(dz) ? (Math.abs(dx) - w / 2) / 2 : 0), T + 2.1, Z(p.y) - Math.sign(dz) * (Math.abs(dx) > Math.abs(dz) ? 0 : (Math.abs(dz) - h / 2) / 2))); }); break; }
      case 'module': { const [w, h] = f.body; B(box(w, 1.6, h, cx, T + 9, cz), c.part === 'esp32' ? '#1b1b1b' : '#0e5aa7'); B(box(10, 1.2, 10, cx, T + 10.4, cz), '#222'); B(box(6, 3, 8, cx - w / 2 + 5, T + 11.3, cz - h / 2 + 6), '#c0c0c0');
        my.forEach(p => { B(box(2.5, 8, 2.5, X(p.x), T + 4, Z(p.y)), '#111'); Ld(box(0.64, 10, 0.64, X(p.x), T + 5, Z(p.y)), '#d4af37'); }); break; }
      case 'header': { const pw = my.length * 2.54; B(box(rot ? 2.5 : pw, 2.5, rot ? pw : 2.5, cx, T + 1.25, cz), '#151515'); my.forEach(p => Ld(box(0.64, 8.5, 0.64, X(p.x), T + 4.25, Z(p.y)), '#d4af37')); break; }
      case 'transformer': B(box(28, 20, 24, cx, T + 10, cz), '#6e6e6e'); B(box(30, 12, 14, cx, T + 10, cz), '#b8692e'); vertLeads(1); break;
      case 'pot': B(box(9.5, 5, 9.5, cx, T + 2.5, cz), '#2c62c9'); B(cyl(2, 2.5, 'y', 12, cx, T + 6, cz), '#f2f2f2'); vertLeads(1); break;
      case 'fuse': B(cyl(1.3, 6, along, 12, cx, T + 2.5, cz), '#e8f2ff', { alpha: 0.6 }); B(cyl(1.4, 1, along, 12, cx + (rot ? 0 : -2.5), T + 2.5, cz + (rot ? -2.5 : 0)), '#c0c0c0'); B(cyl(1.4, 1, along, 12, cx + (rot ? 0 : 2.5), T + 2.5, cz + (rot ? 2.5 : 0)), '#c0c0c0'); vertLeads(2.5); break;
      default: { let [w, h] = f.body; if (rot) [w, h] = [h, w]; B(box(w, Math.min(8, f.h), h, cx, T + Math.min(8, f.h) / 2 + 0.5, cz), '#4a5568'); vertLeads(0.5); }
    }
    if (d.m3d === 'led' && !f.smd && kpad) { const v = rot ? Z(kpad.y) - cz : X(kpad.x) - cx; B(box(rot ? 5.8 : 0.4, 1, rot ? 0.4 : 5.8, cx + (rot ? 0 : Math.sign(v) * 2.7), T + 3.5, cz + (rot ? Math.sign(v) * 2.7 : 0)), d.ledColor ? d.ledColor(c) : '#9fd3ff', { alpha: 0.9 }); }
    body.forEach(m => { m.layer = 4; m.body = true; m.name = `${c.ref} — ${(OCL.parts[c.part] || {}).name || d.name}`; M.push(m); }); leads.forEach(m => { m.layer = 3; m.name = `${c.ref} leads/pins`; M.push(m); });
    M.push({ label: c.ref, at: [cx, T + Math.min(f.h || 6, 16) + 3, cz], cid: c.id, layer: 4 });
  });
  V3.meshes = M; V3.W = W; V3.H = H; V3.T = T;
};
function bands(R) { if (!(R > 0)) return [BAND[0], BAND[0], BAND[0], '#cfa64a']; let e = Math.floor(Math.log10(R)) - 1, m = Math.round(R / 10 ** e); if (m >= 100) { m = Math.round(m / 10); e++; } const d1 = Math.floor(m / 10), d2 = m % 10; return [BAND[d1], BAND[d2], e >= 0 && e <= 9 ? BAND[e] : e === -1 ? '#cfa64a' : '#c0c0c0', '#cfa64a']; }

/* ---- rendering ---- */
const EX = { '-2': -14, '0': 0, '1': 5, '2': 10, '3': 22, '4': 40 };
const VIEWS = { top: [0, 1.5499], bottom: [0, -1.5499], front: [0, 0], back: [Math.PI, 0], left: [-Math.PI / 2, 0], right: [Math.PI / 2, 0], iso: [-0.785, 0.62] };
V3.setView = name => { const v = VIEWS[name]; if (!v) return; const from = [V3.yaw, V3.pitch], t0 = performance.now(); let dy = v[0] - from[0]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  V3.anim = () => { const k = Math.min(1, (performance.now() - t0) / 450), e = 1 - (1 - k) ** 3; V3.yaw = from[0] + dy * e; V3.pitch = from[1] + (v[1] - from[1]) * e; V3.draw(); if (k >= 1) V3.anim = null; }; };
V3.mount = cv => {
  V3.cv = cv; V3.g = cv.getContext('2d'); cv.tabIndex = 0; let drag = null, lastHover = 0;
  cv.addEventListener('mousedown', e => { cv.focus(); OCL.tip.hide();
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const face = (V3.cubeFaces || []).find(f => inPoly(mx, my, f.pts)); if (face) { V3.setView(face.view); return; }
    if (V3.tool === 'move' && e.button === 0) { const F = V3.hitFace(mx, my); if (F && F.m.cid) { const pt = OCL.state.project.pcb.parts.find(p => p.cid === F.m.cid), hit = V3.unproject(mx, my, V3.T); if (pt && hit) { drag = { move: pt, ox: pt.x - (hit[0] + V3.W / 2), oz: pt.y - (hit[2] + V3.H / 2), moved: false }; V3.sel = F.m.cid; OCL.ui.selectComp(F.m.cid, true); return; } } }
    drag = { x: e.clientX, y: e.clientY, yaw: V3.yaw, pitch: V3.pitch, tx: V3.tx, tz: V3.tz, ty: V3.ty, pan: e.button === 2 || e.shiftKey, moved: false }; });
  if (!V3._win) { V3._win = true;
    window.addEventListener('mousemove', e => { if (!drag || !V3.cv || !V3.cv.isConnected) return;
      if (drag.move) { const r = V3.cv.getBoundingClientRect(), hit = V3.unproject(e.clientX - r.left, e.clientY - r.top, V3.T); if (!hit) return; const q = V3.snap ? 0.635 : 0.05; let nx = Math.round((hit[0] + V3.W / 2 + drag.ox) / q) * q, ny = Math.round((hit[2] + V3.H / 2 + drag.oz) / q) * q;
        if (nx !== drag.move.x || ny !== drag.move.y) { drag.move.x = nx; drag.move.y = ny; drag.moved = true; V3.build(); V3.draw(); } return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (drag.pan) { const s = V3.dist / 600, c = Math.cos(V3.yaw), sn = Math.sin(V3.yaw); V3.tx = drag.tx - (dx * c) * s; V3.tz = drag.tz - (-dx * sn) * s; V3.ty = drag.ty + dy * s * Math.cos(V3.pitch); }
      else { V3.yaw = drag.yaw + dx * 0.008; V3.pitch = OCL.clamp(drag.pitch + dy * 0.008, -1.5499, 1.5499); } V3.draw(); });
    window.addEventListener('mouseup', e => { if (!drag) return; if (drag.move) { if (drag.moved) { OCL.pcb.analyze(); OCL.emit('dirty'); OCL.emit('pcbchange'); } } else if (!drag.moved && e.target === V3.cv) V3.pick(e); drag = null; });
    window.addEventListener('keydown', e => { if (!V3.cv || document.activeElement !== V3.cv) return; const k = e.key.toLowerCase(), s = V3.dist / 40, c = Math.cos(V3.yaw), sn = Math.sin(V3.yaw); let hit = true;
      if (k === 'w' || k === 'arrowup') { V3.tx -= sn * s; V3.tz -= c * s; } else if (k === 's' || k === 'arrowdown') { V3.tx += sn * s; V3.tz += c * s; } else if (k === 'a' || k === 'arrowleft') { V3.tx -= c * s; V3.tz += sn * s; } else if (k === 'd' || k === 'arrowright') { V3.tx += c * s; V3.tz -= sn * s; }
      else if (k === 'q') V3.ty -= s; else if (k === 'e') V3.ty += s; else if (k === '+' || k === '=') V3.dist *= 0.9; else if (k === '-') V3.dist *= 1.1; else if (k === 'escape') { OCL.trace.clear(); } else if (k === 'f') V3.fit(); else hit = false;
      if (hit) { e.preventDefault(); V3.draw(); } }); }
  cv.addEventListener('mousemove', e => { if (drag || performance.now() - lastHover < 40) return; lastHover = performance.now(); const r = cv.getBoundingClientRect(), F = V3.hitFace(e.clientX - r.left, e.clientY - r.top);
    const id = F ? F.m : null; if (F && F.m.pad) { const p = F.m.pad; OCL.tip.show(OCL.pinInfoHTML(OCL.pinInfo(p.cid, p.pin, p.num)), e.clientX, e.clientY); } else if (F && F.m.cid && F.m.body) OCL.tip.show(`<b>${OCL.esc(F.m.name)}</b><div class="muted small">click to select · Trace mode: click a pad</div>`, e.clientX, e.clientY); else OCL.tip.hide();
    if (V3.hover !== id) { V3.hover = id; V3.draw(); } });
  cv.addEventListener('mouseleave', () => { OCL.tip.hide(); V3.hover = null; V3.draw(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); V3.dist = OCL.clamp(V3.dist * (e.deltaY < 0 ? 0.9 : 1.1), 10, 900); V3.draw(); }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  let tp = null; cv.addEventListener('touchstart', e => { const t = e.touches[0]; tp = { x: t.clientX, y: t.clientY, yaw: V3.yaw, pitch: V3.pitch }; }, { passive: true });
  cv.addEventListener('touchmove', e => { if (!tp) return; const t = e.touches[0]; V3.yaw = tp.yaw + (t.clientX - tp.x) * 0.008; V3.pitch = OCL.clamp(tp.pitch + (t.clientY - tp.y) * 0.008, -1.5499, 1.5499); V3.draw(); }, { passive: true });
  new ResizeObserver(() => V3.draw()).observe(cv.parentElement);
  if (!V3._loop) { V3._loop = true; const loop = () => { if (V3.cv && V3.cv.isConnected && OCL.state.view === 'workbench') { V3.t += 0.016; if (V3.anim) V3.anim(); else if (V3.flow && OCL.sim.readings && OCL.sim.status !== 'idle') V3.draw(); } requestAnimationFrame(loop); }; loop();
    let deb = 0; const rebuild = () => { clearTimeout(deb); deb = setTimeout(() => { if (V3.cv && V3.cv.isConnected) { V3.build(); V3.draw(); } }, 60); };
    OCL.on('pcbchange', rebuild); OCL.on('circuit', rebuild); OCL.on('sim', rebuild);
    OCL.on('trace', () => V3.cv && V3.cv.isConnected && V3.draw()); OCL.on('selection', () => { V3.sel = OCL.state.sel; if (V3.cv && V3.cv.isConnected) V3.draw(); }); }
};
V3.basis = () => { const cy = Math.cos(V3.yaw), sy = Math.sin(V3.yaw), cp = Math.cos(V3.pitch), sp = Math.sin(V3.pitch); return { cy, sy, cp, sp }; };
V3.project = () => {
  const { cy, sy, cp, sp } = V3.basis(), D = V3.dist;
  const cam = [V3.tx + D * cp * sy, V3.ty + D * sp, V3.tz + D * cp * cy];
  return { cam, f: ([x, y, z]) => { x -= V3.tx; y -= V3.ty; z -= V3.tz; const x1 = x * cy - z * sy, z1 = x * sy + z * cy; const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; return [x1, y2, D - z2]; } };
};
V3.screen = (q, Wd, Hd, foc) => { if (V3.ortho) { const k = foc / V3.dist; return [Wd / 2 + q[0] * k, Hd / 2 - q[1] * k, q[2]]; } const z = Math.max(1, q[2]); return [Wd / 2 + q[0] * foc / z, Hd / 2 - q[1] * foc / z, q[2]]; };
V3.unproject = (sx, sy, planeY) => { const r = V3.cv.getBoundingClientRect(), Wd = r.width, Hd = r.height, foc = Math.min(Wd, Hd) * 1.2, { cy, sy: syw, cp, sp } = V3.basis(), D = V3.dist;
  const at = depth => { let x1, y2; if (V3.ortho) { const k = foc / D; x1 = (sx - Wd / 2) / k; y2 = -(sy - Hd / 2) / k; } else { x1 = (sx - Wd / 2) * depth / foc; y2 = -(sy - Hd / 2) * depth / foc; } const z2 = D - depth;
    const y = y2 * cp + z2 * sp, z1 = -y2 * sp + z2 * cp, x = x1 * cy + z1 * syw, z = -x1 * syw + z1 * cy; return [x + V3.tx, y + V3.ty, z + V3.tz]; };
  const a = at(D * 0.2), b = at(D * 3); if (Math.abs(b[1] - a[1]) < 1e-9) return null; const t = (planeY - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, planeY, a[2] + (b[2] - a[2]) * t]; };
const visible = m => { const S = V3.show; if (m.silk) return S.silk; if (m.kind === 'pad') return m.pad.smd ? S.top : (S.top || S.bottom); if (m.track) return m.track.t.layer === 'top' ? S.top : S.bottom;
  if (m.layer === -2) return S.bottom; if (m.layer === 1) return S.top; if (m.layer === 2) return S.mask; if (m.lead) return S.leads; if (m.body) return S.comps; return true; };
V3.draw = () => {
  const cv = V3.cv; if (!cv || !cv.isConnected) return; const par = cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(par.width * dpr) || cv.height !== Math.round(par.height * dpr)) { cv.width = Math.round(par.width * dpr); cv.height = Math.round(par.height * dpr); cv.style.width = par.width + 'px'; cv.style.height = par.height + 'px'; }
  const g = V3.g, Wd = par.width, Hd = par.height; if (!Wd || !Hd) return; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const grd = g.createLinearGradient(0, 0, 0, Hd); grd.addColorStop(0, '#111a2b'); grd.addColorStop(1, '#070b12'); g.fillStyle = grd; g.fillRect(0, 0, Wd, Hd);
  const { f, cam } = V3.project(), foc = Math.min(Wd, Hd) * 1.2, light = norm([0.4, 1, 0.6]), faces = [];
  const P = p => V3.screen(f(p), Wd, Hd, foc);
  if (V3.show.grid) { g.strokeStyle = 'rgba(120,160,220,0.08)'; g.lineWidth = 1; const gy = -12, step = 10, ext = 200; for (let i = -ext; i <= ext; i += step) { const a = P([i, gy, -ext]), b = P([i, gy, ext]), c = P([-ext, gy, i]), d = P([ext, gy, i]); if (a[2] > 1 && b[2] > 1) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } if (c[2] > 1 && d[2] > 1) { g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.stroke(); } } }
  const e = V3.explode, labels = [], tr = OCL.state.trace, TN = tr ? tr.nets : null;
  V3.meshes.forEach((m, mi) => {
    const off = e * (EX[m.layer] || 0);
    if (m.label) { if (V3.show.comps || V3.show.leads) labels.push({ m, p: P([m.at[0], m.at[1] + off, m.at[2]]) }); return; }
    if (!visible(m)) return;
    const wv = m.v.map(p => [p[0], p[1] + off, p[2]]), pv = wv.map(P);
    const hot = TN && ((m.net !== undefined && TN.has(m.net) && m.net >= 0) || (m.cid && tr.comps.has(m.cid) && (m.body || m.lead))), dim = TN && !hot && m.layer !== 0 && m.layer !== -2 && m.layer !== 1 && m.layer !== 2 || (TN && !hot && (m.track || m.kind === 'pad'));
    m.f.forEach(fc => {
      const a = wv[fc[0]], b = wv[fc[1]], c = wv[fc[2]]; let n = norm(cross(sub(b, a), sub(c, a)));
      const cen = fc.reduce((s, i) => [s[0] + wv[i][0], s[1] + wv[i][1], s[2] + wv[i][2]], [0, 0, 0]).map(v => v / fc.length);
      const view = V3.ortho ? [Math.cos(V3.pitch) * Math.sin(V3.yaw), Math.sin(V3.pitch), Math.cos(V3.pitch) * Math.cos(V3.yaw)] : sub(cam, cen); if (dot(n, view) < 0) n = n.map(v => -v);
      const sh = 0.38 + 0.62 * Math.max(0, dot(n, light)); const z = fc.reduce((s, i) => s + pv[i][2], 0) / fc.length; if (!V3.ortho && z < 2) return;
      faces.push({ pts: fc.map(i => pv[i]), z, m, sh, mi, hot, dim });
    });
  });
  faces.sort((a, b) => b.z - a.z); V3.faces = faces;
  faces.forEach(F => { const m = F.m, sel = V3.sel && m.cid === V3.sel && (m.body || m.lead), hov = V3.hover === m; let [r, gg, b] = m.color, k = F.sh, al = m.alpha * (m.body ? V3.alpha : 1);
    if (m.glow) { r = r + (255 - r) * m.glow * 0.5; gg = gg + (255 - gg) * m.glow * 0.5; b = b + (255 - b) * m.glow * 0.5; k = Math.max(k, 0.85 + 0.15 * m.glow); }
    if (F.hot) { const isP = m.net === (tr && tr.primary); r = r * 0.35 + 255 * 0.65; gg = gg * 0.35 + (isP ? 225 : 184) * 0.65; b = b * 0.35 + (isP ? 77 : 77) * 0.65; k = Math.max(k, 0.8); }
    if (F.dim) al *= 0.22;
    if (sel || hov) { r = r * 0.6 + 57 * 0.4; gg = gg * 0.6 + 208 * 0.4; b = b * 0.6 + 255 * 0.4; }
    g.fillStyle = `rgba(${r * k | 0},${gg * k | 0},${b * k | 0},${al})`; g.beginPath(); F.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
    if (al > 0.95) { g.strokeStyle = `rgba(0,0,0,${sel ? 0.5 : 0.18})`; g.lineWidth = 0.6; g.stroke(); } });
  V3.meshes.filter(m => m.glow && visible(m)).forEach(m => { const c = P(m.v.reduce((s, p) => [s[0] + p[0] / m.v.length, s[1] + p[1] / m.v.length, s[2] + p[2] / m.v.length], [0, 0, 0]).map((v, i) => i === 1 ? v + e * 40 : v)); const rad = Math.max(6, 30 * m.glow * foc / Math.max(40, V3.ortho ? V3.dist : c[2]) / 4); const rg = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], rad); rg.addColorStop(0, `rgba(${m.color.join(',')},0.45)`); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.beginPath(); g.arc(c[0], c[1], rad, 0, 7); g.fill(); });
  // ratsnest (unrouted connections)
  if (V3.show.rats && OCL.pcb.drc) { g.setLineDash([5, 4]); g.lineWidth = 1.4; OCL.pcb.drc.rats.forEach(r => { const y = V3.T + 0.4 + e * 5, a = P([r.a.x - V3.W / 2, y, r.a.y - V3.H / 2]), b = P([r.b.x - V3.W / 2, y, r.b.y - V3.H / 2]); g.strokeStyle = TN && TN.has(r.net) ? '#ffe14d' : 'rgba(255,225,77,0.6)'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }); g.setLineDash([]); }
  // net-voltage flow on tracks
  if (V3.flow && OCL.sim.nodeV && OCL.sim.status !== 'idle') { const nv = OCL.sim.nodeV, vmax = Math.max(1, ...nv.map(Math.abs).filter(isFinite));
    V3.meshes.filter(m => m.track && visible(m) && Math.abs(nv[m.net] || 0) > 1e-3).forEach(m => { const t = m.track.t, a = t.pts[m.track.i], b = t.pts[m.track.i + 1], y = (t.layer === 'top' ? V3.T + 0.3 : -0.3) + e * (EX[m.layer] || 0); const fr = Math.abs(nv[m.net]) / vmax;
      for (let k = 0; k < 3; k++) { const u = ((V3.t * 0.6 + k / 3) % 1); const p = P([a[0] + (b[0] - a[0]) * u - V3.W / 2, y, a[1] + (b[1] - a[1]) * u - V3.H / 2]); g.fillStyle = `hsla(${190 - 150 * fr},95%,60%,0.9)`; g.beginPath(); g.arc(p[0], p[1], 2.2, 0, 7); g.fill(); } }); }
  // labels: references + pad numbers/names (zoom dependent, overlap-avoiding)
  const placed = [], free = box => !placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
  if (V3.labels) { g.font = '600 11px Inter, system-ui, sans-serif'; g.textAlign = 'center'; labels.forEach(({ m, p }) => { if (!V3.ortho && p[2] < 2) return; const sel = V3.sel === m.cid, dim = TN && !tr.comps.has(m.cid); const w = g.measureText(m.label).width + 10, bx = [p[0] - w / 2, p[1] - 15, p[0] + w / 2, p[1] + 1]; if (!sel && !free(bx)) return; placed.push(bx);
    g.globalAlpha = dim ? 0.35 : 1; g.fillStyle = sel ? 'rgba(57,208,255,0.95)' : 'rgba(10,16,28,0.78)'; g.fillRect(bx[0], bx[1], w, 16); g.fillStyle = sel ? '#04121c' : '#cfe6ff'; g.fillText(m.label, p[0], p[1] - 3); g.globalAlpha = 1; }); }
  const pxPerMM = V3.ortho ? foc / V3.dist : foc / Math.max(20, V3.dist);
  if (V3.show.padlabels && (pxPerMM > 7 || V3.sel || TN)) { g.font = '600 10px JetBrains Mono, monospace'; g.textAlign = 'center';
    V3.meshes.filter(m => m.kind === 'pad' && visible(m) && (pxPerMM > 7 || m.cid === V3.sel || (TN && TN.has(m.net)))).forEach(m => { const p = m.pad, y = (p.smd ? V3.T + 0.1 : (V3.pitch < 0 ? -0.1 : V3.T + 0.1)) + e * (EX[m.layer] || 0), s = P([p.x - V3.W / 2, y, p.y - V3.H / 2]); if (!V3.ortho && s[2] < 2) return;
      const txt = pxPerMM > 14 || m.cid === V3.sel ? `${p.num} ${p.name}` : String(p.num), w = g.measureText(txt).width + 6, bx = [s[0] - w / 2, s[1] - 7, s[0] + w / 2, s[1] + 7]; if (!free(bx)) return; placed.push(bx);
      const hot = TN && TN.has(p.net); g.fillStyle = hot ? 'rgba(255,225,77,0.95)' : p.num === 1 ? 'rgba(57,208,255,0.9)' : 'rgba(8,14,22,0.82)'; g.fillRect(bx[0], bx[1], w, 14); g.fillStyle = hot || p.num === 1 ? '#06121a' : '#ffe9a8'; g.fillText(txt, s[0], s[1] + 4); }); }
  // overlays: axes gizmo + navigation cube
  if (V3.show.axes) drawAxes(g, Wd, Hd); drawCube(g, Wd);
};
function rotOnly(p) { const { cy, sy, cp, sp } = V3.basis(); const [x, y, z] = p; const x1 = x * cy - z * sy, z1 = x * sy + z * cy; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; }
function drawAxes(g, Wd, Hd) { const o = [Wd - 50, Hd - 50], L = 30; g.lineWidth = 2.2; g.font = '700 11px Inter, sans-serif'; g.textAlign = 'center';
  [[[1, 0, 0], '#ff5f6d', 'X'], [[0, 1, 0], '#5ee38a', 'Y'], [[0, 0, 1], '#5aa8ff', 'Z']].map(([v, c, n]) => ({ v: rotOnly(v), c, n })).sort((a, b) => a.v[2] - b.v[2]).forEach(a => { g.strokeStyle = a.c; g.beginPath(); g.moveTo(o[0], o[1]); g.lineTo(o[0] + a.v[0] * L, o[1] - a.v[1] * L); g.stroke(); g.fillStyle = a.c; g.fillText(a.n, o[0] + a.v[0] * (L + 9), o[1] - a.v[1] * (L + 9) + 4); });
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(o[0], o[1], 2.5, 0, 7); g.fill(); }
function drawCube(g, Wd) { const c = [Wd - 62, 62], S = 24, faces = [['TOP', [0, 1, 0], 'top'], ['BOTTOM', [0, -1, 0], 'bottom'], ['FRONT', [0, 0, 1], 'front'], ['BACK', [0, 0, -1], 'back'], ['RIGHT', [1, 0, 0], 'right'], ['LEFT', [-1, 0, 0], 'left']];
  const out = []; faces.forEach(([lbl, n, view]) => { const r = rotOnly(n); if (r[2] <= 0.02) return; const u = Math.abs(n[1]) ? [1, 0, 0] : [0, 1, 0], w = cross(n, u);
    const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => { const p = [n[0] + u[0] * a + w[0] * b, n[1] + u[1] * a + w[1] * b, n[2] + u[2] * a + w[2] * b].map(v => v * S); const q = rotOnly(p); return [c[0] + q[0], c[1] - q[1]]; });
    out.push({ lbl, view, pts: corners, z: r[2] }); });
  out.sort((a, b) => a.z - b.z); g.font = '700 9px Inter, sans-serif'; g.textAlign = 'center';
  out.forEach(f => { g.fillStyle = `rgba(${20 + 40 * f.z | 0},${40 + 60 * f.z | 0},${70 + 80 * f.z | 0},0.92)`; g.strokeStyle = '#22d3ee'; g.lineWidth = 1; g.beginPath(); f.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke();
    if (f.z > 0.35) { const cx = f.pts.reduce((s, p) => s + p[0], 0) / 4, cy = f.pts.reduce((s, p) => s + p[1], 0) / 4; g.fillStyle = '#dff7ff'; g.fillText(f.lbl, cx, cy + 3); } });
  V3.cubeFaces = out; }
V3.hitFace = (x, y) => { if (!V3.faces) return null; for (let i = V3.faces.length - 1; i >= 0; i--) { const F = V3.faces[i]; if (inPoly(x, y, F.pts)) return F; } return null; };
V3.pick = e => {
  const r = V3.cv.getBoundingClientRect(), F = V3.hitFace(e.clientX - r.left, e.clientY - r.top);
  if (F) { const m = F.m; if (m.kind === 'pad' && m.pad.pin) { OCL.trace.start(m.pad.cid, m.pad.pin); OCL.ui.selectComp(m.pad.cid, true); }
    else if (m.track) { const p = OCL.pcb.pads().pads.find(q => q.net === m.net && q.pin); if (p) OCL.trace.start(p.cid, p.pin); }
    else if (m.cid) { V3.sel = m.cid; OCL.ui.selectComp(m.cid, true); }
    V3.selName = m.name; OCL.emit('pick3d', m); V3.draw(); return; }
  V3.sel = null; V3.selName = null; OCL.emit('pick3d', null); V3.draw();
};
V3.fit = () => { V3.dist = Math.max(V3.W || 100, V3.H || 70) * 1.7; V3.tx = V3.tz = 0; V3.ty = 4; V3.draw(); };
V3.animateExplode = to => { const from = V3.explode, t0 = performance.now(); V3.anim = () => { const k = Math.min(1, (performance.now() - t0) / 1400), s = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; V3.explode = from + (to - from) * s; V3.draw(); OCL.emit('explode', V3.explode); if (k >= 1) V3.anim = null; }; };
function inPoly(x, y, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
})();
