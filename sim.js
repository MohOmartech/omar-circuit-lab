/* OMAR CIRCUIT LAB — netlist extraction and Modified Nodal Analysis (MNA) simulation engine
   DC operating point (Newton–Raphson with source/gmin stepping) and transient analysis (backward Euler). */
'use strict';
(() => {
const VT = 0.025852;
const safeExp = x => x > 40 ? Math.exp(40) * (1 + x - 40) : Math.exp(Math.max(x, -80));
const pnjlim = (vnew, vold, vt, vcrit) => {
  if (vnew > vcrit && Math.abs(vnew - vold) > 2 * vt) {
    if (vold > 0) { const arg = 1 + (vnew - vold) / vt; vnew = arg > 0 ? vold + vt * Math.log(arg) : vcrit; }
    else vnew = vt * Math.log(Math.max(vnew / vt, 1e-30));
  }
  return vnew;
};

/* ---------------- NETLIST ---------------- */
OCL.netlist = () => {
  const comps = OCL.allComponents(), wires = OCL.allWires(), parent = {};
  const find = k => { while (parent[k] !== undefined && parent[k] !== k) { parent[k] = parent[parent[k]] ?? parent[k]; k = parent[k]; } return k; };
  const add = k => { if (parent[k] === undefined) parent[k] = k; };
  const union = (a, b) => { add(a); add(b); const ra = find(a), rb = find(b); if (ra !== rb) { if (rb === 'GND') parent[ra] = rb; else parent[rb] = ra; } };
  add('GND');
  const pinIndex = {};
  comps.forEach(c => OCL.pinsOf(c).forEach(p => { const k = c.id + ':' + p.id; add(k); pinIndex[k] = { c, p }; }));
  const byName = {}; let hasGround = false;
  comps.forEach(c => {
    if (c.type === 'ground') { union('GND', c.id + ':G'); hasGround = true; }
    if ((c.type === 'label' || c.type === 'vcc') && c.props.net) { const n = String(c.props.net).trim(); if (/^(gnd|0v?)$/i.test(n)) { union('GND', c.id + ':N'); hasGround = true; } else { byName[n] = byName[n] || []; byName[n].push(c.id + ':N'); } }
  });
  Object.values(byName).forEach(ks => ks.slice(1).forEach(k => union(ks[0], k)));
  const badWires = [];
  wires.forEach(w => { const a = w.a.c + ':' + w.a.p, b = w.b.c + ':' + w.b.p; if (pinIndex[a] && pinIndex[b]) union(a, b); else badWires.push(w); });
  const rootId = { GND: 0 }; let next = 1; const nets = [{ id: 0, name: 'GND', pins: [] }];
  Object.keys(pinIndex).forEach(k => { const r = find(k); if (rootId[r] === undefined) { rootId[r] = next; nets.push({ id: next, name: 'N' + next, pins: [] }); next++; } nets[rootId[r]].pins.push(k); });
  Object.entries(byName).forEach(([n, ks]) => { const id = rootId[find(ks[0])]; if (id) nets[id].name = n; });
  const nodeOf = {}; Object.keys(pinIndex).forEach(k => nodeOf[k] = rootId[find(k)]);
  return { nodeOf, nets, nNodes: next, hasGround, pinIndex, badWires, comps, wires };
};

/* ---------------- PRIMITIVES ---------------- */
const P = {
  R: (a, b, r) => ({ k: 'R', a, b, r, stamp(s) { const g = 1 / (typeof this.r === 'function' ? this.r() : this.r); s.addG(this.a, this.b, g); this.g = g; }, cur(s) { return (s.v(this.a) - s.v(this.b)) * this.g; } }),
  C: (a, b, c) => ({ k: 'C', a, b, c, stamp(s) { if (s.mode !== 'tran') return; const g = this.c / s.dt, vp = s.vp(this.a) - s.vp(this.b); s.addG(this.a, this.b, g); s.addI(this.a, g * vp); s.addI(this.b, -g * vp); },
    cur(s) { return s.mode === 'tran' ? this.c / s.dt * ((s.v(this.a) - s.v(this.b)) - (s.vp(this.a) - s.vp(this.b))) : 0; } }),
  L: (a, b, l) => ({ k: 'L', a, b, l, nb: 1, stamp(s) { const k = this.br; s.addM(this.a, -k - 1, 1); s.addM(this.b, -k - 1, -1); s.addRow(k, this.a, 1); s.addRow(k, this.b, -1); if (s.mode === 'tran') { s.addRowB(k, k, -this.l / s.dt); s.rhsB(k, -this.l / s.dt * s.xp[s.bi(k)]); } }, cur(s) { return s.x[s.bi(this.br)]; } }),
  V: (a, b, f) => ({ k: 'V', a, b, f, nb: 1, stamp(s) { const k = this.br; s.addM(this.a, -k - 1, 1); s.addM(this.b, -k - 1, -1); s.addRow(k, this.a, 1); s.addRow(k, this.b, -1); s.rhsB(k, this.f(s.t) * s.scale); }, cur(s) { return s.x[s.bi(this.br)]; } }),
  I: (a, b, f) => ({ k: 'I', a, b, f, stamp(s) { const i = this.f(s.t) * s.scale; s.addI(this.a, -i); s.addI(this.b, i); this.i = i; }, cur() { return this.i; } }),
  D: (a, b, m) => ({ k: 'D', a, b, m, vd: 0, stamp(s) {
      const nvt = this.m.n * VT, vcrit = nvt * Math.log(nvt / (Math.SQRT2 * this.m.Is));
      const raw = s.v(this.a) - s.v(this.b); let vd = pnjlim(raw, this.vd, nvt, vcrit); if (Math.abs(vd - raw) > 1e-9) s.limited = true; this.vd = vd;
      const e = safeExp(vd / nvt); let I = this.m.Is * (e - 1), G = this.m.Is * e / nvt + 1e-12;
      if (this.m.Bv) { const eb = safeExp(-(vd + this.m.Bv) / VT); I -= 5e-3 * eb; G += 5e-3 * eb / VT; }
      I += 1e-12 * vd; const ieq = I - G * vd; s.addG(this.a, this.b, G); s.addI(this.a, -ieq); s.addI(this.b, ieq); this.I = I;
    }, cur(s) { const vd = s.v(this.a) - s.v(this.b), nvt = this.m.n * VT; let I = this.m.Is * (safeExp(vd / nvt) - 1); if (this.m.Bv) I -= 5e-3 * safeExp(-(vd + this.m.Bv) / VT); return I; } }),
  Q: (c, b, e, m, pnp) => ({ k: 'Q', c, b, e, m, pnp, vbe: 0, vbc: 0, eval(vbe, vbc) {
      const { Is, bf, br } = this.m, ebe = safeExp(vbe / VT), ebc = safeExp(vbc / VT), If = Is * (ebe - 1), Ir = Is * (ebc - 1), gf = Is * ebe / VT, gr = Is * ebc / VT;
      return { Ic: If - Ir * (1 + 1 / br), Ib: If / bf + Ir / br, aC: gf, cC: -gr * (1 + 1 / br), aB: gf / bf, cB: gr / br };
    }, stamp(s) {
      const sg = this.pnp ? -1 : 1, vcrit = VT * Math.log(VT / (Math.SQRT2 * this.m.Is));
      const rbe = sg * (s.v(this.b) - s.v(this.e)), rbc = sg * (s.v(this.b) - s.v(this.c));
      const vbe = pnjlim(rbe, this.vbe, VT, vcrit), vbc = pnjlim(rbc, this.vbc, VT, vcrit); if (Math.abs(vbe - rbe) + Math.abs(vbc - rbc) > 1e-9) s.limited = true; this.vbe = vbe; this.vbc = vbc;
      const r = this.eval(vbe, vbc), T = [[this.c, r.Ic, r.aC, r.cC], [this.b, r.Ib, r.aB, r.cB], [this.e, -(r.Ic + r.Ib), -(r.aC + r.aB), -(r.cC + r.cB)]];
      T.forEach(([n, I0, a, cc]) => { s.addM(n, this.b, a + cc + (n === this.b ? 1e-12 : 0)); s.addM(n, this.e, -a); s.addM(n, this.c, -cc); s.addI(n, -sg * (I0 - a * vbe - cc * vbc)); });
    }, terms(s) { const sg = this.pnp ? -1 : 1, r = this.eval(sg * (s.v(this.b) - s.v(this.e)), sg * (s.v(this.b) - s.v(this.c))); return { ic: sg * r.Ic, ib: sg * r.Ib }; },
    cur(s) { return this.terms(s).ic; } }),
  M: (d, g, sN, m, pmos) => ({ k: 'M', d, g, s: sN, m, pmos, eval(vgs, vds) {
      const { vth, k, lambda } = this.m, nv = 0.04, x = (vgs - vth) / nv, vov = x > 30 ? vgs - vth : nv * Math.log1p(Math.exp(x)), dvov = 1 / (1 + Math.exp(-Math.min(60, x)));
      let I, gm, gds;
      if (vds < vov) { I = k * (vov * vds - vds * vds / 2) * (1 + lambda * vds); gm = k * vds * (1 + lambda * vds) * dvov; gds = k * (vov - vds) * (1 + lambda * vds) + k * (vov * vds - vds * vds / 2) * lambda; }
      else { I = k / 2 * vov * vov * (1 + lambda * vds); gm = k * vov * (1 + lambda * vds) * dvov; gds = k / 2 * vov * vov * lambda; }
      return { I, gm, gds: gds + 1e-12 };
    }, stamp(s) {
      const sg = this.pmos ? -1 : 1; let D = this.d, S = this.s;
      if (sg * (s.v(D) - s.v(S)) < 0) [D, S] = [S, D];
      const vgs = sg * (s.v(this.g) - s.v(S)), vds = sg * (s.v(D) - s.v(S)), r = this.eval(vgs, vds);
      const ieq = sg * (r.I - r.gm * vgs - r.gds * vds);
      [[D, 1], [S, -1]].forEach(([n, q]) => { s.addM(n, this.g, q * r.gm); s.addM(n, S, -q * (r.gm + r.gds)); s.addM(n, D, q * r.gds); s.addI(n, -q * ieq); });
    }, cur(s) { const sg = this.pmos ? -1 : 1; let D = this.d, S = this.s, flip = 1; if (sg * (s.v(D) - s.v(S)) < 0) { [D, S] = [S, D]; flip = -1; } const r = this.eval(sg * (s.v(this.g) - s.v(S)), sg * (s.v(D) - s.v(S))); return flip * sg * r.I; } }),
  B: (p, n, ctrl, f, kcl) => ({ k: 'B', p, n, ctrl, f, a: kcl ? kcl[0] : p, b: kcl ? kcl[1] : n, nb: 1, stamp(s) {
      const k = this.br; s.addM(this.a, -k - 1, 1); s.addM(this.b, -k - 1, -1); s.addRow(k, this.p, 1); s.addRow(k, this.n, -1);
      const v0 = this.ctrl.map(c => s.v(c)), f0 = this.f(v0); let rhs = f0;
      this.ctrl.forEach((c, j) => { const h = 1e-6 * (1 + Math.abs(v0[j])), vv = v0.slice(); vv[j] += h; const d = (this.f(vv) - f0) / h; if (d) { s.addRow(k, c, -d); rhs -= d * v0[j]; } });
      s.rhsB(k, rhs);
    }, cur(s) { return s.x[s.bi(this.br)]; } }),
  /* clipped linear controlled source (op-amp/INA/comparator): out = Σ aⱼ·vⱼ + c, hard-limited to [lo, hi] with state switching */
  LIN: (p, n, ctrl, a, c0, lo, hi) => ({ k: 'B', p, n, a: p, b: n, ctrl, co: a, c0, lo, hi, mode: 'lin', nb: 1, stamp(s) {
      const k = this.br; s.addM(this.p, -k - 1, 1); s.addM(this.n, -k - 1, -1); s.addRow(k, this.p, 1); s.addRow(k, this.n, -1);
      let u = this.c0; this.ctrl.forEach((cn, j) => u += this.co[j] * s.v(cn));
      const old = this.mode;
      if (this.mode === 'lin') { if (u > this.hi) this.mode = 'hi'; else if (u < this.lo) this.mode = 'lo'; }
      else if (this.mode === 'hi') { if (u < this.hi) this.mode = 'lin'; } else if (u > this.lo) this.mode = 'lin';
      if (old !== this.mode) s.limited = true;
      if (this.mode === 'lin') { this.ctrl.forEach((cn, j) => s.addRow(k, cn, -this.co[j])); s.rhsB(k, this.c0); }
      else s.rhsB(k, this.mode === 'hi' ? this.hi : this.lo);
    }, cur(s) { return s.x[s.bi(this.br)]; } }),
  X: (p1, p2, s1, s2, n) => ({ k: 'X', p1, p2, s1, s2, n, nb: 1, stamp(s) { const k = this.br; s.addM(this.p1, -k - 1, 1); s.addM(this.p2, -k - 1, -1); s.addM(this.s1, -k - 1, -this.n); s.addM(this.s2, -k - 1, this.n); s.addRow(k, this.p1, 1); s.addRow(k, this.p2, -1); s.addRow(k, this.s1, -this.n); s.addRow(k, this.s2, this.n); }, cur(s) { return s.x[s.bi(this.br)]; } }),
  HOOK: (fn, reset) => ({ k: 'HOOK', fn, reset, stamp() { }, cur() { return 0; } })
};
OCL.prims = P;

/* ---------------- CIRCUIT ---------------- */
class Circuit {
  constructor(nl) {
    this.nl = nl; this.prims = []; this.byComp = {}; this.errors = []; this.notes = [];
    let nNodes = nl.nNodes; const self = this;
    nl.comps.forEach(c => {
      const def = OCL.defs[c.type]; if (!def || !def.build) return;
      const N = pin => { const v = nl.nodeOf[c.id + ':' + pin]; if (v === undefined) throw new Error(`${c.ref}: unknown pin ${pin}`); return v; };
      N.int = () => nNodes++; N.G = -0;
      try { const ps = def.build(c, N, P); ps.forEach(p => p.comp = c); this.byComp[c.id] = ps; this.prims.push(...ps); }
      catch (e) { this.errors.push(e.message); }
    });
    this.nNodes = nNodes; let br = 0; this.prims.forEach(p => { if (p.nb) { p.br = br; br += p.nb; } });
    this.nBr = br; this.size = nNodes - 1 + br;
    this.x = new Float64Array(this.size); this.xp = new Float64Array(this.size);
    this.nonlinear = this.prims.some(p => 'DQMB'.includes(p.k));
    this.hooks = this.prims.filter(p => p.k === 'HOOK');
    this.reactive = this.prims.some(p => p.k === 'C' || p.k === 'L');
    this.timeVarying = nl.comps.some(c => { const d = OCL.defs[c.type]; return d.timeVarying && d.timeVarying(c); }) || this.hooks.length > 0;
    const n = this.size; this.G = new Float64Array(n * n); this.b = new Float64Array(n);
    const S = this.S = { mode: 'dc', t: 0, dt: 1e-5, scale: 1, x: this.x, xp: this.xp, gmin: 1e-12,
      bi: k => nNodes - 1 + k,
      v: a => a > 0 ? S.x[a - 1] : 0, vp: a => a > 0 ? S.xp[a - 1] : 0,
      addG: (a, b, g) => { const G = self.G; if (a > 0) G[(a - 1) * n + a - 1] += g; if (b > 0) G[(b - 1) * n + b - 1] += g; if (a > 0 && b > 0) { G[(a - 1) * n + b - 1] -= g; G[(b - 1) * n + a - 1] -= g; } },
      addI: (a, i) => { if (a > 0) self.b[a - 1] += i; },
      // addM(rowNode, colNode | -branch, val): node row; column is a node (>0) or a branch encoded as negative-1
      addM: (r, cN, val) => { if (r <= 0) return; if (cN === 0) return; const col = cN < 0 ? S.bi(-cN - 1) : cN - 1; self.G[(r - 1) * n + col] += val; },
      addRow: (k, cN, val) => { if (cN > 0) self.G[S.bi(k) * n + cN - 1] += val; },
      addRowB: (k, k2, val) => { self.G[S.bi(k) * n + S.bi(k2)] += val; },
      rhsB: (k, val) => { self.b[S.bi(k)] += val; }
    };
  }
  // NOTE: branch columns are passed to addM as -(k+1).
  assemble() {
    this.G.fill(0); this.b.fill(0); const S = this.S, n = this.size; S.limited = false;
    for (const p of this.prims) p.stamp(S);
    for (let i = 0; i < this.nNodes - 1; i++) this.G[i * n + i] += S.gmin;
  }
  solveLinear() {
    const n = this.size, A = this.G, b = this.b, x = new Float64Array(n);
    for (let c = 0; c < n; c++) {
      let piv = c, mx = Math.abs(A[c * n + c]);
      for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r * n + c]); if (v > mx) { mx = v; piv = r; } }
      if (mx < 1e-18) throw new Error('singular');
      if (piv !== c) { for (let k = c; k < n; k++) { const t = A[c * n + k]; A[c * n + k] = A[piv * n + k]; A[piv * n + k] = t; } const t = b[c]; b[c] = b[piv]; b[piv] = t; }
      const d = A[c * n + c];
      for (let r = c + 1; r < n; r++) { const f = A[r * n + c] / d; if (f) { for (let k = c; k < n; k++) A[r * n + k] -= f * A[c * n + k]; b[r] -= f * b[c]; } }
    }
    for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r * n + k] * x[k]; x[r] = s / A[r * n + r]; }
    return x;
  }
  newton(maxIt = 150) {
    const S = this.S, n = this.size; if (!n) return true;
    for (let it = 0; it < maxIt; it++) {
      this.assemble(); const xn = this.solveLinear();
      let conv = true;
      for (let i = 0; i < n; i++) { if (!isFinite(xn[i])) throw new Error('diverged'); const d = xn[i] - S.x[i]; if (Math.abs(d) > 1e-6 + 1e-4 * Math.abs(xn[i])) conv = false; }
      const damp = it > 60 ? 0.5 : 1;
      for (let i = 0; i < n; i++) { let d = damp * (xn[i] - S.x[i]); if (it >= 20 && i < this.nNodes - 1) d = OCL.clamp(d, -2, 2); S.x[i] += d; }
      if (!this.nonlinear) return true;
      if (conv && it > 0 && !S.limited) return true;
    }
    return false;
  }
  dc() {
    const S = this.S; S.mode = 'dc'; S.t = 0; S.scale = 1; S.gmin = 1e-12;
    try { if (this.newton()) return true; } catch (e) { if (e.message === 'singular') throw e; }
    // source stepping
    S.x.fill(0); this.prims.forEach(p => { p.vd = 0; p.vbe = 0; p.vbc = 0; if (p.mode) p.mode = 'lin'; });
    try { for (let k = 1; k <= 20; k++) { S.scale = k / 20; if (!this.newton(200)) throw 0; } return true; } catch (e) { }
    // gmin stepping
    S.scale = 1; S.x.fill(0);
    try { for (let g = 1e-2; g >= 1e-12; g /= 10) { S.gmin = g; if (!this.newton(200)) throw 0; } S.gmin = 1e-12; return true; } catch (e) { }
    S.gmin = 1e-12; return false;
  }
  beginTransient(fromDC) {
    const S = this.S; this.hooks.forEach(h => h.reset && h.reset());
    if (!fromDC) { S.x.fill(0); this.prims.forEach(p => { p.vd = 0; p.vbe = 0; p.vbc = 0; }); }
    S.xp.set(S.x); S.mode = 'tran'; S.t = 0;
  }
  step(dt) {
    const S = this.S; S.dt = dt; S.t += dt; S.scale = 1;
    let ok = false; try { ok = this.newton(80); } catch (e) { if (e.message === 'singular') throw e; ok = false; }
    if (!ok) { // retry with smaller sub-steps
      S.x.set(S.xp); S.t -= dt; const sub = dt / 10;
      for (let i = 0; i < 10; i++) { S.dt = sub; S.t += sub; if (!this.newton(150)) throw new Error('Transient step failed to converge at t = ' + OCL.fmt(S.t, 's')); S.xp.set(S.x); }
      S.dt = dt;
    }
    const get = a => S.v(a); this.hooks.forEach(h => h.fn(get));
    S.xp.set(S.x);
  }
  /* per-component readings */
  readings() {
    const S = this.S, out = {}, nl = this.nl;
    nl.comps.forEach(c => {
      const def = OCL.defs[c.type], pins = OCL.pinsOf(c), pv = {};
      pins.forEach(p => pv[p.id] = S.v(nl.nodeOf[c.id + ':' + p.id]));
      const prims = this.byComp[c.id] || []; let P = 0;
      prims.forEach(p => { const i = p.cur(S); p.lastI = i;
        if (p.k === 'R' || p.k === 'C' || p.k === 'L' || p.k === 'D' || p.k === 'V' || p.k === 'I') P += (S.v(p.a) - S.v(p.b)) * i;
        else if (p.k === 'B') P += (S.v(p.a) - S.v(p.b)) * i;
        else if (p.k === 'Q') { const t = p.terms(S); P += t.ic * (S.v(p.c) - S.v(p.e)) + t.ib * (S.v(p.b) - S.v(p.e)); }
        else if (p.k === 'M') P += i * (S.v(p.d) - S.v(p.s));
      });
      const pinI = {}, nodePin = {}; pins.forEach(p => { pinI[p.id] = 0; const nd = nl.nodeOf[c.id + ':' + p.id]; if (nodePin[nd] === undefined) nodePin[nd] = p.id; });
      const addT = (nd, i) => { if (Object.is(nd, -0)) return; const pid = nodePin[nd]; if (pid !== undefined && isFinite(i)) pinI[pid] += i; };
      prims.forEach(p => { const i = p.lastI;
        if ('RCLDVIB'.includes(p.k)) { addT(p.a, i); addT(p.b, -i); }
        else if (p.k === 'X') { addT(p.p1, i); addT(p.p2, -i); addT(p.s1, -p.n * i); addT(p.s2, p.n * i); }
        else if (p.k === 'Q') { const tt = p.terms(S); addT(p.c, tt.ic); addT(p.b, tt.ib); addT(p.e, -(tt.ic + tt.ib)); }
        else if (p.k === 'M') { addT(p.d, i); addT(p.s, -i); } });
      const r = { pinI, pins: pv, P, V: pins.length >= 2 ? pv[pins[0].id] - pv[pins[1].id] : pv[pins[0] && pins[0].id], I: prims[0] ? prims[0].lastI : 0, x: {} };
      const t = c.type;
      if (['vdc', 'vac', 'mains', 'ppgsrc'].includes(t)) { r.I = -prims[0].lastI; r.x.delivering = -P; }
      if (t === 'battery') { r.I = -prims[0].lastI; r.x.delivering = -P; r.V = pv['+'] - pv['-']; }
      if (t === 'idc') { r.I = c.props.I; r.x.delivering = -P; r.V = pv['+'] - pv['-']; }
      if (t === 'ammeter') r.I = prims[0].lastI;
      if (t === 'inductor' || t === 'motor') r.I = (t === 'motor' ? prims[0] : prims[0]).lastI;
      if (t === 'npn' || t === 'pnp') { const tt = prims[0].terms(S); r.x = { Ic: tt.ic, Ib: tt.ib, Vbe: pv.B - pv.E, Vce: pv.C - pv.E }; r.I = tt.ic;
        const sg = t === 'pnp' ? -1 : 1, vbe = sg * r.x.Vbe, vce = sg * r.x.Vce; r.x.region = vbe < 0.5 ? 'cut-off' : vce < 0.25 ? 'saturation' : 'active'; }
      if (t === 'nmos' || t === 'pmos') { const sg = t === 'pmos' ? -1 : 1; r.x = { Id: prims[0].lastI, Vgs: pv.G - pv.S, Vds: pv.D - pv.S }; r.I = r.x.Id;
        const vov = sg * r.x.Vgs - c.props.vth; r.x.region = vov <= 0 ? 'cut-off' : sg * r.x.Vds < vov ? 'linear (ohmic)' : 'saturation'; }
      if (t === 'opamp' || t === 'comparator' || t === 'inamp') { const p = c.props, hi = p.vpos - p.swing, lo = p.vneg + p.swing; r.V = pv.OUT; r.I = prims[1] ? prims[1].lastI : 0;
        r.x = { Vout: pv.OUT, Vd: pv['IN+'] - pv['IN-'], saturated: pv.OUT > hi - 0.05 * (hi - lo) ? 'positive rail' : pv.OUT < lo + 0.05 * (hi - lo) ? 'negative rail' : '' }; }
      if (t === 'regulator') { r.x = { Vin: pv.IN - pv.GND, Vout: pv.OUT - pv.GND, Iout: prims[0].lastI, Pdiss: (pv.IN - pv.OUT) * prims[0].lastI }; r.x.dropout = r.x.Vin < c.props.Vout + c.props.Vdo; r.I = r.x.Iout; r.P = r.x.Pdiss; r.V = r.x.Vout; }
      if (t === 'led') { r.x.brightness = OCL.clamp(r.I / c.props.Imax, 0, 1.5); }
      if (t === 'scope') r.x = { A: pv.A, B: pv.B };
      if (t === 'adc') { const n = 2 ** c.props.bits - 1, code = Math.round(OCL.clamp(pv.IN / c.props.vref, 0, 1) * n); r.x = { code, vq: code / n * c.props.vref, conv: OCL.adcConvert(c, code / n * c.props.vref) }; }
      if (t === 'mcu') { const n = 2 ** c.props.bits - 1; r.x = {}; ['A0', 'A1', 'A2'].forEach(a => { r.x[a] = Math.round(OCL.clamp((pv[a] - pv.GND) / c.props.vcc, 0, 1) * n); });
        const i13 = prims[3] ? prims[3].lastI : 0, i12 = prims[5] ? prims[5].lastI : 0, iv = prims[1] ? prims[1].lastI : 0; r.x.Id13 = i13; r.x.Id12 = i12; r.x.Ivcc = iv; r.I = iv; }
      if (t === 'fuse') r.x.blown = Math.abs(r.I) > c.props.I;
      if (t === 'timer555') { r.x.out = pv.OUT - pv.GND; }
      out[c.id] = r;
    });
    return out;
  }
  nodeVoltages() { const v = [0]; for (let i = 1; i < this.nl.nNodes; i++) v.push(this.S.x[i - 1]); return v; }
}
OCL.Circuit = Circuit;

OCL.adcConvert = (c, v) => {
  const p = c.props;
  switch (p.conv) {
    case 'ntc-divider': { // NTC on low side, fixed R on high side to Vref
      if (v <= 0 || v >= p.vref) return { label: 'Temperature', value: NaN, unit: '°C', note: 'out of range' };
      const r = p.rfix * v / (p.vref - v), T = 1 / (1 / 298.15 + Math.log(r / 10000) / 3950) - 273.15;
      return { label: 'Temperature (β = 3950, R25 = 10 kΩ)', value: T, unit: '°C', note: 'R_ntc = ' + OCL.fmt(r, 'Ω') };
    }
    case 'lm35': return { label: 'Temperature', value: v / 0.01, unit: '°C' };
    case 'mpx5010': return { label: 'Pressure (VS = 5 V)', value: (v / 5 - 0.04) / 0.09, unit: 'kPa' };
    case 'o2-cell': return { label: 'O₂ (0.5 mV/% cell)', value: v / Math.max(1e-9, p.gain) / 0.5e-3, unit: '%' };
    default: return null;
  }
};

/* ---------------- SIMULATION CONTROLLER ---------------- */
const sim = OCL.sim = { status: 'idle', circuit: null, readings: null, nodeV: null, hist: null, error: null, raf: 0, t: 0 };
sim.probes = []; // user net probes: [{net, color}]
sim.channelsFor = (c, nl) => {
  const ch = [];
  nl.comps.filter(x => x.type === 'scope').forEach(s => ['A', 'B'].forEach(p => { const net = nl.nodeOf[s.id + ':' + p]; const connected = nl.nets[net] && nl.nets[net].pins.length > 1; if (connected) ch.push({ key: s.ref + '.' + p, net, label: `${s.ref} CH-${p} (${nl.nets[net].name})` }); }));
  nl.comps.filter(x => x.type === 'freqcounter').forEach(s => { const net = nl.nodeOf[s.id + ':IN']; ch.push({ key: s.ref, net, label: s.ref + ' input', hidden: true }); });
  sim.probes.forEach((p, i) => { if (p.net < nl.nNodes) ch.push({ key: 'P' + (i + 1), net: p.net, label: `Probe ${i + 1} (${nl.nets[p.net].name})` }); });
  return ch;
};
sim.autoTiming = (circ, nl) => {
  let fmax = 0, fmin = Infinity;
  nl.comps.forEach(c => { const p = c.props;
    if (c.type === 'vac' && p.wave !== 'dc') { fmax = Math.max(fmax, p.freq * (p.wave === 'sine' ? 1 : 10)); fmin = Math.min(fmin, p.freq); }
    if (c.type === 'mains') { fmax = Math.max(fmax, p.freq); fmin = Math.min(fmin, p.freq); }
    if (c.type === 'ecgsrc') { fmax = Math.max(fmax, 50 * 2, 40); fmin = Math.min(fmin, p.bpm / 60); }
    if (c.type === 'ppgsrc' || (c.type === 'photodiode' && p.mode === 'ppg')) { fmax = Math.max(fmax, 20); fmin = Math.min(fmin, p.bpm / 60); }
    if (c.type === 'mcu' && (p.d13 === 'blink' || p.d13 === 'pwm')) { fmax = Math.max(fmax, p.freq * 20); fmin = Math.min(fmin, p.freq); }
  });
  let maxR = 1, maxC = 0, maxL = 0, minR = 1e12;
  circ.prims.forEach(p => { if (p.k === 'R' && typeof p.r === 'number' && p.r < 1e6 && p.r > 0.5) { maxR = Math.max(maxR, p.r); minR = Math.min(minR, p.r); } if (p.k === 'C') maxC = Math.max(maxC, p.c); if (p.k === 'L') maxL = Math.max(maxL, p.l); });
  let tau = Math.max(maxR * maxC, maxL / Math.max(minR, 1e-3));

  let tStop, dt;
  if (isFinite(fmin) && fmin > 0) { tStop = Math.min(Math.max(3 / fmin, 5 * tau > 0 ? Math.min(5 * tau, 20 / fmin) : 0), 6); dt = Math.min(1 / (fmax * 60), tStop / 1500); }
  else if (circ.hooks.length) { tStop = OCL.clamp(6 * maxR * maxC, 1e-4, 8); dt = tStop / 4000; }
  else { tStop = OCL.clamp(tau > 0 ? 6 * tau : 1e-3, 1e-6, 10); dt = tStop / 1500; }
  if (circ.hooks.length) dt = Math.min(dt, tStop / 4000);
  return { tStop, dt: Math.max(dt, tStop / 20000) };
};
sim.prepare = () => {
  const nl = OCL.netlist();
  if (!nl.comps.length) throw new Error('The circuit is empty. Add components from the library first.');
  if (!nl.hasGround) throw new Error('No ground reference. Add a Ground symbol (Library → Basic → Ground) and connect it to your circuit’s 0 V node.');
  const circ = new Circuit(nl);
  if (circ.errors.length) throw new Error(circ.errors.join('; '));
  if (!circ.prims.length) throw new Error('No simulatable components found (catalog-only parts have no models).');
  return { nl, circ };
};
sim.run = () => {
  if (sim.status === 'paused' && sim.circuit) { sim.status = 'running'; loop(); OCL.emit('sim'); return; }
  sim.stop(true);
  const ps = OCL.state.project.simSettings; sim.error = null;
  let nl, circ;
  try { ({ nl, circ } = sim.prepare()); } catch (e) { return fail(e.message); }
  sim.circuit = circ; sim.nl = nl;
  const t0 = performance.now();
  let dcOK = false;
  try { dcOK = circ.dc(); } catch (e) { return fail(e.message === 'singular' ? singularHelp(nl) : 'DC analysis error: ' + e.message); }
  if (!dcOK) return fail('DC operating point did not converge. Check for unrealistic values, missing load resistors, or components connected in impossible ways (e.g. two ideal voltage sources in parallel).');
  sim.dcReadings = circ.readings(); sim.dcNodeV = circ.nodeVoltages();
  sim.readings = sim.dcReadings; sim.nodeV = sim.dcNodeV;
  sim.mode = 'dc'; sim.history = { t: [], ch: {} };
  const needTran = circ.timeVarying || (circ.reactive && ps.initial !== 'dcop');
  if (!needTran) {
    sim.status = 'done'; OCL.emit('sim');
    OCL.logSim({ project: OCL.state.project.name, kind: 'DC operating point', ms: Math.round(performance.now() - t0), nodes: nl.nNodes, ok: true });
    return;
  }
  const tm = ps.auto ? sim.autoTiming(circ, nl) : { tStop: OCL.parseSI(ps.tStop), dt: OCL.parseSI(ps.dt) };
  if (!(tm.tStop > 0 && tm.dt > 0) || tm.tStop / tm.dt > 2e5) return fail('Invalid transient settings: need 0 < step and span/step ≤ 200 000.');
  sim.tStop = tm.tStop; sim.dt = tm.dt; sim.mode = 'tran';
  sim.channels = sim.channelsFor(null, nl);
  sim.history = { t: [], ch: Object.fromEntries(sim.channels.map(c => [c.key, []])) };
  circ.beginTransient(ps.initial === 'dcop');
  sim.status = 'running'; sim.t0 = t0; sim.stepsDone = 0; OCL.emit('sim'); loop();
};
function loop() {
  cancelAnimationFrame(sim.raf);
  const circ = sim.circuit, ps = OCL.state.project.simSettings;
  const total = sim.tStop / sim.dt, perFrame = Math.max(1, Math.ceil(total / (4 * 60)) * (+ps.speed || 1));
  const tick = () => {
    if (sim.status !== 'running') return;
    const tStart = performance.now();
    try {
      for (let i = 0; i < perFrame; i++) {
        circ.step(sim.dt); sim.stepsDone++;
        const H = sim.history; H.t.push(circ.S.t); sim.channels.forEach(c => H.ch[c.key].push(circ.S.v(c.net)));
        if (ps.continuous && H.t.length > total * 1.02) { H.t.shift(); sim.channels.forEach(c => H.ch[c.key].shift()); }
        if (!ps.continuous && circ.S.t >= sim.tStop - sim.dt / 2) break;
        if (performance.now() - tStart > 30) break; // keep UI responsive
      }
    } catch (e) { return fail((e.message === 'singular' ? singularHelp(sim.nl) : e.message)); }
    sim.readings = circ.readings(); sim.nodeV = circ.nodeVoltages();
    OCL.emit('simframe');
    if (!ps.continuous && circ.S.t >= sim.tStop - sim.dt / 2) {
      sim.status = 'done'; OCL.emit('sim');
      OCL.logSim({ project: OCL.state.project.name, kind: `Transient ${OCL.fmt(sim.tStop, 's')} @ ${OCL.fmt(sim.dt, 's')}`, ms: Math.round(performance.now() - sim.t0), nodes: sim.nl.nNodes, ok: true });
      return;
    }
    sim.raf = requestAnimationFrame(tick);
  };
  sim.raf = requestAnimationFrame(tick);
}
function singularHelp(nl) {
  return 'The circuit matrix is singular — usually a loop of ideal voltage sources/inductors/ammeters (e.g. a source shorted by a wire or ammeter, or two sources in parallel), or a current source with no return path. Run Validation to locate it.';
}
function fail(msg) { sim.status = 'error'; sim.error = msg; OCL.emit('sim'); OCL.logSim({ project: OCL.state.project ? OCL.state.project.name : '', kind: 'Failed', ok: false, msg }); }
sim.pause = () => { if (sim.status === 'running') { sim.status = 'paused'; cancelAnimationFrame(sim.raf); OCL.emit('sim'); } };
sim.stop = quiet => { cancelAnimationFrame(sim.raf); if (sim.status === 'running' || sim.status === 'paused') sim.status = 'stopped'; if (!quiet) OCL.emit('sim'); };
sim.reset = () => { cancelAnimationFrame(sim.raf); Object.assign(sim, { status: 'idle', circuit: null, readings: null, nodeV: null, history: null, error: null }); OCL.emit('sim'); };
/* frequency / amplitude measurements on a history channel */
sim.measure = arr => {
  const H = sim.history; if (!H || !arr || arr.length < 8) return null;
  const n = arr.length, start = Math.floor(n * 0.25); let mn = Infinity, mx = -Infinity, sum = 0, sq = 0;
  for (let i = start; i < n; i++) { const v = arr[i]; mn = Math.min(mn, v); mx = Math.max(mx, v); sum += v; sq += v * v; }
  const cnt = n - start, mean = sum / cnt, rms = Math.sqrt(sq / cnt), lo = mn + 0.4 * (mx - mn), hi = mn + 0.6 * (mx - mn); const cross = []; let armed = false;
  if (mx - mn > 1e-9) for (let i = start; i < n; i++) { if (arr[i] < lo) armed = true; if (armed && arr[i] > hi) { cross.push(H.t[i]); armed = false; } }
  const f = cross.length >= 2 ? (cross.length - 1) / (cross[cross.length - 1] - cross[0]) : NaN;
  return { min: mn, max: mx, pp: mx - mn, mean, rms, f };
};
})();
