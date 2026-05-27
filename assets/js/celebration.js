/* ──────────────────────────────────────────────────────────────────────
   celebration.js — birthday finale: fireworks, dance, hugs, party music
   ──────────────────────────────────────────────────────────────────── */

(() => {
  "use strict";

  const SFX = window.__sfx || {};

  const PHASES = [
    { id: "fireworks", dur: 4500, line: "THE KINGDOM CELEBRATES…" },
    { id: "dance",     dur: 5500, line: "♥ HAPPY BIRTHDAY MOUMITA ♥" },
    { id: "hug",       dur: 4000, line: "group hug!!" },
    { id: "finale",    dur: 2200, line: "" },
  ];

  let running = false;
  let rafId = 0;
  let startTime = 0;
  let onCompleteCb = null;

  /** @type {HTMLCanvasElement|null} */
  let canvas = null;
  let ctx = null;
  let dpr = 1;

  /** @type {{x:number,y:number,vx:number,vy:number,life:number,color:string,size:number}[]} */
  let fireworks = [];
  /** @type {{x:number,y:number,vy:number,size:number,color:string,a:number}[]} */
  let confetti = [];
  /** @type {{x:number,y:number,vy:number,life:number,color:string}[]} */
  let hearts = [];

  let sprites = { girl: null, boy: null, husky: null };

  const dancers = {
    girl:  { x: 0, y: 0, bob: 0, facing: 1 },
    boy:   { x: 0, y: 0, bob: 0, facing: -1 },
    husky: { x: 0, y: 0, bob: 0, facing: 1 },
  };

  function resize() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function spawnFirework() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const x = 80 + Math.random() * (w - 160);
    const y = 60 + Math.random() * (h * 0.45);
    const palette = ["#ff5fae", "#5ff0ff", "#ffd166", "#ff9fd6", "#b46bff", "#7df58f"];
    const color = palette[Math.floor(Math.random() * palette.length)];
    for (let i = 0; i < 28; i++) {
      const ang = (Math.PI * 2 * i) / 28 + Math.random() * 0.2;
      const sp = 1.5 + Math.random() * 3.5;
      fireworks.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 1,
        color,
        size: 2 + Math.floor(Math.random() * 2),
      });
    }
    if (SFX.heart) SFX.heart();
  }

  function spawnConfetti() {
    const w = canvas.width / dpr;
    confetti.push({
      x: Math.random() * w,
      y: -8,
      vy: 1.2 + Math.random() * 2,
      size: 3 + Math.floor(Math.random() * 3),
      color: ["#ff9fd6", "#ffd166", "#5ff0ff", "#fff4dc"][Math.floor(Math.random() * 4)],
      a: 0.9,
    });
  }

  function spawnHeart(x, y) {
    hearts.push({
      x, y,
      vy: -0.4 - Math.random() * 0.8,
      life: 1,
      color: ["#ff5fae", "#ff9fd6", "#ffd166"][Math.floor(Math.random() * 3)],
    });
  }

  function currentPhase(elapsed) {
    let t = 0;
    for (const p of PHASES) {
      t += p.dur;
      if (elapsed < t) return { ...p, tIn: elapsed - (t - p.dur) };
    }
    return null;
  }

  function drawBackground(w, h, pulse) {
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#1a0840");
    grd.addColorStop(0.5, "#4a1d6d");
    grd.addColorStop(1, "#ff9fd6");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = `rgba(255, 209, 102, ${0.08 + pulse * 0.06})`;
    for (let i = 0; i < 40; i++) {
      const x = (i * 47) % w;
      const y = (i * 31) % (h * 0.5);
      ctx.fillRect(x, y, 1, 1);
    }

    // moon
    ctx.fillStyle = "#fff4dc";
    ctx.beginPath();
    ctx.arc(w - 70, 70, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 220, 170, 0.3)";
    ctx.beginPath();
    ctx.arc(w - 70, 70, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCharacter(img, x, y, w, h, bob, facing) {
    if (!img) {
      ctx.fillStyle = "#ff9fd6";
      ctx.fillRect(x, y + bob, w, h);
      return;
    }
    ctx.save();
    if (facing < 0) {
      ctx.translate(x + w, y + bob);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.drawImage(img, x, y + bob, w, h);
    }
    ctx.restore();
  }

  function drawScene(w, h, phase, tIn, elapsed) {
    const groundY = h * 0.72;
    const pulse = 0.5 + Math.sin(elapsed * 0.004) * 0.5;

    drawBackground(w, h, pulse);

    // cake pedestal glow
    ctx.fillStyle = "rgba(255, 95, 174, 0.25)";
    ctx.fillRect(w / 2 - 90, groundY - 8, 180, 12);
    ctx.fillStyle = "#3b1660";
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = "#7a47e4";
    ctx.fillRect(0, groundY, w, 3);

    const cx = w / 2;
    const danceBob = (id) => Math.sin(elapsed * 0.012 + id) * 10;
    const danceSway = (id) => Math.sin(elapsed * 0.009 + id * 2) * 14;

    let gx = cx - 70 + danceSway(0);
    let bx = cx - 8 + danceSway(1);
    let hx = cx + 52 + danceSway(2);
    const charY = groundY - 52;

    if (phase.id === "hug") {
      const hugT = Math.min(1, tIn / 1200);
      gx = cx - 38 + (1 - hugT) * -20;
      bx = cx - 22;
      hx = cx + 18 + (1 - hugT) * 20;
    }

    drawCharacter(sprites.girl, gx, charY, 28, 44, danceBob(0), 1);
    drawCharacter(sprites.boy, bx, charY, 28, 44, danceBob(1), -1);
    drawCharacter(sprites.husky, hx, charY, 32, 24, danceBob(2), 1);

    if (phase.id === "hug" && tIn > 800) {
      // heart aura around group
      for (let i = 0; i < 6; i++) {
        const a = elapsed * 0.005 + i;
        const rx = cx + Math.cos(a) * 50;
        const ry = charY + 10 + Math.sin(a) * 20;
        ctx.fillStyle = "#ff5fae";
        ctx.fillRect(rx, ry, 3, 3);
      }
    }

    // simple pixel cake
    const cakeX = cx - 24;
    const cakeY = groundY - 28;
    ctx.fillStyle = "#ff9fd6";
    ctx.fillRect(cakeX, cakeY, 48, 22);
    ctx.fillStyle = "#fff4dc";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(cakeX + 6 + i * 8, cakeY - 8 - (i % 2) * 2, 2, 8);
    }
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(cakeX + 20, cakeY - 14, 4, 4);

    // confetti
    for (const c of confetti) {
      ctx.fillStyle = c.color;
      ctx.globalAlpha = c.a;
      ctx.fillRect(c.x, c.y, c.size, c.size);
    }
    ctx.globalAlpha = 1;

    // fireworks particles
    for (const f of fireworks) {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillRect(f.x, f.y, f.size, f.size);
    }
    ctx.globalAlpha = 1;

    // floating hearts
    for (const ht of hearts) {
      ctx.fillStyle = ht.color;
      ctx.globalAlpha = ht.life;
      ctx.fillRect(ht.x, ht.y, 4, 4);
      ctx.fillRect(ht.x + 2, ht.y - 2, 2, 2);
      ctx.fillRect(ht.x - 2, ht.y - 2, 2, 2);
    }
    ctx.globalAlpha = 1;

    // phase text
    const textEl = document.getElementById("celebration-text");
    if (textEl && phase.line) {
      textEl.textContent = phase.line;
      textEl.classList.toggle("is-hug", phase.id === "hug");
    }
  }

  function update(dt, elapsed) {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const phase = currentPhase(elapsed);

    if (phase && phase.id === "fireworks" && Math.random() < 0.08) spawnFirework();
    if (phase && (phase.id === "dance" || phase.id === "hug" || phase.id === "finale")) {
      if (Math.random() < 0.25) spawnConfetti();
      if (Math.random() < 0.06) spawnHeart(w / 2 + (Math.random() - 0.5) * 120, h * 0.5);
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
      const f = fireworks[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.04;
      f.life -= 0.018;
      if (f.life <= 0) fireworks.splice(i, 1);
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.y += c.vy;
      c.x += Math.sin(c.y * 0.05) * 0.5;
      if (c.y > h + 20) confetti.splice(i, 1);
    }
    for (let i = hearts.length - 1; i >= 0; i--) {
      const ht = hearts[i];
      ht.y += ht.vy;
      ht.life -= 0.008;
      if (ht.life <= 0) hearts.splice(i, 1);
    }

    if (phase) drawScene(w, h, phase, phase.tIn, elapsed);
    else finishCelebration();
  }

  function frame(now) {
    if (!running) return;
    const elapsed = now - startTime;
    const dt = 16;
    update(dt, elapsed);
    rafId = requestAnimationFrame(frame);
  }

  function finishCelebration() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    const el = document.getElementById("celebration");
    if (el) {
      el.classList.remove("is-active");
      setTimeout(() => { el.hidden = true; }, 500);
    }
    if (SFX.stopPartyMusic) SFX.stopPartyMusic();
    document.body.classList.remove("in-celebration");
    if (onCompleteCb) onCompleteCb();
  }

  window.startBirthdayCelebration = function startBirthdayCelebration(opts = {}) {
    onCompleteCb = opts.onComplete || null;
    sprites = opts.sprites || sprites;
    fireworks = [];
    confetti = [];
    hearts = [];

    const el = document.getElementById("celebration");
    canvas = document.getElementById("celebration-canvas");
    if (!el || !canvas) {
      if (onCompleteCb) onCompleteCb();
      return;
    }
    ctx = canvas.getContext("2d");
    el.hidden = false;
    el.classList.add("is-active");
    document.body.classList.add("in-celebration");

    resize();
    running = true;
    startTime = performance.now();

    try {
      SFX.init && SFX.init();
      if (SFX.ctx && SFX.ctx.state === "suspended") SFX.ctx.resume();
      if (SFX.startPartyMusic) SFX.startPartyMusic();
    } catch (_) { /* */ }

    SFX.confirm && SFX.confirm();
    setTimeout(() => SFX.heart && SFX.heart(), 400);

    rafId = requestAnimationFrame(frame);

    const totalDur = PHASES.reduce((s, p) => s + p.dur, 0);
    setTimeout(() => {
      if (running) finishCelebration();
    }, totalDur + 200);
  };

  window.addEventListener("resize", () => {
    if (running) resize();
  });
})();
