import {$, esc, sgn, cls, STAGE_IT, clockRome, dateRome, dur, shortReason, poll, drawEquity, drawHist, createTorus, splash} from './common.js';
splash(new URLSearchParams(location.search).has('nosplash'));
const T = createTorus($('#torus'), {particles: 11000, maxNodes: 200});
setInterval(() => { $('#clock').textContent = clockRome(); $('#date').textContent = dateRome() + ' · EUROPE/ROME'; }, 1000);
const err = document.createElement('div'); err.className = 'err'; document.body.appendChild(err);
let seenTrades = new Set(), lastNodes = '';
const f4 = v => v == null ? '—' : Number(v).toFixed(4);

poll((s, e) => {
  if (!s) { err.style.display = 'block'; err.textContent = 'CONNESSIONE PERSA · riprovo…'; return; }
  err.style.display = 'none';
  const now = s.ts, eur = s.eur_per_sol, p = s.pnl;
  $('#mode').textContent = s.mode; $('#mode').classList.toggle('live', s.mode === 'LIVE');
  $('#alive').innerHTML = s.running ? '<span class="up">● ATTIVO</span>' : '<span class="dn">● FERMO</span>';
  $('#uptime').textContent = s.started ? dur(now - s.started) : '—';
  $('#logage').innerHTML = `<span class="${s.log_age > 120 ? 'dn' : 'up'}">${dur(s.log_age)} fa</span>`;
  $('#hbeat').textContent = s.heartbeat ? s.heartbeat.slice(11, 19) : '—';
  if ($('#wallet')) { $('#wallet').textContent = s.wallet ? s.wallet.slice(0, 8) + '…' + s.wallet.slice(-6) : '—'; $('#wallet').title = s.wallet || ''; }
  $('#bal').textContent = s.balance_sol == null ? '—' : s.balance_sol.toFixed(4) + ' SOL';
  $('#equity').textContent = s.equity_sol == null ? '—' : s.equity_sol.toFixed(4) + ' SOL';
  $('#fx').textContent = `$${s.sol_usd ?? '—'} · €${eur.toFixed(2)}`;
  $('#life').textContent = s.life?.n ? `#${s.life.n} da ${s.life.started_iso?.slice(11, 16)}` : '—';
  // P&L
  $('#pnl-date').textContent = s.date;
  const big = $('#pnl-sol'); big.textContent = sgn(p.total, 4) + ' SOL'; big.className = 'big ' + cls(p.total);
  $('#pnl-eur').textContent = sgn(p.total * eur, 2) + ' €'; $('#pnl-eur').className = 'eur ' + cls(p.total);
  $('#real').innerHTML = `<span class="${cls(p.realized)}">${sgn(p.realized)}</span>`; $('#unreal').innerHTML = `<span class="${cls(p.unrealized)}">${sgn(p.unrealized)}</span>`;
  $('#pctb').innerHTML = `<span class="${cls(p.pct_budget)}">${sgn(p.pct_budget, 1)}%</span>`;
  $('#kill').innerHTML = p.halted ? '<span class="dn">ATTIVO</span>' : `<span class="up">NO</span> <small class="mut">(${s.rules.daily_stop ? '-' + s.rules.daily_max_loss + '%' : 'off'})</small>`;
  $('#ntr').textContent = p.trades; $('#wl').innerHTML = `<span class="up">${p.wins}</span> / <span class="dn">${p.losses}</span>`;
  const wr = p.wins + p.losses ? 100 * p.wins / (p.wins + p.losses) : null; $('#wr').textContent = wr == null ? '—' : wr.toFixed(1) + '%';
  $('#allt').innerHTML = `<span class="${cls(p.realized_all_time)}">${sgn(p.realized_all_time, 3)}</span>`;
  drawEquity($('#eq'), s.curve); drawHist($('#hist'), s.hist);
  // positions
  $('#npos').textContent = `${s.positions.length} / ${s.rules.max_open}`;
  $('#pos').innerHTML = s.positions.length ? s.positions.map(x => `<tr><td title="${esc(x.mint)}"><b class="yel">${esc(x.sym)}</b>${x.partial ? ' <small class="up">½TP</small>' : ''}<div class="bar"><i style="left:50%;width:${Math.min(50, Math.abs(x.pct) * 2)}%;${x.pct < 0 ? 'transform:translateX(-100%);' : ''}background:${x.pct >= 0 ? 'var(--g)' : 'var(--r)'}"></i></div></td>
    <td>${x.opened} <small class="mut">${x.age_min != null ? Math.round(x.age_min) + 'm' : ''}</small></td><td class="r">${f4(x.cost)}</td><td class="r">${f4(x.value)}</td>
    <td class="r ${cls(x.pct)}"><b>${sgn(x.pct, 1)}%</b></td><td class="r mut">${sgn(x.peak, 1)}%</td></tr>`).join('') : '<tr><td colspan=6 class="mut">nessuna posizione aperta</td></tr>';
  // trades feed
  $('#ntrades').textContent = `${s.feed.length} ultimi · oggi ${p.trades}`;
  $('#trades').innerHTML = s.feed.slice(0, 34).map(t => { const k = t.t + t.sym; const nw = seenTrades.size && !seenTrades.has(k);
    return `<tr class="${nw ? 'new' : ''}"><td class="mut">${t.t}</td><td>${esc(t.sym)}</td><td class="r ${cls(t.pnl)}">${sgn(t.pnl, 4)}</td><td class="r ${cls(t.pct)}"><b>${sgn(t.pct, 1)}%</b></td><td title="${esc(t.reason)}">${shortReason(t.reason)}</td></tr>`; }).join('');
  seenTrades = new Set(s.feed.map(t => t.t + t.sym));
  // strategies
  $('#strat').innerHTML = s.strategies.map(b => `<tr><td><b class="c">${b.bot}</b></td><td class="r">${b.closed}</td><td class="r ${b.wr >= 50 ? 'up' : 'dn'}">${b.wr ?? '—'}%</td>
    <td class="r ${cls(b.pnl)}">${sgn(b.pnl, 3)}</td><td class="r ${cls(b.avg)}">${sgn(b.avg, 1)}</td><td class="r">${b.today}${b.today_wr != null ? ` <small class="mut">${b.today_wr}%</small>` : ''}</td>
    <td>${b.active ? '<span class="up">● LIVE</span>' : `<span class="mut">○ fermo ${b.last.slice(11)}</span>`}</td></tr>`).join('');
  $('#board').innerHTML = s.board.slice(0, 8).map(b => `<tr><td>${esc(b.sym)}</td><td class="r up">${b.score}</td><td class="mut">${esc(b.conf)}</td><td class="${b.rug === 'VERDE' ? 'up' : 'dn'}">${b.rug}</td><td class="r mut">${b.age}m</td></tr>`).join('');
  const R = s.rules;
  $('#rules').innerHTML = [['Piano', R.plan], ['Modo attivo', R.active_mode], ['Budget', R.budget_sol + ' SOL'], ['Size trade', `${R.size_pct}% ≈ ${R.size_sol} SOL`],
    ['Take profit', '+' + R.tp + '%'], ['Stop loss', '-' + R.sl + '%'], ['TP parziale', R.tp_partial + '% venduto'], ['Trailing runner', R.trail + '% dal picco'],
    ['Max aperte', R.max_open], ['Max hold', R.max_hold + ' min'], ['Quick-fail', R.quick_fail + ' min'], ['Cooldown token', R.cooldown + ' min'],
    ['Slippage B/S', R.slip_buy + '% / ' + R.slip_sell + '%'], ['Rugcheck', R.require_verde ? 'solo VERDE' : 'off'],
    ['Stop giornaliero', R.daily_stop ? '-' + R.daily_max_loss + '%' : 'disattivo'], ['Modalità', s.mode]].map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('');
  // funnel
  const F = s.funnel, mx = Math.max(1, F.valutati);
  $('#fun-tot').textContent = Object.entries(F.decisions).map(([k, v]) => `${k} ${v}`).join(' · ');
  $('#funnel').innerHTML = `<div class="fn in"><span>VALUTATI</span><div class="bx"><i style="width:100%"></i></div><span class="n">${F.valutati}</span></div>` +
    F.stages.map(([k, v]) => `<div class="fn"><span>✕ ${STAGE_IT[k] || k}</span><div class="bx"><i style="width:${Math.min(100, 100 * v / mx)}%"></i></div><span class="n dn">${v}</span></div>`).join('') +
    `<div class="fn ok"><span>✓ BOARD</span><div class="bx"><i style="width:${100 * F.board / mx}%"></i></div><span class="n up">${F.board}</span></div>` +
    `<div class="fn ok"><span>★ BUY</span><div class="bx"><i style="width:${Math.min(100, 100 * F.buy / mx)}%;background:var(--y);box-shadow:0 0 8px var(--y)"></i></div><span class="n yel">${F.buy}</span></div>`;
  $('#topreasons').innerHTML = F.top_reasons.map(([k, v]) => { const [st, why] = k.split('|'); return `<div class="tr2"><span><b class="dn">${STAGE_IT[st] || st}</b> ${esc(why)}</span><b>${v}</b></div>`; }).join('') +
    `<div class="tr2"><span class="mut">rugcheck verdetti</span><b>${Object.entries(F.rug).map(([k, v]) => `<span class="${k === 'VERDE' ? 'up' : 'dn'}">${k} ${v}</span>`).join(' ')}</b></div>`;
  $('#dec').innerHTML = s.decisions.slice(0, 13).map(d => `<div><span class="mut">${d.t}</span><span class="tag ${d.d === 'BOARD' ? 'up' : 'dn'}">${d.d}</span><span>${STAGE_IT[d.stage] || d.stage} · ${esc(d.sym)}</span><span>${esc(d.why)}</span></div>`).join('');
  // overlays
  $('#o-eval').textContent = F.valutati; $('#o-board').textContent = F.board; $('#o-buy').textContent = `${s.buys_today} buy · ${s.sells_today} sell`;
  const sc = s.scanner; $('#scan').innerHTML = [['nuovi token', sc.new_tokens], ['migrazioni', sc.migrations], ['trending', sc.trending], ['volume hits', sc.volume_hits], ['in attesa', sc.pending], ['board', sc.board], ['PumpPortal WS', sc.pp_ws]].map(([k, v]) => `<div class="kv"><span>${k}</span><b style="font-size:10px;margin:0;display:inline">${v ?? '—'}</b></div>`).join('');
  $('#reasons').innerHTML = s.reasons.map(([k, v]) => `<div class="kv"><span>${k}</span><b style="font-size:10px;margin:0;display:inline" class="${k === 'take profit' ? 'up' : k === 'stop loss' ? 'dn' : ''}">${v}</b></div>`).join('');
  $('#rpc').innerHTML = [['chiamate', s.rpc.calls], ['errori', s.rpc.errors], ['429', s.rpc['429']], ['fallback', s.rpc.fallback]].map(([k, v]) => `<div class="kv"><span>${k}</span><b style="font-size:10px;margin:0;display:inline">${v ?? '—'}</b></div>`).join('');
  const nk = s.nodes.map(n => n.id + n.s + (n.pct ?? '')).join(); if (nk !== lastNodes) { lastNodes = nk; T.setNodes(s.nodes); }
  const tape = s.decisions.slice(0, 18).map(d => `<span><b class="${d.d === 'BOARD' ? 'up' : 'dn'}">${d.d === 'BOARD' ? '▲' : '▼'} ${esc(d.sym)}</b> <span class="mut">${STAGE_IT[d.stage] || d.stage}</span></span>`).join('') +
    s.feed.slice(0, 10).map(t => `<span><b class="${cls(t.pct)}">${esc(t.sym)} ${sgn(t.pct, 1)}%</b> <span class="mut">${shortReason(t.reason)}</span></span>`).join('');
  if (!$('#tape').dataset.set || Date.now() - $('#tape').dataset.set > 90000) { $('#tape').innerHTML = tape; $('#tape').dataset.set = Date.now(); }
  $('#logline').textContent = s.log.length ? s.log[s.log.length - 1] : '';
}, 30000);
