/* OMAR CIRCUIT LAB — application shell: security gate, navigation, toolbar, circuit designer UI, drawers, exports */
'use strict';
(() => {
const { $, $$, esc, el, fmt } = OCL;
const UI = OCL.ui = { views: {}, propTab: 'props', bottomTab: 'scope', libFilter: '', collapsed: {} };
const P = {
  dash: 'M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z', circuit: 'M4 12h4l2-5 4 10 2-5h4M2 12h2m16 0h2', lib: 'M4 4h6v16H4zM14 4l6 2-4 14-6-2z', heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  chip: 'M8 8h8v8H8zM10 2v4m4-4v4M10 18v4m4-4v4M2 10h4m-4 4h4m12-4h4m-4 4h4', power: 'M13 2 4 14h7l-1 8 9-12h-7z', sensor: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l7-7', pcb: 'M3 3h18v18H3zM7 7h3v3H7zm7 7h3v3h-3zM10 8.5h4V14', cube: 'M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10',
  bot: 'M12 3v3M5 9h14v10H5zM9 14h.01M15 14h.01M2 13v3m20-3v3', book: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM18 20V7', grad: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5', folder: 'M3 6h6l2 2h10v11H3z', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plus: 'M12 5v14M5 12h14', open: 'M3 7h6l2 2h10v10H3zM3 7V5h6', save: 'M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7', undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', redo: 'm15 14 5-5-5-5m5 5H9a5 5 0 0 0 0 10h3', comp: 'M4 6h16M4 12h16M4 18h10', wire: 'M4 18c4 0 4-12 8-12s4 12 8 12', play: 'M7 4v16l13-8z', stop: 'M6 6h12v12H6z', pause: 'M7 5h3v14H7zm7 0h3v14h-3z', explode: 'M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6 4 4M19 5l-4 4M9 15l-4 4', export: 'M12 3v12m-5-5 5 5 5-5M4 21h16',
  check: 'M20 6 9 17l-5-5', shield: 'M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z', rotate: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5', trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3', zin: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4M8 11h6M11 8v6', zout: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4M8 11h6', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5', cursor: 'm4 3 7 17 2-7 7-2z', volt: 'M4 4l8 16 8-16', lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', drop: 'M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z', thermo: 'M10 14V4a2 2 0 1 1 4 0v10a4 4 0 1 1-4 0z', lungs: 'M12 3v9m0 0c-2 0-3 2-5 2s-3 4-3 6c3 1 6-1 8-3m0-5c2 0 3 2 5 2s3 4 3 6c-3 1-6-1-8-3', syringe: 'M18 2l4 4M17 3l4 4-11 11H6v-4zM6 18l-4 4M9 9l2 2m1-5 2 2', monitor: 'M3 4h18v12H3zM8 20h8M5 11h3l2-3 3 6 2-3h4', battery: 'M3 7h16v10H3zM21 10v4M6 10v4m3-4v4', bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4', opamp: 'M5 4v16l15-8zM2 9h3m-3 6h3m15-3h3', resistor: 'M2 12h4l2-4 3 8 3-8 3 8 2-4h3', led: 'M6 6v12l10-6zM16 6v12M14 4l3-3m0 4 3-3', cap: 'M2 12h8m4 0h8M10 5v14m4-14v14', bjt: 'M8 4v16M8 12H3m5-3 8-5v-2m-8 12 8 5v2', coil: 'M2 12h3c0-4 4-4 4 0 0-4 4-4 4 0 0-4 4-4 4 0h5', probe: 'M3 21l6-6m0 0 2 2 9-9-4-4-9 9z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', star: 'm12 2 3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z', layers: 'm12 2 10 5-10 5L2 7zm-10 10 10 5 10-5M2 17l10 5 10-5', route: 'M5 19V9a4 4 0 0 1 4-4h10M15 1l4 4-4 4', via: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', copy: 'M8 8h12v12H8zM4 16V4h12', note: 'M4 4h16v12l-4 4H4zM16 16v4M8 9h8M8 13h5'
};
const I = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${P[n] || P.circuit}"/></svg>`;
UI.icon = I;

/* =================== SECURITY GATE =================== */
UI.gate = async (mode) => {
  const g = $('#gate'), f = $('#gate-form'); g.hidden = false; $('#app').hidden = true;
  if (!OCL.auth.available()) { f.innerHTML = `<div class="errbox">Web Crypto is unavailable (the page must be served over HTTPS or from localhost/file in Chrome or Edge). Password protection cannot be enabled.</div><button class="btn primary" id="g-go">Continue without protection</button>`; $('#g-go').onclick = () => UI.enter(); return; }
  const has = await OCL.auth.has();
  if (!has) {
    f.innerHTML = `<h3>First-time setup</h3><p class="muted small">Create a password to protect this workspace on this device.</p>
      <label class="fld"><span>New password (min. 8 characters)</span><input class="inp" type="text" class="secret" id="g-p1" autocomplete="off"></label><div class="meter"><i id="g-m" style="width:0"></i></div>
      <label class="fld"><span>Confirm password</span><input class="inp" type="text" class="secret" id="g-p2" autocomplete="off"></label>
      <div class="gate-err" id="g-err"></div><button class="btn primary" id="g-go" style="width:100%;justify-content:center">Set password &amp; enter</button>
      <p class="muted small" style="margin-top:12px">Stored only as a salted PBKDF2-SHA-256 hash (210 000 iterations) in this browser. There is no recovery — if forgotten, the workspace must be reset.</p>`;
    $('#g-p1').oninput = e => { $('#g-m').style.width = OCL.auth.strength(e.target.value) * 20 + '%'; };
    const go = async () => { const a = $('#g-p1').value, b = $('#g-p2').value; if (a.length < 8) return $('#g-err').textContent = 'Use at least 8 characters.'; if (a !== b) return $('#g-err').textContent = 'Passwords do not match.';
      $('#g-go').disabled = true; $('#g-go').textContent = 'Securing…'; await OCL.auth.set(a); UI.enter(); };
    $('#g-go').onclick = go; $('#g-p2').onkeydown = e => { if (e.key === 'Enter') go(); };
  } else {
    f.innerHTML = `<h3>${mode === 'locked' ? 'Session locked' : 'Welcome back'}</h3><label class="fld"><span>Password</span><div class="row"><input class="inp secret" type="text" id="g-p" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text" placeholder="Enter password"><button class="btn sm" type="button" id="g-eye" title="Show / hide">Show</button></div></label>
      <div class="gate-err" id="g-err"></div><button class="btn primary" id="g-go" style="width:100%;justify-content:center">${I('lock')} Unlock workspace</button>
      <p class="small" style="margin-top:14px"><a href="#" id="g-reset">Forgot password? Reset this workspace…</a></p><p class="muted small">Resetting erases local projects and restores the default password.</p>`;
    $('#g-eye').onclick = () => { const i = $('#g-p'); i.classList.toggle('secret'); $('#g-eye').textContent = i.classList.contains('secret') ? 'Show' : 'Hide'; i.focus(); };
    $('#gate-card').onclick = e => { if (!e.target.closest('button,a,input')) $('#g-p').focus(); };
    const go = async () => { $('#g-go').disabled = true; $('#g-go').textContent = 'Checking…'; const ok = await OCL.auth.verify($('#g-p').value.trim()); $('#g-go').innerHTML = I('lock') + ' Unlock workspace'; $('#g-go').disabled = false; if (!ok) { $('#g-err').textContent = 'Incorrect password.'; $('#g-p').select(); return; } UI.enter(); };
    $('#g-go').onclick = go; $('#g-p').onkeydown = e => { if (e.key === 'Enter') go(); }; setTimeout(() => $('#g-p') && $('#g-p').focus(), 50);
    $('#g-reset').onclick = async e => { e.preventDefault(); if (await OCL.confirm('Reset workspace', 'This permanently deletes the password AND all projects stored in this browser. Export anything you need first. Continue?', 'Erase everything', true)) { indexedDB.deleteDatabase('omar-circuit-lab'); location.reload(); } };
  }
};
UI.lock = () => { OCL.sim.pause(); UI.gate('locked'); };
let idleT = 0; const bumpIdle = () => { clearTimeout(idleT); const m = +OCL.state.settings.inactivityMin; if (m > 0 && !$('#app').hidden) idleT = setTimeout(() => { UI.lock(); OCL.toast('Locked after inactivity'); }, m * 60000); };
['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(ev => window.addEventListener(ev, bumpIdle, { passive: true }));

UI.enter = async () => {
  $('#gate').hidden = true; $('#app').hidden = false;
  if (!UI.booted) { UI.booted = true; await UI.boot(); }
  bumpIdle();
};

/* =================== BOOT =================== */
UI.boot = async () => {
  const s = await OCL.db.get('kv', 'settings'); if (s) Object.assign(OCL.state.settings, s);
  const cp = await OCL.db.get('kv', 'customParts'); if (cp) OCL.customParts = cp;
  UI.favs = new Set((await OCL.db.get('kv', 'favs')) || []);
  const recent = (await OCL.db.get('kv', 'recent')) || []; let proj = null;
  if (recent[0]) proj = await OCL.db.get('projects', recent[0]);
  UI.setProject(proj ? OCL.validateProjectJSON(proj) : OCL.newProject('My First Circuit'), true);
  buildShell(); UI.show(location.hash.slice(1) && UI.views[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard');
  window.addEventListener('keydown', e => { OCL.editor.keys(e); OCL.pcb.keys(e); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); OCL.saveProject(); } });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && UI.views[h] && h !== OCL.state.view) UI.show(h); });
  $('#foot-storage').textContent = OCL.db.persistent ? 'Projects stored in this browser (IndexedDB)' : 'Browser storage unavailable — export projects to keep them';
  setInterval(() => { if (OCL.state.dirty && OCL.state.project) OCL.saveProject(true); }, 60000);
};
UI.saveSettings = () => OCL.db.put('kv', 'settings', OCL.state.settings);
UI.setProject = (p, quiet) => {
  OCL.sim.reset(); OCL.state.project = p; OCL.state.sheet = 0; OCL.state.sel = null; OCL.state.flagged = new Map(); OCL.state.lastValidation = null; OCL.state.highlight = new Set(); OCL.sim.probes = [];
  OCL.history.clear(); OCL.state.dirty = false; OCL.pcb.drc = null; OCL.view3d.sel = null;
  if (!quiet) OCL.toast(`Opened “${p.name}”`, 'ok'); updateTitle(); OCL.emit('circuit'); OCL.emit('selection');
  if (OCL.editor.svg) setTimeout(() => OCL.editor.fit(), 30);
};
function updateTitle() { const p = OCL.state.project; if (!p || !$('#projname')) return; $('#projname').innerHTML = esc(p.name) + (OCL.state.dirty ? '<span class="dirty-dot" title="Unsaved changes"></span>' : ''); document.title = p.name + ' — Omar Circuit Lab'; }
OCL.on('dirty', () => { OCL.state.dirty = true; updateTitle(); }); OCL.on('saved', updateTitle);
OCL.on('circuit', () => { if (OCL.state.project) OCL.state.flagged = OCL.state.flagged || new Map(); });

/* =================== SHELL =================== */
const NAV = [['dashboard', 'Dashboard', 'dash'], null, ['designer', 'Circuit Designer', 'circuit'], ['library', 'Component Library', 'lib'], ['medical', 'Medical Electronics', 'heart'], ['mcu', 'Microcontrollers', 'chip'], ['power', 'Power Electronics', 'power'], ['sensors', 'Sensors', 'sensor'],
  ['pcb', 'PCB Designer', 'pcb'], ['workbench', '3D Workbench', 'cube'], ['copilot', 'AI Engineering Copilot', 'bot'], ['notebook', 'Engineering Notebook', 'book'], ['learning', 'Learning Centre', 'grad'], ['projects', 'Project Manager', 'folder'], null, ['settings', 'Settings & About', 'gear']];
function buildShell() {
  let n = 0; $('#sidenav').innerHTML = NAV.map(x => x ? `<div class="nav-i" data-v="${x[0]}" title="${x[1]}">${I(x[2])}<span>${x[1]}</span>${x[0] !== 'dashboard' && x[0] !== 'settings' ? `<i class="n">${++n}</i>` : ''}</div>` : '<div class="nav-h">' + (n ? 'System' : 'Workspace') + '</div>').join('');
  $$('#sidenav .nav-i').forEach(e => e.onclick = () => UI.show(e.dataset.v));
  const T = [['new', 'New Project', 'plus'], ['open', 'Open', 'open'], ['save', 'Save', 'save'], '|', ['undo', 'Undo', 'undo'], ['redo', 'Redo', 'redo'], '|', ['components', 'Components', 'comp'], ['connect', 'Connect', 'wire'], ['validate', 'Validate', 'shield'], '|', ['run', 'Run Simulation', 'play', 'run'], ['stop', 'Stop', 'stop', 'stop'], '|', ['pcbview', 'PCB View', 'pcb'], ['view3d', '3D View', 'cube'], ['exploded', 'Exploded View', 'explode'], '|', ['export', 'Export', 'export'], ['lock', 'Lock', 'lock']];
  $('#toolbar').innerHTML = T.map(t => t === '|' ? '<span class="tsep"></span>' : `<button class="tb ${t[3] || ''}" data-a="${t[0]}" title="${t[1]}">${I(t[2])}<span>${t[1]}</span></button>`).join('');
  $$('#toolbar .tb').forEach(b => b.onclick = e => UI.action(b.dataset.a, e));
  $('#brand').onclick = () => UI.show('dashboard');
  $('#projname').onclick = async () => { const n = await OCL.prompt('Rename project', 'Project name', OCL.state.project.name); if (n && n.trim()) { OCL.state.project.name = n.trim(); OCL.emit('dirty'); } };
  OCL.on('sim', simStatus); OCL.on('mode', () => { $$('#toolbar .tb[data-a="connect"]').forEach(b => b.classList.toggle('on', OCL.state.mode === 'wire')); });
  updateTitle();
}
function simStatus() { const s = OCL.sim, el2 = $('#simstat'); if (!el2) return; el2.className = 'simstat ' + s.status; el2.textContent = s.status === 'running' ? `running · t=${fmt(s.circuit ? s.circuit.S.t : 0, 's')}` : s.status === 'done' ? (s.mode === 'dc' ? 'DC solved' : 'transient done') : s.status;
  const rb = $('#toolbar .tb[data-a="run"]'); if (rb) { rb.classList.toggle('on', s.status === 'running'); rb.innerHTML = s.status === 'running' ? I('pause') + '<span>Pause</span>' : I('play') + '<span>' + (s.status === 'paused' ? 'Resume' : 'Run Simulation') + '</span>'; } }
OCL.on('simframe', () => { const el2 = $('#simstat'); if (el2 && OCL.sim.circuit) el2.textContent = `running · t=${fmt(OCL.sim.circuit.S.t, 's')}`; });

UI.action = async (a, e) => {
  const ed = OCL.editor;
  switch (a) {
    case 'new': return UI.newProjectDialog();
    case 'open': return UI.show('projects');
    case 'save': return OCL.saveProject();
    case 'undo': return OCL.history.doUndo();
    case 'redo': return OCL.history.doRedo();
    case 'components': if (OCL.state.view !== 'designer') UI.show('designer'); $('#designer').classList.toggle('nolib'); $('#designer').classList.toggle('show-lib'); return;
    case 'connect': if (OCL.state.view !== 'designer') UI.show('designer'); OCL.state.mode = OCL.state.mode === 'wire' ? 'select' : 'wire'; OCL.emit('mode'); OCL.toast(OCL.state.mode === 'wire' ? 'Connect mode: click a pin, then click another pin (click empty space to add bends, Esc to cancel)' : 'Select mode'); return;
    case 'validate': UI.runValidation(); return;
    case 'run': if (OCL.sim.status === 'running') return OCL.sim.pause(); if (OCL.state.view !== 'designer' && OCL.state.view !== 'medical') UI.show('designer'); OCL.sim.run(); if (OCL.state.view === 'designer') UI.showBottom(OCL.sim.status === 'error' ? 'messages' : (OCL.sim.mode === 'tran' ? 'scope' : 'readings')); return;
    case 'stop': OCL.sim.stop(); return;
    case 'pcbview': return UI.show('pcb');
    case 'view3d': return UI.show('workbench');
    case 'exploded': UI.show('workbench'); setTimeout(() => OCL.view3d.animateExplode(1), 120); return;
    case 'export': return UI.exportMenu(e.currentTarget);
    case 'lock': return UI.lock();
  }
};
UI.menu = (anchor, items) => {
  $$('.menu').forEach(m => m.remove()); const r = anchor.getBoundingClientRect();
  const m = el(`<div class="menu" style="left:${Math.min(r.left, innerWidth - 260)}px;top:${r.bottom + 4}px">${items.map((it, i) => it ? `<div class="mi" data-i="${i}">${it.icon ? I(it.icon) : ''}${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</div>` : '<hr>').join('')}</div>`);
  document.body.appendChild(m); m.querySelectorAll('.mi').forEach(x => x.onclick = () => { m.remove(); items[+x.dataset.i].act(); });
  setTimeout(() => window.addEventListener('mousedown', function h(ev) { if (!m.contains(ev.target)) { m.remove(); window.removeEventListener('mousedown', h); } }), 0);
};
UI.exportMenu = anchor => UI.menu(anchor, [
  { label: 'Project (JSON)', hint: '.json', icon: 'save', act: () => OCL.exportText(slug() + '.ocl.json', JSON.stringify(OCL.state.project, null, 1), 'application/json') },
  { label: 'Netlist (SPICE-style text)', hint: '.net', icon: 'list', act: () => OCL.exportText(slug() + '.net', UI.netlistText()) },
  { label: 'Bill of materials', hint: '.csv', icon: 'list', act: () => OCL.exportText(slug() + '-BOM.csv', OCL.bomCSV(), 'text/csv') },
  { label: 'Schematic image', hint: '.svg', icon: 'circuit', act: () => OCL.exportText(slug() + '.svg', OCL.editor.snapshotSVG(), 'image/svg+xml') },
  null,
  { label: 'Engineering report', hint: '.html / print to PDF', icon: 'book', act: () => UI.report() },
  { label: 'PCB fabrication files…', hint: 'Gerber · drill', icon: 'pcb', act: () => { UI.show('pcb'); setTimeout(UI.fabDialog, 100); } }
]);
const slug = () => OCL.state.project.name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'project';
UI.netlistText = () => { const nl = OCL.netlist(); let s = `* ${OCL.state.project.name}\n* Omar Circuit Lab ${OCL.VERSION} — ${OCL.SIGNATURE}\n* Behavioural netlist (educational models; not directly SPICE-compatible for ICs)\n`;
  nl.comps.forEach(c => { const d = OCL.defs[c.type]; if (['ground', 'label', 'vcc', 'junction'].includes(c.type)) return; s += `${c.ref} ${OCL.pinsOf(c).map(p => nl.nets[nl.nodeOf[c.id + ':' + p.id]].name).join(' ')} ${d.value ? d.value(c).replace(/\s/g, '') : ''} ; ${(OCL.parts[c.part] || { name: d.name }).name}\n`; });
  return s + '.end\n'; };

UI.newProjectDialog = async () => {
  const body = el(`<div><label class="fld"><span>Project name</span><input class="inp" id="np-n" value="New Project"></label><label class="fld"><span>Start from</span><select class="inp" id="np-t"><option value="">Blank schematic</option>${Object.values(OCL.templates).map(t => `<option value="${t.key}">${esc(t.title)}</option>`).join('')}</select></label></div>`);
  const r = await OCL.modal({ title: 'New project', body, actions: [{ label: 'Cancel', value: null }, { label: 'Create', kind: 'primary', value: m => ({ n: m.querySelector('#np-n').value, t: m.querySelector('#np-t').value }) }] });
  if (!r) return; if (OCL.state.dirty && !(await OCL.confirm('Unsaved changes', 'Save the current project first?', 'Save & continue'))) { /* continue without saving */ } else if (OCL.state.dirty) await OCL.saveProject(true);
  const p = r.t ? OCL.loadTemplate(r.t) : OCL.newProject(); if (r.n.trim() && (!r.t || r.n !== 'New Project')) p.name = r.n.trim(); UI.setProject(p); UI.show('designer');
};
UI.openTemplate = async key => { if (OCL.state.dirty && OCL.state.project.sheets.some(s => s.components.length)) await OCL.saveProject(true); UI.setProject(OCL.loadTemplate(key)); UI.show('designer'); };

/* =================== VIEW ROUTER =================== */
UI.show = (v) => {
  if (v === 'mcu' || v === 'power' || v === 'sensors') { UI.libCat = { mcu: 'Microcontrollers', power: 'Power', sensors: 'Sensors' }[v]; }
  else if (v === 'library') UI.libCat = UI.libCat && OCL.state.view === 'library' ? UI.libCat : 'All';
  OCL.state.view = v; $$('#sidenav .nav-i').forEach(n => n.classList.toggle('on', n.dataset.v === v));
  $$('#main > .view').forEach(x => x.hidden = true);
  let host = $('#view-' + v); if (!host) { host = el(`<div class="view" id="view-${v}"></div>`); $('#main').appendChild(host); }
  host.hidden = false; const fn = UI.views[v]; if (fn) fn(host);
  try { if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v); } catch (e) { }
};

/* =================== CIRCUIT DESIGNER =================== */
UI.views.designer = host => {
  if (!host.dataset.built) {
    host.classList.add('full'); host.dataset.built = 1;
    host.innerHTML = `<div class="designer" id="designer">
      <aside class="libpane"><div class="pane-h"><input class="inp" id="lib-q" placeholder="Search parts, e.g. resistor, LM358…"></div><div class="pane-b" id="lib-list"></div></aside>
      <section class="center"><div class="canvas-wrap" id="cwrap"><svg id="sch"></svg>
        <div class="floatbar">${[['select', 'cursor', 'Select / move (Esc)'], ['wire', 'wire', 'Connect wires (W)'], ['rotate', 'rotate', 'Rotate (R)'], ['delete', 'trash', 'Delete (Del)'], ['probe', 'probe', 'Add oscilloscope probe: then click a wire'], ['trace', 'route', 'TRACE MY CIRCUIT (T): click any pin to follow its connections'], ['zin', 'zin', 'Zoom in'], ['zout', 'zout', 'Zoom out'], ['fit', 'fit', 'Fit to view (F)'], ['volts', 'volt', 'Show node voltages'], ['lib', 'comp', 'Toggle component library'], ['props', 'list', 'Toggle properties panel']].map(b => `<button class="icon-btn" data-f="${b[0]}" title="${b[2]}">${I(b[1])}</button>`).join('')}</div>
        <div class="hintbar" id="hintbar" hidden></div><div class="emptystate" id="emptystate" hidden><div><h3>Start designing</h3><p>Drag a part from the library onto the grid, or click a part and then click the canvas. Click a pin, then another pin, to connect them.</p><div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-tpl="divider">Load a voltage-divider lesson</button><button class="btn" data-tpl="ecg">Open ECG template</button></div></div></div>
        <div class="sheet-tabs" id="sheet-tabs"></div><div class="statusbar" id="statusbar"></div></div>
        <div class="drawer" id="drawer"><div class="drawer-h">${[['scope', 'Oscilloscope'], ['readings', 'Readings'], ['validation', 'Validation'], ['simset', 'Simulation settings'], ['messages', 'Messages']].map(t => `<div class="tab" data-b="${t[0]}">${t[1]}</div>`).join('')}<span class="sp"></span><button class="icon-btn" id="drawer-min" title="Collapse / expand">▾</button></div><div class="drawer-b" id="drawer-b"></div></div>
      </section>
      <aside class="props"><div class="tabs" id="prop-tabs">${[['props', 'Properties'], ['ds', 'Datasheet'], ['read', 'Readings'], ['calc', 'Calc'], ['trace', 'Trace'], ['ai', 'AI']].map(t => `<div class="tab" data-p="${t[0]}">${t[1]}</div>`).join('')}</div><div class="pane-b" id="prop-body"></div></aside></div>`;
    OCL.editor.init($('#sch'));
    $('#lib-q').oninput = e => { UI.libFilter = e.target.value; renderLibPane(); };
    $$('.floatbar .icon-btn').forEach(b => b.onclick = () => floatAction(b.dataset.f));
    $$('#drawer .tab').forEach(t => t.onclick = () => UI.showBottom(t.dataset.b)); $('#drawer-min').onclick = () => $('#drawer').classList.toggle('min');
    $$('#prop-tabs .tab').forEach(t => t.onclick = () => { UI.propTab = t.dataset.p; UI.refreshProps(); });
    $$('#emptystate [data-tpl]').forEach(b => b.onclick = () => UI.openTemplate(b.dataset.tpl));
    OCL.on('selection', () => { UI.refreshProps(); if (UI.probeMode && OCL.state.selNet && OCL.editor.selWire) { addProbe(OCL.state.selNet); } });
    OCL.on('circuit', () => { UI.refreshProps(); renderSheets(); emptyState(); if (UI.bottomTab === 'validation' && OCL.state.lastValidation) renderValidation(); });
    OCL.on('rendered', emptyState);
    OCL.on('sim', () => { if (OCL.state.view !== 'designer') return; UI.refreshProps(); renderBottom(); });
    OCL.on('simframe', () => { if (OCL.state.view !== 'designer') return; if (UI.bottomTab === 'scope') drawScope(); else if (UI.bottomTab === 'readings') renderBottom(); if (UI.propTab === 'read') UI.refreshProps(); });
    OCL.on('mode', () => { modeUI(); emptyState(); }); OCL.on('cursor', p => { const sb = $('#statusbar'); if (sb) sb.innerHTML = `<span>x ${p.x} y ${p.y}</span><span>${Math.round(OCL.editor.zoom * 100)}%</span><span>${OCL.state.mode}</span>`; });
    OCL.on('focusProps', () => { UI.propTab = 'props'; UI.refreshProps(); const i = $('#prop-body input,#prop-body select'); if (i) i.focus(); });
    new ResizeObserver(() => { if (UI.bottomTab === 'scope') drawScope(); }).observe($('#drawer'));
    renderLibPane(); setTimeout(() => OCL.editor.fit(), 50);
  }
  renderLibPane(); OCL.editor.render(); renderSheets(); UI.refreshProps(); renderBottom(); modeUI(); emptyState();
  $$('.floatbar [data-f="volts"]').forEach(b => b.classList.toggle('on', OCL.state.settings.showVolts));
};
function emptyState() { const e = $('#emptystate'); if (e) e.hidden = OCL.sheet().components.length > 0 || !!OCL.state.placing; }
function modeUI() {
  const st = OCL.state, w = $('#cwrap'); if (!w) return; w.classList.toggle('mode-wire', st.mode === 'wire'); w.classList.toggle('mode-place', !!st.placing);
  $$('.floatbar .icon-btn').forEach(b => b.classList.toggle('on', (b.dataset.f === 'select' && st.mode === 'select' && !st.placing && !UI.probeMode && !st.traceMode) || (b.dataset.f === 'wire' && st.mode === 'wire') || (b.dataset.f === 'probe' && UI.probeMode) || (b.dataset.f === 'trace' && st.traceMode) || (b.dataset.f === 'volts' && st.settings.showVolts)));
  const h = $('#hintbar'); const part = st.placing && (OCL.parts[st.placing] || OCL.customParts[st.placing]);
  h.hidden = !(st.placing || st.mode === 'wire' || UI.probeMode || st.traceMode); h.textContent = st.placing ? `Placing ${part.name} — click to place · R rotate · Shift-click to place several · Esc cancel` : UI.probeMode ? 'Probe mode — click any wire to add it to the oscilloscope' : st.traceMode ? 'TRACE MY CIRCUIT — click any pin to follow its connections · Esc clears · T exits' : 'Connect mode — click a pin, then another pin · click empty space for bends · Esc cancel';
  $$('#lib-list .part').forEach(p => p.classList.toggle('on', p.dataset.k === st.placing));
}
function floatAction(f) {
  const ed = OCL.editor, st = OCL.state;
  if (f === 'trace') { st.traceMode = !st.traceMode; UI.probeMode = false; if (st.traceMode) { st.mode = 'select'; OCL.toast('Trace mode: click any pin'); } else OCL.trace.clear(); }
  if (f === 'select') { UI.probeMode = false; st.mode = 'select'; st.traceMode = false; ed.cancelWireIfAny(); if (st.placing) ed.cancelPlace(); }
  if (f === 'wire') { UI.probeMode = false; st.mode = st.mode === 'wire' ? 'select' : 'wire'; }
  if (f === 'rotate') ed.rotate(); if (f === 'delete') ed.del(); if (f === 'zin') ed.zoomBy(1.2); if (f === 'zout') ed.zoomBy(1 / 1.2); if (f === 'fit') ed.fit();
  if (f === 'probe') { UI.probeMode = !UI.probeMode; st.mode = 'select'; }
  if (f === 'volts') { st.settings.showVolts = !st.settings.showVolts; UI.saveSettings(); ed.renderSim(); }
  if (f === 'lib') { $('#designer').classList.toggle('nolib'); $('#designer').classList.toggle('show-lib'); }
  if (f === 'props') $('#designer').classList.toggle('show-props');
  OCL.emit('mode');
}
function addProbe(net) { if (OCL.sim.probes.length >= 4) OCL.sim.probes.shift(); OCL.sim.probes.push({ net: net.net }); UI.probeMode = false; OCL.emit('mode'); OCL.toast(`Probe added on net ${net.name}. Run the simulation to see it on the oscilloscope.`, 'ok'); UI.showBottom('scope'); }
UI.miniSym = key => {
  const part = OCL.parts[key] || OCL.customParts[key], def = OCL.defs[part.base]; const c = { type: part.base, part: key, props: {}, rot: 0, label: part.label || '' };
  def.props.forEach(p => c.props[p.k] = p.def); Object.assign(c.props, part.props || {});
  let [w, h] = def.box || [80, 40]; if (def.type === 'block') h = OCL.partPins(c).h; const pad = 6, W = Math.max(w + 40, 100), H = Math.max(h + 10, 50);
  return `<svg viewBox="${-W / 2 - pad} ${-H / 2 - pad} ${W + 2 * pad} ${H + 2 * pad}"><g class="sym">${def.symbol(c)}</g></svg>`;
};
const simBadge = p => { const s = OCL.defs[p.base].sim; return s === 'full' ? '<span class="pill sim">SIM</span>' : s === 'partial' ? '<span class="pill partial">PARTIAL</span>' : '<span class="pill cat">CATALOG</span>'; };
function renderLibPane() {
  const box = $('#lib-list'); if (!box) return; const q = UI.libFilter.trim().toLowerCase();
  const parts = OCL.partsList().filter(p => !q || (p.name + ' ' + (p.tags || '') + ' ' + (p.ds.part || '') + ' ' + p.key).toLowerCase().includes(q));
  const favs = parts.filter(p => UI.favs.has(p.key));
  const groups = [...(favs.length ? [['★ Favourites', favs]] : []), ...OCL.CATS.map(c => [c, parts.filter(p => OCL.partCat(p) === c)])].filter(g => g[1].length);
  box.innerHTML = groups.map(([cat, ps]) => `<div class="cat-h" data-c="${esc(cat)}"><span>${esc(cat)}</span><span>${UI.collapsed[cat] && !q ? '+' : '–'} ${ps.length}</span></div>` + (UI.collapsed[cat] && !q ? '' : ps.map(p => `<div class="part" draggable="true" data-k="${p.key}" title="${esc(p.name)} — click then click the canvas, or drag"><div class="mini">${UI.miniSym(p.key)}</div><div class="nm">${esc(p.name)}<small>${['ground', 'label', 'vcc', 'junction'].includes(p.base) ? 'net symbol' : OCL.defs[p.base].instrument ? 'virtual instrument' : OCL.defs[p.base].sim === 'none' ? 'catalog only' : OCL.defs[p.base].sim === 'partial' ? 'partial model' : 'simulated'}</small></div></div>`).join(''))).join('') || '<div class="empty">No parts match.</div>';
  $$('#lib-list .cat-h').forEach(h => h.onclick = () => { UI.collapsed[h.dataset.c] = !UI.collapsed[h.dataset.c]; renderLibPane(); });
  $$('#lib-list .part').forEach(p => { p.onclick = () => OCL.editor.startPlace(p.dataset.k); p.ondragstart = e => { e.dataTransfer.setData('text/ocl-part', p.dataset.k); e.dataTransfer.effectAllowed = 'copy'; }; });
  modeUI();
}
function renderSheets() {
  const t = $('#sheet-tabs'); if (!t) return; const p = OCL.state.project;
  t.innerHTML = p.sheets.map((s, i) => `<div class="st-t ${i === OCL.state.sheet ? 'on' : ''}" data-i="${i}" title="Double-click to rename">${esc(s.name)}</div>`).join('') + `<div class="st-t" id="sheet-add" title="Add sheet">＋</div>`;
  $$('#sheet-tabs .st-t[data-i]').forEach(x => { x.onclick = () => { OCL.state.sheet = +x.dataset.i; OCL.state.sel = null; OCL.emit('circuit'); OCL.editor.fit(); };
    x.ondblclick = async () => { const s = p.sheets[+x.dataset.i]; const n = await OCL.modal({ title: 'Sheet', body: `<label class="fld"><span>Name</span><input class="inp" value="${esc(s.name)}"></label><p class="muted small">Use net labels with the same name to connect nets across sheets.</p>`, actions: [...(p.sheets.length > 1 ? [{ label: 'Delete sheet', kind: 'danger', value: 'DEL' }] : []), { label: 'Cancel', value: null }, { label: 'Save', kind: 'primary', value: m => m.querySelector('input').value }] });
      if (n === 'DEL') { OCL.history.push(); p.sheets.splice(+x.dataset.i, 1); OCL.state.sheet = 0; OCL.emit('circuit'); } else if (n) { s.name = n; OCL.emit('dirty'); renderSheets(); } }; });
  $('#sheet-add').onclick = () => { OCL.history.push(); p.sheets.push({ id: OCL.uid('s'), name: 'Sheet ' + (p.sheets.length + 1), components: [], wires: [] }); OCL.state.sheet = p.sheets.length - 1; OCL.emit('circuit'); };
}

/* ---------- properties panel ---------- */
const dsRow = (k, v) => `<tr><td>${esc(k)}</td>${!v || v === '—' ? '<td class="ns">Not specified — check the manufacturer datasheet</td>' : `<td>${esc(v)}</td>`}</tr>`;
UI.datasheetHTML = (key, c) => {
  const p = OCL.parts[key] || OCL.customParts[key]; if (!p) return '<p class="muted">No datasheet information.</p>'; const d = OCL.defs[p.base], ds = p.ds || {}, fp = c ? OCL.pcb.fpFor(c) : OCL.pcb.fpFor({ type: p.base, part: key, props: {} });
  const custom = c && c.dsRef ? `<tr><td>Your reference</td><td><a href="${esc(c.dsRef)}" target="_blank" rel="noopener">${esc(c.dsRef)}</a></td></tr>` : '';
  return `<h3>${esc(p.name)}</h3><div class="row wrap" style="margin-bottom:8px">${simBadge(p)}<span class="pill">${esc(OCL.partCat(p))}</span></div><p class="small">${esc(ds.desc || d.name)}</p>
  <table class="kv">${dsRow('Manufacturer', ds.mfr)}${dsRow('Part number', ds.part)}${dsRow('Operating voltage', ds.vop)}${dsRow('Maximum voltage', ds.vmax)}${dsRow('Operating current', ds.iop)}${dsRow('Maximum current', ds.imax)}${dsRow('Power rating', ds.pwr)}${dsRow('Tolerance', ds.tol)}
  <tr><td>Pin configuration</td><td class="mono small">${OCL.pinsOf(c || { type: p.base, part: key, props: {} }).map(x => esc(x.name || x.id)).join(' · ') || '—'}</td></tr>${dsRow('Package', ds.pkg)}${dsRow('Temperature limits', ds.temp)}
  <tr><td>Electrical characteristics</td>${ds.elec && ds.elec.length ? `<td>${ds.elec.map(esc).join('<br>')}</td>` : '<td class="ns">Not specified — check the manufacturer datasheet</td>'}</tr>${dsRow('Suggested applications', ds.apps)}
  <tr><td>Simulation model</td><td>${d.sim === 'none' ? 'Not available (catalog only)' : esc(d.model || 'Educational model (not SPICE-validated)')}</td></tr><tr><td>PCB footprint</td><td>${fp ? esc(fp.name) : 'Off-board / none'}</td></tr>
  <tr><td>Datasheet reference</td><td>${ds.link ? `<a href="${esc(ds.link)}" target="_blank" rel="noopener">${esc(ds.linkNote || ds.link)}</a><br><span class="muted small">Manufacturer page — verify the current revision.</span>` : '<span class="ns">No verified link stored — search the manufacturer’s website for the part number.</span>'}</td></tr>${custom}</table>`;
};
UI.refreshProps = () => {
  const b = $('#prop-body'); if (!b || OCL.state.view !== 'designer') return; $$('#prop-tabs .tab').forEach(t => t.classList.toggle('on', t.dataset.p === UI.propTab));
  const c = OCL.findComp(OCL.state.sel), R = c && OCL.sim.readings ? OCL.sim.readings[c.id] : null;
  if (UI.propTab === 'trace') { b.innerHTML = OCL.trace.panelHTML() + (OCL.state.trace ? '' : `<button class="btn sm" id="tr-on" style="margin-top:10px">${I('route')} Turn on Trace mode</button>`); OCL.trace.bindPanel(b); const on = $('#tr-on'); if (on) on.onclick = () => floatAction('trace'); return; }
  if (!c) { const nsel = OCL.editor.selWire && OCL.state.selNet;
    b.innerHTML = nsel ? `<h3>Net ${esc(OCL.state.selNet.name)}</h3><p class="muted small">${OCL.state.selNet.pins.length} pins connected</p><div class="note-box mono small">${OCL.state.selNet.pins.map(k => { const [cid, pid] = k.split(':'); const cc = OCL.findComp(cid); return cc ? esc(cc.ref + '.' + pid) : ''; }).join('<br>')}</div>${OCL.sim.nodeV ? `<div class="big-read"><div><b>${fmt(OCL.sim.nodeV[OCL.state.selNet.net], 'V')}</b><span>Node voltage</span></div></div>` : ''}<div class="row" style="margin-top:10px"><button class="btn sm" id="pn-probe">${I('probe')} Probe on oscilloscope</button><button class="btn sm danger" id="pn-del">${I('trash')} Delete wire</button></div>`
      : `<div class="empty" style="margin-top:20px">Select a component or wire to see its properties.<br><br><span class="small">Shortcuts: <span class="kbd">W</span> wire · <span class="kbd">R</span> rotate · <span class="kbd">Del</span> delete · <span class="kbd">Ctrl+D</span> duplicate · <span class="kbd">Ctrl+Z</span> undo · <span class="kbd">F</span> fit</span></div>${OCL.state.project.template ? `<div class="card" style="margin-top:12px"><h4>Template</h4><b>${esc(OCL.templates[OCL.state.project.template].title)}</b><p class="small muted">${esc(OCL.templates[OCL.state.project.template].summary)}</p><button class="btn sm" id="pn-doc">Open design notes</button></div>` : ''}`;
    if ($('#pn-probe')) $('#pn-probe').onclick = () => addProbe(OCL.state.selNet); if ($('#pn-del')) $('#pn-del').onclick = () => OCL.editor.del(); if ($('#pn-doc')) $('#pn-doc').onclick = () => { UI.medSel = OCL.state.project.template; UI.show('medical'); };
    return; }
  const d = OCL.defs[c.type], part = OCL.parts[c.part] || OCL.customParts[c.part] || { name: d.name, ds: {} }, nl = OCL.netlist();
  if (UI.propTab === 'props') {
    b.innerHTML = `<div class="row"><h3 class="grow" style="margin:0">${esc(c.ref)}</h3>${simBadge({ base: c.type })}</div><p class="muted small">${esc(part.name)}</p>
      <label class="fld"><span>Reference designator</span><input class="inp" data-ref value="${esc(c.ref)}"></label>
      ${d.props.map(p => `<label class="fld"><span>${esc(p.label)}${p.unit ? ' (' + esc(p.unit) + ')' : ''}</span>${p.type === 'sel' ? `<select class="inp" data-k="${p.k}">${p.opts.map(o => `<option ${c.props[p.k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : p.type === 'bool' ? `<select class="inp" data-k="${p.k}" data-bool="1"><option value="1" ${c.props[p.k] ? 'selected' : ''}>Yes</option><option value="0" ${!c.props[p.k] ? 'selected' : ''}>No</option></select>` : `<input class="inp ${p.type === 'num' ? 'mono' : ''}" data-k="${p.k}" value="${esc(p.type === 'num' ? OCL.fmt(c.props[p.k], '', 4).trim() : c.props[p.k])}">`}</label>`).join('')}
      <div class="row wrap" style="margin:10px 0"><button class="btn sm" data-x="rot">${I('rotate')} Rotate</button><button class="btn sm" data-x="dup">${I('copy')} Duplicate</button><button class="btn sm danger" data-x="del">${I('trash')} Delete</button></div>
      <h4 style="margin-top:14px">Pins & nets <span class="muted small">(one pin map: schematic ⇄ footprint ⇄ 3D ⇄ simulation)</span></h4><table class="ptable"><tr><th>Pin</th><th>Pad</th><th>Function</th><th>Net</th>${OCL.sim.readings ? '<th>V</th>' : ''}</tr>${OCL.pinsOf(c).map(pn => { const n = nl.nodeOf[c.id + ':' + pn.id], pads = d.offboard ? [] : OCL.padsOfPin(c, pn.id); return `<tr class="click" data-trpin="${esc(pn.id)}" title="Click to trace this pin"><td class="mono">${esc(pn.name || pn.id)}</td><td class="mono">${pads.join(',') || '—'}</td><td class="small">${esc(OCL.pinFunction(pads.length ? (OCL.pinout(c).pads.find(q => q.num === pads[0]) || {}).name || pn.id : pn.id))}</td><td>${esc(nl.nets[n].name)}${nl.nets[n].pins.length < 2 && n ? ' <span class="sev sev-medium">open</span>' : ''}</td>${OCL.sim.nodeV ? `<td class="mono">${fmt(OCL.sim.nodeV[n], 'V')}</td>` : ''}</tr>`; }).join('')}</table>
      ${d.model ? `<h4 style="margin-top:14px">Model</h4><p class="small muted">${esc(d.model)}</p>` : '<p class="small muted" style="margin-top:12px">Simplified educational model — not a validated SPICE model.</p>'}
      <h4 style="margin-top:14px">Component note</h4><textarea class="inp" rows="2" data-note placeholder="Attach a note to ${esc(c.ref)} (saved in the Engineering Notebook)"></textarea><button class="btn sm" data-x="note" style="margin-top:6px">${I('note')} Add note</button>`;
    b.querySelectorAll('[data-trpin]').forEach(r => r.onclick = () => { OCL.trace.start(c.id, r.dataset.trpin); });
    if (!d.offboard && OCL.pinout(c).pads.some(p => !p.pin)) { const extra = OCL.pinout(c).pads.filter(p => !p.pin); b.querySelector('.ptable').insertAdjacentHTML('afterend', `<p class="small muted">Other footprint pads: ${extra.map(p => `${p.num} ${esc(p.name)}${p.implicit ? ' (supply — implicit in model)' : ''}`).join(' · ')}${OCL.pinout(c).generic ? '<br><b>Generic pinout</b> — verify against your exact part number’s datasheet.' : ''}</p>`); }
    b.querySelector('[data-ref]').onchange = e => { const v = e.target.value.trim(); if (!v) return; if (OCL.allComponents().some(x => x !== c && x.ref === v)) { OCL.toast('That reference is already used', 'warn'); e.target.value = c.ref; return; } OCL.history.push(); c.ref = v; OCL.emit('circuit'); };
    b.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { const pd = d.props.find(x => x.k === i.dataset.k); let v = i.value;
      if (pd.type === 'num') { v = OCL.parseSI(v); if (!isFinite(v)) { OCL.toast(`“${i.value}” is not a valid number (examples: 4.7k, 100n, 2.2M, 0.5)`, 'err'); i.value = OCL.fmt(c.props[pd.k], '', 4).trim(); return; } if (/R|C|L|Rg|R25|Rin|Ra|La|Rint/.test(pd.k) && v <= 0) { OCL.toast(pd.label + ' must be greater than zero', 'err'); return; } }
      if (i.dataset.bool) v = i.value === '1'; OCL.history.push(); c.props[pd.k] = v; OCL.emit('circuit'); if (['done', 'paused'].includes(OCL.sim.status)) OCL.sim.run(); });
    b.querySelectorAll('[data-x]').forEach(x => x.onclick = () => { const a = x.dataset.x; if (a === 'rot') OCL.editor.rotate(); if (a === 'dup') OCL.editor.duplicate(); if (a === 'del') OCL.editor.del();
      if (a === 'note') { const t = b.querySelector('[data-note]').value.trim(); if (!t) return; OCL.state.project.notes.unshift({ id: OCL.uid('n'), type: 'note', text: t, comp: c.ref, at: Date.now() }); OCL.emit('dirty'); OCL.toast('Note attached to ' + c.ref, 'ok'); b.querySelector('[data-note]').value = ''; } });
  } else if (UI.propTab === 'ds') {
    b.innerHTML = UI.datasheetHTML(c.part, c) + `<label class="fld" style="margin-top:12px"><span>Add your own datasheet reference (URL)</span><input class="inp" id="ds-ref" placeholder="https://…" value="${esc(c.dsRef || '')}"></label><div class="row"><button class="btn sm" id="ds-save">Save reference</button><button class="btn sm" id="ds-fav">${I('star')} ${UI.favs.has(c.part) ? 'Remove from' : 'Add to'} favourites</button></div>`;
    $('#ds-save').onclick = () => { const v = $('#ds-ref').value.trim(); if (v && !/^https?:\/\//i.test(v)) return OCL.toast('Enter a full http(s) URL', 'warn'); OCL.history.push(); c.dsRef = v; OCL.toast('Datasheet reference attached to ' + c.ref + ' (saved with the project)', 'ok'); UI.refreshProps(); };
    $('#ds-fav').onclick = () => { UI.toggleFav(c.part); UI.refreshProps(); };
  } else if (UI.propTab === 'read') {
    if (!R) { b.innerHTML = `<div class="empty">Run the simulation to see live readings.</div><button class="btn primary" style="margin-top:10px" id="rd-run">${I('play')} Run simulation</button>`; $('#rd-run').onclick = () => UI.action('run'); return; }
    const x = R.x || {}, extra = Object.entries(x).filter(([k, v]) => typeof v === 'number' || typeof v === 'string' && v).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="mono">${typeof v === 'number' ? (/^I/.test(k) ? fmt(v, 'A') : /^V/.test(k) ? fmt(v, 'V') : /^P/.test(k) ? fmt(v, 'W') : +v.toPrecision(4)) : esc(v)}</td></tr>`).join('');
    b.innerHTML = `<h3>${esc(c.ref)} readings</h3><p class="muted small">${OCL.sim.mode === 'tran' ? 'Transient — value at t = ' + fmt(OCL.sim.circuit.S.t, 's') : 'DC operating point'}</p>
      <div class="big-read"><div><b>${fmt(R.V, 'V')}</b><span>Voltage</span></div><div><b>${fmt(R.I, 'A')}</b><span>Current</span></div><div><b>${fmt(Math.abs(R.P), 'W')}</b><span>${R.x && R.x.delivering !== undefined ? 'Power delivered' : 'Power dissipated'}</span></div><div><b>${R.x && R.x.region ? esc(R.x.region) : (d.props.find(p => p.k === 'P') ? Math.round(Math.abs(R.P) / c.props.P * 100) + ' %' : '—')}</b><span>${R.x && R.x.region ? 'Region' : 'of power rating'}</span></div></div>
      <table class="kv">${Object.entries(R.pins).map(([k, v]) => `<tr><td>Pin ${esc(k)}</td><td class="mono">${fmt(v, 'V')}</td></tr>`).join('')}${extra}${x.conv ? `<tr><td>${esc(x.conv.label)}</td><td class="mono"><b>${isFinite(x.conv.value) ? x.conv.value.toFixed(2) + ' ' + x.conv.unit : '—'}</b></td></tr>` : ''}</table>`;
  } else if (UI.propTab === 'calc') b.innerHTML = calcFor(c, R) + quickCalc();
  else if (UI.propTab === 'trace') { b.innerHTML = OCL.trace.panelHTML() + (OCL.state.trace ? '' : `<button class="btn sm" id="tr-on" style="margin-top:10px">${I('route')} Turn on Trace mode</button>`); OCL.trace.bindPanel(b); const on = $('#tr-on'); if (on) on.onclick = () => floatAction('trace'); }
  else if (UI.propTab === 'ai') { b.innerHTML = `<h3>Copilot hints — ${esc(c.ref)}</h3>${OCL.copilot.hints(c)}<div class="row" style="margin-top:12px"><input class="inp" id="ai-q" placeholder="Ask about ${esc(c.ref)}…"><button class="btn sm" id="ai-go">Ask</button></div><div id="ai-a" style="margin-top:10px"></div><p class="muted small" style="margin-top:10px">Local rule-based engine — no external AI connected.</p>`;
    const go = () => { const r = OCL.copilot.ask($('#ai-q').value || 'why is ' + c.ref + ' not working'); $('#ai-a').innerHTML = `<div class="msg a">${r.html}</div>`; }; $('#ai-go').onclick = go; $('#ai-q').onkeydown = e => { if (e.key === 'Enter') go(); }; }
  if (UI.propTab === 'calc') bindQuickCalc();
};
function calcFor(c, R) {
  const p = c.props, rows = []; const I = R ? Math.abs(R.I) : null;
  switch (c.type) {
    case 'resistor': rows.push(['Resistance', fmt(p.R, 'Ω')], ['Tolerance range', `${fmt(p.R * (1 - p.tol / 100), 'Ω')} … ${fmt(p.R * (1 + p.tol / 100), 'Ω')}`], ['Max current at rating', fmt(Math.sqrt(p.P / p.R), 'A')], ['Max voltage at rating', fmt(Math.sqrt(p.P * p.R), 'V')]); if (R) rows.push(['P = I²R (now)', fmt(I * I * p.R, 'W')], ['Utilisation', Math.round(I * I * p.R / p.P * 100) + ' %']); break;
    case 'capacitor': case 'cap_e': rows.push(['Reactance @ 50 Hz', fmt(1 / (2 * Math.PI * 50 * p.C), 'Ω')], ['Reactance @ 1 kHz', fmt(1 / (2 * Math.PI * 1000 * p.C), 'Ω')], ['Energy at rated V', fmt(0.5 * p.C * p.Vmax ** 2, 'J')]); break;
    case 'inductor': rows.push(['Reactance @ 1 kHz', fmt(2 * Math.PI * 1000 * p.L, 'Ω')], ['L/R time constant', fmt(p.L / p.Rdc, 's')]); break;
    case 'led': { const vf = { red: 1.9, green: 2.1, yellow: 2, blue: 3, white: 3.1, infrared: 1.3 }[p.color]; [3.3, 5, 9, 12].forEach(v => rows.push([`Series R for ${v} V @ 15 mA`, fmt((v - vf) / 0.015, 'Ω')])); break; }
    case 'npn': case 'pnp': if (R) rows.push(['Forced β = Ic/Ib', (Math.abs(R.x.Ic / R.x.Ib)).toFixed(1)], ['Saturated?', R.x.region === 'saturation' ? 'yes' : 'no'], ['Pd = Vce·Ic', fmt(Math.abs(R.P), 'W')]); rows.push(['Base R for 100 mA load, 5 V drive', fmt((5 - 0.7) / (0.1 / 10), 'Ω') + ' (forced β = 10)']); break;
    case 'regulator': if (R) rows.push(['Dissipation (Vin−Vout)·I', fmt(R.x.Pdiss, 'W')], ['Junction temp (no heatsink)', (25 + R.x.Pdiss * p.theta).toFixed(0) + ' °C'], ['Headroom', fmt(R.x.Vin - R.x.Vout, 'V') + ` (needs ≥ ${p.Vdo} V)`]); break;
    case 'opamp': rows.push(['Output swing', `${p.vneg + p.swing} … ${p.vpos - p.swing} V`], ['Non-inverting gain', '1 + Rf/Rg'], ['Inverting gain', '−Rf/Rin']); break;
    case 'inamp': rows.push(['Gain G = 1 + k/RG', (1 + p.k / p.Rg).toFixed(2)], ['RG for G = 100', fmt(p.k / 99, 'Ω')], ['Common-mode gain', (1 + p.k / p.Rg) / 10 ** (p.cmrr / 20) + '']); break;
    case 'ntc': rows.push(['R at set temperature', fmt(OCL.defs.ntc.rOf(c), 'Ω')], ['α (approx.) = −β/T²', (-p.B / (p.T + 273.15) ** 2 * 100).toFixed(2) + ' %/°C']); break;
    case 'timer555': rows.push(['Astable f', '1.44 / ((RA + 2RB)·C)'], ['Monostable t', '1.1 · R · C']); break;
    case 'vac': rows.push(['Period', fmt(1 / p.freq, 's')], ['RMS (sine)', fmt(p.amp / Math.SQRT2, 'V')], ['Peak-to-peak', fmt(2 * p.amp, 'V')]); break;
    case 'mains': rows.push(['Peak', fmt(p.Vrms * Math.SQRT2, 'V')], ['Peak-to-peak', fmt(2 * p.Vrms * Math.SQRT2, 'V')]); break;
    case 'battery': rows.push(['Runtime at 50 mA', (p.mAh / 50).toFixed(1) + ' h (ideal)'], ['Short-circuit current', fmt(p.V / p.Rint, 'A')]); if (R) rows.push(['Runtime at present load', (p.mAh / 1000 / Math.max(1e-6, I)).toFixed(1) + ' h']); break;
    default: if (R) rows.push(['Voltage', fmt(R.V, 'V')], ['Current', fmt(R.I, 'A')], ['Power', fmt(Math.abs(R.P), 'W')]);
  }
  return `<h3>Engineering calculations — ${esc(c.ref)}</h3>${rows.length ? OCL.kvTable(rows) : '<p class="muted">No specific calculations for this part.</p>'}`;
}
function quickCalc() { return `<h4 style="margin-top:16px">Ohm’s law calculator</h4><div class="row"><input class="inp mono" id="qc-v" placeholder="V"><input class="inp mono" id="qc-i" placeholder="I"><input class="inp mono" id="qc-r" placeholder="R"></div><p class="small muted">Fill any two (SI prefixes OK: 4.7k, 20m).</p><div id="qc-out" class="note-box mono small">—</div>`; }
function bindQuickCalc() { const go = () => { const V = OCL.parseSI($('#qc-v').value), Ii = OCL.parseSI($('#qc-i').value), R = OCL.parseSI($('#qc-r').value); let o = '—';
  if (isFinite(V) && isFinite(R)) o = `I = ${fmt(V / R, 'A')} · P = ${fmt(V * V / R, 'W')}`; else if (isFinite(Ii) && isFinite(R)) o = `V = ${fmt(Ii * R, 'V')} · P = ${fmt(Ii * Ii * R, 'W')}`; else if (isFinite(V) && isFinite(Ii)) o = `R = ${fmt(V / Ii, 'Ω')} · P = ${fmt(V * Ii, 'W')}`; $('#qc-out').textContent = o; };
  ['#qc-v', '#qc-i', '#qc-r'].forEach(s => $(s) && ($(s).oninput = go)); }

/* ---------- bottom drawer ---------- */
UI.showBottom = tab => { if (OCL.state.view !== 'designer') UI.show('designer'); UI.bottomTab = tab; $('#drawer').classList.remove('min'); renderBottom(); };
function renderBottom() {
  const b = $('#drawer-b'); if (!b) return; $$('#drawer .tab').forEach(t => t.classList.toggle('on', t.dataset.b === UI.bottomTab)); const sim = OCL.sim;
  if (UI.bottomTab === 'scope') {
    b.innerHTML = `<div class="scope"><canvas id="scope-cv"></canvas><div class="scope-side" id="scope-side"></div></div>`; drawScope();
  } else if (UI.bottomTab === 'readings') {
    if (!sim.readings) { b.innerHTML = `<div class="empty" style="margin:12px">No results yet — press <b>Run Simulation</b>.</div>`; return; }
    const nl = sim.nl, comps = nl.comps.filter(c => !['ground', 'label', 'vcc', 'junction'].includes(c.type));
    b.innerHTML = `<div class="grid g2" style="padding:10px"><div><h4>Node voltages</h4><table class="ptable"><tr><th>Net</th><th>Voltage</th><th>Pins</th></tr>${nl.nets.slice(1).map(n => `<tr><td>${esc(n.name)}</td><td class="mono">${fmt(sim.nodeV[n.id], 'V', 4)}</td><td class="muted small">${n.pins.length}</td></tr>`).join('')}</table></div>
      <div><h4>Components</h4><table class="ptable"><tr><th>Ref</th><th>V</th><th>I</th><th>P</th></tr>${comps.map(c => { const r = sim.readings[c.id]; return r ? `<tr class="click" data-c="${c.id}"><td>${esc(c.ref)}</td><td class="mono">${fmt(r.V, 'V')}</td><td class="mono">${fmt(r.I, 'A')}</td><td class="mono">${fmt(Math.abs(r.P), 'W')}</td></tr>` : ''; }).join('')}</table></div></div>`;
    $$('#drawer-b tr[data-c]').forEach(r => r.onclick = () => { const c = OCL.findComp(r.dataset.c); const si = OCL.state.project.sheets.findIndex(s => s.components.includes(c)); if (si !== OCL.state.sheet) { OCL.state.sheet = si; OCL.emit('circuit'); } OCL.editor.select(c.id); });
  } else if (UI.bottomTab === 'validation') renderValidation();
  else if (UI.bottomTab === 'simset') {
    const s = OCL.state.project.simSettings;
    b.innerHTML = `<div class="grid g3" style="padding:12px;max-width:900px"><label class="fld"><span>Timing</span><select class="inp" id="ss-auto"><option value="1" ${s.auto ? 'selected' : ''}>Automatic (from sources & time constants)</option><option value="0" ${!s.auto ? 'selected' : ''}>Manual</option></select></label>
      <label class="fld"><span>Time span</span><input class="inp mono" id="ss-t" value="${esc(s.tStop)}" ${s.auto ? 'disabled' : ''}></label><label class="fld"><span>Time step</span><input class="inp mono" id="ss-dt" value="${esc(s.dt)}" ${s.auto ? 'disabled' : ''}></label>
      <label class="fld"><span>Initial state</span><select class="inp" id="ss-init"><option value="poweron" ${s.initial !== 'dcop' ? 'selected' : ''}>Power-on (capacitors discharged)</option><option value="dcop" ${s.initial === 'dcop' ? 'selected' : ''}>DC operating point</option></select></label>
      <label class="fld"><span>Run mode</span><select class="inp" id="ss-cont"><option value="0" ${!s.continuous ? 'selected' : ''}>Single run</option><option value="1" ${s.continuous ? 'selected' : ''}>Continuous (scrolling)</option></select></label>
      <label class="fld"><span>Simulation speed ×${s.speed}</span><input type="range" class="slider" id="ss-sp" min="0.25" max="8" step="0.25" value="${s.speed}"></label>
      <label class="fld"><span>Animate current flow on wires</span><select class="inp" id="ss-anim"><option value="1" ${OCL.state.settings.animateCurrent ? 'selected' : ''}>On</option><option value="0" ${!OCL.state.settings.animateCurrent ? 'selected' : ''}>Off</option></select></label></div>
      <p class="muted small" style="padding:0 12px">Engine: Modified Nodal Analysis, Newton–Raphson with junction limiting, source & gmin stepping; transient by backward Euler. Models are simplified educational models — not SPICE-validated.${sim.tStop ? ` Last run: span ${fmt(sim.tStop, 's')}, step ${fmt(sim.dt, 's')}.` : ''}</p>`;
    const save = () => { s.auto = $('#ss-auto').value === '1'; s.tStop = $('#ss-t').value; s.dt = $('#ss-dt').value; s.initial = $('#ss-init').value; s.continuous = $('#ss-cont').value === '1'; s.speed = +$('#ss-sp').value; OCL.state.settings.animateCurrent = $('#ss-anim').value === '1'; UI.saveSettings(); OCL.emit('dirty'); renderBottom(); };
    $$('#drawer-b select, #drawer-b input').forEach(i => i.onchange = save);
  } else if (UI.bottomTab === 'messages') {
    b.innerHTML = (sim.error ? `<div class="errbox"><b>Simulation error</b><br>${esc(sim.error)}</div>` : '') + `<div style="padding:10px 12px" class="small"><p>Status: <b>${esc(sim.status)}</b>${sim.nl ? ` · ${sim.nl.nNodes - 1} nets · ${sim.circuit ? sim.circuit.size : 0} unknowns` : ''}</p>${sim.circuit && sim.circuit.notes.length ? sim.circuit.notes.map(esc).join('<br>') : ''}<p class="muted">Tip: run <b>Validate</b> before simulating to catch shorts, floating inputs and missing ground.</p></div>`;
  }
}
const CH_COL = ['#22d3ee', '#ffd23b', '#ff5fa2', '#7cf29a'];
function drawScope() {
  const cv = $('#scope-cv'), side = $('#scope-side'); if (!cv || !cv.isConnected) return; const sim = OCL.sim, H = sim.history;
  const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = r.width, Hh = r.height, padL = 46, padB = 18, pw = W - padL - 8, ph = Hh - padB - 8;
  g.fillStyle = '#050a10'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#13283a'; g.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { const x = padL + pw * i / 10; g.beginPath(); g.moveTo(x, 8); g.lineTo(x, 8 + ph); g.stroke(); } for (let i = 0; i <= 8; i++) { const y = 8 + ph * i / 8; g.beginPath(); g.moveTo(padL, y); g.lineTo(padL + pw, y); g.stroke(); }
  g.strokeStyle = '#1f4a63'; g.beginPath(); g.moveTo(padL + pw / 2, 8); g.lineTo(padL + pw / 2, 8 + ph); g.moveTo(padL, 8 + ph / 2); g.lineTo(padL + pw, 8 + ph / 2); g.stroke();
  const chans = (sim.channels || []).filter(c => !c.hidden);
  if (!H || !H.t.length || !chans.length) {
    g.fillStyle = '#5d7a99'; g.font = '13px Inter, sans-serif'; g.textAlign = 'center';
    g.fillText(sim.mode === 'dc' && sim.status === 'done' ? 'DC result — the circuit has no time-varying sources. See Readings.' : 'Place an Oscilloscope (Instruments) or add a probe, then Run Simulation.', padL + pw / 2, 8 + ph / 2 - 8);
    side.innerHTML = `<h4>Channels</h4><p class="muted small">No channels. Connect scope inputs A/B to nets, or use the probe tool <span class="kbd">${'⌖'}</span> on the canvas.</p>${OCL.sim.probes.length ? `<p class="small">${OCL.sim.probes.length} probe(s) set.</p><button class="btn sm" id="sc-clr">Clear probes</button>` : ''}`;
    if ($('#sc-clr')) $('#sc-clr').onclick = () => { OCL.sim.probes = []; drawScope(); }; return;
  }
  const n = H.t.length, t0 = H.t[0], t1 = H.t[n - 1] || 1e-9; let mn = Infinity, mx = -Infinity;
  chans.forEach(c => { const a = H.ch[c.key]; for (let i = 0; i < n; i++) { if (a[i] < mn) mn = a[i]; if (a[i] > mx) mx = a[i]; } });
  if (!isFinite(mn)) { mn = -1; mx = 1; } if (mx - mn < 1e-6) { mx += 0.5; mn -= 0.5; } const pad = (mx - mn) * 0.08; mn -= pad; mx += pad;
  const X = t => padL + (t - t0) / Math.max(1e-12, (UI.scopeSpan || (t1 - t0))) * pw, Y = v => 8 + ph - (v - mn) / (mx - mn) * ph;
  const tSpan = sim.mode === 'tran' && !OCL.state.project.simSettings.continuous ? sim.tStop : t1 - t0; UI.scopeSpan = tSpan;
  chans.forEach((c, k) => { const a = H.ch[c.key]; g.strokeStyle = CH_COL[k % 4]; g.lineWidth = 1.6; g.beginPath(); const step = Math.max(1, Math.floor(n / (pw * 2)));
    for (let i = 0; i < n; i += step) { const x = X(H.t[i]), y = Y(a[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
  g.fillStyle = '#7f9bbb'; g.font = '10px JetBrains Mono, monospace'; g.textAlign = 'right';
  for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4; g.fillText(fmt(v, 'V', 3), padL - 4, Y(v) + 3); }
  g.textAlign = 'center'; for (let i = 0; i <= 5; i++) g.fillText(fmt(t0 + tSpan * i / 5, 's', 3), padL + pw * i / 5, Hh - 4);
  side.innerHTML = `<h4>Channels · ${fmt(tSpan / 10, 's')}/div · ${fmt((mx - mn) / 8, 'V')}/div</h4>` + chans.map((c, k) => { const m = sim.measure(H.ch[c.key]); return `<div style="margin-bottom:8px"><div class="ch"><i style="background:${CH_COL[k % 4]}"></i><b>${esc(c.label)}</b></div>${m ? `<div class="mono small muted">Vpp ${fmt(m.pp, 'V')} · Vmax ${fmt(m.max, 'V')}<br>Vmin ${fmt(m.min, 'V')} · Vavg ${fmt(m.mean, 'V')}<br>Vrms ${fmt(m.rms, 'V')} · f ${isFinite(m.f) ? fmt(m.f, 'Hz', 4) : '—'}</div>` : ''}</div>`; }).join('') + `<p class="muted small">t = ${fmt(t1, 's')} · ${n} samples</p>${OCL.sim.probes.length ? '<button class="btn sm" id="sc-clr">Clear probes</button>' : ''}`;
  if ($('#sc-clr')) $('#sc-clr').onclick = () => { OCL.sim.probes = []; OCL.toast('Probes cleared — re-run to update'); };
}
UI.runValidation = () => { const rep = OCL.validate(); OCL.editor.render(); UI.showBottom('validation'); OCL.toast(`Validation: ${rep.counts.critical} critical, ${rep.counts.high} high, ${rep.counts.medium} medium — health ${rep.score}/100`, rep.counts.critical ? 'err' : rep.counts.high ? 'warn' : 'ok'); return rep; };
function renderValidation() {
  const b = $('#drawer-b'); const rep = OCL.state.lastValidation;
  if (!rep) { b.innerHTML = `<div style="padding:14px"><p>Run the Prototype Validation & Circuit Health Checker to find design problems before simulating.</p><button class="btn primary" id="v-run">${I('shield')} Run validation</button></div>`; $('#v-run').onclick = UI.runValidation; return; }
  b.innerHTML = `<div style="padding:10px 12px"><div class="row wrap"><div><div class="score ${rep.score >= 85 ? 'good' : rep.score >= 60 ? 'mid' : 'bad'}">${rep.score}<span class="small muted">/100</span></div><div class="muted small">circuit health · stress source: ${esc(rep.src || 'structural only')}</div></div><span class="sp"></span>${OCL.SEV.map(s => `<span class="sev sev-${s}">${s} ${rep.counts[s]}</span>`).join(' ')}<button class="btn sm" id="v-run">${I('shield')} Re-run</button><button class="btn sm" id="v-clr">Clear highlights</button></div>
    <table class="ptable" style="margin-top:8px"><tr><th>Severity</th><th>Part</th><th>Finding</th><th>Explanation</th><th>Corrective action</th></tr>${rep.issues.map((i, k) => `<tr class="click" data-k="${k}"><td><span class="sev sev-${i.sev}">${i.sev}</span></td><td class="mono">${esc(i.ref)}</td><td><b>${esc(i.title)}</b></td><td class="small">${esc(i.why)}</td><td class="small">${esc(i.fix)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No issues found by the implemented checks.</td></tr>'}</table>
    <details style="margin-top:10px"><summary class="small muted">Checks NOT performed by this version (${OCL.UNSUPPORTED_CHECKS.length})</summary><ul class="small muted">${OCL.UNSUPPORTED_CHECKS.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details></div>`;
  $('#v-run').onclick = UI.runValidation; $('#v-clr').onclick = () => { OCL.state.flagged = new Map(); OCL.editor.render(); };
  $$('#drawer-b tr[data-k]').forEach(r => r.onclick = () => { const i = rep.issues[+r.dataset.k]; if (!i.comp) return; const c = OCL.findComp(i.comp); if (!c) return; const si = OCL.state.project.sheets.findIndex(s => s.components.includes(c)); if (si !== OCL.state.sheet) { OCL.state.sheet = si; OCL.emit('circuit'); } OCL.editor.select(c.id); UI.propTab = 'ai'; UI.refreshProps(); });
}

/* =================== REPORT =================== */
UI.reportHTML = () => {
  const p = OCL.state.project, d = p.doc || {}, t = p.template && OCL.templates[p.template], rep = OCL.validate(); OCL.editor.render();
  const bom = OCL.bomCSV().split('\n').filter(l => l && !l.startsWith('"Generated')).map(l => l.match(/("([^"]|"")*"|[^,]+)/g) || []);
  const simRows = OCL.sim.readings && OCL.sim.nl ? OCL.sim.nl.comps.filter(c => !['ground', 'label', 'vcc', 'junction'].includes(c.type)).map(c => { const r = OCL.sim.readings[c.id]; return r ? `<tr><td>${esc(c.ref)}</td><td>${fmt(r.V, 'V')}</td><td>${fmt(r.I, 'A')}</td><td>${fmt(Math.abs(r.P), 'W')}</td></tr>` : ''; }).join('') : '';
  const sec = (n, title, body) => `<h2>${n}. ${title}</h2>${body || '<p class="m">—</p>'}`, pre = s => s ? `<p>${esc(s).replace(/\n/g, '<br>')}</p>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(p.name)} — Engineering Report</title><style>body{font:14px/1.5 Inter,Segoe UI,Arial,sans-serif;color:#1a2333;max-width:900px;margin:30px auto;padding:0 24px}h1{font-size:26px;margin:0}h2{font-size:17px;border-bottom:2px solid #0e7490;padding-bottom:4px;margin-top:28px;color:#0b4f63}table{border-collapse:collapse;width:100%;font-size:12.5px}td,th{border:1px solid #cfd8e3;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eef4f8}.m{color:#6b7a90}.sig{margin-top:40px;padding-top:12px;border-top:1px solid #cfd8e3;font-size:12px;color:#4a5a70}.warn{background:#fff6e0;border:1px solid #e7c46a;padding:10px 14px;border-radius:8px;font-size:12.5px}.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0e7490;padding-bottom:10px}.bd-box{fill:#eef6fa;stroke:#0e7490}.bd-t{font:600 11px sans-serif;fill:#0b3140}.bd-a{stroke:#0e7490;fill:none;stroke-width:1.5}.bd-ah{fill:#0e7490}svg.bd{width:100%;max-height:220px}@media print{body{margin:0}}</style></head><body>
  <div class="hdr"><div><div class="m">OMAR CIRCUIT LAB · Engineering Report</div><h1>${esc(d.title || p.name)}</h1></div><div class="m" style="text-align:right">${new Date().toLocaleString()}<br>Version ${OCL.VERSION}</div></div>
  ${t && t.medical ? `<div class="warn" style="margin-top:14px"><b>Educational prototype — not a medical device.</b> Not clinically validated. Do not connect to patients. Real devices require IEC 60601-1 compliance (isolation, leakage current, EMC, calibration, biocompatibility).</div>` : ''}
  ${sec(1, 'Project title', `<p>${esc(d.title || p.name)}</p>`)}${sec(2, 'Problem statement', pre(d.problem))}${sec(3, 'Design objective', pre(d.objective))}${sec(4, 'Requirements', pre(d.requirements))}
  ${sec(5, 'Block diagram', t ? OCL.blockDiagramSVG(t.blocks) : pre(d.block))}${sec(6, 'Circuit schematic', OCL.editor.snapshotSVG())}
  ${sec(7, 'Component selection (BOM)', `<table>${bom.map((r, i) => `<tr>${r.map(c => i ? `<td>${esc(c.replace(/^"|"$/g, '').replace(/""/g, '"'))}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table>${pre(d.selection)}`)}
  ${sec(8, 'Calculations', (t ? `<ul>${t.calcs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '') + pre(d.calcs && (!t || d.calcs !== t.calcs.join('\n')) ? d.calcs : ''))}
  ${sec(9, 'Simulation results', simRows ? `<p class="m">${OCL.sim.mode === 'tran' ? 'Transient analysis, values at t = ' + fmt(OCL.sim.circuit.S.t, 's') : 'DC operating point'} — simplified educational models.</p><table><tr><th>Part</th><th>Voltage</th><th>Current</th><th>Power</th></tr>${simRows}</table>` : '<p class="m">No simulation run in this session.</p>' + pre(d.simresults))}
  ${sec(10, 'Validation report', `<p>Health score <b>${rep.score}/100</b> (${esc(rep.src || 'structural')}). Critical ${rep.counts.critical}, high ${rep.counts.high}, medium ${rep.counts.medium}, low ${rep.counts.low}.</p><table><tr><th>Severity</th><th>Part</th><th>Finding</th><th>Action</th></tr>${rep.issues.map(i => `<tr><td>${i.sev}</td><td>${esc(i.ref)}</td><td>${esc(i.title)} — ${esc(i.why)}</td><td>${esc(i.fix)}</td></tr>`).join('')}</table>`)}
  ${sec(11, 'Limitations', pre(d.limitations || 'Simplified behavioural models; results must be confirmed on hardware with calibrated instruments.'))}${sec(12, 'Recommendations', pre(d.recommendations))}
  ${p.notes.length ? `<h2>Engineering notebook</h2><table><tr><th>When</th><th>Type</th><th>Part</th><th>Note</th></tr>${p.notes.map(n => `<tr><td>${new Date(n.at).toLocaleString()}</td><td>${esc(n.type)}</td><td>${esc(n.comp || '')}</td><td>${esc(n.text).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>` : ''}
  <div class="sig">Generated by <b>OMAR CIRCUIT LAB</b> — Medical Engineering Design &amp; Simulation Studio<br>Designed &amp; Developed by <b>Eng. Omar Abdalla</b> · KMTC Makindu Campus</div></body></html>`;
};
UI.report = async () => {
  const html = UI.reportHTML();
  const r = await OCL.modal({ title: 'Engineering report', wide: true, body: `<p class="muted small">Download the report as HTML, then open it in Chrome/Edge and use <b>Print → Save as PDF</b>. (Embedded viewers block printing and downloads; use Copy HTML there.)</p><iframe style="width:100%;height:60vh;border:1px solid var(--line);border-radius:8px;background:#fff" sandbox="allow-same-origin"></iframe>`,
    actions: [{ label: 'Close', value: null }, { label: 'Copy HTML', value: 'copy' }, { label: 'Download .html', kind: 'primary', value: 'dl' }] });
  if (r === 'dl') OCL.exportText(slug() + '-report.html', html, 'text/html'); if (r === 'copy') navigator.clipboard.writeText(html).then(() => OCL.toast('Report HTML copied', 'ok'), () => OCL.toast('Clipboard blocked', 'warn'));
};
const _modal = OCL.modal; OCL.modal = o => { const pr = _modal(o); setTimeout(() => { const f = document.querySelector('.modal iframe'); if (f && o.title === 'Engineering report') f.srcdoc = UI.reportHTML(); }, 20); return pr; };
UI.selectComp = (cid, keepView) => { const c = OCL.findComp(cid); if (!c) return; const si = OCL.state.project.sheets.findIndex(s => s.components.includes(c));
  if (si >= 0 && si !== OCL.state.sheet) { OCL.state.sheet = si; OCL.emit('circuit'); }
  if (OCL.editor.svg) OCL.editor.select(cid); else { OCL.state.sel = cid; OCL.emit('selection'); }
  OCL.view3d.sel = cid; OCL.pcb.sel = cid; if (!keepView && OCL.state.view !== 'designer') UI.show('designer'); };
OCL.on('trace', tr => { if (OCL.state.view === 'designer') { if (tr) UI.propTab = 'trace'; UI.refreshProps(); } });
UI.toggleFav = key => { UI.favs.has(key) ? UI.favs.delete(key) : UI.favs.add(key); OCL.db.put('kv', 'favs', [...UI.favs]); OCL.toast(UI.favs.has(key) ? 'Added to favourites' : 'Removed from favourites'); if ($('#lib-list')) renderLibPane(); };

/* start */
window.addEventListener('DOMContentLoaded', () => UI.gate());
})();
