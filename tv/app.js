// ThatC Life — Fire TV (10-foot UI). Pure web tech: runs in Silk, a Fire OS WebView app, or the Vega webview.
(() => {
  const H = new URLSearchParams(location.search).get('h') || 'demo';
  const API = (p) => `${p}${p.includes('?') ? '&' : '?'}h=${encodeURIComponent(H)}`;
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app'), voiceEl = $('#voice'), overlay = $('#overlay');
  let S = null, offset = 0, focusKey = null, lastMode = null, overlayOpen = false;

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nowMs = () => Date.now() + offset;
  const fmtClock = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
  const fmtShort = (min) => { min = Math.max(0, Math.round(min)); return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60 ? (min % 60) + 'm' : ''}`.trim(); };

  const act = (tool, args) => fetch(API('/api/action'), { method: 'POST', body: JSON.stringify({ tool, args }) }).then((r) => r.json());
  const demo = (p, body) => fetch(API(p), { method: 'POST', body: JSON.stringify(body || {}) });

  // ---------- rendering ----------
  function ring(a) {
    const C = 2 * Math.PI * 45; const frac = Math.max(0, Math.min(1, (S.deadline - nowMs()) / (S.deadline - S.createdAt)));
    return `<div class="ringbox"><svg class="ring" viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="45"/><circle class="fg" id="ringfg" cx="50" cy="50" r="45" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg>
      <div class="ringtxt"><div class="t" id="clock">${fmtClock(S.deadline - nowMs())}</div><div class="l">remaining</div></div></div>`;
  }
  function chips(a) {
    const paceCls = a.pace >= .95 ? 'good' : a.pace >= .7 ? 'warn' : 'bad';
    const buf = a.progress.bufferMin;
    return `<div class="chips">
      <div class="chip"><span>Work needed</span><b>${fmtShort(a.keptWork)}</b></div>
      <div class="chip ${paceCls}"><span>Pace</span><b>${Math.round(a.pace * 100)}%</b></div>
      <div class="chip ${buf < 0 ? 'bad' : buf < 10 ? 'warn' : 'good'}"><span>Buffer</span><b>${buf >= 0 ? '+' : '−'}${fmtShort(Math.abs(buf))}</b></div></div>`;
  }
  function stepsList(a, { onlyKept = false } = {}) {
    const byId = Object.fromEntries(a.plan.map((p) => [p.id, p]));
    const rows = S.session.steps.map((st) => {
      const p = byId[st.id]; if (onlyKept && p.status === 'deferred') return '';
      const mark = p.status === 'done' ? '✓' : p.status === 'current' ? '▶' : p.status === 'deferred' ? '⏸' : '';
      return `<button class="step ${p.status}" data-focus data-key="st-${st.id}" data-act="step:${st.id}"><span class="dot">${mark}</span><span class="tt">${esc(st.title)}</span><span class="m">${p.status === 'done' ? '' : p.est + 'm'}</span></button>`;
    }).join('');
    const parked = a.deferred.length ? `<div class="parked"><b>Parked — returns if time frees up</b>${a.deferred.map((d) => esc(d.title)).join(' · ')}</div>` : '';
    const banked = S.session.banked.length ? `<div class="banked"><b>✓ Carried forward:</b> ${S.session.banked.map((b) => esc(b.title)).join(' · ')}</div>` : '';
    return `<div class="steps"><h3>${onlyKept ? 'Trimmed plan' : 'Your plan'}</h3>${rows}${parked}${banked}</div>`;
  }
  function chart(a) {
    const s = S.session, p = a.progress, t0 = p.baselineT, t1 = S.deadline, W = 600, Hh = 110;
    const x = (t) => Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) * W;
    const y = (w) => Hh - (w / Math.max(1, p.baselineWork)) * (Hh - 8) - 4;
    let done = p.baselineWork; const pts = [[x(t0), y(done)]];
    s.steps.filter((st) => st.done && st.doneAt >= t0).sort((a1, b1) => a1.doneAt - b1.doneAt).forEach((st) => { pts.push([x(st.doneAt), y(done)]); done -= st.est; pts.push([x(st.doneAt), y(done)]); });
    pts.push([x(nowMs()), y(a.remainWork)]);
    const finX = x(t0 + (t1 - t0) * 0.7);
    return `<div class="card chart"><div class="cap"><span>Work remaining · plan vs reality</span><span>${a.pace >= .95 ? 'on plan' : a.pace >= .7 ? 'slightly behind' : 'behind plan'}</span></div>
      <svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none">
        <line x1="${x(t0)}" y1="${y(p.baselineWork)}" x2="${finX}" y2="${y(0)}" stroke="rgba(255,255,255,.35)" stroke-dasharray="5 5" stroke-width="2"/>
        <line x1="${W}" y1="0" x2="${W}" y2="${Hh}" stroke="#ff5a6e" stroke-width="2"/>
        <polyline points="${pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 4px var(--accent))"/>
        <circle cx="${x(nowMs())}" cy="${y(a.remainWork)}" r="6" fill="#fff"/>
      </svg></div>`;
  }

  function header(a) {
    return `<div class="top"><div class="logo"><b>T</b>ThatC Life</div>${S.session ? `<div class="goal">${esc(S.session.goal)}</div>${a?.planSource === 'ai' ? '<div class="ai">✦ Tailored by AI</div>' : ''}` : ''}<div class="spacer"></div>
      ${S.demoSkewMin ? `<div class="demo-chip">Demo clock +${S.demoSkewMin}m</div>` : ''}
      ${a ? `<div class="mode"><i></i><b>${a.label}</b><span>${esc(a.tagline)}</span></div>` : ''}</div>`;
  }
  function footer(a) {
    const tl = S.session?.timeline || [];
    return `<div class="foot"><div class="timeline">${tl.length ? '<em>Reassessed:</em>' : ''}${tl.slice(-5).map((t, i, arr) => `<span class="${i === arr.length - 1 ? 'now' : ''}">${esc(t.mode)}</span>`).join('<em>›</em>')}</div><div class="spacer"></div>
      <div class="keys"><span>◀ ▲ ▼ ▶</span> move <span>●</span> select <span>☰</span> demo clock</div></div>`;
  }

  function viewIdle() {
    return `${header(null)}<div class="stage idle"><div><div class="say">Say <em>"Alexa, ask ThatC Life to help me finish my presentation in two hours."</em></div>
      <div class="sub">Or pick one to start from the remote.</div>
      <div class="row" style="justify-content:center">
        <button class="btn primary" data-focus data-key="q1" data-act="start:presentation for the investor meeting:120">📊 Presentation · 2h</button>
        <button class="btn" data-focus data-key="q2" data-act="start:study for my chemistry exam:90">📚 Study · 90m</button>
        <button class="btn" data-focus data-key="q3" data-act="start:evening workout:45">🏋️ Workout · 45m</button>
      </div></div></div>${footer()}`;
  }

  function viewMain(a) {
    const m = a.message, c = a.current, d = a.style.density;
    if (d === 'celebrate') {
      return `${header(a)}<div class="stage celebrate"><div><div class="big">Done.</div><div class="explain">${esc(m.say)}</div></div>
        <div class="row" style="justify-content:center"><button class="btn primary" data-focus data-key="again" data-act="reset">Start something new</button></div></div>${footer(a)}`;
    }
    if (d === 'single') {
      const opts = m.options ? `<div class="row">${m.options.map((o, i) => `<button class="btn ${i ? '' : 'primary'}" data-focus data-key="o-${o.id}" data-act="opt:${o.id}">${esc(o.label)}</button>`).join('')}</div>` : `<div class="row"><button class="btn primary" data-focus data-key="done" data-act="done">✓ Done</button></div>`;
      return `${header(a)}<div class="stage solo">${ring(a)}<div><div class="eyebrow">${a.compressed ? 'Express mode · ' : ''}Right now</div><div class="headline">${esc(m.headline)}</div>
        <div class="sub">${m.question ? esc(m.say.split('. ').slice(0, 2).join('. ')) : `${a.essentialsLeft} essential step${a.essentialsLeft === 1 ? '' : 's'} left · ${c ? c.est : 0} min budget${a.brief?.points?.[0] ? ' · Key fact: ' + esc(a.brief.points[0]) : ''}`}</div>${opts}</div></div>${footer(a)}`;
    }
    let center;
    if (d === 'diagnostic' && m.options) {
      center = `<div class="card focus"><div class="eyebrow">Let's find the real problem</div><div class="headline">${esc(m.headline)}</div>
        <div class="explain">I won't assume anything. Which is closest?</div>
        <div class="opts">${m.options.map((o) => `<button class="opt" data-focus data-key="o-${o.id}" data-act="opt:${o.id}"><b>${esc(o.label)}</b><span>${esc(o.sub)}</span></button>`).join('')}</div></div>`;
    } else {
      const rich = d === 'full';
      const pts = a.brief?.points || [];
      const know = pts.length ? `<div class="know"><h4>Know this · sized for ${fmtShort(a.remainingMin)}</h4><ul class="bul">${pts.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>` : `<ul class="bul">${m.bullets.slice(0, 3).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
      center = `<div class="card focus"><div class="eyebrow">${esc(a.label)} · ${esc(a.tier.label)}${c?.overdue ? ' · <span class="due">⏰ time-box reached</span>' : ''}</div><div class="headline">${esc(m.headline)}</div>
        ${rich && c ? `<div class="explain">${esc(c.explain)}</div>` : ''}
        ${d === 'essentials' && m.bullets[0] ? `<div class="explain">${esc(m.bullets[0])}</div>` : ''}
        ${know}
        <div class="row"><button class="btn primary" data-focus data-key="done" data-act="done">✓ Done with this step</button>
        ${a.mode === 'flow' || a.mode === 'explore' ? `<button class="btn" data-focus data-key="stuck" data-act="opt:hard">I'm stuck</button>` : ''}</div></div>`;
    }
    return `${header(a)}<div class="stage"><div class="col">${ring(a)}${chips(a)}</div><div class="col">${center}${chart(a)}</div><div class="col">${stepsList(a, { onlyKept: d === 'essentials' })}</div></div>${footer(a)}`;
  }

  function render() {
    const a = S.assessment;
    const key = focusKey;
    document.documentElement.style.setProperty('--accent', a?.color || '#7c5cff');
    app.dataset.mode = a?.mode || 'idle'; app.dataset.density = a?.style.density || 'idle';
    app.innerHTML = S.session ? viewMain(a) : viewIdle();
    // restore focus
    const els = [...app.querySelectorAll('[data-focus]')];
    const el = els.find((e) => e.dataset.key === key) || els.find((e) => e.dataset.key === 'done') || els[0];
    setFocus(el);
    lastMode = a?.mode;
  }
  function setFocus(el) {
    app.querySelectorAll('.focused').forEach((e) => e.classList.remove('focused'));
    if (!el) return; el.classList.add('focused'); focusKey = el.dataset.key; el.scrollIntoView?.({ block: 'nearest' });
  }

  // ---------- notices: every change has its own sound; proactive ones also show what ThatC Life noticed ----------
  let lastNotice = undefined, bubbleTimer = null;
  function handleNotice(n) {
    if (lastNotice === undefined) { lastNotice = n?.id || null; return; } // first state after load: don't replay old events
    if (!n || n.id === lastNotice) return; lastNotice = n.id;
    window.ThatCSound?.play(n.sound);
    if (n.source === 'remote') return; // you pressed a button on the TV yourself — the sound is enough
    const label = n.source === 'auto' ? 'ThatC Life noticed' : 'Alexa+ · ThatC Life';
    voiceEl.innerHTML = `<div class="orb"></div><div><small class="${n.source === 'auto' ? 'auto' : ''}">${label}</small><p>${esc(n.say)}</p></div>`;
    voiceEl.classList.add('on'); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => voiceEl.classList.remove('on'), Math.min(15000, 5000 + n.say.length * 60));
    if (new URLSearchParams(location.search).get('voice') === '1' && n.source === 'auto' && 'speechSynthesis' in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(n.say)); }
  }
  setInterval(() => { const el = $('#snd'); if (el) el.hidden = !!window.ThatCSound?.isOn(); }, 1000);

  // ---------- state ----------
  function apply(state) {
    offset = state.now - Date.now();
    const modeChanged = (state.assessment?.mode) !== lastMode, hadSession = !!S?.session, has = !!state.session;
    const structural = !S || modeChanged || hadSession !== has || JSON.stringify(sig(state)) !== JSON.stringify(sig(S));
    S = state;
    if (!overlayOpen && structural) render();
    handleNotice(state.notice);
  }
  const sig = (st) => st.session ? [st.session.steps.map((x) => x.id + x.done + (x.est)), st.assessment.plan.map((p) => p.status + p.est), st.assessment.message.headline, st.assessment.brief?.points?.join('|'), st.assessment.current?.overdue, st.assessment.planSource, st.assessment.tier?.id, st.session.goal, st.session.timeline.length, st.demoSkewMin, Math.round(st.assessment.pace * 10), st.session.banked.length] : [null];

  function connect() {
    const es = new EventSource(API('/api/events'));
    es.onmessage = (e) => apply(JSON.parse(e.data));
    es.onerror = () => { es.close(); setTimeout(connect, 1500); };
  }
  setInterval(() => { // live countdown without re-rendering
    if (!S?.session || overlayOpen) return;
    const c = $('#clock'), f = $('#ringfg'); const rem = S.deadline - nowMs();
    if (c) c.textContent = fmtClock(rem);
    if (f) { const C = 2 * Math.PI * 45; f.setAttribute('stroke-dashoffset', C * (1 - Math.max(0, Math.min(1, rem / (S.deadline - S.createdAt))))); }
  }, 1000);

  // ---------- actions ----------
  async function run(a) {
    const [k, ...rest] = a.split(':');
    if (k === 'done') return act('complete_step', {});
    if (k === 'step') { const st = S.session.steps.find((x) => x.id === rest[0]); if (st && !st.done) return act('complete_step', { step: rest[0] }); return; }
    if (k === 'opt') {
      const id = rest[0];
      if (id === 'rescope') return act('change_goal', { new_goal: 'a short version of ' + S.session.goal, minutes_remaining: Math.max(5, Math.round(S.assessment.remainingMin)) });
      if (id === 'push') return act('get_guidance', {});
      return act('report_blocker', { reason: id });
    }
    if (k === 'start') return act('start_session', { goal: rest[0], minutes: Number(rest[1]) });
    if (k === 'reset') { await demo('/api/demo/reset'); return; }
    if (k === 'adv') return demo('/api/demo/advance', { minutes: Number(rest[0]) });
    if (k === 'time') return act('update_time', { minutes_remaining: Number(rest[0]) });
    if (k === 'close') return closeOverlay();
  }

  // ---------- D-pad / spatial navigation ----------
  function move(dir) {
    const scope = overlayOpen ? overlay : app;
    const els = [...scope.querySelectorAll('[data-focus]')]; const cur = scope.querySelector('.focused') || els[0]; if (!cur) return;
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bs = Infinity;
    for (const el of els) {
      if (el === cur) continue; const q = el.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2, dx = x - cx, dy = y - cy;
      const ok = dir === 'ArrowRight' ? dx > 4 : dir === 'ArrowLeft' ? dx < -4 : dir === 'ArrowDown' ? dy > 4 : dy < -4; if (!ok) continue;
      const major = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dx) : Math.abs(dy), minor = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx);
      const s = major + minor * 2.2; if (s < bs) { bs = s; best = el; }
    }
    setFocus(best || cur);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key.startsWith('Arrow')) { e.preventDefault(); move(e.key); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const el = (overlayOpen ? overlay : app).querySelector('.focused'); if (el) run(el.dataset.act); }
    else if (e.key === 'ContextMenu' || e.key === 'm' || e.key === 'd' || e.keyCode === 82) { e.preventDefault(); overlayOpen ? closeOverlay() : openOverlay(); }
    else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') { if (overlayOpen) { e.preventDefault(); closeOverlay(); } }
  });
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-focus]'); if (el) { setFocus(el); run(el.dataset.act); } });

  // ---------- demo clock overlay (labelled; used to show time passing in the video) ----------
  function openOverlay() {
    overlayOpen = true; overlay.hidden = false;
    overlay.innerHTML = `<div class="panel card"><h2>Demo clock</h2><p>Time-travel so a 3-minute video can show a 2-hour deadline. Real clients (Alexa+, remote) behave exactly as in live use.</p>
      <button class="btn" data-focus data-key="a1" data-act="adv:15">⏩ Fast-forward 15 minutes</button>
      <button class="btn" data-focus data-key="a2" data-act="adv:30">⏩ Fast-forward 30 minutes</button>
      <button class="btn" data-focus data-key="a3" data-act="time:25">⏱ "I only have 25 minutes now"</button>
      <button class="btn" data-focus data-key="a4" data-act="reset">↺ Reset everything</button>
      <button class="btn primary" data-focus data-key="a5" data-act="close">Close</button></div>`;
    setFocus(overlay.querySelector('[data-focus]'));
  }
  function closeOverlay() { overlayOpen = false; overlay.hidden = true; render(); }

  window.__tvBack = () => { if (overlayOpen) { closeOverlay(); return true; } return false; }; // Fire TV Back button hook (native shell)
  fetch(API('/api/state')).then((r) => r.json()).then(apply).finally(connect);
})();
