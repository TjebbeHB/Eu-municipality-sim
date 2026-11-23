/* Voxelstad — the town: voxel batching, buildings, colliders and named locations */
(function () {
  const W = (G.World = { colliders: [], features: {}, bins: [], signs: [], BOUND: 54 });
  const geo = (W.geo = new THREE.BoxGeometry(1, 1, 1));
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), C = new THREE.Color();
  const WIN = 0xffdf9a;

  class Batch {
    constructor() { this.s = []; this.g = []; }
    box(x, y, z, sx, sy, sz, c, j) { this.s.push([x, y, z, sx, sy, sz, c, j || 0]); }
    glow(x, y, z, sx, sy, sz, c) { this.g.push([x, y, z, sx, sy, sz, c, 0]); }
    // hollow block of unit voxels: walls and top only, min-corner origin
    shell(x0, y0, z0, w, h, d, c, j = 0.08, top = true) {
      for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++)
        if (x === 0 || x === w - 1 || z === 0 || z === d - 1 || (top && y === h - 1)) this.box(x0 + x + 0.5, y0 + y + 0.5, z0 + z + 0.5, 1, 1, 1, c, j);
    }
    build(parent) {
      const out = new THREE.Group();
      for (const [list, mat] of [[this.s, W.matSolid], [this.g, W.matGlow]]) {
        if (!list.length) continue;
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((b, i) => {
          M4.compose(V.set(b[0], b[1], b[2]), Q, SC.set(b[3], b[4], b[5])); im.setMatrixAt(i, M4);
          C.setHex(b[6]); if (b[7]) C.multiplyScalar(1 + (Math.random() - 0.5) * b[7]); im.setColorAt(i, C);
        });
        im.frustumCulled = false; im.castShadow = im.receiveShadow = mat === W.matSolid;
        out.add(im);
      }
      parent.add(out); return out;
    }
  }
  W.Batch = Batch;

  const col = (x0, z0, x1, z1, h = 6, feat) => W.colliders.push({ x0, z0, x1, z1, h, feat });
  W.blocked = function (x, z, r) {
    if (Math.abs(x) > W.BOUND || Math.abs(z) > W.BOUND) return true;
    for (const c of W.colliders) {
      if (c.feat && !W.features[c.feat].visible) continue;
      if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
    }
    return false;
  };
  W.insideSolid = function (x, y, z) { // for the camera boom
    for (const c of W.colliders) {
      if (c.h < 4 || (c.feat && !W.features[c.feat].visible)) continue;
      if (y < c.h && x > c.x0 - 0.3 && x < c.x1 + 0.3 && z > c.z0 - 0.3 && z < c.z1 + 0.3) return true;
    }
    return false;
  };
  function feature(name, fn) { const b = new Batch(); fn(b); const g = b.build(W.scene); g.visible = false; W.features[name] = g; }
  W.show = (name, on = true) => { if (W.features[name]) W.features[name].visible = on; };

  function roof(b, o) {
    const w = o.x1 - o.x0, d = o.z1 - o.z0, cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, h = o.h, rc = o.roof;
    if (o.type === 'flat') { b.box(cx, h + 0.15, cz, w + 0.4, 0.3, d + 0.4, rc); return; }
    const ridgeX = o.ridge ? o.ridge === 'x' : w >= d;
    for (let s = 0; s < 12; s++) {
      const sw = o.type === 'hip' || !ridgeX ? w + 0.8 - s * 2 : w + 0.6, sd = o.type === 'hip' || ridgeX ? d + 0.8 - s * 2 : d + 0.6;
      if (sw <= 0.2 || sd <= 0.2) break;
      b.box(cx, h + s * 0.8 + 0.4, cz, sw, 0.8, sd, rc, 0.05);
      if (o.step) { // stepped gable on both ends
        const t = 0.5;
        if (ridgeX) { b.box(o.x0 + t / 2, h + s * 0.8 + 0.55, cz, t, 1.1, Math.max(0.8, sd - 0.4), o.wall, 0.05); b.box(o.x1 - t / 2, h + s * 0.8 + 0.55, cz, t, 1.1, Math.max(0.8, sd - 0.4), o.wall, 0.05); }
        else { b.box(cx, h + s * 0.8 + 0.55, o.z0 + t / 2, Math.max(0.8, sw - 0.4), 1.1, t, o.wall, 0.05); b.box(cx, h + s * 0.8 + 0.55, o.z1 - t / 2, Math.max(0.8, sw - 0.4), 1.1, t, o.wall, 0.05); }
      }
    }
  }
  function building(b, o) {
    const w = o.x1 - o.x0, d = o.z1 - o.z0;
    b.shell(o.x0, 0, o.z0, w, o.h, d, o.wall, 0.09);
    if (!o.noCol) col(o.x0, o.z0, o.x1, o.z1, o.h + 3, o.feat);
    const wc = o.winColor || WIN;
    if (o.win !== false) for (let y = 1.7; y < o.h - 0.5; y += 3) {
      for (let x = o.x0 + 1.25; x < o.x1 - 0.8; x += 2.5) { b.glow(x, y, o.z0 - 0.03, 1, 1.3, 0.1, wc); b.glow(x, y, o.z1 + 0.03, 1, 1.3, 0.1, wc); }
      for (let z = o.z0 + 1.25; z < o.z1 - 0.8; z += 2.5) { b.glow(o.x0 - 0.03, y, z, 0.1, 1.3, 1, wc); b.glow(o.x1 + 0.03, y, z, 0.1, 1.3, 1, wc); }
    }
    if (o.door) {
      const dc = o.doorColor || 0x3b2a20, at = o.doorAt;
      if (o.door === 'n') b.box(at, 1.2, o.z0 - 0.08, 1.5, 2.4, 0.2, dc);
      if (o.door === 's') b.box(at, 1.2, o.z1 + 0.08, 1.5, 2.4, 0.2, dc);
      if (o.door === 'w') b.box(o.x0 - 0.08, 1.2, at, 0.2, 2.4, 1.5, dc);
      if (o.door === 'e') b.box(o.x1 + 0.08, 1.2, at, 0.2, 2.4, 1.5, dc);
    }
    roof(b, o);
  }
  function tree(b, x, z, s = 1, noCol) {
    b.box(x, 0.9 * s, z, 0.5, 1.8 * s, 0.5, 0x6b4a2b);
    b.box(x, 2.5 * s, z, 2.3 * s, 1.7 * s, 2.3 * s, 0x3f8a4a, 0.2); b.box(x, 3.6 * s, z, 1.4 * s, 1.0 * s, 1.4 * s, 0x4f9d58, 0.2);
    if (!noCol) col(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 1.5);
  }
  function lamp(b, x, z) { b.box(x, 1.6, z, 0.14, 3.2, 0.14, 0x2c333d); b.box(x, 3.25, z, 0.5, 0.1, 0.5, 0x2c333d); b.glow(x, 3.05, z, 0.34, 0.3, 0.34, 0xffe9b0); }
  function sign(text, x, y, z, rotY, w = 4, bg = '#16213a', fg = '#f2c230') {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const c = cv.getContext('2d');
    c.fillStyle = bg; c.fillRect(0, 0, 512, 96); c.fillStyle = fg; c.font = '800 54px Archivo, Arial Black, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, 256, 52, 480);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
    m.position.set(x, y, z); m.rotation.y = rotY; W.scene.add(m); W.signs.push(m); return m;
  }

  /* ---------- named places ---------- */
  const LOC = (W.LOC = {
    counter: [{ x: -7, z: -9.8 }, { x: -4, z: -9.8 }, { x: -1, z: -9.8 }],
    queue: (i) => ({ x: -7.6 + i * 1.25, z: -7 }),
    hallDoor: { x: 5, z: -10.6 }, archive: { x: -3, z: 12.7 }, lab: { x: 16, z: -13.8 },
    planning: { x: 26.9, z: -20 }, social: { x: -11, z: 27.1 }, depotDump: { x: 35.5, z: -3 }, depotDoor: { x: 37.6, z: -4.5 },
    truckPark: { x: 31, z: 4.6 }, kiosk: { x: 10, z: -7.3 }, dc: { x: 31, z: 11 }, start: { x: 3, z: -7 },
    entries: [[{ x: -21, z: 0 }, { x: -13, z: 0 }], [{ x: 22, z: 0 }, { x: 13, z: 0 }], [{ x: 8, z: 22 }, { x: 8, z: 10 }]],
    homes: [
      { x: -39.2, z: 10, name: 'Mevrouw De Wit', addr: 'Westkade 12' },
      { x: -9.5, z: -31.2, name: 'Mr Yilmaz', addr: 'Noordstraat 8' },
      { x: 11.5, z: -31.2, name: 'The Jansen family', addr: 'Noordstraat 22' },
      { x: 7.5, z: 27.2, name: 'Mr Bakker', addr: 'Zuidlaan 5' },
      { x: 37.5, z: -31.2, name: 'Ms Okafor', addr: 'Molenweg 3' },
    ],
    lots: [{ x: 31, z: 18.5, f: 21.9 }, { x: 38, z: 18.5, f: 21.9 }, { x: 44, z: 18.5, f: 21.9 }, { x: 30, z: 31, f: 27.3 }, { x: 37, z: 31, f: 27.3 }, { x: 44, z: 31, f: 27.3 }],
    stalls: [{ x: -9.5, z: 7.5 }, { x: -5.5, z: 7.5 }, { x: 4.5, z: 7.8 }, { x: 11, z: 5.5 }],
    binSpots: [[-12.5, 9.5], [12.5, 9.5], [-26, -12], [-26, 12], [2, -24.6], [27.6, -12], [27.6, 16], [-3, 27.2], [22, 27.2], [-35.6, -8], [-35.6, 16], [40.5, 27.2]],
    nodes: {
      hall: { x: 0, y: 9.5, z: -13.5, at: 'hallDoor', name: 'Town Hall' }, archive: { x: -3, y: 9, z: 17, at: 'archive', name: 'Archive' },
      planning: { x: 32, y: 9.5, z: -20, at: 'planning', name: 'Planning office' }, social: { x: -11, y: 7, z: 31, at: 'social', name: 'Social office' },
      depot: { x: 42, y: 7, z: -4.5, at: 'depotDoor', name: 'Depot' }, lab: { x: 16, y: 7.5, z: -17.5, at: 'lab', name: 'The Lab' },
    },
    links: [['hall', 'lab'], ['hall', 'archive'], ['hall', 'planning'], ['hall', 'social'], ['lab', 'depot'], ['planning', 'depot'], ['archive', 'social']],
  });
  // road graph for pedestrians, the collector bot and pothole placement
  W.graph = {
    n: [[-22, -28], [0, -28], [24, -28], [24, 0], [24, 24], [0, 24], [-22, 24], [-22, 0], [33, 0], [-38, -28], [-38, 24], [42, -28], [42, 24], [0, 0], [-38, 0]],
    e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [3, 8], [0, 9], [6, 10], [2, 11], [4, 12], [7, 13], [13, 3], [9, 14], [14, 10]],
  };
  W.roadEdges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [0, 9], [6, 10], [2, 11], [4, 12]];
  W.graphPath = function (from, to) { // BFS over node indices
    const adj = W.graph.n.map(() => []); W.graph.e.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    const prev = new Array(adj.length).fill(-1), q = [from]; prev[from] = from;
    while (q.length) { const c = q.shift(); if (c === to) break; for (const n of adj[c]) if (prev[n] < 0) { prev[n] = c; q.push(n); } }
    const path = []; for (let c = to; c !== from; c = prev[c]) { if (c < 0) return [to]; path.unshift(c); } return path;
  };
  W.nearestNode = (p) => { let bi = 0, bd = 1e9; W.graph.n.forEach((n, i) => { const d = Math.hypot(n[0] - p.x, n[1] - p.z); if (d < bd) { bd = d; bi = i; } }); return bi; };
  W.randomRoadPoint = function () {
    const [a, b] = G.pick(W.roadEdges), A = W.graph.n[a], B = W.graph.n[b], t = G.rand(0.12, 0.88), horiz = A[1] === B[1], off = G.rand(-1.6, 1.6);
    return { x: G.lerp(A[0], B[0], t) + (horiz ? 0 : off), z: G.lerp(A[1], B[1], t) + (horiz ? off : 0) };
  };

  /* ---------- build ---------- */
  W.build = function (scene) {
    W.scene = scene;
    W.matSolid = new THREE.MeshLambertMaterial();
    W.matGlow = new THREE.MeshBasicMaterial();
    const b = new Batch();
    const BRICK = [0xa5523d, 0xb86b4b, 0x8f4a3a, 0xc98a5e, 0xd9c7a8, 0x9c6e5a, 0x7d8a99], ROOF = [0x4a3b3b, 0x7a4636, 0x39424d, 0x5a3a33];

    // ground, grass patches, tulip fields
    b.box(0, -0.5, 0, 124, 1, 124, 0x5f8f4e);
    for (let i = 0; i < 260; i++) b.box(G.rand(-60, 60), 0.01, G.rand(-60, 60), G.rand(2, 5), 0.02, G.rand(2, 5), G.pick([0x578746, 0x679a55, 0x5a8a4a]));
    [0xd94f4f, 0xf2c230, 0xe58fb1, 0x9a6fd0, 0xf08a3c, 0xf3efe6].forEach((c, i) => { b.box(-4, 0.09, -45.5 - i * 1.7, 52, 0.18, 1.1, c, 0.1); b.box(0, 0.09, 43 + i * 1.7, 30, 0.18, 1.1, c, 0.1); });

    // roads
    const RD = 0x3d434b, DASH = 0xd9d4c2;
    const roadX = (z, x0, x1) => { b.box((x0 + x1) / 2, 0.03, z, x1 - x0, 0.06, 5, RD); for (let x = x0 + 2; x < x1 - 1; x += 4) b.box(x, 0.065, z, 1.4, 0.01, 0.16, DASH); };
    const roadZ = (x, z0, z1) => { b.box(x, 0.03, (z0 + z1) / 2, 5, 0.06, z1 - z0, RD); for (let z = z0 + 2; z < z1 - 1; z += 4) b.box(x, 0.065, z, 0.16, 0.01, 1.4, DASH); };
    roadX(-28, -47, 47); roadX(24, -47, 47); roadZ(-22, -25.5, 21.5); roadZ(24, -25.5, 21.5); roadX(0, 26.5, 30);
    b.box(-38, 0.03, -2, 3, 0.06, 47, 0x8d877b);                 // west quay path
    b.box(-16.75, 0.03, 0, 5.5, 0.06, 4, 0x9a958a); b.box(17.75, 0.03, 0, 7.5, 0.06, 4, 0x9a958a); b.box(8, 0.03, 16.25, 4, 0.06, 10.5, 0x9a958a);
    for (let x = -14; x < 14; x++) for (let z = -11; z < 11; z++) b.box(x + 0.5, 0.04, z + 0.5, 1, 0.08, 1, (x + z) & 1 ? 0x968f82 : 0x8a8377, 0.06);

    // canal, quays, bridges
    const water = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x3b7ea8, transparent: true, opacity: 0.92 }));
    water.scale.set(5.2, 0.05, 124); water.position.set(-31.5, 0.035, 0); scene.add(water); W.water = water;
    [[-62, -30.7], [-25.3, 21.3], [26.7, 62]].forEach(([z0, z1]) => {
      b.box(-34.3, 0.2, (z0 + z1) / 2, 0.6, 0.4, z1 - z0, 0x8a8f96); b.box(-28.7, 0.2, (z0 + z1) / 2, 0.6, 0.4, z1 - z0, 0x8a8f96);
      col(-34.5, z0, -28.5, z1, 0.5);
    });
    [-28, 24].forEach((z) => { b.box(-31.5, 0.1, z, 7, 0.2, 5.4, 0x8d8375); b.box(-31.5, 0.6, z - 2.6, 7, 0.9, 0.25, 0x6d6459); b.box(-31.5, 0.6, z + 2.6, 7, 0.9, 0.25, 0x6d6459); });
    W.boats = [[-31.5, -10, 0x8f4a3a], [-31.8, 8, 0x2f5d44], [-31.2, 38, 0x39424d]].map(([x, z, c]) => {
      const g = new THREE.Group(), mk = (cc, sx, sy, sz, y, zz = 0) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: cc })); m.scale.set(sx, sy, sz); m.position.set(0, y, zz); g.add(m); };
      mk(c, 1.8, 0.5, 4.4, 0.3); mk(0xd9c7a8, 1.4, 0.7, 1.6, 0.85, -0.6); g.position.set(x, 0, z); scene.add(g); return g;
    });

    // ---- Town Hall ----
    b.shell(-9, 0, -22, 18, 7, 10, 0xa5523d, 0.09); col(-9, -22, 9, -12, 14);
    b.box(0, 0.4, -11.93, 18.2, 0.8, 0.22, 0xcbc3b2); b.box(0, 7.2, -17, 18.8, 0.4, 10.8, 0xcbc3b2);
    for (let s = 0; s < 4; s++) b.box(0, 7.85 + s * 0.9, -17, 18 - s * 3.4, 0.9, 10 - s * 2.4, 0x39424d, 0.05);
    b.shell(-2, 7, -19, 4, 7, 4, 0xa5523d, 0.09); b.box(0, 14.3, -17, 4.8, 0.6, 4.8, 0xcbc3b2);
    b.box(0, 15.4, -17, 3, 1.6, 3, 0x39424d); b.box(0, 16.8, -17, 1.8, 1.2, 1.8, 0x39424d); b.box(0, 18.3, -17, 0.5, 1.8, 0.5, 0xf2c230);
    b.glow(0, 12, -14.94, 1.9, 1.9, 0.1, 0xfff4d0); b.box(0, 12.3, -14.88, 0.14, 0.8, 0.05, 0x222222); b.box(0.3, 12, -14.88, 0.6, 0.14, 0.05, 0x222222);
    for (let x = -7.5; x <= 7.5; x += 2.5) { b.glow(x, 5, -11.96, 1.1, 1.7, 0.1, WIN); b.glow(x, 5, -22.04, 1.1, 1.7, 0.1, WIN); b.glow(x, 2, -22.04, 1.1, 1.7, 0.1, WIN); }
    for (let z = -20.5; z <= -13; z += 2.5) for (const y of [2, 5]) { b.glow(-9.04, y, z, 0.1, 1.7, 1.1, WIN); b.glow(9.04, y, z, 0.1, 1.7, 1.1, WIN); }
    b.box(5, 1.5, -11.9, 2.2, 3, 0.25, 0x3b2a20); b.box(5, 3.2, -11.9, 2.8, 0.4, 0.3, 0xcbc3b2); b.box(5, 0.1, -11.2, 3.6, 0.2, 1.4, 0xcbc3b2);
    LOC.counter.forEach((c, i) => {
      b.glow(c.x, 2.15, -11.96, 2, 1.5, 0.1, 0xfff0c0); b.box(c.x, 1.1, -11.6, 2.4, 0.2, 0.9, 0x7a5536); b.box(c.x, 0.5, -11.75, 2.2, 1, 0.5, 0x8a6442);
      for (let k = 0; k < 4; k++) b.box(c.x - 1.05 + k * 0.7, 3.25, -11.3, 0.7, 0.22, 1.5, k % 2 ? 0xd94f4f : 0xf0e9da);
      col(c.x - 1.2, -12, c.x + 1.2, -11.15, 1.2);
    });
    sign('TOWN HALL', 0, 6.3, -11.85, 0, 6);

    // ---- The Lab (shipping containers behind the square) ----
    b.shell(13, 0, -20, 6, 3, 5, 0x2e6e8e, 0.06); b.shell(14, 3, -20, 5, 3, 3, 0xd9772e, 0.06); col(13, -20, 19, -15, 7);
    for (let x = 13.5; x < 19; x += 1) b.box(x, 1.5, -14.96, 0.12, 2.6, 0.1, 0x25596f);
    b.box(14.2, 1.2, -14.9, 1.3, 2.4, 0.2, 0x1d3f52); b.glow(16.6, 1.7, -14.92, 1.5, 0.9, 0.1, 0x7fffd0); b.box(16.6, 0.95, -14.6, 1.8, 0.12, 0.7, 0x4a3b3b);
    b.box(18.2, 7.6, -19, 0.12, 3.2, 0.12, 0x9aa5b5); b.glow(18.2, 9.3, -19, 0.3, 0.3, 0.3, 0xff5555); b.box(15, 6.4, -18.5, 1.4, 0.8, 1.4, 0xdfe6ef);
    b.box(19.6, 0.5, -16, 0.9, 1, 0.9, 0x8a6442, 0.1); b.box(19.6, 1.3, -16.1, 0.7, 0.6, 0.7, 0x8a6442, 0.1);
    sign('THE LAB', 16, 3.6, -14.9, 0, 3.4, '#0e2a36', '#7fffd0');

    // ---- Archive ----
    building(b, { x0: -7, z0: 14, x1: 1, z1: 20, h: 6, wall: 0x8f4a3a, roof: 0x4a3b3b, type: 'gable', ridge: 'x', step: true, door: 'n', doorAt: -3, doorColor: 0x2f5d44 });
    sign('ARCHIVE', -3, 3.3, 13.9, Math.PI, 3.6);

    // ---- Planning office (glass) ----
    b.shell(28, 0, -24, 8, 8, 8, 0x9db0c2, 0.04); col(28, -24, 36, -16, 11);
    for (let y = 1.6; y < 8; y += 2.2) { for (let x = 29; x < 36; x += 2) { b.glow(x + 0.5, y, -24.04, 1.6, 1.5, 0.1, 0xbfe6ff); b.glow(x + 0.5, y, -15.96, 1.6, 1.5, 0.1, 0xbfe6ff); } for (let z = -23; z < -16; z += 2) { b.glow(27.96, y, z + 0.5, 0.1, 1.5, 1.6, 0xbfe6ff); b.glow(36.04, y, z + 0.5, 0.1, 1.5, 1.6, 0xbfe6ff); } }
    b.box(32, 8.3, -20, 8.6, 0.6, 8.6, 0xe89a3c); b.box(27.9, 1.3, -20, 0.2, 2.6, 1.8, 0x2c333d);
    sign('PLANNING', 27.9, 3.4, -20, -Math.PI / 2, 3.6);

    // ---- Social office ----
    building(b, { x0: -16, z0: 28, x1: -6, z1: 35, h: 4, wall: 0xdcc9a6, roof: 0xb0586e, type: 'hip', door: 'n', doorAt: -11, doorColor: 0xb0586e });
    sign('SOCIAL OFFICE', -11, 3.2, 27.9, Math.PI, 4.4, '#5a2434', '#ffe1ea');

    // ---- Depot ----
    b.box(37, 0.03, 0, 19, 0.06, 16.4, 0x8b8d8f);
    building(b, { x0: 39, z0: -8, x1: 46, z1: -1, h: 5, wall: 0x6f7783, roof: 0x4d545e, type: 'flat', win: false });
    b.box(38.92, 2, -4.5, 0.2, 4, 4.2, 0xe07a2a); for (let y = 0.6; y < 4; y += 0.8) b.box(38.8, y, -4.5, 0.1, 0.08, 4.2, 0xb85f1c);
    b.box(35.5, 0.8, -5.2, 3.6, 1.6, 2.2, 0x2e7d4f); b.box(35.5, 1.65, -5.2, 3.2, 0.1, 1.8, 0x1c1f22); col(33.7, -6.3, 37.3, -4.1, 1.8);
    b.box(44, 0.9, 5.5, 3, 1.8, 3, 0xe9e4d8, 0.1); b.box(44, 2.1, 5.5, 1.8, 0.8, 1.8, 0xe9e4d8, 0.1); col(42.5, 4, 45.5, 7, 2);
    for (let i = 0; i < 3; i++) { b.box(40 + i * 0.7, 0.35, 6.5, 0.4, 0.7, 0.4, 0xe07a2a); b.box(40 + i * 0.7, 0.75, 6.5, 0.2, 0.3, 0.2, 0xf3efe6); }
    for (let x = 28; x <= 46; x += 3) b.box(x, 0.6, 8.2, 0.2, 1.2, 0.2, 0x4d545e); b.box(37, 1.0, 8.2, 18, 0.1, 0.1, 0x4d545e);
    sign('DEPOT', 38.9, 4.6, -4.5, -Math.PI / 2, 3, '#3a2a12', '#ffb35c');

    // ---- shops and houses around the square ----
    [[-10, -6.5], [-6.5, -3], [3, 6.5], [6.5, 10]].forEach(([z0, z1], i) => {
      building(b, { x0: -19, z0, x1: -15, z1, h: 5 + (i % 2), wall: BRICK[i % 7], roof: ROOF[i % 4], type: 'gable', ridge: 'x', step: true, door: 'e', doorAt: (z0 + z1) / 2 });
      building(b, { x0: 15, z0, x1: 19.5, z1, h: 6 - (i % 2), wall: BRICK[(i + 3) % 7], roof: ROOF[(i + 1) % 4], type: 'gable', ridge: 'x', step: true, door: 'w', doorAt: (z0 + z1) / 2 });
      for (let k = 0; k < 4; k++) b.box(14.3, 2.9, z0 + 0.6 + k * 0.75, 1.3, 0.16, 0.75, k % 2 ? (i % 2 ? 0x2f5d44 : 0x2f5fd0) : 0xf0e9da);
    });
    [[13.2, 4], [13.2, 7.5], [-13.6, -8]].forEach(([x, z]) => { b.box(x, 0.75, z, 0.9, 0.1, 0.9, 0xe9e4d8); b.box(x, 0.37, z, 0.14, 0.74, 0.14, 0x2c333d); b.box(x, 0.3, z + 0.9, 0.4, 0.6, 0.4, 0x7a5536); b.box(x, 0.3, z - 0.9, 0.4, 0.6, 0.4, 0x7a5536); });
    building(b, { x0: -19, z0: -24, x1: -12, z1: -19.5, h: 5, wall: BRICK[4], roof: ROOF[1], type: 'gable', ridge: 'x', door: 's', doorAt: -15.5 });
    building(b, { x0: -19, z0: -18.5, x1: -12, z1: -14, h: 4, wall: BRICK[1], roof: ROOF[0], type: 'gable', ridge: 'x', door: 'e', doorAt: -16 });
    building(b, { x0: 12, z0: 14, x1: 16, z1: 20, h: 5, wall: BRICK[3], roof: ROOF[2], type: 'gable', ridge: 'z', step: true, door: 'n', doorAt: 14 });
    building(b, { x0: 16, z0: 14, x1: 20, z1: 20, h: 6, wall: BRICK[5], roof: ROOF[1], type: 'gable', ridge: 'z', step: true, door: 'n', doorAt: 18 });
    // church
    building(b, { x0: -18, z0: 14, x1: -10, z1: 20, h: 6, wall: 0xb9b1a2, roof: 0x39424d, type: 'gable', ridge: 'x', door: 'e', doorAt: 17, winColor: 0xa9d0ff });
    b.shell(-18, 6, 15.5, 3, 6, 3, 0xb9b1a2, 0.08); b.box(-16.5, 12.8, 17, 2.4, 1.6, 2.4, 0x39424d); b.box(-16.5, 14.4, 17, 1.4, 1.6, 1.4, 0x39424d); b.box(-16.5, 16, 17, 0.5, 1.6, 0.5, 0x39424d); b.box(-16.5, 17.2, 17, 0.9, 0.16, 0.16, 0xf2c230);

    // ---- residential rows ----
    let hi = 0;
    const house = (x0, z0, x1, z1, door, at, ridge) => { building(b, { x0, z0, x1, z1, h: 4 + (hi % 3), wall: BRICK[hi % 7], roof: ROOF[hi % 4], type: 'gable', ridge, step: hi % 2 === 0, door, doorAt: at }); hi++; };
    [-19, -12, -5, 2, 9, 16, 28, 35, 42].forEach((x) => house(x, -38, x + 5, -32, 's', x + 2.5, 'z'));
    [-26, -2, 5, 12, 19].forEach((x) => house(x, 28, x + 5, 34, 'n', x + 2.5, 'z'));
    [[-23, -19], [-18, -14], [-13, -9], [3, 7], [8, 12], [13, 17], [17.5, 21]].forEach(([z0, z1]) => house(-46, z0, -40, z1, 'e', (z0 + z1) / 2, 'x'));

    // ---- windmill ----
    for (let i = 0; i < 7; i++) { const s = 5 - i * 0.45; b.box(-43, i * 1.4 + 0.7, -3, s, 1.4, s, i < 2 ? 0x8f4a3a : 0xe9e4d8, 0.06); }
    b.box(-43, 10.4, -3, 2.8, 1.3, 2.8, 0x2f2a26); col(-45.6, -5.6, -40.4, -0.4, 12);
    W.mill = new THREE.Group(); W.mill.position.set(-41.3, 10.4, -3);
    for (let k = 0; k < 4; k++) { const arm = new THREE.Group(), m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xd9c7a8 })); m.scale.set(0.15, 5.6, 1.1); m.position.y = 3.2; m.castShadow = true; arm.add(m); arm.rotation.x = (k * Math.PI) / 2; W.mill.add(arm); }
    scene.add(W.mill);

    // ---- fountain, lots, park, trees, lamps ----
    b.box(0, 0.35, 4, 3.4, 0.7, 3.4, 0xcbc3b2); b.box(0, 0.72, 4, 2.8, 0.06, 2.8, 0x5aa0c8); b.box(0, 1.5, 4, 0.8, 1.6, 0.8, 0xcbc3b2); b.box(0, 2.6, 4, 0.6, 0.7, 1, 0xf2c230); col(-1.7, 2.3, 1.7, 5.7, 1);
    LOC.lots.forEach((l) => { b.box(l.x, 0.04, l.z, 5.4, 0.08, 5.4, 0xcdb98a, 0.05); for (const [dx, dz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) b.box(l.x + dx, 0.5, l.z + dz, 0.12, 1, 0.12, 0xe07a2a); });
    b.box(LOC.dc.x, 0.04, LOC.dc.z, 6.4, 0.08, 6.4, 0x9a958a);
    b.box(-41, 0.05, 37, 6, 0.06, 5, 0x4a90b8); b.box(-41, 0.03, 37, 7, 0.06, 6, 0xcdb98a);
    [[-12, 4.5], [12.3, -3.5], [-27, -22], [-27, -16], [-27, -4], [-27, 4], [-27, 18], [-37, 30], [-45, 32], [-44, 41], [-37, 44], [-47, 46], [-36.5, -20], [-36.5, 0.5],
      [24, -40], [-24, -40], [-30, -44], [50, -20], [50, 10], [50, 36], [-50, -36], [-51, 24], [22, 40], [-20, 42], [34, -12], [20.5, -22.5], [-20.5, 26.5], [10, 38], [-4, 38], [30, 40], [44, 42], [50, -44], [-52, -8], [-10, -44], [8, -44]]
      .forEach(([x, z], i) => tree(b, x, z, 0.85 + (i % 4) * 0.12));
    for (let x = -18; x <= 20; x += 9.5) { lamp(b, x, -25); lamp(b, x, 21); }
    for (let z = -18; z <= 18; z += 9) { lamp(b, -19, z + 4.5); lamp(b, 21, z + 4.5); }
    [[-13.5, -10.5], [13.5, -10.5], [-13.5, 10.5], [13.5, 10.5], [-36, -14], [-36, 6], [-36, 20], [30, 8], [27.5, -27], [27.5, 21]].forEach(([x, z]) => lamp(b, x, z));
    b.build(scene);

    /* ---------- features that appear as the story unfolds ---------- */
    feature('kiosk', (f) => { f.box(10, 1.2, -8.6, 0.9, 2.4, 0.5, 0x1f4fb0); f.glow(10, 1.6, -8.33, 0.7, 0.9, 0.06, 0x9fd0ff); f.box(10, 2.7, -8.4, 1.6, 0.14, 1.2, 0xf2c230); f.box(10, 0.05, -7.6, 2.2, 0.1, 2.2, 0x1f4fb0); });
    col(9.5, -8.9, 10.5, -8.3, 2.5, 'kiosk');
    feature('dc_open', (f) => {
      f.shell(28.5, 0, 8.5, 5, 3, 5, 0xdfe6ef, 0.04); f.box(31, 3.2, 11, 5.4, 0.4, 5.4, 0x3f8a4a, 0.1);
      for (let i = 0; i < 3; i++) f.box(29.5 + i * 1.5, 3.6, 11, 1.1, 0.12, 3.6, 0x1c2f5a);
      f.box(31, 1.5, 8.44, 5, 0.5, 0.1, 0x1f4fb0); for (let i = 0; i < 6; i++) f.glow(29 + i * 0.8, 2.3, 8.44, 0.25, 0.14, 0.08, 0x64ff9a);
      f.box(34.2, 3, 8.2, 0.12, 6, 0.12, 0x9aa5b5); f.box(34.9, 5.4, 8.2, 1.3, 0.9, 0.08, 0x1f4fb0); f.glow(34.9, 5.4, 8.15, 0.3, 0.3, 0.05, 0xf2c230);
    });
    col(28.5, 8.5, 33.5, 13.5, 6, 'dc_open');
    feature('dc_mono', (f) => { f.box(31, 5, 11, 2.6, 10, 2.6, 0x0b0d10); f.glow(31, 7.5, 9.66, 1.1, 1.1, 0.06, 0xffffff); f.glow(31, 7.5, 12.34, 1.1, 1.1, 0.06, 0xffffff); f.box(31, 0.15, 11, 4.6, 0.3, 4.6, 0x1c1f22); });
    col(29.7, 9.7, 32.3, 12.3, 12, 'dc_mono');
    feature('car', (f) => { f.box(11, 0.55, 2.5, 1.9, 0.6, 4.2, 0x0b0d10); f.box(11, 1.1, 2.3, 1.7, 0.6, 2.2, 0x15181c); f.glow(11, 1.1, 3.42, 1.5, 0.4, 0.05, 0x8fc7e8); for (const [x, z] of [[10.1, 3.8], [11.9, 3.8], [10.1, 1.2], [11.9, 1.2]]) f.box(x, 0.3, z, 0.25, 0.6, 0.6, 0x16181b); f.glow(10.4, 0.6, 4.62, 0.4, 0.16, 0.05, 0xffffff); f.glow(11.6, 0.6, 4.62, 0.4, 0.16, 0.05, 0xffffff); });
    col(10, 0.4, 12, 4.6, 1.6, 'car');
    feature('flags', (f) => { for (const [x, c, d] of [[-8.2, 0x1f4fb0, 0xf2c230], [8.2, 0x2f8a4f, 0xf3efe6]]) { f.box(x, 3.5, -11, 0.12, 7, 0.12, 0x9aa5b5); f.box(x + 0.75, 6.3, -11, 1.4, 0.95, 0.08, c); f.glow(x + 0.75, 6.3, -10.95, 0.34, 0.34, 0.04, d); } });
    feature('banner', (f) => { f.box(0, 9.6, -14.9, 2.6, 4.4, 0.1, 0x0b0d10); f.glow(0, 10.4, -14.83, 0.9, 0.9, 0.05, 0xffffff); });
    feature('permitdesk', (f) => { f.box(26.6, 1.1, -17.6, 0.7, 2.2, 0.4, 0x7b4fb0); f.glow(26.38, 1.5, -17.6, 0.06, 0.8, 0.5, 0xe4ccff); });
    feature('nis2', (f) => { for (const [x, y, z] of [[16, 6.6, -14.9], [5, 3.9, -11.8], [-3, 4.4, 13.9], [27.85, 4.6, -20], [-11, 4.2, 27.85], [38.85, 5.6, -4.5]]) { f.glow(x, y, z, 0.5, 0.6, 0.12, 0x4da3ff); f.glow(x, y - 0.4, z, 0.3, 0.3, 0.12, 0x4da3ff); } });
    feature('dronepad', (f) => { f.box(30, 0.1, -5, 2.6, 0.1, 2.6, 0x2c333d); f.glow(30, 0.16, -5, 1.4, 0.02, 0.3, 0xf2c230); f.glow(29.45, 0.16, -5, 0.3, 0.02, 1.4, 0xf2c230); f.glow(30.55, 0.16, -5, 0.3, 0.02, 1.4, 0xf2c230); });
    LOC.lots.forEach((l, i) => {
      feature('lot' + i, (f) => building(f, { x0: l.x - 2.5, z0: l.z - 2.5, x1: l.x + 2.5, z1: l.z + 2.5, h: 4 + (i % 2), wall: [0xf3efe6, 0xd9c7a8, 0xc98a5e][i % 3], roof: [0x39424d, 0x7a4636][i % 2], type: 'gable', ridge: i % 2 ? 'x' : 'z', door: l.f > l.z ? 's' : 'n', doorAt: l.x, feat: 'lot' + i }));
    });
    LOC.stalls.forEach((s, i) => {
      feature('stall' + i, (f) => {
        f.box(s.x, 0.8, s.z, 2.6, 0.16, 1.4, 0x8a6442); for (const dx of [-1.2, 1.2]) for (const dz of [-0.6, 0.6]) f.box(s.x + dx, 1.2, s.z + dz, 0.1, 2.4, 0.1, 0x6b4a2b);
        for (let k = 0; k < 4; k++) f.box(s.x - 1.05 + k * 0.7, 2.5, s.z, 0.7, 0.14, 1.9, k % 2 ? [0xd94f4f, 0x2f5fd0, 0x2f8a4f, 0xf08a3c][i] : 0xf3efe6);
        for (let k = 0; k < 5; k++) f.box(s.x - 1 + k * 0.5, 1, s.z + G.rand(-0.3, 0.3), 0.36, 0.3, 0.36, G.pick([0xf08a3c, 0xd94f4f, 0x8bc34a, 0xf2c230]));
      });
      col(s.x - 1.3, s.z - 0.7, s.x + 1.3, s.z + 0.7, 2.6, 'stall' + i);
    });

    // network links and node beacons (visible once data exchange is live, and during the night attack)
    W.nodes = {}; W.links = [];
    for (const id in LOC.nodes) {
      const n = LOC.nodes[id], m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x54e0ff })); m.scale.set(0.9, 0.9, 0.9); m.position.set(n.x, n.y, n.z); m.visible = false; scene.add(m); W.nodes[id] = m;
    }
    LOC.links.forEach(([a, c]) => {
      const A = LOC.nodes[a], B = LOC.nodes[c], m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x54e0ff, transparent: true, opacity: 0.75 }));
      const len = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z); m.scale.set(0.12, 0.12, len); m.position.set((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2); m.lookAt(B.x, B.y, B.z); m.visible = false; scene.add(m);
      W.links.push({ a, b: c, mesh: m });
    });
  };

  /* ---------- time of day: 0 day, 0.5 dusk, 1 night; storm darkens the day ---------- */
  const SKY = [new THREE.Color(0x9fd3f0), new THREE.Color(0xe9a070), new THREE.Color(0x0b1322)], GL = [new THREE.Color(0x3a4a60), new THREE.Color(0xffe6b8), new THREE.Color(0xffffff)], tmp = new THREE.Color(), STORM = new THREE.Color(0x6f7c88);
  W.setTime = function (t, storm = 0) {
    const a = t < 0.5 ? 0 : 1, f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    tmp.copy(SKY[a]).lerp(SKY[a + 1], f); if (storm) tmp.lerp(STORM, storm * (1 - t));
    W.scene.background.copy(tmp); W.scene.fog.color.copy(tmp);
    W.matGlow.color.copy(GL[a]).lerp(GL[a + 1], f);
    W.hemi.intensity = G.lerp(0.58, 0.3, t) - storm * 0.12; W.sun.intensity = G.lerp(0.82, 0.16, t) - storm * 0.3;
    W.sun.color.setHex(t > 0.75 ? 0x9fb8ff : t > 0.25 ? 0xffc890 : 0xfff1d6);
  };
})();
