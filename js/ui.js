/* Voxelstad — HUD, dialogue, menus and the minimap */
(function () {
  const UI = (G.UI = {}), $ = (id) => document.getElementById(id), W = G.World;
  G.modals = 0;
  const openModal = () => { G.modals++; if (document.pointerLockElement) document.exitPointerLock(); };
  const closeModal = () => { G.modals = Math.max(0, G.modals - 1); G.modalClosedAt = performance.now(); };

  G.CAST = {
    hanneke: { name: 'Hanneke Brouwer', role: 'Municipal secretary' }, joris: { name: 'Joris', role: 'IT department. All of it.' },
    fatima: { name: 'Fatima', role: 'Civil affairs counter' }, bram: { name: 'Bram', role: 'Public works' },
    sterling: { name: 'Victor Sterling', role: 'Monolith Systems' }, dewit: { name: 'Mevrouw De Wit', role: 'Westkade 12' },
    ines: { name: 'Ines Vermeer', role: 'Mayor of Dijkveen' }, mayor: { name: 'You', role: 'Mayor of Voxelstad' },
  };
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  function portrait(who) {
    const o = G.LOOKS[who] || G.LOOKS.mayor, p = $('portrait'); p.style.background = hex(o.top);
    const px = (c, l, t, w, h) => `<i style="background:${hex(c)};left:${l}%;top:${t}%;width:${w}%;height:${h}%"></i>`;
    p.innerHTML = px(o.skin, 22, 22, 56, 56) + px(o.hair, 18, 10, 64, o.scarf ? 30 : 20) + (o.scarf ? px(o.hair, 14, 30, 12, 50) + px(o.hair, 74, 30, 12, 50) : '') +
      (o.shades ? px(0x0b0d10, 22, 42, 56, 12) : px(0x1a1a1a, 32, 44, 10, 10) + px(0x1a1a1a, 58, 44, 10, 10)) + px(0x7a3b30, 40, 64, 20, 5) + (o.chain ? px(0xf2c230, 30, 86, 40, 8) : '') + (o.cap ? px(o.hair, 12, 16, 76, 8) : '');
  }

  /* ---------- dialogue ---------- */
  let dlg = null;
  function showLine(who, text, options) {
    return new Promise((resolve) => {
      openModal(); const c = G.CAST[who] || { name: who, role: '' };
      $('dialogue').hidden = false; portrait(who);
      $('dlg-who').innerHTML = `${c.name}<small>${c.role}</small>`; $('dlg-who').style.color = who === 'sterling' ? '#fff' : hex((G.LOOKS[who] || G.LOOKS.mayor).top === 0x1c2f5a ? 0xa4c0fa : (G.LOOKS[who] || {}).top || 0xffffff);
      $('dlg-choices').innerHTML = ''; $('dlg-next').hidden = true;
      dlg = { text, shown: 0, done: false, options, resolve, t: 0, blip: 0 };
      $('dlg-text').textContent = '';
    });
  }
  function finishLine() {
    dlg.done = true; $('dlg-text').textContent = dlg.text;
    if (dlg.options) {
      $('dlg-choices').innerHTML = dlg.options.map((o, i) => `<button data-i="${i}"><kbd>${i + 1}</kbd><span>${o.t}</span>${o.note ? `<small>${o.note}</small>` : ''}</button>`).join('');
    } else $('dlg-next').hidden = false;
  }
  function advance(choice) {
    if (!dlg) return;
    if (!dlg.done) { finishLine(); return; }
    if (dlg.options && (choice === undefined || !dlg.options[choice])) return;
    const d = dlg; dlg = null; $('dialogue').hidden = true; closeModal(); G.Audio.sfx('ui'); d.resolve(choice);
  }
  UI.tickDialogue = function (dt) {
    if (!dlg || dlg.done) return;
    dlg.t += dt * 55; const n = Math.floor(dlg.t);
    if (n > dlg.shown) { dlg.shown = n; $('dlg-text').textContent = dlg.text.slice(0, n); if (--dlg.blip <= 0) { G.Audio.sfx('talk'); dlg.blip = 3; } if (n >= dlg.text.length) finishLine(); }
  };
  UI.say = (who, text) => showLine(who, text);
  UI.choose = (who, text, options) => showLine(who, text, options);
  UI.dialogueOpen = () => !!dlg;
  $('dialogue').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) advance(+b.dataset.i); else advance(); });
  window.addEventListener('keydown', (e) => {
    if (!dlg) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); advance(); }
    else if (/^Digit[1-9]$/.test(e.code)) advance(+e.code.slice(5) - 1);
  });

  /* ---------- cards (chapter titles, intro) ---------- */
  UI.card = function (eyebrow, title, text, btn = 'Continue') {
    return new Promise((res) => {
      openModal(); $('card').hidden = false; $('card-eyebrow').textContent = eyebrow; $('card-title').textContent = title; $('card-text').textContent = text; $('card-btn').textContent = btn;
      const done = () => { $('card').hidden = true; closeModal(); window.removeEventListener('keydown', key); G.Audio.sfx('ui'); res(); };
      const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); done(); } };
      $('card-btn').onclick = done; setTimeout(() => window.addEventListener('keydown', key), 250); $('card-btn').focus();
    });
  };

  /* ---------- toasts, pops, objective, prompt ---------- */
  UI.toast = function (html, kind = '') { const d = document.createElement('div'); d.className = 'toast ' + kind; d.innerHTML = html; $('toasts').appendChild(d); while ($('toasts').children.length > 3) $('toasts').firstChild.remove(); setTimeout(() => d.remove(), 4600); };
  const v3 = new THREE.Vector3();
  UI.pop = function (text, pos, kind = 'good') {
    v3.set(pos.x, pos.y === undefined ? 2.4 : pos.y, pos.z).project(G.camera); if (v3.z > 1) return;
    const d = document.createElement('div'); d.className = 'pop ' + kind; d.textContent = text;
    d.style.left = ((v3.x + 1) / 2) * innerWidth + 'px'; d.style.top = ((1 - v3.y) / 2) * innerHeight + 'px'; $('pops').appendChild(d); setTimeout(() => d.remove(), 1400);
  };
  let objPos = null;
  UI.setObjective = function (text, pos) { objPos = pos || null; $('objective').hidden = !text; $('obj-text').textContent = text || ''; G.objectivePos = objPos; };
  UI.prompt = function (label, progress, blocked) {
    const p = $('prompt'); p.hidden = !label; if (!label) return;
    $('prompt-text').textContent = label; p.classList.toggle('blocked', !!blocked); $('prompt-bar').style.width = (progress || 0) * 100 + '%';
  };
  UI.bump = (id) => { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); };

  /* ---------- per-frame HUD ---------- */
  let last = {};
  const set = (id, v, prop = 'textContent') => { if (last[id + prop] !== v) { last[id + prop] = v; $(id)[prop] = v; } };
  UI.showHUD = (on) => { $('hud').hidden = !on; };
  UI.update = function () {
    const S = G.S; if (!S) return;
    set('daychip', S.phase === 'night' ? 'Night 4' : 'Day ' + S.day);
    const f = S.dayLen ? G.clamp(S.time / S.dayLen, 0, 1) : 0;
    let clock = '—', phase = '';
    if (S.phase === 'day') { const mins = 540 + f * 480; clock = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(Math.floor(mins % 60 / 5) * 5).padStart(2, '0'); phase = S.clock ? 'Service hours' : 'Before opening'; }
    else if (S.phase === 'evening') { clock = '18:30'; phase = 'Evening'; }
    else if (S.phase === 'night') { const m = 14 + Math.floor((S.night ? S.night.t : 0) / 4); clock = '02:' + String(Math.min(59, m)).padStart(2, '0'); phase = 'Under attack'; }
    set('clock', clock); set('phase', phase); $('daybar').firstElementChild.style.width = (S.phase === 'day' ? f * 100 : S.phase === 'evening' ? 100 : 0) + '%';
    set('s-budget', G.eur(S.budget)); $('s-budget').classList.toggle('neg', S.budget < 0);
    set('s-trust', String(Math.round(S.trust))); $('m-trust').style.width = S.trust + '%';
    const sov = G.Game.sovereignty(); set('s-sov', String(sov)); $('m-sov').style.width = sov + '%';
    set('s-score', String(Math.round(S.score)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
    set('s-streak', S.streak >= 2 ? `streak ×${(1 + Math.min(S.streak, 10) * 0.1).toFixed(1)}` : '');
    // open requests
    const rows = [];
    const jobs = S.jobs.filter((j) => !j.hidden).sort((a, b) => a.pat / a.max - b.pat / b.max);
    for (const j of jobs.slice(0, 6)) {
      const fr = j.pat / j.max, st = j.steps[j.i];
      let sub = !j.ready ? 'On the way…' : j.type === 'doc' && !j.atWindow ? 'Waiting in the queue' : st.wait ? `${st.label} ${Math.ceil(st.t)}s` : st.label;
      rows.push(`<div class="job ${fr < 0.25 ? 'crit' : fr < 0.5 ? 'warn' : ''}" style="--c:${G.TYPE[j.type].c}"><span class="n">${j.title}</span><span class="m">${Math.ceil(j.pat)}s</span><span class="s">${sub}</span><div class="bar"><i style="width:${Math.round(fr * 50) * 2}%"></i></div></div>`);
    }
    if (jobs.length > 6) rows.push(`<div class="job more">+${jobs.length - 6} more waiting</div>`);
    const over = S.bins.filter((b) => b.fill >= 1).length;
    if (over && S.phase === 'day') rows.push(`<div class="job crit" style="--c:${G.TYPE.waste.c}"><span class="n">${over} bin${over > 1 ? 's' : ''} overflowing</span><span class="m"></span><span class="s">Empty them: by hand or with the truck</span></div>`);
    if (S.phase === 'night' && S.night) for (const id in S.night.nodes) { const n = S.night.nodes[id]; if (n.state === 'infected') rows.push(`<div class="job crit" style="--c:#e03535"><span class="n">${W.LOC.nodes[id].name} infected</span><span class="m">${Math.ceil(n.t)}s</span><span class="s">Pull the uplink before it encrypts</span><div class="bar"><i style="width:${Math.round((n.t / n.max) * 50) * 2}%"></i></div></div>`); }
    if (S.phase === 'night' && S.night && !S.night.done && S.night.waves.length) rows.push(`<div class="job more">Next attack wave in ${Math.max(0, Math.ceil(S.night.waves[0][0] - S.night.t))}s · ${S.night.waves.length} to come</div>`);
    set('jobs', rows.join(''), 'innerHTML');
    set('inv', S.inv.map((it) => `<span class="item"><i style="background:${G.ITEM_CSS[it.type]}"></i>${G.ITEMS[it.type]}</span>`).join('') + (S.inTruck ? `<span class="item"><i style="background:#3fb46f"></i>Truck load ${Math.round(S.truck.load * 10) / 10} / 10</span>` : ''), 'innerHTML');
    if (objPos) set('obj-dist', Math.round(G.dist(objPos, G.player)) + ' m'); else set('obj-dist', '');
    const st = $('stamina'); st.classList.toggle('show', G.player.stamina < 0.99); st.firstElementChild.style.width = G.player.stamina * 100 + '%';
    drawMap();
  };

  /* ---------- minimap ---------- */
  let mapBase = null; const MS = 360, R = 58, k = MS / (R * 2), mx = (x) => (x + R) * k, mz = (z) => (z + R) * k;
  function buildMapBase() {
    mapBase = document.createElement('canvas'); mapBase.width = mapBase.height = MS; const c = mapBase.getContext('2d');
    c.fillStyle = '#3d5c3a'; c.fillRect(0, 0, MS, MS);
    c.fillStyle = '#2d6a8c'; c.fillRect(mx(-34), 0, 5 * k, MS);
    c.strokeStyle = '#565d68'; c.lineWidth = 5 * k; c.lineCap = 'butt';
    for (const [a, b] of W.roadEdges) { c.beginPath(); c.moveTo(mx(W.graph.n[a][0]), mz(W.graph.n[a][1])); c.lineTo(mx(W.graph.n[b][0]), mz(W.graph.n[b][1])); c.stroke(); }
    c.fillStyle = '#565d68'; c.fillRect(mx(24), mz(-2.5), 8 * k, 5 * k);
    c.fillStyle = '#8f897c'; c.fillRect(mx(-14), mz(-11), 28 * k, 22 * k); c.fillRect(mx(-39.5), mz(-26), 3 * k, 48 * k);
    c.fillStyle = '#1b2230'; for (const b of W.colliders) if (b.h >= 4 && !b.feat) c.fillRect(mx(b.x0), mz(b.z0), (b.x1 - b.x0) * k, (b.z1 - b.z0) * k);
    c.font = '700 15px Arial'; c.textAlign = 'center'; c.fillStyle = '#f2c230';
    [['HALL', 0, -16], ['ARCHIVE', -3, 18.5], ['PLAN', 32, -19], ['SOCIAL', -11, 33], ['DEPOT', 42.5, -3.5], ['LAB', 16, -16.5]].forEach(([t, x, z]) => c.fillText(t, mx(x), mz(z) + 5));
  }
  function drawMap() {
    const S = G.S, cv = $('minimap'); if (!cv || !W.colliders.length) return; if (!mapBase) buildMapBase();
    const c = cv.getContext('2d'); c.drawImage(mapBase, 0, 0);
    const dot = (p, col, r = 6, ring) => { c.beginPath(); c.arc(mx(p.x), mz(p.z), r, 0, 7); if (ring) { c.strokeStyle = col; c.lineWidth = 3; c.stroke(); } else { c.fillStyle = col; c.fill(); c.strokeStyle = '#0b1019'; c.lineWidth = 2; c.stroke(); } };
    const sensors = G.Game.has('smartbins');
    for (const b of S.bins) if (S.phase === 'day' && (b.fill >= 1 || sensors && b.fill > 0.5 || b.seen && b.fill > 0.6)) dot(b, b.fill >= 1 ? '#e05555' : '#3fb46f', 4.5);
    for (const j of S.jobs) if (!j.hidden && j.ready) { const st = j.steps[j.i]; dot(st.at || j.pos, G.TYPE[j.type].c, j.i > 0 ? 7.5 : 6); }
    if (S.phase === 'evening') for (const t of S.talks) if (!t.done) dot(t.pos, '#f2c230', 6);
    if (S.phase === 'night' && S.night) for (const id in S.night.nodes) { const n = S.night.nodes[id], p = W.LOC[W.LOC.nodes[id].at]; dot(p, { clean: '#54e0ff', infected: '#ff3b3b', isolated: '#4da3ff', encrypted: '#5d6a7e' }[n.state], n.state === 'infected' ? 9 + Math.sin(performance.now() / 120) * 2 : 6); }
    if (S.truck && !S.inTruck) { c.fillStyle = '#eaffef'; c.fillRect(mx(S.truck.x) - 5, mz(S.truck.z) - 5, 10, 10); c.strokeStyle = '#0b1019'; c.lineWidth = 2; c.strokeRect(mx(S.truck.x) - 5, mz(S.truck.z) - 5, 10, 10); }
    if (S.bot && S.bot.g.visible) dot(S.bot, '#64ff9a', 3.5);
    if (objPos) dot(objPos, '#f2c230', 11 + Math.sin(performance.now() / 200) * 2, true);
    const p = G.player; c.save(); c.translate(mx(p.x), mz(p.z)); c.rotate(-p.yaw + Math.PI); c.fillStyle = '#fff'; c.strokeStyle = '#0b1019'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 9); c.lineTo(0, 4); c.lineTo(-8, 9); c.closePath(); c.fill(); c.stroke(); c.restore();
  }

  /* ---------- the Lab terminal ---------- */
  UI.openLab = function () {
    return new Promise((res) => {
      openModal(); const el = $('lab'); el.hidden = false; G.S.labOpened = true;
      const render = () => {
        const S = G.S, Gm = G.Game, fees = Gm.monoFees();
        el.innerHTML = `<div class="sheet"><div class="lab-head"><div><div class="eyebrow">The Lab · investment terminal</div><h2>What should the town build next?</h2>
          <p class="sub">Every system you fund takes a chore off your hands tomorrow. Open builds belong to the town. ${S.flags.metSterling ? 'Monolith products are cheaper today and billed every day after.' : ''} ${S.flags.commons ? 'Commons membership: open builds cost 25% less.' : ''} ${S.flags.exclusive ? 'Exclusive contract: open builds are locked by clause seven.' : ''}</p></div>
          <div class="lab-nums"><div><span>Budget</span><b>${G.eur(S.budget)}</b></div><div><span>Sovereignty</span><b>${Gm.sovereignty()}</b></div><div><span>Subscriptions</span><b class="${fees ? 'negc' : ''}">${fees ? G.eur(fees) + '/day' : 'none'}</b></div></div></div>
          <div class="ups">${G.UP.map((u) => {
            const fl = S.own[u.id], po = Gm.priceOpen(u);
            let state = '', buy = '';
            if (fl === 'open') state = `<div class="state">Live · owned by the town</div>`;
            else if (fl === 'mono') { state = `<div class="state">Live · ${u.monoName} · ${G.eur(u.mono[1] * S.feeMult)}/day</div>`; if (u.sov && !S.flags.exclusive) buy = `<button class="btn small" data-buy="${u.id}" data-fl="open" ${S.budget < po ? 'disabled' : ''}>Migrate to open build<small>${G.eur(po)} once, then free</small></button>`; }
            else {
              buy = `<button class="btn small primary" data-buy="${u.id}" data-fl="open" ${S.budget < po || (S.flags.exclusive && u.mono) ? 'disabled' : ''}>${u.mono ? 'Fund open build' : 'Fund it'}<small>${S.flags.exclusive && u.mono ? 'locked by contract' : G.eur(po) + ' once'}</small></button>`;
              if (u.mono && S.flags.metSterling) buy += `<button class="btn small mono" data-buy="${u.id}" data-fl="mono" ${S.budget < u.mono[0] ? 'disabled' : ''}>${u.monoName}<small>${G.eur(u.mono[0])} + ${G.eur(u.mono[1] * S.feeMult)}/day</small></button>`;
            }
            return `<div class="up ${fl ? 'owned' : ''} ${fl === 'mono' ? 'mono' : ''}"><div class="dept">${u.dept}${u.sov ? ` · +${u.sov} sovereignty if open` : ''}</div><h3>${u.name}</h3><p>${u.desc}</p>${state}<div class="buy">${buy}</div></div>`;
          }).join('')}</div>
          <div class="row" style="margin-top:16px"><button class="btn primary" id="lab-close">Back to town</button></div></div>`;
        $('lab-close').onclick = close;
        el.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { if (G.Game.buy(b.dataset.buy, b.dataset.fl)) render(); }));
      };
      const close = () => { el.hidden = true; closeModal(); window.removeEventListener('keydown', key); res(); };
      const key = (e) => { if (e.code === 'Escape') { e.stopPropagation(); close(); } };
      window.addEventListener('keydown', key, true); render();
    });
  };

  /* ---------- end-of-day report ---------- */
  UI.summary = function (d) {
    return new Promise((res) => {
      openModal(); const el = $('summary'); el.hidden = false;
      const row = (l, v, cls = '') => `<dt>${l}</dt><dd class="${cls}">${v}</dd>`, money = (v) => (v >= 0 ? '+' : '') + G.eur(v);
      el.innerHTML = `<div class="sheet narrow" style="width:min(680px,100%)"><div class="eyebrow">Day ${d.day} · 17:00 · counter closed</div><h2>${d.headline}</h2><p class="sub">${d.line}</p>
        <div class="sum"><div><h3>Service</h3><dl class="kv">${row('Handled by you', d.manual)}${row('Handled by staff and systems', d.auto)}${row('Left unanswered', d.missed, d.missed ? 'negc' : '')}${row('Trust', `${Math.round(d.trust0)} → ${Math.round(d.trust1)}`, d.trust1 >= d.trust0 ? 'pos' : 'negc')}${row('Best streak', '×' + (1 + Math.min(d.best, 10) * 0.1).toFixed(1))}</dl></div>
        <div><h3>Budget</h3><dl class="kv">${row('Fees earned today', money(d.earned), 'pos')}${row('National grant (follows trust)', money(d.grant), 'pos')}${d.savings ? row('Licences no longer paid', money(d.savings), 'pos') : ''}${d.mono ? row('Monolith subscriptions', money(-d.mono), 'negc') : ''}${d.counter ? row('Counter staff', money(-d.counter), 'negc') : ''}<dt class="tot">In the bank</dt><dd class="tot">${G.eur(d.budget)}</dd></dl></div></div>
        <div class="row"><button class="btn primary" id="sum-go">${d.day < 5 ? 'Walk into the evening' : 'To the council chamber'}</button></div></div>`;
      $('sum-go').onclick = () => { el.hidden = true; closeModal(); res(); }; $('sum-go').focus();
    });
  };

  UI.ending = function (e) {
    openModal(); const el = $('ending'); el.hidden = false;
    el.innerHTML = `<div class="sheet" style="width:min(760px,100%)"><div class="grade">${e.grade}</div><div class="eyebrow">End of term · ${e.kicker}</div><h2 style="font-size:34px">${e.title}</h2>
      <div class="epi">${e.paras.map((p) => `<p>${p}</p>`).join('')}</div>
      <div class="sum"><div><h3>The town</h3><dl class="kv"><dt>Trust</dt><dd>${Math.round(e.trust)}</dd><dt>Sovereignty</dt><dd>${e.sov}</dd><dt>Systems live</dt><dd>${e.systems} of ${G.UP.length}</dd><dt>Rented from Monolith</dt><dd>${e.mono}</dd></dl></div>
      <div><h3>Your term</h3><dl class="kv"><dt>Requests handled by hand</dt><dd>${e.manual}</dd><dt>Handled by staff and systems</dt><dd>${e.auto}</dd><dt>Left unanswered</dt><dd>${e.missed}</dd><dt class="tot">Final score</dt><dd class="tot" style="color:var(--gold)">${e.score}</dd></dl></div></div>
      <div class="row"><button class="btn primary" id="end-again">Run for another term</button><a class="btn" href="https://github.com/TjebbeHB/Eu-municipality-sim/blob/main/docs/research.md">Read the research behind it</a></div></div>`;
    $('end-again').onclick = () => { G.Game.clearSave(); location.reload(); };
  };
})();
