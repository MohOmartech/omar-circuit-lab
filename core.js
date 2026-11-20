/* OMAR CIRCUIT LAB v2.0 — core utilities, storage, security, state
   Designed & Developed by Eng. Omar Abdalla, KMTC Makindu Campus */
'use strict';
const OCL = window.OCL = {};
OCL.VERSION = '2.1.0';
OCL.SIGNATURE = 'Designed & Developed by Eng. Omar Abdalla — KMTC Makindu Campus';

/* ---------- DOM helpers ---------- */
OCL.$ = (s, r = document) => r.querySelector(s);
OCL.$$ = (s, r = document) => [...r.querySelectorAll(s)];
OCL.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
OCL.el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
OCL.uid = (p = 'id') => p + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
OCL.clone = o => JSON.parse(JSON.stringify(o));
OCL.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- event bus ---------- */
const _ev = {};
OCL.on = (n, f) => (_ev[n] = _ev[n] || []).push(f);
OCL.emit = (n, d) => (_ev[n] || []).forEach(f => { try { f(d); } catch (e) { console.error(n, e); } });

/* ---------- SI units ---------- */
const PREF = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
OCL.parseSI = s => {
  if (typeof s === 'number') return s;
  s = String(s ?? '').trim().replace(/\s+/g, '').replace(/(ohms?|Ω|hz|v|a|f|h|w|s|%|°c)$/i, '');
  const m = s.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)([pnuµmkKMG]?)$/);
  return m ? parseFloat(m[1]) * (PREF[m[2]] || 1) : NaN;
};
OCL.fmt = (v, unit = '', d = 3) => {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  if (v === 0) return '0 ' + unit;
  const a = Math.abs(v), P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  for (const [f, p] of P) if (a >= f * 0.9995) return +(v / f).toPrecision(d) + ' ' + p + unit;
  return v.toExponential(2) + ' ' + unit;
};

/* ---------- toasts & dialogs (alert/confirm/prompt are blocked in sandboxed viewers) ---------- */
OCL.toast = (msg, kind = 'info', ms = 3200) => {
  const box = OCL.$('#toasts'); if (!box) return;
  const t = OCL.el(`<div class="toast ${kind}">${OCL.esc(msg)}</div>`);
  box.appendChild(t); setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 400);
};
OCL.modal = ({ title, body, actions = [{ label: 'Close' }], wide = false }) => new Promise(res => {
  const m = OCL.el(`<div class="modal-back"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-h"><h3>${OCL.esc(title)}</h3><button class="icon-btn x" aria-label="Close">✕</button></div>
    <div class="modal-b"></div><div class="modal-f"></div></div></div>`);
  const b = m.querySelector('.modal-b'); if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
  const close = v => { m.remove(); res(v); };
  m.querySelector('.x').onclick = () => close(null);
  m.addEventListener('mousedown', e => { if (e.target === m) close(null); });
  actions.forEach(a => {
    const btn = OCL.el(`<button class="btn ${a.kind || ''}">${OCL.esc(a.label)}</button>`);
    btn.onclick = () => { const v = a.value !== undefined ? (typeof a.value === 'function' ? a.value(m) : a.value) : a.label; if (v === false) return; close(v); };
    m.querySelector('.modal-f').appendChild(btn);
  });
  document.body.appendChild(m);
  const f = m.querySelector('input,textarea,select'); if (f) setTimeout(() => f.focus(), 30);
});
OCL.confirm = (title, text, okLabel = 'Confirm', danger = false) =>
  OCL.modal({ title, body: `<p>${OCL.esc(text)}</p>`, actions: [{ label: 'Cancel', value: 'no' },{ label: okLabel, kind: danger ? 'danger' : 'primary', value: true }] }).then(v => v === true);
OCL.prompt = (title, label, def = '') =>
  OCL.modal({ title, body: `<label class="fld"><span>${OCL.esc(label)}</span><input class="inp" value="${OCL.esc(def)}"></label>`, actions: [{ label: 'Cancel', value: null }, { label: 'OK', kind: 'primary', value: m => m.querySelector('input').value }] });

/* Export helper: tries a real download; also offers Copy, because embedded viewers may block downloads */
OCL.exportText = (filename, text, mime = 'text/plain') => {
  let downloaded = false;
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); downloaded = true;
  } catch (e) { /* blocked */ }
  const ta = OCL.el(`<div><p class="muted">Saved as <b>${OCL.esc(filename)}</b> if your browser allowed the download. Embedded viewers (for example inside claude.ai) block downloads — use <b>Copy</b> and paste into a file instead.</p><textarea class="inp mono" rows="12" readonly></textarea></div>`);
  ta.querySelector('textarea').value = text.length > 400000 ? text.slice(0, 400000) + '\n…(truncated in preview; Copy copies everything)' : text;
  OCL.modal({ title: 'Export — ' + filename, wide: true, body: ta, actions: [{ label: 'Copy to clipboard', kind: 'primary', value: () => { navigator.clipboard.writeText(text).then(() => OCL.toast('Copied ' + filename, 'ok'), () => OCL.toast('Clipboard blocked — select the text and copy manually', 'warn')); return false; } }, { label: 'Close' }] });
  return downloaded;
};
OCL.pickFile = (accept = '.json') => new Promise(res => {
  const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res({ name: f.name, text: r.result }); r.readAsText(f); };
  i.click();
});

/* ---------- storage: IndexedDB with in-memory fallback ---------- */
OCL.db = (() => {
  let dbp = null; const mem = { projects: new Map(), kv: new Map() }; let ok = true;
  const open = () => dbp || (dbp = new Promise((res) => {
    try {
      const r = indexedDB.open('omar-circuit-lab', 2);
      r.onupgradeneeded = () => { const d = r.result; ['projects', 'kv'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); }); };
      r.onsuccess = () => res(r.result); r.onerror = () => { ok = false; res(null); };
    } catch (e) { ok = false; res(null); }
  }));
  const tx = async (store, mode, fn) => {
    const d = await open();
    if (!d) return fn(null, mem[store]);
    return new Promise((res, rej) => { const t = d.transaction(store, mode); const s = t.objectStore(store); const r = fn(s); t.oncomplete = () => res(typeof IDBRequest !== 'undefined' && r instanceof IDBRequest ? r.result : r); t.onerror = () => rej(t.error); });
  };
  return {
    get persistent() { return ok; },
    get: (store, k) => tx(store, 'readonly', (s, m) => s ? s.get(k) : m.get(k)),
    put: (store, k, v) => tx(store, 'readwrite', (s, m) => s ? s.put(v, k) : m.set(k, v)),
    del: (store, k) => tx(store, 'readwrite', (s, m) => s ? s.delete(k) : m.delete(k)),
    all: async store => {
      const d = await open();
      if (!d) return [...mem[store].values()];
      return new Promise(res => { const out = []; const c = d.transaction(store).objectStore(store).openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out); }; c.onerror = () => res(out); });
    }
  };
})();

/* ---------- security: PBKDF2 password hashing via Web Crypto ---------- */
OCL.auth = (() => {
  const enc = new TextEncoder(), ITER = 210000;
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  /* Pure-JS PBKDF2-HMAC-SHA256 fallback for viewers where crypto.subtle is unavailable */
  const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const sha256 = bytes => {
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(bytes); m[l] = 0x80; const bl = l * 8; for (let i = 0; i < 4; i++) m[n - 1 - i] = (bl >>> (8 * i)) & 255; m[n - 5] = Math.floor(l / 0x20000000) & 255;
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]), w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) { for (let i = 0; i < 16; i++) w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h; }
    const out = new Uint8Array(32); for (let i = 0; i < 8; i++) { out[4 * i] = H[i] >>> 24; out[4 * i + 1] = H[i] >>> 16; out[4 * i + 2] = H[i] >>> 8; out[4 * i + 3] = H[i]; } return out;
  };
  const pbkdf2js = async (pw, salt, iter) => {
    let key = enc.encode(pw); if (key.length > 64) key = sha256(key); const k = new Uint8Array(64); k.set(key);
    const ip = k.map(x => x ^ 0x36), op = k.map(x => x ^ 0x5c), cat = (a, b) => { const c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; };
    const hmac = msg => sha256(cat(op, sha256(cat(ip, msg))));
    let u = hmac(cat(salt, new Uint8Array([0, 0, 0, 1]))); const t = u.slice();
    for (let i = 1; i < iter; i++) { u = hmac(u); for (let j = 0; j < 32; j++) t[j] ^= u[j]; if (i % 20000 === 0) await new Promise(r => setTimeout(r, 0)); }
    return b64(t);
  };
  async function derive(pw, salt, iter) {
    if (!(window.crypto && crypto.subtle)) return pbkdf2js(pw, salt, iter);
    try {
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
    } catch (e) { return pbkdf2js(pw, salt, iter); }
  }
  // Default password (OmarAbdalla) shipped only as a salted PBKDF2 hash — never as plaintext. Changing the password replaces it.
  const DEFAULT = {"alg": "PBKDF2-SHA256", "iter": 210000, "salt": "ujL0sTjmCHLBbiFggQvWTg==", "hash": "hYeYA49cUghnU9dqfltP8PrUbyp7M3L9nb4XwBkVm9k=", "set": "default"};
  const rec = async () => (await OCL.db.get('kv', 'auth')) || DEFAULT;
  const eq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
  return {
    available: () => true, native: () => !!(window.crypto && crypto.subtle),
    _pbkdf2js: (pw, saltB64, iter) => pbkdf2js(pw, unb64(saltB64), iter),
    async has() { return true; },
    async isDefault() { return !(await OCL.db.get('kv', 'auth')); },
    async set(pw) {
      const salt = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(16)) : Uint8Array.from({ length: 16 }, () => Math.random() * 256 | 0);
      await OCL.db.put('kv', 'auth', { alg: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), hash: await derive(pw, salt, ITER), set: new Date().toISOString() });
    },
    async verify(pw) {
      const r = await rec();
      return eq(await derive(pw, unb64(r.salt), r.iter), r.hash);
    },
    async change(oldPw, newPw) { if (!(await this.verify(oldPw))) return false; await this.set(newPw); return true; },
    strength(pw) { let s = 0; if (pw.length >= 8) s++; if (pw.length >= 12) s++; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++; return s; }
  };
})();

/* ---------- application state ---------- */
OCL.state = {
  project: null, sheet: 0, sel: null, mode: 'select', placing: null, wiring: null,
  highlight: new Set(), flagged: new Map(), view: 'dashboard', sim: null, settings: { inactivityMin: 0, showVolts: true, animateCurrent: true, level: 'diploma' }
};
OCL.newProject = (name = 'Untitled Project') => ({
  id: OCL.uid('p'), name, created: Date.now(), modified: Date.now(), version: OCL.VERSION,
  sheets: [{ id: OCL.uid('s'), name: 'Sheet 1', components: [], wires: [] }],
  notes: [], doc: {}, pcb: null, revisions: [], template: null,
  simSettings: { auto: true, tStop: 0.01, dt: 1e-5, continuous: false, speed: 1 }
});
OCL.sheet = () => OCL.state.project.sheets[OCL.state.sheet];
OCL.allComponents = () => OCL.state.project.sheets.flatMap(s => s.components);
OCL.allWires = () => OCL.state.project.sheets.flatMap(s => s.wires);
OCL.findComp = id => OCL.allComponents().find(c => c.id === id);

/* undo / redo (snapshot based) */
OCL.history = {
  undo: [], redo: [],
  push() { const p = OCL.state.project; if (!p) return; this.undo.push(JSON.stringify(p.sheets)); if (this.undo.length > 120) this.undo.shift(); this.redo = []; p.modified = Date.now(); OCL.emit('dirty'); },
  doUndo() { const p = OCL.state.project; if (!this.undo.length) return OCL.toast('Nothing to undo'); this.redo.push(JSON.stringify(p.sheets)); p.sheets = JSON.parse(this.undo.pop()); OCL.state.sheet = Math.min(OCL.state.sheet, p.sheets.length - 1); OCL.state.sel = null; OCL.emit('circuit'); },
  doRedo() { const p = OCL.state.project; if (!this.redo.length) return OCL.toast('Nothing to redo'); this.undo.push(JSON.stringify(p.sheets)); p.sheets = JSON.parse(this.redo.pop()); OCL.state.sel = null; OCL.emit('circuit'); },
  clear() { this.undo = []; this.redo = []; }
};

/* project persistence */
OCL.saveProject = async (quiet) => {
  const p = OCL.state.project; if (!p) return;
  p.modified = Date.now();
  await OCL.db.put('projects', p.id, OCL.clone(p));
  const recent = (await OCL.db.get('kv', 'recent')) || [];
  await OCL.db.put('kv', 'recent', [p.id, ...recent.filter(x => x !== p.id)].slice(0, 12));
  OCL.state.dirty = false; OCL.emit('saved');
  if (!quiet) OCL.toast(OCL.db.persistent ? `Saved “${p.name}” to this browser` : 'Saved for this session only (browser storage unavailable) — use Export to keep a copy', OCL.db.persistent ? 'ok' : 'warn');
};
OCL.validateProjectJSON = o => {
  if (!o || typeof o !== 'object' || !Array.isArray(o.sheets)) throw new Error('Not an Omar Circuit Lab project (missing sheets).');
  o.sheets.forEach(s => { if (!Array.isArray(s.components) || !Array.isArray(s.wires)) throw new Error('Sheet “' + (s.name || '?') + '” is malformed.'); });
  o.id = o.id || OCL.uid('p'); o.notes = o.notes || []; o.doc = o.doc || {}; o.revisions = o.revisions || [];
  o.simSettings = Object.assign({ auto: true, tStop: 0.01, dt: 1e-5, continuous: false, speed: 1 }, o.simSettings || {});
  return o;
};
OCL.logSim = async entry => {
  const h = (await OCL.db.get('kv', 'simhistory')) || [];
  h.unshift({ ...entry, at: Date.now() }); await OCL.db.put('kv', 'simhistory', h.slice(0, 40));
};
