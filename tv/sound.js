// ThatC Life sound design: every kind of change has its own sound. Pure WebAudio synthesis — no audio files, no copyright.
(() => {
  let ctx = null, master = null, defs = null;
  const load = () => fetch((document.currentScript?.src || '/tv/sound.js').replace('sound.js', 'sounds.json')).then((r) => r.json()).then((d) => { defs = d; }).catch(() => {});
  const ready = load();
  function ensure() {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  async function play(name) {
    await ready; const c = ensure(); if (!c || !defs || !defs[name] || window.ThatCSound.muted) return;
    const t0 = c.currentTime + 0.03;
    for (const n of defs[name]) {
      const o = c.createOscillator(), g = c.createGain(), s = t0 + n.t, e = s + n.d;
      o.type = n.w || 'sine'; o.frequency.setValueAtTime(n.f, s); if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, e);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(n.g || 0.25, s + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, e);
      o.connect(g); g.connect(master); o.start(s); o.stop(e + 0.05);
    }
  }
  window.ThatCSound = { play, unlock: ensure, muted: false, isOn: () => !!ctx && ctx.state === 'running' };
  ['keydown', 'pointerdown', 'click', 'touchstart'].forEach((ev) => window.addEventListener(ev, ensure, { passive: true }));
})();
