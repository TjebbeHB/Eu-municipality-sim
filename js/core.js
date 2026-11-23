/* Voxelstad — core helpers shared by every module */
(function () {
  const G = (window.G = {});
  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  G.dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  G.angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
  G.eur = (k) => (k < 0 ? '−' : '') + '€' + Math.abs(Math.round(k)) + 'k';

  // Promise helpers driven by the frame loop, so story scripts can `await` game conditions.
  const waiters = [];
  G.until = (fn) => new Promise((res) => waiters.push({ fn, res }));
  G.delay = (sec) => { let t = 0; return new Promise((res) => waiters.push({ fn: (dt) => (t += dt) >= sec, res })); };
  G.tickWaiters = (dt) => {
    for (let i = waiters.length - 1; i >= 0; i--) {
      let ok = false;
      try { ok = waiters[i].fn(dt); } catch (e) { console.error(e); ok = true; }
      if (ok) { const w = waiters.splice(i, 1)[0]; w.res(); }
    }
  };
  G.clearWaiters = () => { waiters.length = 0; };
})();
