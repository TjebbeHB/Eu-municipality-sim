/* Voxelstad — renderer, input, player, truck, camera and the frame loop */
(function () {
  const W = G.World, UI = G.UI, Gm = G.Game, $ = (id) => document.getElementById(id);
  const canvas = $('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fd3f0); scene.fog = new THREE.Fog(0x9fd3f0, 55, 150);
  const camera = (G.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 320));
  W.hemi = new THREE.HemisphereLight(0xe4f1ff, 0x5a6b4c, 0.8); scene.add(W.hemi);
  W.sun = new THREE.DirectionalLight(0xfff1d6, 1); W.sun.castShadow = true; W.sun.shadow.mapSize.set(2048, 2048);
  Object.assign(W.sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 160 }); W.sun.shadow.bias = -0.0006;
  scene.add(W.sun); scene.add(W.sun.target);

  W.build(scene);
  let S = Gm.reset();
  const P = (G.player = { x: 3, z: -7, y: 0, vy: 0, yaw: Math.PI, stamina: 1, char: G.makeChar(G.LOOKS.mayor), faceTo: null });
  scene.add(P.char.g);
  P.bike = new THREE.Group(); P.char.g.add(P.bike); P.bike.visible = false;
  G.box(P.bike, 0x8a6442, 0.9, 0.5, 1.0, 0, 0.55, 1.05); G.box(P.bike, 0x2c333d, 0.1, 0.1, 2.0, 0, 0.45, 0.1); G.box(P.bike, 0x2c333d, 0.5, 0.08, 0.08, 0, 1.05, 0.5); G.box(P.bike, 0x2c333d, 0.08, 0.6, 0.08, 0, 0.75, 0.5);
  for (const [x, z] of [[-0.5, 1.05], [0.5, 1.05], [0, -0.8]]) G.box(P.bike, 0x16181b, 0.12, 0.62, 0.62, x, 0.31, z);
  Gm.initWorld(); Gm.applyWorld(); W.setTime(0, 0);
  const objBeacon = G.makeBeacon(0xf2c230);

  // rain for the storm
  const RAIN = 700, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN * 3);
  for (let i = 0; i < RAIN; i++) { rainPos[i * 3] = G.rand(-30, 30); rainPos[i * 3 + 1] = G.rand(0, 30); rainPos[i * 3 + 2] = G.rand(-30, 30); }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xcfe3f5, size: 0.14, transparent: true, opacity: 0.7 })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);

  /* ---------- input ---------- */
  const keys = {}; let camYaw = 0, camPitch = 0.5, camDist = 9, camDistNow = 9, first = false, fpPitch = 0, dragging = false, lastMouseT = 0, eLatch = false;
  const stick = { x: 0, y: 0 };
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.repeat) return; G.Audio.init();
    if ((G.modals || performance.now() - (G.modalClosedAt || 0) < 200) && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter')) return; // that press belonged to a dialogue
    keys[e.code] = true;
    if (S.phase === 'title') return;
    if (e.code === 'KeyV') first = !first;
    if (e.code === 'KeyM') UI.toast(G.Audio.toggle() ? 'Sound off' : 'Sound on');
    if ((e.code === 'Escape' || e.code === 'KeyP') && (G.modals === 0 || G.paused)) togglePause();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  function togglePause(force) {
    G.paused = force === undefined ? !G.paused : force; $('pause').hidden = !G.paused;
    if (G.paused && document.pointerLockElement) document.exitPointerLock();
  }
  $('btn-resume').onclick = () => togglePause(false);
  $('btn-restart').onclick = () => { Gm.clearSave(); location.reload(); };
  const look = (dx, dy) => {
    camYaw -= dx * 0.0028; lastMouseT = performance.now();
    if (first) fpPitch = G.clamp(fpPitch - dy * 0.0022, -1.2, 1.2); else camPitch = G.clamp(camPitch + dy * 0.0022, 0.08, 1.35);
  };
  canvas.addEventListener('mousedown', () => { G.Audio.init(); if (S.phase !== 'title' && !G.modals && !G.paused && canvas.requestPointerLock && !('ontouchstart' in window)) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } dragging = true; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => { if (G.modals || G.paused) return; if (document.pointerLockElement === canvas || dragging) look(e.movementX || 0, e.movementY || 0); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); camDist = G.clamp(camDist * (1 + e.deltaY * 0.001), 2.5, 22); if (camDist <= 2.6 && e.deltaY < 0) first = true; else if (e.deltaY > 0 && first) { first = false; camDist = 4; } }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // touch: left stick moves, dragging the scene looks, buttons act
  if ('ontouchstart' in window) {
    document.body.classList.add('touch'); $('touch').hidden = false;
    const st = $('stick'), knob = st.firstElementChild; let sid = null, lookId = null, lx = 0, ly = 0;
    const setStick = (t) => { const r = st.getBoundingClientRect(), dx = (t.clientX - r.left - 60) / 50, dy = (t.clientY - r.top - 60) / 50, l = Math.max(1, Math.hypot(dx, dy)); stick.x = dx / l; stick.y = dy / l; knob.style.transform = `translate(${stick.x * 36}px,${stick.y * 36}px)`; };
    st.addEventListener('touchstart', (e) => { G.Audio.init(); sid = e.changedTouches[0].identifier; setStick(e.changedTouches[0]); e.preventDefault(); }, { passive: false });
    st.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === sid) setStick(t); e.preventDefault(); }, { passive: false });
    const endStick = (e) => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; stick.x = stick.y = 0; knob.style.transform = ''; } };
    st.addEventListener('touchend', endStick); st.addEventListener('touchcancel', endStick);
    canvas.addEventListener('touchstart', (e) => { G.Audio.init(); const t = e.changedTouches[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: true });
    canvas.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === lookId) { look((t.clientX - lx) * 2.2, (t.clientY - ly) * 2.2); lx = t.clientX; ly = t.clientY; } e.preventDefault(); }, { passive: false });
    const hold = (id, code) => { const b = $(id); b.addEventListener('touchstart', (e) => { keys[code] = true; e.preventDefault(); }, { passive: false }); b.addEventListener('touchend', () => { keys[code] = false; }); b.addEventListener('touchcancel', () => { keys[code] = false; }); };
    hold('t-act', 'KeyE'); hold('t-run', 'ShiftLeft'); hold('t-jump', 'Space');
  }

  /* ---------- player ---------- */
  function axes() {
    const ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x, iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y;
    return [G.clamp(ix, -1, 1), G.clamp(iz, -1, 1)];
  }
  function updatePlayer(dt) {
    const [ix, iz] = axes(), len = Math.hypot(ix, iz), bike = Gm.has('bakfiets'); let sp = 0, sprinting = false;
    if (len > 0.12) {
      const n = Math.max(1, len), fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const dx = (fx * iz + rx * ix) / n, dz = (fz * iz + rz * ix) / n;
      sprinting = (keys.ShiftLeft || keys.ShiftRight) && (bike || P.stamina > 0.04);
      sp = (sprinting ? 9.4 : 6.2) * (bike ? 1.35 : 1) * Math.min(1, len);
      if (sprinting && !bike) P.stamina = Math.max(0, P.stamina - dt * 0.2);
      const free = W.blocked(P.x, P.z, 0.3); // if something was built on top of us, let us walk out
      const nx = P.x + dx * sp * dt, nz = P.z + dz * sp * dt;
      if (free || !W.blocked(nx, P.z, 0.45)) P.x = nx; if (free || !W.blocked(P.x, nz, 0.45)) P.z = nz;
      P.x = G.clamp(P.x, -W.BOUND, W.BOUND); P.z = G.clamp(P.z, -W.BOUND, W.BOUND);
      P.yaw = G.angLerp(P.yaw, Math.atan2(dx, dz), Math.min(1, dt * 12)); P.faceTo = null;
    } else if (P.faceTo) P.yaw = G.angLerp(P.yaw, Math.atan2(P.faceTo.x - P.x, P.faceTo.z - P.z), Math.min(1, dt * 8));
    if (!sprinting) P.stamina = Math.min(1, P.stamina + dt * 0.16);
    if (keys.Space && P.y <= 0) { P.vy = 6.6; G.Audio.sfx('jump'); }
    P.vy -= 19 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) P.vy = 0;
    P.char.sit = bike && P.bike.visible; P.char.carry.position.set(0, bike ? 0.95 : 1.0, bike ? 1.05 : 0.42);
    P.char.anim(dt, sp);
  }
  function syncPlayer() {
    P.char.g.position.set(P.x, P.y, P.z); P.char.g.rotation.y = first && !S.inTruck ? camYaw + Math.PI : P.yaw;
    P.char.g.visible = !first && !S.inTruck && S.phase !== 'title' && camDistNow > 1.7;
  }
  function updateTruck(dt) {
    const t = S.truck, [ix, iz] = axes();
    if (iz > 0.1) t.v = Math.min(17, t.v + 13 * dt * iz); else if (iz < -0.1) t.v = Math.max(-6, t.v - 18 * dt); else t.v *= 1 - Math.min(1, dt * 1.3);
    t.h -= ix * 2.0 * dt * G.clamp(t.v / 6, -1, 1);
    const nx = t.x + Math.sin(t.h) * t.v * dt, nz = t.z + Math.cos(t.h) * t.v * dt;
    if (!W.blocked(nx, nz, 1.45)) { t.x = nx; t.z = nz; } else if (!W.blocked(nx, t.z, 1.45)) { t.x = nx; t.v *= 0.9; } else if (!W.blocked(t.x, nz, 1.45)) { t.z = nz; t.v *= 0.9; } else t.v *= -0.3;
    t.g.position.set(t.x, 0, t.z); t.g.rotation.y = t.h; P.x = t.x; P.z = t.z; P.yaw = t.h; P.y = 0;
    G.Audio.engine(t.v, true);
    if (Math.abs(t.v) > 1.5 && performance.now() - lastMouseT > 1200) camYaw = G.angLerp(camYaw, t.h + Math.PI, Math.min(1, dt * 2.2));
  }

  /* ---------- interaction ---------- */
  let holdT = 0, holdKey = null;
  function updateInteract(dt) {
    if (!keys.KeyE) eLatch = false;
    if (S.inTruck) {
      const slow = Math.abs(S.truck.v) < 3; UI.prompt(slow ? 'Get out of the truck' : 'Slow down to get out', 0, !slow);
      if (keys.KeyE && !eLatch && slow) { eLatch = true; Gm.exitTruck(); } return;
    }
    let best = null, bd = 1e9;
    for (const it of Gm.interactables()) { const d = G.dist(it.pos, P); if (d > it.r) continue; const score = d + (it.blocked ? 100 : 0); if (score < bd) { bd = score; best = it; } }
    if (!best) { UI.prompt(null); holdT = 0; holdKey = null; return; }
    const key = best.label + '|' + best.pos.x + '|' + best.pos.z; if (key !== holdKey) { holdKey = key; holdT = 0; }
    if (keys.KeyE && !best.blocked) {
      if (best.hold <= 0) { if (!eLatch) { eLatch = true; best.act(); } }
      else if (!eLatch) { holdT += dt; if (holdT >= best.hold) { holdT = 0; holdKey = null; best.act(); } }
    } else holdT = Math.max(0, holdT - dt * 2);
    UI.prompt(best.blocked && !best.keepLabel ? best.blocked : best.label, best.hold > 0 ? holdT / best.hold : 0, !!best.blocked);
  }

  /* ---------- camera ---------- */
  const tgt = new THREE.Vector3(); let titleA = 0;
  function updateCamera(dt) {
    if (S.phase === 'title') { titleA += dt * 0.07; camera.position.set(Math.sin(titleA) * 50 + 8, 26, Math.cos(titleA) * 50); camera.lookAt(8, 3, -4); return; }
    const inTruck = S.inTruck;
    if (first && !inTruck) {
      camera.position.set(P.x, 1.66 + P.y, P.z);
      tgt.set(P.x - Math.sin(camYaw) * Math.cos(fpPitch), 1.66 + P.y + Math.sin(fpPitch), P.z - Math.cos(camYaw) * Math.cos(fpPitch)); camera.lookAt(tgt); return;
    }
    const ty = (inTruck ? 2.4 : 1.55) + P.y * 0.6, want = camDist + (inTruck ? 4 : 0), bx = Math.sin(camYaw) * Math.cos(camPitch), by = Math.sin(camPitch), bz = Math.cos(camYaw) * Math.cos(camPitch);
    let d = want; for (let s = 1.2; s <= want; s += 0.6) if (W.insideSolid(P.x + bx * s, ty + by * s, P.z + bz * s)) { d = Math.max(1.2, s - 0.7); break; }
    camDistNow = d < camDistNow ? d : G.lerp(camDistNow, d, Math.min(1, dt * 5));
    camera.position.set(P.x + bx * camDistNow, ty + by * camDistNow, P.z + bz * camDistNow); tgt.set(P.x, ty, P.z); camera.lookAt(tgt);
  }
  function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();

  /* ---------- title ---------- */
  const save = Gm.load(); if (save && save.day >= 1) { $('btn-continue').hidden = false; $('btn-continue').textContent = `Continue · day ${save.day}`; }
  function begin(fromSave) {
    G.Audio.init(); G.Audio.music('day'); $('title').hidden = true; UI.showHUD(true);
    S = Gm.reset(fromSave || null); Gm.initState && Gm.initState(); rebind(); S.phase = 'cutscene'; Gm.applyWorld();
    const q = new URLSearchParams(location.search); if (q.get('cash')) S.budget = +q.get('cash');
    G.Story.run(fromSave ? fromSave.day : +(q.get('day') || 1)).catch((e) => console.error(e));
  }
  // bins, truck and helpers live on the state object, so carry them over when the state is replaced
  const keep = { bins: S.bins, truck: S.truck, bot: S.bot, drone: S.drone };
  function rebind() { Object.assign(S, keep); }
  $('btn-new').onclick = () => { Gm.clearSave(); begin(null); };
  $('btn-continue').onclick = () => begin(Gm.load());
  G.Audio.music('title');

  /* ---------- frame ---------- */
  let last = performance.now(), flash = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; S = G.S;
    G.tickWaiters(dt); UI.tickDialogue(dt);
    const paused = G.modals > 0 || G.paused || S.phase === 'title' || S.phase === 'cutscene';
    if (!paused) { if (S.inTruck) updateTruck(dt); else { updatePlayer(dt); G.Audio.engine(0, false); } Gm.update(dt); updateInteract(dt); }
    else { UI.prompt(null); P.char.anim(dt, 0); G.Audio.engine(0, false); if (G.modals) eLatch = true; }
    syncPlayer(); G.updateNPCs(dt); G.updatePackets(dt);
    W.mill.rotation.x += dt * 0.5; W.boats.forEach((b, i) => { b.position.y = Math.sin(now / 900 + i * 2) * 0.06; b.rotation.z = Math.sin(now / 1300 + i) * 0.03; });
    if (S.truck) S.truck.beacon.visible = S.inTruck && Math.floor(now / 300) % 2 === 0;
    objBeacon.visible = !!G.objectivePos && S.phase !== 'title'; if (G.objectivePos) { objBeacon.position.x = G.objectivePos.x; objBeacon.position.z = G.objectivePos.z; objBeacon.material.opacity = 0.2 + Math.sin(now / 250) * 0.08; }
    // weather
    rain.visible = S.storm > 0 && S.phase === 'day';
    if (rain.visible) {
      for (let i = 0; i < RAIN; i++) { rainPos[i * 3 + 1] -= dt * 34; if (rainPos[i * 3 + 1] < 0) rainPos[i * 3 + 1] = 30; } rainGeo.attributes.position.needsUpdate = true; rain.position.set(camera.position.x, 0, camera.position.z);
      if (!paused && Math.random() < dt * 0.12) { flash = 0.25; G.Audio.sfx('thunder'); }
      if (flash > 0) { flash -= dt; W.hemi.intensity = 1.5; } else W.hemi.intensity = 0.46;
    }
    updateCamera(dt);
    for (const o of scene.children) if (o.isSprite) { const sc = G.clamp(camera.position.distanceTo(o.position) * 0.05, 0.75, 3.2); o.scale.set(sc, sc, 1); }
    W.sun.position.set(P.x + 30, 55, P.z + 22); W.sun.target.position.set(P.x, 0, P.z);
    if (!$('hud').hidden) UI.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
