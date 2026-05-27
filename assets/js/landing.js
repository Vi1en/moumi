/* ──────────────────────────────────────────────────────────────────────
   landing.js
   - Animated pixel night-sky canvas (twinkling stars + drifting hearts)
   - Chiptune-style ambient music via WebAudio (no external files)
   - Audio-toggle button wiring
   - Keyboard menu navigation for the RPG menu
   ──────────────────────────────────────────────────────────────────── */

(() => {
  "use strict";

  /* ═══════════════ animated background canvas ═══════════════ */

  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  /** @type {{x:number,y:number,r:number,baseA:number,tw:number,hue:string}[]} */
  let stars = [];
  /** @type {{x:number,y:number,vy:number,size:number,hue:string,wobble:number,a:number}[]} */
  let hearts = [];
  /** @type {{x:number,y:number,vx:number,vy:number,life:number,color:string}[]} */
  let sparks = [];

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seedStars();
  }

  function seedStars() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const target = Math.floor((w * h) / 5200);
    stars = new Array(target).fill(0).map(() => {
      const palette = ["#ffffff", "#fff4dc", "#5ff0ff", "#ff9fd6", "#b6f5ff"];
      return {
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: Math.random() < 0.85 ? 1 : 2,
        baseA: 0.4 + Math.random() * 0.6,
        tw: 0.6 + Math.random() * 1.6,
        hue: palette[Math.floor(Math.random() * palette.length)],
      };
    });
  }

  function spawnHeart() {
    const w = window.innerWidth;
    const palette = ["#ff5fae", "#ff9fd6", "#ff2d8b", "#b46bff", "#ffd166"];
    hearts.push({
      x: Math.random() * w,
      y: window.innerHeight + 20,
      vy: 0.4 + Math.random() * 0.9,
      size: 5 + Math.floor(Math.random() * 4),
      hue: palette[Math.floor(Math.random() * palette.length)],
      wobble: Math.random() * Math.PI * 2,
      a: 0.55 + Math.random() * 0.4,
    });
    if (hearts.length > 40) hearts.shift();
  }

  function spawnSpark(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 2.5;
      sparks.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 1,
        color,
      });
    }
  }

  // Draw a chunky pixel heart at integer coords
  function drawHeart(x, y, size, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    // 7x6 pixel-heart shape
    const shape = [
      [0,1,1,0,1,1,0],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],
      [0,0,1,1,1,0,0],
      [0,0,0,1,0,0,0],
    ];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          ctx.fillRect(
            Math.round(x + c * size),
            Math.round(y + r * size),
            size,
            size
          );
        }
      }
    }
    // glow
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 4;
    ctx.globalAlpha = alpha * 0.25;
    ctx.fillRect(
      Math.round(x + size * 2),
      Math.round(y + size * 1),
      size * 3,
      size * 3
    );
    ctx.restore();
  }

  let last = performance.now();
  let heartTimer = 0;

  function tick(now) {
    const dt = Math.min(48, now - last);
    last = now;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    // stars
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(now * 0.002 * s.tw + s.x);
      const a = s.baseA * tw;
      ctx.fillStyle = s.hue;
      ctx.globalAlpha = a;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.r, s.r);
      if (s.r === 2) {
        // sparkle cross
        ctx.globalAlpha = a * 0.6;
        ctx.fillRect(Math.round(s.x - 1), Math.round(s.y + 1), 1, 1);
        ctx.fillRect(Math.round(s.x + 2), Math.round(s.y + 1), 1, 1);
        ctx.fillRect(Math.round(s.x + 1), Math.round(s.y - 1), 1, 1);
        ctx.fillRect(Math.round(s.x + 1), Math.round(s.y + 2), 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    // hearts
    heartTimer += dt;
    if (heartTimer > 380) {
      heartTimer = 0;
      spawnHeart();
    }
    for (let i = hearts.length - 1; i >= 0; i--) {
      const ht = hearts[i];
      ht.y -= ht.vy * (dt / 16);
      ht.wobble += 0.05;
      const xx = ht.x + Math.sin(ht.wobble) * 12;
      drawHeart(xx, ht.y, ht.size, ht.hue, ht.a);
      if (ht.y < -40) hearts.splice(i, 1);
    }

    // sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 0.05;
      sp.life -= 0.025;
      if (sp.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = sp.life;
      ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2);
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(tick);

  // Expose a global so other scripts can pop sparks (e.g. on menu click)
  window.__poofSparks = (x, y, color = "#ff9fd6") => {
    spawnSpark(x, y, color);
  };

  /* ═══════════════ keyboard menu navigation ═══════════════ */

  const menuItems = Array.from(document.querySelectorAll(".menu__item"));
  let menuIdx = menuItems.findIndex((el) => el.classList.contains("is-selected"));
  if (menuIdx < 0) menuIdx = 0;

  function selectMenu(idx) {
    menuIdx = (idx + menuItems.length) % menuItems.length;
    menuItems.forEach((el, i) => {
      el.classList.toggle("is-selected", i === menuIdx);
    });
    SFX.blip();
  }

  document.addEventListener("keydown", (e) => {
    const landing = document.getElementById("screen-landing");
    if (!landing || !landing.classList.contains("is-active")) return;

    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      e.preventDefault();
      selectMenu(menuIdx + 1);
    } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      selectMenu(menuIdx - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      menuItems[menuIdx].click();
    }
  });

  menuItems.forEach((el, i) => {
    el.addEventListener("mouseenter", () => selectMenu(i));
  });

  /* ═══════════════ tiny chiptune via Web Audio ═══════════════
     Generates a soft, looping "birthday lullaby" using square waves
     with a slow LFO and reverb-ish delay. No external audio files. */

  const SFX = {
    ctx: null,
    master: null,
    delay: null,
    delayGain: null,
    musicGain: null,
    isOn: false,
    loopId: null,
    partyLoopId: null,
    _partyOn: false,

    init() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.master);

      this.delay = this.ctx.createDelay();
      this.delay.delayTime.value = 0.32;
      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.value = 0.25;
      this.musicGain.connect(this.delay);
      this.delay.connect(this.delayGain);
      this.delayGain.connect(this.master);
      this.delayGain.connect(this.delay);
    },

    note(freq, dur = 0.2, type = "square", dest = this.master, gain = 0.08) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(dest || this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    blip() {
      if (!this.ctx) return;
      this.note(880, 0.06, "square", this.master, 0.05);
    },
    confirm() {
      if (!this.ctx) return;
      this.note(660, 0.08, "square", this.master, 0.08);
      setTimeout(() => this.note(990, 0.12, "square", this.master, 0.08), 70);
    },
    pickup() {
      if (!this.ctx) return;
      this.note(1200, 0.06, "triangle", this.master, 0.1);
      setTimeout(() => this.note(1600, 0.1, "triangle", this.master, 0.08), 60);
    },
    heart() {
      if (!this.ctx) return;
      this.note(740, 0.12, "sine", this.master, 0.09);
      setTimeout(() => this.note(988, 0.18, "sine", this.master, 0.08), 100);
    },

    // simple repeating melody — a soft birthday motif in A minor
    melody: [
      // [midi-style note (semitones from A4=0), duration in beats]
      [0, 1], [2, 1], [3, 1], [5, 2],
      [3, 1], [2, 1], [0, 2],
      [-5, 1], [0, 1], [3, 1], [5, 2],
      [7, 1], [5, 1], [3, 2],
      [0, 1], [3, 1], [5, 1], [7, 2],
      [8, 1], [7, 1], [5, 2],
      [3, 1], [2, 1], [0, 1], [-2, 1],
      [0, 4],
    ],
    bass: [
      [-12, 4], [-5, 4], [-17, 4], [-10, 4],
      [-12, 4], [-5, 4], [-15, 4], [-12, 4],
    ],

    midiToHz(n) {
      // A4 = 440
      return 440 * Math.pow(2, n / 12);
    },

    startMusic() {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.isOn = true;
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(
        0.18,
        this.ctx.currentTime + 1.4
      );
      this._scheduleLoop();
    },

    stopMusic() {
      this.isOn = false;
      if (!this.ctx) return;
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(
        0,
        this.ctx.currentTime + 0.6
      );
      if (this.loopId) clearTimeout(this.loopId);
    },

    /* Upbeat party loop for the birthday celebration finale */
    partyMelody: [
      [0, 1], [0, 1], [2, 1], [2, 1], [4, 1], [4, 1], [5, 2],
      [4, 1], [2, 1], [0, 2],
      [-3, 1], [-3, 1], [0, 1], [0, 1], [4, 1], [5, 2],
      [7, 1], [5, 1], [4, 2],
    ],
    partyBass: [
      [-12, 2], [-8, 2], [-5, 2], [-3, 2],
      [-12, 2], [-8, 2], [-5, 2], [-3, 2],
    ],

    startPartyMusic() {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.isOn = false;
      if (this.loopId) clearTimeout(this.loopId);
      this._partyOn = true;
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(
        0.34,
        this.ctx.currentTime + 0.35
      );
      this._schedulePartyLoop();
    },

    stopPartyMusic() {
      this._partyOn = false;
      if (!this.ctx) return;
      if (this.partyLoopId) clearTimeout(this.partyLoopId);
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(
        0,
        this.ctx.currentTime + 0.8
      );
    },

    _schedulePartyLoop() {
      if (!this._partyOn || !this.ctx) return;
      const bpm = 132;
      const beat = 60 / bpm;
      let t = this.ctx.currentTime + 0.05;
      for (const [n, d] of this.partyMelody) {
        const f = this.midiToHz(n);
        const dur = d * beat * 0.92;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "square";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(t);
        o.stop(t + dur + 0.02);
        t += d * beat;
      }
      let bt = this.ctx.currentTime + 0.05;
      for (const [n, d] of this.partyBass) {
        const f = this.midiToHz(n);
        const dur = d * beat * 0.92;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, bt);
        g.gain.linearRampToValueAtTime(0.07, bt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, bt + dur);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(bt);
        o.stop(bt + dur + 0.02);
        bt += d * beat;
      }
      const loopLen =
        this.partyMelody.reduce((s, [, d]) => s + d, 0) * beat * 1000;
      this.partyLoopId = setTimeout(() => this._schedulePartyLoop(), loopLen - 30);
    },

    _scheduleLoop() {
      if (!this.isOn || !this.ctx) return;
      const bpm = 78;
      const beat = 60 / bpm;
      let t = this.ctx.currentTime + 0.1;
      // melody (square)
      for (const [n, d] of this.melody) {
        const f = this.midiToHz(n);
        const dur = d * beat * 0.95;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "square";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(t);
        o.stop(t + dur + 0.02);
        t += d * beat;
      }
      // bass (triangle, lower)
      let bt = this.ctx.currentTime + 0.1;
      for (const [n, d] of this.bass) {
        const f = this.midiToHz(n);
        const dur = d * beat * 0.95;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, bt);
        g.gain.linearRampToValueAtTime(0.05, bt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, bt + dur);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(bt);
        o.stop(bt + dur + 0.02);
        bt += d * beat;
      }
      const loopLength = this.melody.reduce((s, [, d]) => s + d, 0) * beat * 1000;
      this.loopId = setTimeout(() => this._scheduleLoop(), loopLength - 40);
    },
  };

  // expose for other scripts
  window.__sfx = SFX;

  /* ═══════════════ audio toggle ═══════════════ */
  const audioBtn = document.getElementById("audio-toggle");
  const audioLabel = audioBtn.querySelector(".audio-toggle__label");

  audioBtn.addEventListener("click", () => {
    SFX.init();
    // iOS: explicitly resume the context inside the user gesture
    if (SFX.ctx && SFX.ctx.state === "suspended") {
      SFX.ctx.resume().catch(() => {});
    }
    if (SFX.isOn) {
      SFX.stopMusic();
      audioBtn.setAttribute("aria-pressed", "false");
      audioLabel.textContent = "MUSIC: OFF";
    } else {
      SFX.startMusic();
      audioBtn.setAttribute("aria-pressed", "true");
      audioLabel.textContent = "MUSIC: ON";
    }
  });
})();
