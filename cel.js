import {$, esc, sgn, cls, STAGE_IT, clockRome, dur, shortReason, poll, drawEquity, drawHist, createTorus, splash} from './common.js';
localStorage.removeItem('monee_view');
splash(new URLSearchParams(location.search).has('nosplash'));
const T = createTorus($('#torus'), {particles: 2600, maxNodes: 70, dpr: 1.5, fps: 30, psize: .06});
setInterval(() => $('#clock').textContent = clockRome(), 1000);
const pager = $('#pager'), btns = [...document.querySelectorAll('nav button')];
btns.forEach(b => b.onclick = () => pager.scrollTo({left: pager.clientWidth * +b.dataset.i, behavior: 'smooth'}));
const pages = [...document.querySelectorAll('.page')];
const fitH = () => { const i = Math.round(pager.scrollLeft / pager.clientWidth); btns.forEach((b, j) => b.classList.toggle('on', i === j)); pager.style.height = pages[i].scrollHeight + 'px'; };
pager.addEventListener('scroll', fitH, {passive: true}); window.addEventListener('resize', fitH);
const err = document.createElement('div'); err.className = 'err'; document.body.appendChild(err);
let lastNodes = '';
const f4 = v => v == null ? '—' : Number(v).toFixed(4);
const bar = p => `<div class="bar"><i style="left:50%;width:${Math.min(50, Math.abs(p) * 2)}%;${p < 0 ? 'transform:translateX(-100%);' : ''}background:${p >= 0 ? 'var(--g)' : 'var(--r)'}"></i></div>`;
poll(s => {
  if (!s) { err.style.display = 'block'; err.textContent = 'Connessione persa · riprovo…'; return; }
  err.style.display = 'none'; const p = s.pnl, eur = s.eur_per_sol, today = s.pnl_today || {}, life = s.life || {};
  $('#mode').textContent = s.mode; $('#mode').classList.toggle('live', s.mode === 'LIVE');
  const lab = $('#pnl-label'); if (lab) lab.textContent = life.n ? `P&L VITA #${life.n}` : 'P&L VITA';
  $('#pnl-sol').textContent = sgn(p.total, 4) + ' SOL'; $('#pnl-sol').className = 'big ' + cls(p.total);
  $('#pnl-eur').textContent = sgn(p.total * eur, 2) + ' €'; $('#pnl-eur').className = 'eur ' + cls(p.total);
  const elToday = $('#pnl-today');
  if (elToday) {
    if (today.total == null) elToday.textContent = '';
    else elToday.innerHTML = `oggi <b class="${cls(today.total)}">${sgn(today.total, 4)} SOL</b> · ${today.trades ?? 0} trade`;
  }
  $('#c-pct').innerHTML = `<span class="${cls(p.pct_budget)}">${sgn(p.pct_budget, 1)}%</span> da inizio vita`;
  $('#c-wl').innerHTML = `${p.trades} trade · <span class="up">${p.wins}V</span> <span class="dn">${p.losses}P</span>`;
  $('#c-alive').innerHTML = s.running ? `<span class="up">● attivo</span> · log ${dur(s.log_age)} fa` : '<span class="dn">● fermo</span>';
  $('#real').innerHTML = `<span class="${cls(p.realized)}">${sgn(p.realized)}</span>`; $('#unreal').innerHTML = `<span class="${cls(p.unrealized)}">${sgn(p.unrealized)}</span>`;
  $('#equity').textContent = s.equity_sol == null ? '—' : s.equity_sol.toFixed(3) + ' SOL';
  $('#kill').innerHTML = p.halted ? '<span class="dn">ATTIVO</span>' : '<span class="up">NO</span>';
  $('#npos').textContent = `${s.positions.length} / ${s.rules.max_open}`;
  $('#pos').innerHTML = s.positions.length ? s.positions.map(x => `<div class="item pos"><div class="sym">${esc(x.sym)}${x.partial ? ' <small class="up">½TP</small>' : ''}</div><div class="pct ${cls(x.pct)}">${sgn(x.pct, 1)}%</div>
    <div class="sub">${x.opened} · ${Math.round(x.age_min || 0)} min · picco ${sgn(x.peak, 1)}%</div><div class="sub2">${f4(x.cost)} → ${f4(x.value)}</div>${bar(x.pct)}</div>`).join('') : '<div class="empty">Nessuna posizione aperta</div>';
  drawEquity($('#eq'), s.curve); drawHist($('#hist'), s.hist);
  $('#ntr').textContent = `vita ${p.trades}` + (today.trades != null ? ` · oggi ${today.trades}` : '');
  $('#trades').innerHTML = s.feed.slice(0, 40).map(t => `<div class="item ${t.pnl >= 0 ? 'win' : 'loss'}"><div class="sym">${esc(t.sym)}</div><div class="pct ${cls(t.pct)}">${sgn(t.pct, 1)}%</div>
    <div class="sub">${t.t} · ${shortReason(t.reason)}</div><div class="sub2 ${cls(t.pnl)}">${sgn(t.pnl, 4)} SOL</div></div>`).join('') || '<div class="empty">Nessun trade in questa vita</div>';
  const F = s.funnel, mx = Math.max(1, F.valutati);
  $('#funnel').innerHTML = `<div class="fn in"><span>Valutati</span><div class="bx"><i style="width:100%"></i></div><span class="n">${F.valutati}</span></div>` +
    F.stages.filter(([, v]) => v).map(([k, v]) => `<div class="fn"><span>✕ ${STAGE_IT[k] || k}</span><div class="bx"><i style="width:${Math.min(100, 100 * v / mx)}%"></i></div><span class="n dn">${v}</span></div>`).join('') +
    `<div class="fn ok"><span>✓ Board</span><div class="bx"><i style="width:${100 * F.board / mx}%"></i></div><span class="n up">${F.board}</span></div>` +
    `<div class="fn ok"><span>★ Buy</span><div class="bx"><i style="width:${Math.min(100, 100 * F.buy / mx)}%;background:var(--y)"></i></div><span class="n yel">${F.buy}</span></div>`;
  $('#dec').innerHTML = s.decisions.slice(0, 25).map(d => `<div class="dec"><div class="h"><b class="${d.d === 'BOARD' ? 'up' : 'dn'}">${d.d === 'BOARD' ? '▲' : '▼'} ${esc(d.sym)}</b><span class="mut">${STAGE_IT[d.stage] || d.stage}</span><small>${d.t}</small></div><p>${esc(d.why)}</p></div>`).join('');
  $('#strat').innerHTML = s.strategies.map(b => `<div class="card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><b style="font-size:20px;color:var(--c)">Bot ${b.bot}</b>${b.active ? '<span class="up">● live</span>' : `<span class="mut">○ fermo dalle ${b.last.slice(11)}</span>`}</div>
    <div class="st"><div>Win rate<b class="${b.wr >= 50 ? 'up' : 'dn'}">${b.wr ?? '—'}%</b></div><div>P&L SOL<b class="${cls(b.pnl)}">${sgn(b.pnl, 3)}</b></div><div>Chiusi<b>${b.closed}</b></div>
    <div>Media<b class="${cls(b.avg)}">${sgn(b.avg, 1)}%</b></div><div>Oggi<b>${b.today}</b></div><div>Win oggi<b>${b.today_wr ?? '—'}%</b></div></div></div>`).join('');
  const R = s.rules;
  $('#rules').innerHTML = [['Piano', R.plan], ['Budget', R.budget_sol + ' SOL'], ['Size trade', `${R.size_pct}% ≈ ${R.size_sol} SOL`], ['Take profit', '+' + R.tp + '%'], ['Stop loss', '-' + R.sl + '%'],
    ['Max aperte', R.max_open], ['Max hold', R.max_hold + ' min'], ['Trailing', R.trail + '%'], ['Rugcheck', R.require_verde ? 'solo VERDE' : 'off'], ['Stop giornaliero', R.daily_stop ? '-' + R.daily_max_loss + '%' : 'disattivo']]
    .map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('');
  $('#sys').innerHTML = [['Modalità', s.mode], ['Stato', s.running ? 'attivo' : 'fermo'], ['Uptime', s.started ? dur(s.ts - s.started) : '—'], ['Heartbeat', s.heartbeat?.slice(11, 19)],
    ['Saldo on-chain', s.balance_sol == null ? '—' : s.balance_sol.toFixed(4) + ' SOL'], ['EUR/SOL', eur.toFixed(2)], ['SOL/USD', s.sol_usd]]
    .map(([k, v]) => `<div><span>${k}</span><b>${esc(v ?? '—')}</b></div>`).join('');
  fitH(); const nodes = s.nodes.slice(-70), nk = nodes.map(n => n.id + n.s + (n.pct ?? '')).join(); if (nk !== lastNodes) { lastNodes = nk; T.setNodes(nodes); }
}, 30000);
