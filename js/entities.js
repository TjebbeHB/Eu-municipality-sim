/* Voxelstad — characters, vehicles, props and in-world markers */
(function () {
  const W = G.World, geo = W.geo, mats = {};
  const mat = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c });
  function box(parent, c, sx, sy, sz, x = 0, y = 0, z = 0, glow) {
    const m = new THREE.Mesh(geo, glow ? glowMat(c) : mat(c)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = !glow; parent.add(m); return m;
  }
  G.box = box;

  /* ---------- people ---------- */
  const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68658, 0x8d5a3b, 0xf5d7b8], HAIR = [0x2b2118, 0x5a3a22, 0xa8733a, 0xd8c08a, 0x8a8f96, 0x111111, 0xb5482e];
  const TOPS = [0x3d7be0, 0xd95757, 0xe89a3c, 0x3fb46f, 0x8794a6, 0xb678dd, 0xf2c230, 0x2f8a8a, 0xe58fb1, 0xf3efe6], BOTTOMS = [0x2c3a52, 0x3b3b3b, 0x5a4a3a, 0x1f2a3a, 0x6b7280];
  G.LOOKS = {
    mayor:    { skin: 0xe0ac7e, top: 0x1c2f5a, bottom: 0x1a2233, hair: 0x2b2118, chain: true },
    hanneke:  { skin: 0xf1c9a5, top: 0x2f8a8a, bottom: 0x2c3a52, hair: 0x8a8f96, bun: true },
    joris:    { skin: 0xf5d7b8, top: 0xe07a2a, bottom: 0x3b3b3b, hair: 0x2f5d44, beanie: true },
    fatima:   { skin: 0xc68658, top: 0x7b4fb0, bottom: 0x2c3a52, hair: 0xe4ccff, scarf: true },
    bram:     { skin: 0xe0ac7e, top: 0xff7a1a, bottom: 0x1f2a3a, hair: 0xf2c230, cap: true, vest: true },
    sterling: { skin: 0xf1c9a5, top: 0x0b0d10, bottom: 0x0b0d10, hair: 0x111111, shades: true, tie: 0xffffff },
    dewit:    { skin: 0xf5d7b8, top: 0xb678dd, bottom: 0x6b5a7a, hair: 0xe9e4d8, bun: true, small: true },
    ines:     { skin: 0xc68658, top: 0xd94f4f, bottom: 0x2c3a52, hair: 0x2b2118 },
    builder:  { skin: 0xe0ac7e, top: 0x3d7be0, bottom: 0x5a4a3a, hair: 0xf2c230, cap: true, vest: true },
  };
  G.randomLook = () => ({ skin: G.pick(SKIN), top: G.pick(TOPS), bottom: G.pick(BOTTOMS), hair: G.pick(HAIR), bun: Math.random() < 0.2, cap: Math.random() < 0.15, small: Math.random() < 0.12 });

  G.makeChar = function (look) {
    const g = new THREE.Group(), o = look;
    const limb = (c, sx, sy, sz, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); box(p, c, sx, sy, sz, 0, -sy / 2, 0); g.add(p); return p; };
    const legL = limb(o.bottom, 0.25, 0.75, 0.27, -0.15, 0.75), legR = limb(o.bottom, 0.25, 0.75, 0.27, 0.15, 0.75);
    box(g, o.top, 0.58, 0.66, 0.34, 0, 1.08, 0);
    const armL = limb(o.top, 0.19, 0.62, 0.21, -0.39, 1.38), armR = limb(o.top, 0.19, 0.62, 0.21, 0.39, 1.38);
    box(armL, o.skin, 0.17, 0.14, 0.19, 0, -0.66, 0); box(armR, o.skin, 0.17, 0.14, 0.19, 0, -0.66, 0);
    const head = new THREE.Group(); head.position.y = 1.64; g.add(head);
    box(head, o.skin, 0.44, 0.44, 0.44);
    box(head, 0x1a1a1a, 0.07, 0.07, 0.03, -0.11, 0.03, 0.225); box(head, 0x1a1a1a, 0.07, 0.07, 0.03, 0.11, 0.03, 0.225);
    if (o.scarf) { box(head, o.hair, 0.5, 0.3, 0.5, 0, 0.12, -0.02); box(head, o.hair, 0.5, 0.5, 0.12, 0, -0.05, -0.22); }
    else if (o.beanie) box(head, o.hair, 0.48, 0.22, 0.48, 0, 0.2, 0);
    else { box(head, o.hair, 0.48, 0.16, 0.48, 0, 0.21, 0); box(head, o.hair, 0.48, 0.3, 0.12, 0, 0.06, -0.2); }
    if (o.bun) box(head, o.hair, 0.2, 0.2, 0.2, 0, 0.3, -0.2);
    if (o.cap) { box(head, o.hair, 0.5, 0.14, 0.5, 0, 0.26, 0); box(head, o.hair, 0.4, 0.05, 0.22, 0, 0.2, 0.32); }
    if (o.shades) box(head, 0x0b0d10, 0.46, 0.1, 0.04, 0, 0.03, 0.23);
    if (o.tie) box(g, o.tie, 0.1, 0.4, 0.03, 0, 1.15, 0.18);
    if (o.vest) { box(g, 0xf2f25a, 0.6, 0.12, 0.36, 0, 1.0, 0); box(g, 0xf2f25a, 0.6, 0.12, 0.36, 0, 1.25, 0); }
    if (o.chain) { box(g, 0xf2c230, 0.4, 0.07, 0.04, 0, 1.3, 0.18); box(g, 0xf2c230, 0.14, 0.14, 0.04, 0, 1.17, 0.19); }
    const carry = new THREE.Group(); carry.position.set(0, 1.0, 0.42); g.add(carry);
    if (o.small) g.scale.setScalar(0.88);
    const ch = { g, legL, legR, armL, armR, head, carry, phase: Math.random() * 6, carrying: false, sit: false };
    ch.anim = function (dt, speed) {
      ch.phase += dt * (4 + speed * 1.5);
      const sw = speed > 0.2 ? Math.sin(ch.phase) * Math.min(0.9, 0.25 + speed * 0.09) : 0;
      if (ch.sit) { legL.rotation.x = legR.rotation.x = -1.2; armL.rotation.x = armR.rotation.x = -1.0; return; }
      legL.rotation.x = sw; legR.rotation.x = -sw;
      if (ch.carrying) { armL.rotation.x = armR.rotation.x = -1.25; } else { armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8; }
      head.rotation.y = speed > 0.2 ? 0 : Math.sin(ch.phase * 0.25) * 0.25;
    };
    return ch;
  };

  const ITEM_COLORS = { form: 0xf3efe6, passport: 0x7a1f2e, bag: 0x1c1f22, plans: 0x3d7be0, permit: 0x3fb46f, carefile: 0xe0607e };
  G.ITEMS = { form: 'Application form', passport: 'Document', bag: 'Waste bag', plans: 'Building plans', permit: 'Permit', carefile: 'Care request' };
  G.ITEM_CSS = { form: '#f3efe6', passport: '#a12c40', bag: '#4a5058', plans: '#3d7be0', permit: '#3fb46f', carefile: '#e0607e' };
  G.setCarry = function (ch, items) {
    while (ch.carry.children.length) ch.carry.remove(ch.carry.children[0]);
    items.forEach((it, i) => { const big = it.type === 'bag'; box(ch.carry, ITEM_COLORS[it.type] || 0xffffff, big ? 0.42 : 0.36, big ? 0.36 : 0.08 + 0.04, big ? 0.36 : 0.28, 0, i * (big ? 0.38 : 0.16), 0); });
    ch.carrying = items.length > 0;
  };

  // NPC that walks through a list of waypoints, then calls back
  G.npcs = [];
  G.spawnNPC = function (look, x, z) {
    const ch = G.makeChar(look); ch.g.position.set(x, 0, z); W.scene.add(ch.g);
    const n = { ch, x, z, path: [], speed: G.rand(2.6, 3.4), onArrive: null, face: null, dead: false, mood: 0 };
    n.walk = (pts, cb, speed) => { n.path = pts.map((p) => ({ x: p.x, z: p.z })); n.onArrive = cb || null; if (speed) n.speed = speed; };
    n.remove = () => { n.dead = true; W.scene.remove(ch.g); };
    G.npcs.push(n); return n;
  };
  G.updateNPCs = function (dt) {
    for (let i = G.npcs.length - 1; i >= 0; i--) {
      const n = G.npcs[i]; if (n.dead) { G.npcs.splice(i, 1); continue; }
      let sp = 0;
      if (n.path.length) {
        const t = n.path[0], dx = t.x - n.x, dz = t.z - n.z, d = Math.hypot(dx, dz), stepLen = n.speed * dt;
        if (d <= stepLen) { n.x = t.x; n.z = t.z; n.path.shift(); if (!n.path.length && n.onArrive) { const cb = n.onArrive; n.onArrive = null; cb(n); } }
        else { n.x += (dx / d) * stepLen; n.z += (dz / d) * stepLen; n.ch.g.rotation.y = G.angLerp(n.ch.g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 10)); sp = n.speed; }
      } else if (n.face) n.ch.g.rotation.y = G.angLerp(n.ch.g.rotation.y, Math.atan2(n.face.x - n.x, n.face.z - n.z), Math.min(1, dt * 6));
      n.ch.g.position.set(n.x, n.mood > 0 ? Math.abs(Math.sin(n.mood * 12)) * 0.25 : 0, n.z); if (n.mood > 0) n.mood -= dt;
      n.ch.anim(dt, sp);
    }
  };
  // ambient townsfolk wandering the road graph
  G.spawnWanderer = function () {
    const start = Math.floor(Math.random() * W.graph.n.length), p = W.graph.n[start], off = () => G.rand(-2, 2);
    const n = G.spawnNPC(G.randomLook(), p[0] + off(), p[1] + off()); n.ambient = true; n.node = start; n.speed = G.rand(1.6, 2.4);
    const next = () => { const opts = W.graph.e.filter((e) => e.includes(n.node)).map((e) => (e[0] === n.node ? e[1] : e[0])); n.node = G.pick(opts); const q = W.graph.n[n.node]; n.walk([{ x: q[0] + G.rand(-2.2, 2.2), z: q[1] + G.rand(-2.2, 2.2) }], () => setTimeout(next, G.rand(200, 2500))); };
    next(); return n;
  };

  /* ---------- markers ---------- */
  const TYPE = (G.TYPE = {
    doc: { c: '#3d7be0', name: 'Documents' }, waste: { c: '#3fb46f', name: 'Waste' }, road: { c: '#e89a3c', name: 'Roads' }, permit: { c: '#b678dd', name: 'Permits' }, care: { c: '#e0607e', name: 'Care' },
    talk: { c: '#f2c230', name: 'Talk' }, lab: { c: '#19b89a', name: 'Lab' }, door: { c: '#f3efe6', name: 'Door' }, alert: { c: '#e03535', name: 'Alert' }, safe: { c: '#4da3ff', name: 'Safe' },
  });
  const texCache = {};
  function badgeTex(type) {
    if (texCache[type]) return texCache[type];
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d');
    c.fillStyle = '#0b1019'; c.beginPath(); c.arc(48, 48, 46, 0, 7); c.fill();
    c.fillStyle = TYPE[type].c; c.beginPath(); c.arc(48, 48, 40, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
    if (type === 'doc') { c.fillRect(31, 24, 34, 48); c.fillStyle = TYPE.doc.c; c.fillRect(37, 34, 22, 5); c.fillRect(37, 45, 22, 5); c.fillRect(37, 56, 14, 5); }
    else if (type === 'waste') { c.fillRect(28, 27, 40, 7); c.fillRect(41, 21, 14, 7); c.beginPath(); c.moveTo(32, 38); c.lineTo(64, 38); c.lineTo(60, 74); c.lineTo(36, 74); c.fill(); }
    else if (type === 'road') { c.beginPath(); c.moveTo(48, 20); c.lineTo(64, 66); c.lineTo(32, 66); c.fill(); c.fillRect(24, 66, 48, 8); c.fillStyle = TYPE.road.c; c.fillRect(38, 44, 20, 6); }
    else if (type === 'permit') { c.beginPath(); c.moveTo(48, 22); c.lineTo(72, 44); c.lineTo(64, 44); c.lineTo(64, 72); c.lineTo(32, 72); c.lineTo(32, 44); c.lineTo(24, 44); c.fill(); c.fillStyle = TYPE.permit.c; c.fillRect(43, 54, 10, 18); }
    else if (type === 'care') { c.beginPath(); c.moveTo(48, 72); c.bezierCurveTo(14, 48, 28, 20, 48, 36); c.bezierCurveTo(68, 20, 82, 48, 48, 72); c.fill(); }
    else { c.fillStyle = type === 'door' || type === 'talk' ? '#16130a' : '#fff'; c.font = '900 54px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText({ talk: '!', lab: '€', door: 'Zz', alert: '!', safe: '✓' }[type] || '?', 48, 52, 70); }
    return (texCache[type] = new THREE.CanvasTexture(cv));
  }
  G.makeBadge = function (type, scale = 1.25) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(type), depthTest: false, transparent: true })); s.scale.set(scale, scale, 1); s.renderOrder = 10;
    const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x3fb46f, depthTest: false })); bar.scale.set(1, 0.12, 1); bar.center.set(0, 0.5); bar.position.set(-0.5, -0.64, 0); bar.renderOrder = 10; bar.visible = false; s.add(bar); s.bar = bar;
    s.setType = (t) => { s.material.map = badgeTex(t); };
    s.setBar = (f) => { bar.visible = true; bar.scale.x = Math.max(0.03, f); bar.material.color.setHex(f > 0.5 ? 0x3fb46f : f > 0.25 ? 0xe89a3c : 0xe05555); };
    W.scene.add(s); return s;
  };
  G.makeBeacon = function (color = 0xf2c230) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    m.position.y = 15; m.visible = false; W.scene.add(m); return m;
  };

  /* ---------- bins and potholes ---------- */
  G.makeBin = function (x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    box(g, 0x2f6f4f, 0.8, 1.0, 0.8, 0, 0.5, 0); box(g, 0x24573d, 0.9, 0.12, 0.9, 0, 1.06, 0);
    const heap = box(g, 0x1c1f22, 0.7, 0.5, 0.7, 0, 1.2, 0); heap.visible = false;
    const sensor = box(g, 0x64ff9a, 0.16, 0.16, 0.16, 0.3, 1.2, 0.3, true); sensor.visible = false;
    const litter = new THREE.Group(); for (let i = 0; i < 5; i++) box(litter, G.pick([0x1c1f22, 0xe9e4d8, 0xd94f4f]), 0.3, 0.26, 0.3, G.rand(-1.1, 1.1), 0.13, G.rand(-1.1, 1.1)); litter.visible = false; g.add(litter);
    W.scene.add(g); W.colliders.push({ x0: x - 0.4, z0: z - 0.4, x1: x + 0.4, z1: z + 0.4, h: 1.1 });
    return { x, z, fill: G.rand(0.1, 0.45), rate: G.rand(0.75, 1.25), g, heap, sensor, litter, seen: false };
  };
  G.makePothole = function (x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    box(g, 0x16181b, 1.5, 0.03, 1.2, 0, 0.075, 0); box(g, 0x16181b, 0.9, 0.03, 1.6, 0.2, 0.076, 0.1);
    const cone = new THREE.Group(); box(cone, 0xe07a2a, 0.5, 0.08, 0.5, 0, 0.04, 0); box(cone, 0xe07a2a, 0.3, 0.5, 0.3, 0, 0.33, 0); box(cone, 0xf3efe6, 0.32, 0.12, 0.32, 0, 0.4, 0); cone.position.set(0.9, 0.08, 0.7); cone.visible = false; g.add(cone);
    W.scene.add(g); return { x, z, g, cone, known: false, age: 0, job: null };
  };

  /* ---------- vehicles ---------- */
  G.makeTruck = function () {
    const g = new THREE.Group();
    box(g, 0x2e7d4f, 1.9, 1.5, 2.9, 0, 1.25, -0.55); box(g, 0x24573d, 1.94, 0.2, 2.94, 0, 0.55, -0.55);
    box(g, 0xf3efe6, 1.86, 1.25, 1.25, 0, 1.12, 1.55); box(g, 0x8fc7e8, 1.7, 0.5, 0.06, 0, 1.4, 2.19); box(g, 0x1c1f22, 1.9, 0.3, 4.2, 0, 0.4, 0.1);
    for (const [x, z] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.2], [0.9, -1.2]]) box(g, 0x16181b, 0.3, 0.7, 0.7, x, 0.35, z);
    const beacon = box(g, 0xffa53a, 0.3, 0.2, 0.3, 0, 1.85, 1.5, true);
    box(g, 0xf2c230, 0.5, 0.3, 0.06, -0.55, 0.75, 2.19, true); box(g, 0xf2c230, 0.5, 0.3, 0.06, 0.55, 0.75, 2.19, true);
    const p = W.LOC.truckPark; g.position.set(p.x, 0, p.z); g.rotation.y = -Math.PI / 2; W.scene.add(g);
    return { g, beacon, x: p.x, z: p.z, h: -Math.PI / 2, v: 0, load: 0, loadT: 0 };
  };
  G.makeBot = function () {
    const g = new THREE.Group(); box(g, 0xf3efe6, 1.1, 0.7, 1.6, 0, 0.6, 0); box(g, 0x2f8a4f, 1.14, 0.2, 1.64, 0, 0.3, 0); box(g, 0x64ff9a, 0.9, 0.1, 0.06, 0, 0.75, 0.82, true);
    for (const [x, z] of [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]]) box(g, 0x16181b, 0.2, 0.4, 0.4, x, 0.2, z);
    g.visible = false; W.scene.add(g); const d = W.LOC.depotDump;
    return { g, x: d.x - 3, z: d.z + 4, path: [], target: null, wait: 0 };
  };
  G.makeDrone = function () {
    const g = new THREE.Group(); box(g, 0x2c333d, 0.7, 0.25, 0.7); box(g, 0xe89a3c, 0.3, 0.12, 0.3, 0, -0.18, 0, true);
    const rot = []; for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { box(g, 0x2c333d, 0.1, 0.08, 0.1, x * 0.6, 0.02, z * 0.6); rot.push(box(g, 0xdfe6ef, 0.7, 0.03, 0.1, x, 0.14, z)); }
    g.visible = false; W.scene.add(g);
    return { g, rot, x: 30, y: 0.5, z: -5, target: null, state: 'idle', t: 0 };
  };

  /* ---------- data packets: little lights that fly between buildings ---------- */
  const packets = [];
  G.sendPacket = function (from, to, color = 0x54e0ff) {
    const m = new THREE.Mesh(geo, glowMat(color)); m.scale.setScalar(0.35); W.scene.add(m);
    packets.push({ m, from, to, t: 0, dur: Math.max(0.5, Math.hypot(to.x - from.x, to.z - from.z) / 40) });
  };
  G.updatePackets = function (dt) {
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]; p.t += dt / p.dur;
      if (p.t >= 1) { W.scene.remove(p.m); packets.splice(i, 1); continue; }
      p.m.position.set(G.lerp(p.from.x, p.to.x, p.t), 2 + Math.sin(p.t * Math.PI) * 7, G.lerp(p.from.z, p.to.z, p.t)); p.m.rotation.y += dt * 8;
    }
  };
})();
