import * as THREE from './vendor/three.module.min.js';
export const PINK = document.documentElement.dataset.theme !== 'neon';
const K = PINK ? {mut:'#8a5a78', grid:'rgba(255,120,200,.10)', zero:'rgba(255,220,240,.35)', up:'#5dffc0', upa:'93,255,192', dn:'#ff4d5e', dna:'255,77,94'}
             : {mut:'#4d6a80', grid:'rgba(0,180,255,.08)', zero:'rgba(255,255,255,.25)', up:'#00ff9c', upa:'0,255,156', dn:'#ff3b6b', dna:'255,59,107'};
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const sgn = (v, d = 4) => (v == null || isNaN(v)) ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(d);
export const cls = v => v > 0 ? 'up' : v < 0 ? 'dn' : 'flat';
export const STAGE_IT = {scout:'SCOUT', social:'NEWS/SOCIAL', charts:'GRAFICI', antirug:'ANTI-RUG', rugcheck:'RUGCHECK', skeptic:'SKEPTIC', board:'BOARD', altro:'ALTRO'};
export function clockRome() {
  return new Date().toLocaleTimeString('it-IT', {timeZone: 'Europe/Rome', hour12: false});
}
export function dateRome() {
  return new Date().toLocaleDateString('it-IT', {timeZone: 'Europe/Rome', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'}).toUpperCase();
}
export function dur(sec) {
  if (sec == null) return '—'; sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h ? `${h}h ${String(m).padStart(2,'0')}m` : m ? `${m}m ${String(s).padStart(2,'0')}s` : `${s}s`;
}
export function shortReason(r) {
  r = (r || '').toLowerCase();
  return r.includes('take profit') ? 'TAKE PROFIT' : r.includes('partial') ? 'TP PARZIALE' : r.includes('stop loss') ? 'STOP LOSS' :
    r.includes('quick-fail') ? 'QUICK-FAIL' : r.includes('breakeven') ? 'BREAKEVEN' : r.includes('trail') ? 'TRAILING' :
    r.includes('time exit') ? 'USCITA TEMPO' : (r.split('(')[0] || '—').toUpperCase().slice(0, 14);
}
export async function poll(cb, ms = 30000) {
  const tick = async () => {
    try {
      const r = await fetch('./data.json?t=' + Date.now(), {cache: 'no-store'});
      if (r.ok) {
        const j = await r.json();
        if (j && j.ts) {
          if (j.heartbeat) {
            const hb = Date.parse(j.heartbeat);
            if (!isNaN(hb)) j.log_age = (Date.now() - hb) / 1000;
          }
          j.ts = Date.now() / 1000;
          cb(j, null);
        }
      } else cb(null, r.status);
    }
    catch (e) { cb(null, e); }
    setTimeout(tick, document.hidden ? Math.max(ms * 2, 60000) : ms);
  };
  tick();
}

/* ---------- canvas helpers ---------- */
export function fitCanvas(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [g, w, h];
}
function parseCurveT(t) {
  if (t == null || t === '<live>') return null;
  const s = String(t);
  if (/T/.test(s) || (s.length > 8 && /\d{4}-\d{2}-\d{2}/.test(s))) {
    const ms = Date.parse(s);
    if (!isNaN(ms)) return ms / 1000;
  }
  const p = s.split(':');
  if (p.length >= 2) {
    const a = +p[0], b = +p[1], c = +(p[2] || 0);
    if ([a, b, c].every(n => !isNaN(n))) return a * 3600 + b * 60 + c;
  }
  return null;
}
export function drawEquity(c, curve, opt = {}) {
  const [g, w, h] = fitCanvas(c); g.clearRect(0, 0, w, h);
  if (!curve || !curve.length) return;
  const pad = {l: 44, r: 8, t: 8, b: 16};
  const raw = curve.filter(p => p && p.length >= 2);
  let pts = raw.map(p => [parseCurveT(p[0]), +p[1], p[0]]).filter(p => p[0] != null && !isNaN(p[1]));
  if (!pts.length) return;
  const iso = raw.some(p => /T/.test(String(p[0])));
  if (!iso && pts[0][1] !== 0) pts = [[parseCurveT('00:00:00'), 0, '00:00:00'], ...pts];
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(x0 + 60, Math.max(...xs));
  let y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys); const sp = (y1 - y0) || 0.01; y0 -= sp * .08; y1 += sp * .08;
  const X = v => pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r), Y = v => pad.t + (y1 - v) / (y1 - y0) * (h - pad.t - pad.b);
  g.font = '9px "JetBrains Mono", monospace'; g.fillStyle = K.mut; g.strokeStyle = K.grid; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4, y = Y(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke(); g.fillText(v.toFixed(3), 2, y + 3); }
  const span = x1 - x0;
  if (iso) {
    const step = span > 3 * 86400 ? 12 * 3600 : span > 18 * 3600 ? 4 * 3600 : span > 6 * 3600 ? 2 * 3600 : 1800;
    const fmt = t => {
      const d = new Date(t * 1000);
      const lab = d.toLocaleString('it-IT', {timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false});
      if (span < 36 * 3600) return lab.slice(-5);
      return lab.replace(',', '');
    };
    for (let t = Math.ceil(x0 / step) * step; t <= x1; t += step) {
      const x = X(t); g.beginPath(); g.moveTo(x, pad.t); g.lineTo(x, h - pad.b); g.stroke(); g.fillText(fmt(t), x - 14, h - 4);
    }
  } else {
    for (let hh = Math.ceil(x0 / 7200) * 2; hh * 3600 <= x1; hh += 2) { const x = X(hh * 3600); g.beginPath(); g.moveTo(x, pad.t); g.lineTo(x, h - pad.b); g.stroke(); g.fillText(String(hh).padStart(2, '0') + ':00', x - 12, h - 4); }
  }
  g.strokeStyle = K.zero; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(pad.l, Y(0)); g.lineTo(w - pad.r, Y(0)); g.stroke(); g.setLineDash([]);
  // candles: 30 min intra-day, coarser over a multi-day life
  if (opt.candles !== false) {
    const B = iso && span > 36 * 3600 ? 3600 : 1800, buckets = new Map(); let prev = 0;
    pts.forEach((p, i) => { const k = Math.floor(xs[i] / B); if (!buckets.has(k)) buckets.set(k, {o: prev, h: prev, l: prev, c: prev}); const b = buckets.get(k); b.h = Math.max(b.h, p[1]); b.l = Math.min(b.l, p[1]); b.c = p[1]; prev = p[1]; });
    const bw = Math.max(2, (X(x0 + B) - X(x0)) * .6);
    buckets.forEach((b, k) => { const x = X(k * B + B / 2), up = b.c >= b.o; g.strokeStyle = g.fillStyle = up ? `rgba(${K.upa},.55)` : `rgba(${K.dna},.55)`;
      g.beginPath(); g.moveTo(x, Y(b.h)); g.lineTo(x, Y(b.l)); g.stroke(); const yt = Y(Math.max(b.o, b.c)), yb = Y(Math.min(b.o, b.c)); g.fillRect(x - bw / 2, yt, bw, Math.max(1, yb - yt)); });
  }
  const last = ys[ys.length - 1], col = last >= 0 ? K.up : K.dn;
  const grad = g.createLinearGradient(0, pad.t, 0, h); grad.addColorStop(0, last >= 0 ? `rgba(${K.upa},.25)` : `rgba(${K.dna},.02)`); grad.addColorStop(1, last >= 0 ? `rgba(${K.upa},0)` : `rgba(${K.dna},.25)`);
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(xs[i]), Y(p[1])) : g.moveTo(X(xs[i]), Y(p[1]))); g.lineTo(X(xs[xs.length - 1]), Y(0)); g.lineTo(X(xs[0]), Y(0)); g.closePath(); g.fillStyle = grad; g.fill();
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(xs[i]), Y(p[1])) : g.moveTo(X(xs[i]), Y(p[1]))); g.strokeStyle = col; g.lineWidth = 1.6; g.shadowColor = col; g.shadowBlur = 8; g.stroke(); g.shadowBlur = 0;
  const lx = X(xs[xs.length - 1]), ly = Y(last); g.fillStyle = col; g.beginPath(); g.arc(lx, ly, 3, 0, 7); g.fill();
}
export function drawHist(c, hist) {
  const [g, w, h] = fitCanvas(c); g.clearRect(0, 0, w, h);
  const n = hist.counts.length, mx = Math.max(1, ...hist.counts), pad = {l: 22, b: 14, t: 6};
  const bw = (w - pad.l - 4) / n; g.font = '9px "JetBrains Mono", monospace';
  g.strokeStyle = K.grid; for (let i = 0; i <= 3; i++) { const y = pad.t + (h - pad.t - pad.b) * i / 3; g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w, y); g.stroke(); g.fillStyle = K.mut; g.fillText(Math.round(mx * (3 - i) / 3), 2, y + 3); }
  hist.counts.forEach((v, i) => {
    const lo = i === 0 ? -99 : hist.bins[i - 1]; const x = pad.l + i * bw, bh = (h - pad.t - pad.b) * v / mx;
    const col = lo >= 0 ? K.upa : K.dna;
    g.fillStyle = `rgba(${col},.75)`; g.shadowColor = `rgb(${col})`; g.shadowBlur = v ? 6 : 0; g.fillRect(x + 1, h - pad.b - bh, bw - 2, bh); g.shadowBlur = 0;
    if (i % 5 === 1) { g.fillStyle = K.mut; g.fillText((lo > 0 ? '+' : '') + lo + '%', x - 6, h - 3); }
  });
}
export function spark(c, vals, col) {
  const [g, w, h] = fitCanvas(c); g.clearRect(0, 0, w, h); if (vals.length < 2) return;
  const mn = Math.min(...vals), mx = Math.max(...vals), sp = (mx - mn) || 1;
  g.beginPath(); vals.forEach((v, i) => { const x = i / (vals.length - 1) * w, y = h - 2 - (v - mn) / sp * (h - 4); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.strokeStyle = col; g.lineWidth = 1.2; g.shadowColor = col; g.shadowBlur = 6; g.stroke(); g.shadowBlur = 0;
}

/* ---------- 3D torus network ---------- */
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.2, 'rgba(255,255,255,.8)'); r.addColorStop(.5, 'rgba(255,255,255,.18)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}
const COL = PINK ? {board: 0x5dffc0, check: 0xc9a2ff, reject: 0xff3b4e, open: 0xffd27a} : {board: 0x00ff9c, check: 0x18c8ff, reject: 0xff2d55, open: 0xffd23f};
const DEF = PINK ? 0xc9a2ff : 0x18c8ff;
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
export function createTorus(el, opt = {}) {
  const P = opt.particles ?? 9000, R = 3.2, r = 1.25;
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(opt.dpr ?? 1.5, window.devicePixelRatio || 1)); el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, .1, 100); cam.position.set(0, 4.2, 8.6); cam.lookAt(0, 0, 0);
  const root = new THREE.Group(); root.rotation.x = -0.32; scene.add(root); const tex = glowTex();
  // particle shell
  const pos = new Float32Array(P * 3), col = new Float32Array(P * 3), c1 = new THREE.Color(PINK ? 0xff6ec4 : 0x0a7cff), c2 = new THREE.Color(PINK ? 0xffd6ee : 0x00f0ff), c3 = new THREE.Color(PINK ? 0xd2b0ff : 0x7a3cff);
  for (let i = 0; i < P; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.random() * Math.PI * 2, rr = r * (0.82 + Math.random() * 0.3);
    pos[i*3] = (R + rr * Math.cos(v)) * Math.cos(u); pos[i*3+1] = rr * Math.sin(v); pos[i*3+2] = (R + rr * Math.cos(v)) * Math.sin(u);
    const k = Math.random(), c = k < .55 ? c1 : k < .9 ? c2 : c3; col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({size: opt.psize ?? .07, map: tex, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending}));
  root.add(pts);
  // wire rings
  const wire = new THREE.Mesh(new THREE.TorusGeometry(R, r, 18, 90), new THREE.MeshBasicMaterial({color: PINK ? 0xff7ac8 : 0x0a5cff, wireframe: true, transparent: true, opacity: PINK ? .08 : .035}));
  wire.rotation.x = Math.PI / 2; root.add(wire);
  const core = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(Array.from({length: 1200}, () => (Math.random() - .5) * 1.6)), 3)),
    new THREE.PointsMaterial({size: .05, map: tex, color: PINK ? 0xffffff : 0x00e5ff, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending}));
  root.add(core);
  // nodes
  const MAXN = opt.maxNodes ?? 200;
  const ng = new THREE.BufferGeometry(), npos = new Float32Array(MAXN * 3), ncol = new Float32Array(MAXN * 3), nsz = new Float32Array(MAXN);
  ng.setAttribute('position', new THREE.BufferAttribute(npos, 3)); ng.setAttribute('color', new THREE.BufferAttribute(ncol, 3)); ng.setAttribute('size', new THREE.BufferAttribute(nsz, 1));
  const nmat = new THREE.ShaderMaterial({uniforms: {map: {value: tex}, t: {value: 0}, px: {value: renderer.getPixelRatio()}}, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float t; uniform float px; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); float s=size; if(size>1.5) s=size*(1.+.35*sin(t*4.+position.x*3.)); gl_PointSize=s*px*150./-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; varying vec3 vC; void main(){ vec4 c=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC*1.6,1.)*c; }`});
  const nodes = new THREE.Points(ng, nmat); root.add(nodes);
  const MAXL = MAXN * 3, lg = new THREE.BufferGeometry(), lpos = new Float32Array(MAXL * 6), lcol = new Float32Array(MAXL * 6);
  lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending})); root.add(lines);
  let labels = [], openPts = [];
  const labelBox = document.createElement('div'); labelBox.className = 'labels3d'; el.appendChild(labelBox);
  function setNodes(list) {
    list = list.slice(-MAXN); const P3 = [];
    list.forEach((n, i) => {
      const a = hash(n.id) * Math.PI * 2, b = hash(n.id + 'x') * Math.PI * 2, rr = n.s === 'open' ? r * 1.25 : r * (1.0 + hash(n.id + 'r') * .35);
      const p = [(R + rr * Math.cos(b)) * Math.cos(a), rr * Math.sin(b), (R + rr * Math.cos(b)) * Math.sin(a)];
      P3.push(p); npos.set(p, i * 3); const c = new THREE.Color(COL[n.s] ?? DEF); ncol.set([c.r, c.g, c.b], i * 3);
      nsz[i] = n.s === 'open' ? 3.6 : n.s === 'board' ? 1.0 : n.s === 'reject' ? .75 : .7;
    });
    ng.setDrawRange(0, list.length); ng.attributes.position.needsUpdate = ng.attributes.color.needsUpdate = ng.attributes.size.needsUpdate = true;
    // links: each node to its 2 nearest, open positions to 6 nearest
    let k = 0;
    for (let i = 0; i < list.length && k < MAXL; i++) {
      const d = P3.map((q, j) => [j, (q[0]-P3[i][0])**2 + (q[1]-P3[i][1])**2 + (q[2]-P3[i][2])**2]).filter(x => x[0] !== i).sort((a, b) => a[1] - b[1]);
      const m = list[i].s === 'open' ? 6 : 2;
      for (let z = 0; z < Math.min(m, d.length) && k < MAXL; z++) {
        const j = d[z][0]; if (d[z][1] > (list[i].s === 'open' ? 9 : 1.6)) continue;
        lpos.set(P3[i], k * 6); lpos.set(P3[j], k * 6 + 3);
        const c = new THREE.Color(COL[list[i].s] ?? DEF).multiplyScalar(.55), c2 = new THREE.Color(COL[list[j].s] ?? DEF).multiplyScalar(.55);
        lcol.set([c.r, c.g, c.b], k * 6); lcol.set([c2.r, c2.g, c2.b], k * 6 + 3); k++;
      }
    }
    lg.setDrawRange(0, k * 2); lg.attributes.position.needsUpdate = lg.attributes.color.needsUpdate = true;
    openPts = list.map((n, i) => n.s === 'open' ? {n, p: new THREE.Vector3(...P3[i])} : null).filter(Boolean);
    if (labelBox.childElementCount !== openPts.length) { labelBox.innerHTML = openPts.map(() => '<div class="l3"></div>').join(''); }
    labels = [...labelBox.children];
    openPts.forEach((o, i) => { labels[i].innerHTML = `${esc(o.n.sym)} <b class="${cls(o.n.pct)}">${sgn(o.n.pct, 1)}%</b>`; });
  }
  function resize() { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'; cam.aspect = w / h; cam.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(el); resize();
  const v = new THREE.Vector3(); let last = 0; const fpsCap = opt.fps ?? 40;
  function frame(t) {
    requestAnimationFrame(frame); if (document.hidden || t - last < 1000 / fpsCap) return; last = t;
    root.rotation.y = t * 0.00012; core.rotation.y = -t * 0.0004; pts.rotation.y = Math.sin(t * .0002) * .05; nmat.uniforms.t.value = t / 1000;
    renderer.render(scene, cam);
    const w = el.clientWidth, h = el.clientHeight;
    openPts.forEach((o, i) => { v.copy(o.p).applyMatrix4(root.matrixWorld).project(cam); const L = labels[i]; if (!L) return; L.style.transform = `translate(${(v.x * .5 + .5) * w + 10}px, ${(-v.y * .5 + .5) * h - 8}px)`; });
  }
  requestAnimationFrame(frame);
  return {setNodes};
}

export function splash(skip) {
  const el = document.getElementById('splash'); if (!el) return Promise.resolve();
  if (skip || sessionStorage.getItem('monee_boot')) { el.remove(); return Promise.resolve(); }
  const L = [PINK ? '> MONEE ♡ PUMP.FUN DESK v1.0 ✿' : '> MONEE // PUMP.FUN DESK v1.0', '> collegamento a ~/pumpbot (sola lettura) ... ok', '> caricamento state.json, trades.csv, decisions.jsonl ... ok',
    '> rete token 3D ... ok', '> System ready', PINK ? '> Access granted ✨♡' : '> Access granted ✔'];
  const log = document.getElementById('sp-log'), bar = el.querySelector('.sp-bar i'); let i = 0;
  return new Promise(res => {
    const t = setInterval(() => {
      log.textContent += L[i] + '\n'; bar.style.width = ((i + 1) / L.length * 100) + '%'; i++;
      if (i >= L.length) { clearInterval(t); setTimeout(() => { el.classList.add('off'); sessionStorage.setItem('monee_boot', '1'); setTimeout(() => el.remove(), 700); res(); }, 450); }
    }, 300);
  });
}
