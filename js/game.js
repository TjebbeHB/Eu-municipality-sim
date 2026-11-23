/* Voxelstad — rules: requests, automation, economy, the day, the evening and the night */
(function () {
  const Gm = (G.Game = {}), W = G.World, UI = G.UI, LOC = W.LOC;
  let S;

  G.UP = [
    { id: 'wallet', name: 'EU Digital Identity Wallet', dept: 'Civil affairs', open: 60, mono: [25, 6], monoName: 'Monolith ID', sov: 15,
      desc: 'A kiosk on the square and a login on every phone. Half of all document requests settle themselves without reaching the counter.' },
    { id: 'oots', name: 'Once-only data exchange', dept: 'All desks', open: 90, mono: [40, 9], monoName: 'Monolith DataHub', sov: 20,
      desc: 'Registers talk to each other over a secure exchange layer. No more walking to the Archive: documents are issued at the counter in one step, and half of online permits approve themselves.' },
    { id: 'smartbins', name: 'Smart bins and collector bot', dept: 'Waste', open: 70, sov: 5,
      desc: 'Fill sensors put every bin on your map. An electric collector drives the round on its own and empties whatever is filling up.' },
    { id: 'twin', name: 'Digital twin and repair drone', dept: 'Roads', open: 80, sov: 5,
      desc: 'A live model of every street. Potholes are reported the moment they form, and a drone patches them before anyone complains.' },
    { id: 'permitdesk', name: 'Digital permit desk', dept: 'Planning', open: 60, sov: 5,
      desc: 'Applicants file plans online. No more carrying drawings back and forth: you decide each case in one step at the Planning office.' },
    { id: 'casesys', name: 'Shared care case system', dept: 'Social support', open: 45, sov: 10,
      desc: 'Open-source case software built with neighbouring towns. You still visit people at home. The paperwork is done before you leave their kitchen.' },
    { id: 'workplace', name: 'Workplace and cloud', dept: 'Whole organisation', open: 100, mono: [20, 12], monoName: 'Monolith 365 Cloud', sov: 25,
      desc: 'Modern tools for every civil servant: each counter action takes 30% less time. The open build runs on the town\'s own sovereign cloud, ends €6k a day in old licences and keeps tested backups.' },
    { id: 'nis2', name: 'NIS2 security baseline', dept: 'Security', open: 60, sov: 5,
      desc: 'Multi-factor login, segmented networks, offline backups and a rehearsed incident plan. If attackers return, they spread at half the speed and nothing is lost for good.' },
    { id: 'ai', name: 'Governed AI assistant', dept: 'Civil affairs', open: 80, mono: [35, 10], monoName: 'Monolith Copilot', sov: 10,
      desc: 'Answers routine questions day and night: a further quarter of document requests never reach the counter, and everyone waits 30% more patiently. The open build is a local model with a public algorithm register.' },
    { id: 'bakfiets', name: 'The mayoral cargo bike', dept: 'You', open: 15, sov: 0,
      desc: 'A bakfiets. You move 35% faster, never run out of breath, and carry three things at once.' },
  ];
  const UPI = {}; G.UP.forEach((u) => (UPI[u.id] = u));
  const NODE_UPS = { hall: ['wallet', 'ai'], archive: ['oots'], planning: ['permitdesk'], social: ['casesys'], depot: ['smartbins', 'twin'], lab: ['workplace'] };
  const DAYS = {
    1: { len: 130, doc: 19, care: 0, permit: 0, road: 36, bin: 120 },
    2: { len: 170, doc: 14, care: 40, permit: 52, road: 32, bin: 100 },
    3: { len: 180, doc: 12, care: 34, permit: 44, road: 28, bin: 88 },
    4: { len: 180, doc: 10, care: 30, permit: 40, road: 24, bin: 76 },
    5: { len: 190, doc: 8, care: 26, permit: 34, road: 20, bin: 64 },
  };

  function fresh() {
    return { day: 1, phase: 'title', budget: 30, trust: 55, score: 0, streak: 0, best: 0, own: {}, flags: {}, feeMult: 1, disabled: {}, monoDown: 0, lots: [], stalls: [],
      stats: { manual: 0, auto: 0, missed: 0 }, d: { manual: 0, auto: 0, missed: 0, earned: 0, best: 0, trust0: 55 },
      time: 0, dayLen: 0, clock: false, dayDone: false, eveningDone: false, jobs: [], bins: [], potholes: [], inv: [], timers: [], talks: [],
      inTruck: false, truck: null, bot: null, drone: null, night: null, slots: [null, null, null], queue: [], spawn: {}, mods: { doc: 1, road: 1, bin: 1 }, storm: 0, fatimaT: 20, said: {} };
  }
  Gm.reset = function (save) { S = G.S = fresh(); if (save) Object.assign(S, save); return S; };
  Gm.save = function () { try { localStorage.setItem('voxelstad-save', JSON.stringify({ day: S.day, budget: S.budget, trust: S.trust, score: S.score, best: S.best, own: S.own, flags: S.flags, feeMult: S.feeMult, disabled: S.disabled, monoDown: S.monoDown, lots: S.lots, stalls: S.stalls, stats: S.stats })); } catch (e) {} };
  Gm.load = function () { try { return JSON.parse(localStorage.getItem('voxelstad-save')); } catch (e) { return null; } };
  Gm.clearSave = function () { try { localStorage.removeItem('voxelstad-save'); } catch (e) {} };

  /* ---------- upgrades ---------- */
  Gm.has = (id) => !!S.own[id] && !S.disabled[id] && !(S.own[id] === 'mono' && S.phase === 'day' && S.time < S.monoDown);
  Gm.sovereignty = () => G.clamp(G.UP.reduce((a, u) => a + (S.own[u.id] === 'open' ? u.sov : 0), 0) + (S.flags.commons ? 10 : 0), 0, 100);
  Gm.priceOpen = (u) => Math.round(u.open * (S.flags.commons ? 0.75 : 1));
  Gm.monoFees = () => G.UP.reduce((a, u) => a + (S.own[u.id] === 'mono' ? u.mono[1] * S.feeMult : 0), 0);
  Gm.monoCount = () => G.UP.filter((u) => S.own[u.id] === 'mono').length;
  Gm.ownedCount = () => G.UP.filter((u) => S.own[u.id]).length;
  Gm.buy = function (id, fl) {
    const u = UPI[id], cost = fl === 'mono' ? u.mono[0] : Gm.priceOpen(u);
    if (S.budget < cost || S.own[id] === fl || (fl === 'open' && S.flags.exclusive && u.mono)) return false;
    const migrated = S.own[id] === 'mono'; S.budget -= cost; S.own[id] = fl; delete S.disabled[id];
    G.Audio.sfx('buy'); UI.toast(migrated ? `<b>${u.name}</b> migrated to the town's own build.` : `<b>${fl === 'mono' ? u.monoName : u.name}</b> goes live tomorrow morning.`, 'good');
    Gm.applyWorld(); return true;
  };
  Gm.applyWorld = function () {
    const o = S.own;
    W.show('kiosk', !!o.wallet); W.show('dc_open', o.workplace === 'open'); W.show('dc_mono', o.workplace === 'mono' || (!!S.flags.exclusive && o.workplace !== 'open'));
    W.show('car', S.phase === 'evening' && (S.day === 2 || S.day === 3)); W.show('flags', !!S.flags.commons); W.show('banner', !!S.flags.exclusive); W.show('permitdesk', !!o.permitdesk); W.show('nis2', !!o.nis2); W.show('dronepad', !!o.twin);
    LOC.lots.forEach((l, i) => W.show('lot' + i, S.lots.includes(i))); LOC.stalls.forEach((l, i) => W.show('stall' + i, S.stalls.includes(i)));
    for (const b of S.bins) b.sensor.visible = !!o.smartbins;
    if (S.bot) S.bot.g.visible = !!o.smartbins; if (S.drone) S.drone.g.visible = !!o.twin;
    if (G.player && G.player.bike) G.player.bike.visible = !!o.bakfiets;
    const night = S.phase === 'night';
    for (const l of W.links) l.mesh.visible = night || !!o.oots; for (const id in W.nodes) W.nodes[id].visible = night || !!o.oots;
  };
  const has = Gm.has;
  const docAuto = () => (has('wallet') ? 0.5 : 0) + (has('ai') ? 0.25 : 0);
  const holdMult = () => (has('workplace') ? 0.7 : 1);
  const patienceMult = () => (has('ai') ? 1.3 : 1);
  const cap = () => (has('bakfiets') ? 3 : 1);
  Gm.cap = cap;
  const trust = (d) => { S.trust = G.clamp(S.trust + d, 3, 100); };
  Gm.trust = trust;
  const later = (t, fn) => S.timers.push({ t, fn });
  const once = (key, fn) => { if (!S.said[key]) { S.said[key] = 1; fn(); } };

  /* ---------- requests ---------- */
  let jid = 0;
  function addJob(o) {
    const j = Object.assign({ id: ++jid, i: 0, ready: true, steps: [] }, o);
    j.pat = j.max = o.max * patienceMult(); j.badge = G.makeBadge(j.type); S.jobs.push(j); return j;
  }
  function removeJob(j) {
    const k = S.jobs.indexOf(j); if (k < 0) return; S.jobs.splice(k, 1); W.scene.remove(j.badge);
    S.inv = S.inv.filter((it) => it.job !== j); G.setCarry(G.player.char, S.inv);
    if (j.type === 'doc') freeSlot(j);
    if (j.onEnd) j.onEnd(j);
  }
  function leave(npc) { if (!npc || npc.dead) return; const e = G.pick(LOC.entries); npc.face = null; npc.walk([e[1], e[0]], () => npc.remove(), 3.4); }
  function payout(pos, reward, mode, label) { // mode: manual | staff | auto
    const manual = mode === 'manual', mult = manual ? 1 + Math.min(S.streak, 10) * 0.1 : 0.6;
    S.budget += reward; S.d.earned += reward; S.score += reward * 10 * mult;
    S.d[manual ? 'manual' : 'auto']++; S.stats[manual ? 'manual' : 'auto']++;
    UI.pop(label || `+${G.eur(reward)}${manual && S.streak >= 2 ? '  ×' + mult.toFixed(1) : ''}`, pos, manual ? 'gold' : 'good'); UI.bump('s-budget');
    G.Audio.sfx(manual ? 'done' : 'auto');
  }
  function complete(j, mode) {
    const fast = j.pat / j.max > 0.4;
    if (mode === 'manual') { if (fast) S.streak++; S.best = Math.max(S.best, S.streak); S.d.best = Math.max(S.d.best, S.streak); trust(fast ? 1.2 : 0.7); } else trust(0.4);
    payout(j.steps.length ? (j.steps[j.steps.length - 1].at || j.pos) : j.pos, j.reward, mode, mode === 'staff' ? `Fatima  +${G.eur(j.reward)}` : null);
    if (j.onDone) j.onDone(j, mode);
    if (j.npc && mode === 'manual' && Math.random() < 0.6) UI.pop(G.pick(['Dank je!', 'Thanks, Mayor!', 'Finally!', 'Bedankt!', 'That was quick!', 'Top!']), { x: j.npc.x, y: 2.9, z: j.npc.z }, 'note');
    if (j.npc) { j.npc.mood = 0.9; if (j.type === 'doc') leave(j.npc); else { const n = j.npc; later(1.6, () => n.remove()); } }
    removeJob(j);
  }
  function expire(j) {
    trust(j.type === 'road' ? -2 : -3); S.streak = 0; S.d.missed++; S.stats.missed++;
    UI.pop(j.type === 'road' ? 'Complaint filed' : 'Gave up waiting', j.npc || j.steps[j.i].at || j.pos, 'bad'); G.Audio.sfx('fail'); UI.bump('s-trust');
    if (j.npc) { if (j.type === 'doc') leave(j.npc); else j.npc.remove(); }
    removeJob(j);
  }
  function doStep(j) {
    const st = j.steps[j.i];
    if (st.need) { const k = S.inv.findIndex((it) => it.job === j && it.type === st.need); if (k >= 0) S.inv.splice(k, 1); }
    if (st.give) S.inv.push({ type: st.give, job: j });
    G.setCarry(G.player.char, S.inv); G.Audio.sfx(st.sfx || (st.give ? 'pick' : 'stamp'));
    if (st.on) st.on(j);
    j.i++; j.started = true;
    if (j.i >= j.steps.length) complete(j, 'manual'); else if (j.steps[j.i].wait) j.steps[j.i].t = j.steps[j.i].wait;
  }

  // --- documents ---
  function freeSlot(j) {
    const k = S.slots.indexOf(j);
    if (k >= 0) {
      S.slots[k] = null; const nx = S.queue.shift();
      if (nx) { S.slots[k] = nx; nx.atWindow = true; nx.ready = false; Object.assign(nx.spot, LOC.counter[k]); nx.npc.walk([nx.spot], () => { nx.ready = true; nx.npc.face = { x: nx.spot.x, z: -14 }; }); }
    } else { const q = S.queue.indexOf(j); if (q >= 0) S.queue.splice(q, 1); }
    S.queue.forEach((q, i) => { Object.assign(q.spot, LOC.queue(i)); q.npc.walk([q.spot]); });
  }
  const DOC_TITLES = ['Passport renewal', 'ID card', 'Driving licence', 'Birth extract', 'Address change', 'Marriage notice'];
  Gm.spawnDoc = function (opts = {}) {
    const entry = G.pick(LOC.entries), auto = !opts.manual && Math.random() < docAuto();
    if (auto) {
      const viaAI = !has('wallet') || Math.random() < 0.33 && has('ai');
      const finish = (pos) => { payout(pos, 4, 'auto'); trust(0.4);
        if (viaAI && S.own.ai === 'mono' && Math.random() < 0.3) later(5, () => { UI.toast('Monolith Copilot told a resident the wrong fee. They are at the counter, furious.', 'bad'); trust(-1); Gm.spawnDoc({ manual: true, angry: true }); }); };
      if (!has('wallet')) { later(3, () => finish({ x: 5, y: 4, z: -11 })); return null; }
      const npc = G.spawnNPC(G.randomLook(), entry[0].x + G.rand(-1, 1), entry[0].z + G.rand(-1, 1)), kx = LOC.kiosk.x + G.rand(-0.9, 0.9), kz = LOC.kiosk.z + G.rand(0, 1.4);
      npc.walk([entry[1], { x: kx, z: kz }], () => { npc.face = { x: LOC.kiosk.x, z: -9 }; later(2.2, () => { npc.mood = 0.6; finish(npc); leave(npc); }); });
      return null;
    }
    const free = S.slots.indexOf(null);
    if (free < 0 && S.queue.length >= 5) { trust(-0.5); once('queue' + S.day, () => UI.toast('The queue is out the door. People are turning away.', 'bad')); return null; }
    const npc = G.spawnNPC(G.randomLook(), entry[0].x + G.rand(-1, 1), entry[0].z + G.rand(-1, 1));
    const j = addJob({ type: 'doc', title: opts.angry ? 'Wrong answer from the chatbot' : G.pick(DOC_TITLES), max: opts.angry ? 40 : 62, reward: 4, npc, ready: false, spot: { x: 0, z: 0 }, frozen: !!opts.frozen });
    if (free >= 0) { S.slots[free] = j; j.atWindow = true; Object.assign(j.spot, LOC.counter[free]); } else { S.queue.push(j); j.atWindow = false; Object.assign(j.spot, LOC.queue(S.queue.length - 1)); }
    j.steps = has('oots')
      ? [{ at: j.spot, label: 'Verify and issue on the spot', hold: 1.0, sfx: 'stamp', on: () => G.sendPacket(LOC.archive, j.spot) }]
      : [{ at: j.spot, label: 'Take the application', hold: 0.5, give: 'form' }, { at: LOC.archive, label: 'Look up the record', hold: 1.4, need: 'form', give: 'passport', sfx: 'stamp' }, { at: j.spot, label: 'Hand over the document', hold: 0.4, need: 'passport' }];
    npc.walk([entry[1], j.spot], () => { j.ready = true; npc.face = { x: j.spot.x, z: -14 }; });
    return j;
  };
  // --- care ---
  Gm.spawnCare = function (idx, opts = {}) {
    const free = LOC.homes.filter((h) => !h.busy); if (!free.length) return null;
    const h = idx !== undefined ? LOC.homes[idx] : G.pick(free); if (h.busy) return null; h.busy = true;
    const look = h === LOC.homes[0] ? G.LOOKS.dewit : Object.assign(G.randomLook(), { hair: 0xe9e4d8, small: true, cap: false });
    const npc = G.spawnNPC(look, h.x, h.z); npc.face = { x: h.x + (h.x < -30 ? 5 : 0), z: h.z + (h.x < -30 ? 0 : h.z < 0 ? 5 : -5) };
    const j = addJob({ type: 'care', title: `Care visit · ${h.addr}`, max: 88, reward: 7, npc, home: h, frozen: !!opts.frozen });
    j.steps = has('casesys')
      ? [{ at: h, label: `Listen to ${h.name}, arrange care on the spot`, hold: 2.2, human: true, sfx: 'pick' }]
      : [{ at: h, label: `Sit down and listen to ${h.name}`, hold: 2.2, human: true, give: 'carefile' }, { at: LOC.social, label: 'File the care request', hold: 1.2, need: 'carefile', sfx: 'stamp' }];
    j.onEnd = () => { h.busy = false; };
    return j;
  };
  // --- permits ---
  Gm.spawnPermit = function () {
    const busy = (key) => S.jobs.some((j) => j.key === key);
    const lots = LOC.lots.map((l, i) => i).filter((i) => !S.lots.includes(i) && !busy('lot' + i)), stalls = LOC.stalls.map((l, i) => i).filter((i) => !S.stalls.includes(i) && !busy('stall' + i));
    let pos, title, key, onDone;
    if (lots.length && (Math.random() < 0.65 || !stalls.length)) { const i = lots[0], l = LOC.lots[i]; pos = { x: l.x, z: l.f }; title = `Building permit · plot ${i + 1}`; key = 'lot' + i; onDone = () => { S.lots.push(i); W.show('lot' + i); UI.pop('A new home goes up', { x: l.x, y: 6, z: l.z }, 'note'); }; }
    else if (stalls.length) { const i = stalls[0], s = LOC.stalls[i]; pos = { x: s.x, z: s.z - 1.9 }; title = 'Market stall licence'; key = 'stall' + i; onDone = () => { S.stalls.push(i); W.show('stall' + i); UI.pop('The market grows', { x: s.x, y: 3, z: s.z }, 'note'); }; }
    else { const s = G.pick(LOC.stalls); pos = { x: s.x + G.rand(-1, 1), z: s.z - 2.2 }; title = 'Event licence'; key = 'ev' + jid; onDone = null; }
    if (busy(key)) return null;
    if (has('permitdesk') && has('oots') && Math.random() < 0.5) { const j = { key }; S.jobs.push(Object.assign(j, { hidden: true, type: 'permit', pat: 99, max: 99, steps: [{ wait: 1, t: 99, at: pos }], i: 0, ready: true, badge: new THREE.Object3D() }));
      later(6, () => { S.jobs.splice(S.jobs.indexOf(j), 1); G.sendPacket(LOC.planning, pos, 0xb678dd); payout({ x: pos.x, y: 3, z: pos.z }, 10, 'auto'); trust(0.4); if (onDone) onDone(); }); return null; }
    const npc = G.spawnNPC(G.LOOKS.builder, pos.x, pos.z); npc.face = { x: pos.x, z: pos.z + (pos.z > 24 ? -5 : 5) };
    const j = addJob({ type: 'permit', title, max: 125, reward: 10, npc, key, pos, onDone });
    j.steps = has('permitdesk')
      ? [{ at: LOC.planning, label: 'Decide the online application', hold: 1.4, sfx: 'stamp', on: () => G.sendPacket(LOC.planning, pos, 0xb678dd) }]
      : [{ at: pos, label: 'Take the plans', hold: 0.5, give: 'plans' }, { at: LOC.planning, label: 'Submit the plans for review', hold: 1.0, need: 'plans', sfx: 'stamp' }, { wait: 14, label: 'Planning is reviewing…', at: LOC.planning },
         { at: LOC.planning, label: 'Collect the decision', hold: 0.5, give: 'permit', sfx: 'stamp' }, { at: pos, label: 'Hand over the permit', hold: 0.5, need: 'permit' }];
    return j;
  };
  // --- roads ---
  Gm.spawnPothole = function (at, opts = {}) {
    if (S.potholes.length >= 8) return null;
    const p = at || W.randomRoadPoint(), ph = G.makePothole(p.x, p.z); S.potholes.push(ph); ph.frozen = !!opts.frozen;
    if (has('twin') || opts.known) reveal(ph, 'sensor'); return ph;
  };
  function reveal(ph, how) {
    ph.known = true; ph.cone.visible = true;
    const j = (ph.job = addJob({ type: 'road', title: how === 'complaint' ? 'Pothole · complaint' : 'Pothole', max: 78, reward: 4, pos: ph, ph, frozen: ph.frozen }));
    j.steps = [{ at: ph, label: 'Repair the road', hold: 2.2, sfx: 'stamp' }];
    j.onEnd = () => { W.scene.remove(ph.g); const k = S.potholes.indexOf(ph); if (k >= 0) S.potholes.splice(k, 1); };
    if (how === 'complaint') { trust(-1); once('complaint' + S.day, () => UI.toast('A resident phoned in a pothole you never knew about.', 'bad')); }
    if (how === 'spot') UI.pop('Pothole spotted', { x: ph.x, y: 2, z: ph.z }, 'note');
  }
  // --- waste ---
  function grabBag(b) { S.inv.push({ type: 'bag', v: b.fill }); b.fill = 0; G.setCarry(G.player.char, S.inv); G.Audio.sfx('pick'); }
  function dumpBags() {
    const n = S.inv.filter((i) => i.type === 'bag').length; S.inv = S.inv.filter((i) => i.type !== 'bag'); G.setCarry(G.player.char, S.inv);
    for (let i = 0; i < n; i++) { S.streak++; payout({ x: LOC.depotDump.x, y: 2.5 + i * 0.5, z: LOC.depotDump.z }, 2, 'manual'); } S.best = Math.max(S.best, S.streak); S.d.best = Math.max(S.d.best, S.streak); trust(0.4 * n);
  }
  function enterTruck() { S.inTruck = true; G.Audio.sfx('engine'); once('truckhelp', () => UI.toast('<b>W A S D</b> to drive. Roll slowly past bins to load them. Unload at the depot. <b>E</b> to get out.', 'note')); }
  Gm.exitTruck = function () {
    const t = S.truck; if (Math.abs(t.v) > 3) return;
    for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) { const x = t.x + Math.sin(t.h + a) * 2.4, z = t.z + Math.cos(t.h + a) * 2.4; if (!W.blocked(x, z, 0.5)) { G.player.x = x; G.player.z = z; break; } }
    S.inTruck = false; t.v = 0; G.Audio.engine(0, false);
  };

  /* ---------- what can the player do right here? ---------- */
  const NEED = { form: 'Take their application first', passport: 'Fetch the record from the Archive first', plans: 'Take the plans from the applicant first', permit: 'Collect the decision first', carefile: 'Visit the resident first' };
  Gm.interactables = function () {
    const L = []; if (S.inTruck) return L;
    if (S.phase === 'day') {
      for (const j of S.jobs) {
        if (!j.ready || j.hidden) continue; const st = j.steps[j.i]; if (!st || st.wait || (j.type === 'doc' && !j.atWindow)) continue;
        let blocked = null; if (st.need && !S.inv.some((it) => it.job === j && it.type === st.need)) blocked = NEED[st.need]; else if (st.give && !st.need && S.inv.length >= cap()) blocked = 'Your hands are full';
        L.push({ pos: st.at, label: st.label, hold: st.hold * (st.human ? 1 : holdMult()), blocked, act: () => doStep(j), r: 2.4 });
      }
      for (const b of S.bins) if (b.fill > 0.3) L.push({ pos: b, label: 'Grab the waste bag', hold: 0.35, blocked: S.inv.length >= cap() ? 'Your hands are full' : null, act: () => grabBag(b), r: 2 });
      if (S.inv.some((i) => i.type === 'bag')) L.push({ pos: LOC.depotDump, label: 'Dump the waste', hold: 0.3, act: dumpBags, r: 3.4 });
    }
    if (S.phase === 'evening') {
      for (const t of S.talks) if (!t.done && !t.busy) L.push({ pos: t.pos, label: t.label || `Talk to ${G.CAST[t.who].name.split(' ')[0]}`, hold: 0, act: () => runTalk(t), r: 2.8 });
      L.push({ pos: LOC.lab, label: 'Open the investment terminal', hold: 0, act: () => UI.openLab(), r: 2.6 });
      const need = S.talks.filter((t) => t.need && !t.done);
      L.push({ pos: LOC.hallDoor, label: need.length ? `Call it a day (first: ${need.map((t) => G.CAST[t.who].name.split(' ')[0]).join(', ')})` : 'Call it a day', hold: need.length ? 0 : 0.8, blocked: need.length ? 'x' : null, act: () => { S.eveningDone = true; }, r: 2.6, keepLabel: true });
    }
    if (S.phase === 'night' && S.night && !S.night.done) for (const id in S.night.nodes) {
      const n = S.night.nodes[id]; if (n.state === 'infected' || n.state === 'clean') L.push({ pos: LOC[LOC.nodes[id].at], label: n.state === 'infected' ? `Pull the uplink: ${LOC.nodes[id].name}` : `Isolate ${LOC.nodes[id].name} as a precaution`, hold: 1.5, act: () => isolate(id, 'you'), r: 3 });
    }
    if (S.truck && (S.phase === 'day' || S.phase === 'night')) L.push({ pos: S.truck, label: 'Drive the truck', hold: 0, act: enterTruck, r: 3.2 });
    return L;
  };
  async function runTalk(t) { t.busy = true; G.player.faceTo = t.pos; const r = await t.fn(); t.busy = false; if (r === false) return; t.done = true; if (t.badge) { W.scene.remove(t.badge); t.badge = null; } }

  /* ---------- phases ---------- */
  function clearField() {
    for (const j of S.jobs.slice()) { if (j.npc) j.npc.remove(); W.scene.remove(j.badge); } S.jobs = [];
    for (const n of G.npcs) if (!n.ambient) n.remove();
    for (const ph of S.potholes) W.scene.remove(ph.g); S.potholes = [];
    for (const t of S.talks) if (t.badge) W.scene.remove(t.badge); S.talks = [];
    S.inv = []; G.setCarry(G.player.char, S.inv); S.slots = [null, null, null]; S.queue = []; S.timers = []; LOC.homes.forEach((h) => (h.busy = false));
    if (S.inTruck) Gm.exitTruck(); S.inTruck = false;
    const t = S.truck, p = LOC.truckPark; t.x = p.x; t.z = p.z; t.h = -Math.PI / 2; t.v = 0; t.load = 0;
    for (const m of Gm.marks) m.visible = false;
  }
  Gm.marks = [];
  Gm.initWorld = function () {
    S.bins = LOC.binSpots.map(([x, z]) => G.makeBin(x, z)); S.truck = G.makeTruck(); S.bot = G.makeBot(); S.drone = G.makeDrone();
    Gm.beacons = [G.makeBeacon(0x9ad0ff), G.makeBeacon(0x9ad0ff), G.makeBeacon(0x9ad0ff)];
    Gm.marks = [G.makeBadge('lab', 1.5), G.makeBadge('door', 1.5)]; Gm.marks.forEach((m) => (m.visible = false));
    for (let i = 0; i < 14; i++) G.spawnWanderer();
  };
  Gm.startDay = function (day) {
    clearField(); const c = DAYS[day];
    Object.assign(S, { day, phase: 'day', time: 0, dayLen: c.len, clock: false, dayDone: false, streak: 0, mods: { doc: 1, road: 1, bin: 1 }, storm: 0, fatimaT: 18,
      d: { manual: 0, auto: 0, missed: 0, earned: 0, best: 0, trust0: S.trust }, spawn: { doc: 4, care: c.care * 0.4, permit: c.permit * 0.3, road: 10 } });
    for (const b of S.bins) b.fill = G.rand(0.1, 0.45);
    G.player.x = LOC.start.x; G.player.z = LOC.start.z; G.player.yaw = Math.PI; G.camYawTarget = 0;
    W.setTime(0, 0); Gm.applyWorld(); G.Audio.music('day'); document.getElementById('vignette').classList.remove('on');
  };
  Gm.openCounter = function () { S.clock = true; for (const j of S.jobs) j.frozen = false; for (const p of S.potholes) p.frozen = false; };
  Gm.endOfDay = function () {
    const d = S.d, grant = Math.round(20 + S.trust * 0.4), mono = Gm.monoFees(), counter = S.flags.counter ? 4 : 0, savings = S.own.workplace === 'open' ? 6 : 0;
    S.budget += grant - mono - counter + savings;
    if (S.flags.counter === false && S.own.wallet) trust(-3); if (S.flags.counter) trust(2);
    const net = d.manual + d.auto, ratio = net + d.missed ? d.missed / (net + d.missed) : 0;
    const headline = ratio < 0.08 ? 'A day the town will remember kindly' : ratio < 0.25 ? 'The town got served, mostly' : ratio < 0.5 ? 'Too many people went home empty-handed' : 'The queue won today';
    const line = d.auto > d.manual * 1.5 ? 'Most of today\'s work never reached you. That is the point.' : d.auto > 0 ? 'The systems are starting to carry weight. You carried the rest.' : 'Everything that got done today, you did on foot.';
    return { day: S.day, manual: d.manual, auto: d.auto, missed: d.missed, trust0: d.trust0, trust1: S.trust, best: d.best, earned: d.earned, grant, mono, counter, savings, budget: S.budget, headline, line };
  };
  Gm.startEvening = function (talks) {
    clearField(); S.phase = 'evening'; S.eveningDone = false; S.labOpened = false; W.setTime(0.5, 0); G.Audio.music('evening'); UI.prompt(null);
    S.talks = talks.map((t) => { const npc = G.spawnNPC(G.LOOKS[t.who], t.pos.x, t.pos.z); npc.face = G.player; const badge = G.makeBadge('talk', 1.1); badge.position.set(t.pos.x, 2.9, t.pos.z); return Object.assign({ done: false, npc, badge }, t); });
    Gm.marks[0].position.set(LOC.lab.x, 3.4, LOC.lab.z); Gm.marks[1].position.set(LOC.hallDoor.x, 4, LOC.hallDoor.z); Gm.marks.forEach((m) => (m.visible = true));
    Gm.applyWorld();
  };

  Gm.finish = function () { clearField(); S.phase = 'end'; W.setTime(0.5, 0); };

  /* ---------- the night of the ransom ---------- */
  Gm.startNight = function () {
    clearField(); S.phase = 'night'; W.setTime(1, 0); G.Audio.music('night'); document.getElementById('vignette').classList.add('on');
    const nis = !!S.own.nis2; S.night = { t: 0, done: false, nodes: {}, enc: nis ? 52 : 32, spread: nis ? 30 : 17, helpT: 22, lost: [], saved: 0, first: true,
      waves: nis ? [[1.5, 1], [20, 1], [40, 1]] : [[1.5, 1], [13, 1], [25, 2], [38, 2]] };
    for (const id in LOC.nodes) { const badge = G.makeBadge('safe', 1.6); const p = LOC[LOC.nodes[id].at]; badge.position.set(p.x, 4.2, p.z); badge.visible = false; S.night.nodes[id] = { state: 'clean', t: 0, max: 1, spread: 0, badge }; }
    G.player.x = LOC.start.x; G.player.z = LOC.start.z; Gm.applyWorld();
  };
  function infect(id) {
    const N = S.night, n = N.nodes[id]; if (!n || n.state !== 'clean') return;
    n.state = 'infected'; n.t = n.max = N.enc; n.spread = N.spread; n.badge.setType('alert'); n.badge.visible = true;
    G.Audio.sfx('alarm'); UI.toast(`<b>${LOC.nodes[id].name}</b> is infected. Pull its uplink before the files encrypt.`, 'bad');
  }
  function isolate(id, who) {
    const n = S.night.nodes[id]; if (n.state !== 'infected' && n.state !== 'clean') return;
    const wasInfected = n.state === 'infected'; n.state = 'isolated'; n.badge.setType('safe'); n.badge.visible = true; n.badge.bar.visible = false;
    G.Audio.sfx('isolate'); if (who === 'you') { S.score += wasInfected ? 150 : 40; UI.pop(wasInfected ? 'Contained  +150' : 'Isolated', { x: LOC[LOC.nodes[id].at].x, y: 3, z: LOC[LOC.nodes[id].at].z }, 'note'); }
    else UI.toast(`${who} cut <b>${LOC.nodes[id].name}</b> off remotely.`, 'good');
  }
  function updateNight(dt) {
    const N = S.night; if (N.done) return; N.t += dt;
    const cleanNow = () => Object.keys(N.nodes).filter((k) => N.nodes[k].state === 'clean');
    while (N.waves.length && N.t >= N.waves[0][0]) {
      const n = N.waves.shift()[1];
      for (let i = 0; i < n; i++) { let c = cleanNow(); if (N.first) { c = c.filter((k) => k !== 'hall' && k !== 'lab'); N.first = false; } if (c.length) infect(G.pick(c)); }
    }
    const helper = S.own.workplace === 'open' ? 'Joris' : S.flags.commons ? 'Dijkveen\'s security team' : null;
    if (helper && (N.helpT -= dt) <= 0) { N.helpT = 24; const inf = Object.keys(N.nodes).filter((k) => N.nodes[k].state === 'infected').sort((a, b) => N.nodes[a].t - N.nodes[b].t); if (inf.length) isolate(inf[0], helper); }
    let active = 0;
    for (const id in N.nodes) {
      const n = N.nodes[id], mesh = W.nodes[id];
      if (n.state === 'infected') {
        active++; n.t -= dt; n.spread -= dt; n.badge.setBar(n.t / n.max);
        if (n.spread <= 0) { n.spread = N.spread; const nb = LOC.links.filter((l) => l.includes(id)).map((l) => (l[0] === id ? l[1] : l[0])).filter((k) => N.nodes[k].state === 'clean'); if (nb.length) infect(G.pick(nb)); }
        if (n.t <= 0) { n.state = 'encrypted'; N.lost.push(id); n.badge.visible = false; G.Audio.sfx('fail'); UI.toast(`<b>${LOC.nodes[id].name}</b> is encrypted.`, 'bad'); }
      }
      mesh.material.color.setHex({ clean: 0x54e0ff, infected: Math.sin(N.t * 10) > 0 ? 0xff2a2a : 0x7a1010, isolated: 0x4da3ff, encrypted: 0x3a4250 }[n.state]);
      mesh.scale.setScalar(n.state === 'infected' ? 1.3 + Math.sin(N.t * 10) * 0.3 : 0.9);
    }
    for (const l of W.links) { const a = N.nodes[l.a].state, b = N.nodes[l.b].state; l.mesh.material.color.setHex(a === 'infected' || b === 'infected' ? (a === 'clean' || b === 'clean' ? 0xff5a2a : 0x9a2020) : a === 'clean' && b === 'clean' ? 0x54e0ff : 0x3a4250); }
    if (!active && N.t > 4 && (!N.waves.length || !cleanNow().length)) { N.done = true; N.saved = Object.keys(N.nodes).length - N.lost.length; document.getElementById('vignette').classList.remove('on'); for (const id in N.nodes) W.scene.remove(N.nodes[id].badge); }
  }
  Gm.afterNight = function (rebuild) { // rebuild: the lost departments stay on paper tomorrow
    const N = S.night; if (rebuild) for (const id of N.lost) for (const u of NODE_UPS[id]) if (S.own[u]) S.disabled[u] = true;
    if (Gm.monoCount()) S.monoDown = 95;
  };

  /* ---------- per-frame simulation ---------- */
  Gm.update = function (dt) {
    const p = S.inTruck ? S.truck : G.player, now = performance.now() / 1000;
    for (let i = S.timers.length - 1; i >= 0; i--) if ((S.timers[i].t -= dt) <= 0) { const t = S.timers.splice(i, 1)[0]; t.fn(); }
    if (S.phase === 'day') {
      const c = DAYS[S.day];
      if (S.clock) {
        S.time += dt; if (S.time >= S.dayLen) { S.clock = false; S.dayDone = true; }
        const sp = S.spawn, jit = () => G.rand(0.7, 1.3);
        if ((sp.doc -= dt * S.mods.doc) <= 0) { sp.doc = c.doc * jit(); Gm.spawnDoc(); }
        if (c.care && (sp.care -= dt) <= 0) { sp.care = c.care * jit(); Gm.spawnCare(); }
        if (c.permit && (sp.permit -= dt) <= 0) { sp.permit = c.permit * jit(); Gm.spawnPermit(); }
        if ((sp.road -= dt * S.mods.road) <= 0) { sp.road = c.road * jit(); Gm.spawnPothole(); }
        // Fatima at the counter
        const fInt = S.day <= 2 ? 34 : S.flags.counter ? (has('oots') ? 12 : 20) : 0;
        if (fInt && (S.fatimaT -= dt) <= 0) { S.fatimaT = fInt; const j = S.jobs.find((q) => q.type === 'doc' && q.atWindow && q.ready && q.i === 0 && !q.frozen); if (j) complete(j, 'staff'); }
      }
      for (const j of S.jobs.slice()) {
        const st = j.steps[j.i];
        if (st.wait) { if ((st.t -= dt) <= 0 && !j.hidden) { j.i++; G.Audio.sfx('auto'); UI.pop('Decision ready', { x: st.at.x, y: 3, z: st.at.z }, 'note'); } }
        else if (!j.frozen && j.ready && S.clock) { j.pat -= dt; if (j.pat <= 0) { expire(j); continue; } }
      }
      for (const b of S.bins) {
        if (S.clock) { b.fill = Math.min(1.25, b.fill + (dt / c.bin) * b.rate * S.mods.bin); if (b.fill >= 1) trust(-0.012 * dt); }
        if (G.dist(b, p) < 10) b.seen = true;
        b.heap.visible = b.fill > 0.3; b.heap.scale.y = 0.15 + b.fill * 0.6; b.heap.position.y = 1.12 + b.heap.scale.y / 2; b.litter.visible = b.fill >= 1;
        b.sensor.material.color.setHex(b.fill >= 1 ? 0xff3b3b : b.fill > 0.55 ? 0xffc23b : 0x64ff9a);
      }
      for (const ph of S.potholes) if (!ph.known && !ph.frozen) { ph.age += dt; if (G.dist(ph, p) < 12) reveal(ph, 'spot'); else if (ph.age > 24) reveal(ph, 'complaint'); }
      updateTruckWork(dt); updateBot(dt); updateDrone(dt);
    }
    if (S.phase === 'night' && S.night) updateNight(dt);
    // markers
    let bi = 0;
    for (const j of S.jobs) {
      if (j.hidden) continue; const st = j.steps[j.i], q = !j.ready && j.npc ? j.npc : st.at || j.pos;
      j.badge.position.set(q.x, 3.05 + Math.sin(now * 3 + j.id) * 0.12, q.z); j.badge.setBar(j.pat / j.max); j.badge.material.opacity = j.type === 'doc' && !j.atWindow ? 0.45 : 1;
      if (j.i > 0 && !st.wait && bi < 3) { const b = Gm.beacons[bi++]; b.visible = true; b.position.x = st.at.x; b.position.z = st.at.z; }
    }
    if (bi < 3 && S.inv.some((i) => i.type === 'bag')) { const b = Gm.beacons[bi++]; b.visible = true; b.position.x = LOC.depotDump.x; b.position.z = LOC.depotDump.z; }
    for (; bi < 3; bi++) Gm.beacons[bi].visible = false;
    for (const t of S.talks) if (t.badge) t.badge.position.y = 2.9 + Math.sin(now * 3) * 0.1;
  };
  function updateTruckWork(dt) {
    const t = S.truck; if (!S.inTruck) return;
    if (Math.abs(t.v) < 7 && t.load < 10) for (const b of S.bins) if (b.fill > 0.25 && G.dist(b, t) < 3.6) { if ((t.loadT += dt) > 0.4) { t.loadT = 0; t.load++; b.fill = 0; G.Audio.sfx('pick'); UI.pop('Loaded', { x: b.x, y: 2, z: b.z }, 'note'); } break; }
    if (t.load > 0 && Math.abs(t.v) < 5 && G.dist(t, LOC.depotDump) < 6.5) {
      const n = t.load; t.load = 0; S.streak += n; S.best = Math.max(S.best, S.streak); S.d.best = Math.max(S.d.best, S.streak); trust(0.4 * n);
      S.budget += 2 * n; S.d.earned += 2 * n; S.d.manual += n; S.stats.manual += n; S.score += 20 * n * (1 + Math.min(S.streak, 10) * 0.1);
      UI.pop(`${n} bins unloaded  +${G.eur(2 * n)}`, { x: LOC.depotDump.x, y: 3, z: LOC.depotDump.z }, 'gold'); G.Audio.sfx('done'); UI.bump('s-budget');
    }
  }
  function updateBot(dt) {
    const b = S.bot; if (!has('smartbins')) { b.g.visible = !!S.own.smartbins; return; } b.g.visible = true;
    if (b.wait > 0) { if ((b.wait -= dt) <= 0 && b.target) { b.target.fill = 0; payout({ x: b.target.x, y: 2, z: b.target.z }, 2, 'auto'); trust(0.25); b.target = null; } }
    else if (!b.target) {
      const cand = S.bins.filter((x) => x.fill > 0.55).sort((a, c) => c.fill - a.fill)[0];
      if (cand && S.clock) { b.target = cand; const path = W.graphPath(W.nearestNode(b), W.nearestNode(cand)).map((i) => ({ x: W.graph.n[i][0], z: W.graph.n[i][1] })); const dx = cand.x - (path.length ? path[path.length - 1].x : b.x), dz = cand.z - (path.length ? path[path.length - 1].z : b.z), d = Math.hypot(dx, dz) || 1; path.push({ x: cand.x - (dx / d) * 1.3, z: cand.z - (dz / d) * 1.3 }); b.path = path; }
    } else if (b.path.length) {
      const q = b.path[0], dx = q.x - b.x, dz = q.z - b.z, d = Math.hypot(dx, dz), stp = 7.5 * dt;
      if (d <= stp) { b.x = q.x; b.z = q.z; b.path.shift(); if (!b.path.length) b.wait = 0.8; } else { b.x += (dx / d) * stp; b.z += (dz / d) * stp; b.g.rotation.y = Math.atan2(dx, dz); }
    }
    b.g.position.set(b.x, 0, b.z);
  }
  function updateDrone(dt) {
    const d = S.drone; if (!has('twin')) { d.g.visible = !!S.own.twin; return; } d.g.visible = true;
    for (const r of d.rot) r.rotation.y += dt * 40;
    const pad = { x: 30, z: -5 };
    if (d.state === 'idle') { d.y = G.lerp(d.y, 0.4, dt * 4); const ph = S.potholes.find((p) => p.known && p.job && !p.claimed && !p.frozen); if (ph && S.clock) { ph.claimed = true; d.target = ph; d.state = 'go'; } }
    else if (d.state === 'go' || d.state === 'back') {
      const q = d.state === 'go' ? d.target : pad; d.y = G.lerp(d.y, 7, dt * 3);
      if (d.state === 'go' && S.potholes.indexOf(d.target) < 0) { d.state = 'back'; return; }
      const dx = q.x - d.x, dz = q.z - d.z, dist = Math.hypot(dx, dz), stp = 15 * dt;
      if (dist <= stp) { d.x = q.x; d.z = q.z; if (d.state === 'go') { d.state = 'work'; d.t = 2.6; } else d.state = 'idle'; } else { d.x += (dx / dist) * stp; d.z += (dz / dist) * stp; d.g.rotation.y = Math.atan2(dx, dz); }
    } else if (d.state === 'work') {
      d.y = G.lerp(d.y, 1.6, dt * 3); d.t -= dt;
      if (S.potholes.indexOf(d.target) < 0) d.state = 'back'; else if (d.t <= 0) { complete(d.target.job, 'auto'); d.state = 'back'; }
    }
    d.g.position.set(d.x, d.y, d.z);
  }
})();
