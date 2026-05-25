/* ──────────────────────────────────────────────────────────────────────
   game.js
   - Screen transitions (landing → cutscene → world)
   - Dialogue cutscene engine (typewriter, portraits, multi-speaker)
   - Modal popups for gallery / settings / credits
   - Mini-game: Memory Forest side-scroller
   ──────────────────────────────────────────────────────────────────── */

(() => {
  "use strict";

  const SFX = window.__sfx || { blip() {}, confirm() {}, pickup() {}, heart() {} };

  /* ───────── Robust touch / capability detection ─────────
     CSS media queries are unreliable on Android (Chrome may report hover:hover
     when a stylus, Bluetooth keyboard / mouse, or desktop-site mode is active).
     Detect from JS using the most permissive signal: ANY touch input has ever
     been usable on this device. We toggle a body class that the stylesheet
     keys off of, so the touch overlay always appears when it should. */
  const HAS_TOUCH =
    "ontouchstart" in window ||
    (navigator.maxTouchPoints   || 0) > 0 ||
    (navigator.msMaxTouchPoints || 0) > 0;

  // Some Android setups also need the class on `<html>` for very early CSS
  document.documentElement.classList.toggle("is-touch", HAS_TOUCH);
  document.body.classList.toggle("is-touch", HAS_TOUCH);

  /* Coarse-environment helpers */
  const IS_ANDROID = /android/i.test(navigator.userAgent || "");
  const IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  document.body.classList.toggle("is-android", IS_ANDROID);
  document.body.classList.toggle("is-ios", IS_IOS);

  // Quick build banner in the console so we can verify the live deploy ships latest
  try { console.log("[birthday] build 2026-05-26 · touch=%s android=%s ios=%s",
    HAS_TOUCH, IS_ANDROID, IS_IOS); } catch (_) { /* */ }

  const screens = {
    landing: document.getElementById("screen-landing"),
    intro:   document.getElementById("screen-intro"),
    world:   document.getElementById("screen-world"),
  };

  function show(name) {
    Object.entries(screens).forEach(([k, el]) => {
      const active = k === name;
      el.classList.toggle("is-active", active);
      if (active) {
        el.hidden = false;
      } else {
        // delay hide so the fade can play
        setTimeout(() => {
          if (!el.classList.contains("is-active")) el.hidden = true;
        }, 650);
      }
    });
    // toggle a body class so CSS can react to which screen is showing
    document.body.classList.toggle("in-world",  name === "world");
    document.body.classList.toggle("in-intro",  name === "intro");
    document.body.classList.toggle("in-landing", name === "landing");
  }

  /* ═══════════════ menu actions ═══════════════ */
  // Tapping the "PRESS START" prompt should also trigger New Game (mobile friendly)
  const pressStart = document.getElementById("press-start");
  if (pressStart) {
    pressStart.style.cursor = "pointer";
    pressStart.addEventListener("click", () => {
      SFX.confirm();
      startNewGame();
    });
  }

  document.getElementById("menu-list").addEventListener("click", (e) => {
    const li = e.target.closest(".menu__item");
    if (!li) return;
    const action = li.dataset.action;
    SFX.confirm();

    const rect = li.getBoundingClientRect();
    if (window.__poofSparks) {
      for (let i = 0; i < 6; i++) {
        window.__poofSparks(
          rect.left + Math.random() * rect.width,
          rect.top + Math.random() * rect.height,
          "#ff9fd6"
        );
      }
    }

    switch (action) {
      case "start":     return startNewGame();
      case "continue":  return continueGame();
      case "gallery":   return openGallery();
      case "settings":  return openSettings();
      case "credits":   return openCredits();
    }
  });

  /* ═══════════════ gallery / settings / credits modals ═══════════════ */
  const modal      = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody  = document.getElementById("modal-body");
  const modalClose = document.getElementById("modal-close");

  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
  }
  function closeModal() { modal.hidden = true; }
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  function openGallery() {
    openModal("CHARACTER GALLERY", `
      <div class="gallery">
        <div class="gallery__card">
          <img src="assets/sprites/girl_portrait.png" alt="Moumita the Birthday Princess">
          <div class="gallery__name">MOUMITA</div>
          <div class="gallery__role">Birthday Princess · Lv 1</div>
          <div class="gallery__desc">
            Long brown hair, oversized green sweater, expressive anime eyes.
            Shy but cheerful. Her smile recharges Love Energy and
            apparently melts a Goblin King's plans.
          </div>
        </div>
        <div class="gallery__card">
          <img src="assets/sprites/boy_portrait.png" alt="Manab the Champion">
          <div class="gallery__name">MANAB</div>
          <div class="gallery__role">Champion · Lv 1</div>
          <div class="gallery__desc">
            Messy dark hair and a black hoodie. Playful, protective,
            and absolutely terrible at hiding birthday surprises.
            Will fight a Goblin King for cake.
          </div>
        </div>
        <div class="gallery__card">
          <img src="assets/sprites/husky_portrait.png" alt="Igloo the Husky">
          <div class="gallery__name">IGLOO</div>
          <div class="gallery__role">Magical Companion · Lv 99</div>
          <div class="gallery__desc">
            Fluffy black-and-white husky with glowing blue eyes.
            Acts as your magical pet and follows you everywhere.
            Sometimes gives hints. Always a very good boy.
          </div>
        </div>
      </div>
    `);
  }

  let settings = {
    music:  false,
    crt:    true,
    speed:  "normal",
  };

  function openSettings() {
    openModal("SETTINGS", `
      <div class="settings-list">
        <div class="settings-row">
          <span class="settings-row__name">CHIPTUNE MUSIC</span>
          <button data-set="music">${settings.music ? "ON" : "OFF"}</button>
        </div>
        <div class="settings-row">
          <span class="settings-row__name">CRT SCANLINES</span>
          <button data-set="crt">${settings.crt ? "ON" : "OFF"}</button>
        </div>
        <div class="settings-row">
          <span class="settings-row__name">TEXT SPEED</span>
          <button data-set="speed">${settings.speed.toUpperCase()}</button>
        </div>
        <div class="settings-row" style="opacity:.7">
          <span class="settings-row__name">SAVE SLOT</span>
          <span class="settings-row__value">★ Slot 01 · Auto-Save</span>
        </div>
      </div>
    `);
    // listener is wired once at module scope (see below) so buttons keep working
  }

  // single delegated handler for the settings modal (the previous `{ once: true }`
  // version killed the buttons after the first click)
  modalBody.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-set]");
    if (!b) return;
    const key = b.dataset.set;
    if (key === "music") {
      settings.music = !settings.music;
      b.textContent = settings.music ? "ON" : "OFF";
      const audioBtn = document.getElementById("audio-toggle");
      if (audioBtn) audioBtn.click();
    } else if (key === "crt") {
      settings.crt = !settings.crt;
      b.textContent = settings.crt ? "ON" : "OFF";
      const crt = document.querySelector(".crt");
      if (crt) crt.style.display = settings.crt ? "" : "none";
    } else if (key === "speed") {
      const cycle = ["slow", "normal", "fast"];
      const i = (cycle.indexOf(settings.speed) + 1) % cycle.length;
      settings.speed = cycle[i];
      b.textContent = settings.speed.toUpperCase();
    }
    SFX.blip();
  });

  function openCredits() {
    openModal("CREDITS", `
      <div class="credits">
        <p class="credits__line">A LOVE LETTER IN 32 BITS</p>
        <p class="credits__line">FOR THE BIRTHDAY PRINCESS</p>

        <p class="credits__role">DIRECTED BY</p>
        <p class="credits__name">Manab</p>

        <p class="credits__role">STARRING</p>
        <p class="credits__name">Moumita as the Birthday Princess</p>

        <p class="credits__role">CO-STARRING</p>
        <p class="credits__name">Igloo the Husky (good boy)</p>

        <p class="credits__role">SOUNDTRACK</p>
        <p class="credits__name">Birthday Lullaby in A minor</p>

        <p class="credits__role">DEDICATION</p>
        <p class="credits__name">to every silly moment we've shared ♥</p>

        <p class="credits__line" style="margin-top:18px; opacity:.7">
          press ESC to close
        </p>
      </div>
    `);
  }

  /* ═══════════════ cutscene dialogue ═══════════════ */
  const dialogEl     = document.getElementById("dialog");
  const dialogText   = document.getElementById("dialog-text");
  const dialogName   = document.getElementById("dialog-name");
  const dialogImg    = document.getElementById("dialog-portrait-img");
  const dialogPortrait = document.getElementById("dialog-portrait");

  const portraits = {
    girl:  { src: "assets/sprites/girl_portrait.png",  name: "MOUMITA"  },
    boy:   { src: "assets/sprites/boy_portrait.png",   name: "MANAB"    },
    husky: { src: "assets/sprites/husky_portrait.png", name: "IGLOO"    },
    narrator: { src: "assets/sprites/husky_portrait.png", name: "NARRATOR" },
  };

  const introScript = [
    { who: "narrator", text: "Once upon a glittering birthday eve,\nin a kingdom stitched together from memories…" },
    { who: "girl",  text: "Eeeep! It's finally here — my birthday!\nEverything is glowing pink today…" },
    { who: "boy",   text: "Happy birthday, Moumita.\nI baked the cake myself. Eat it slowly." },
    { who: "husky", text: "*woof woof* (translation: PLEASE share,\nthis is a family policy)." },
    { who: "narrator", text: "But then — a wicked giggle cracked the sky.\nThe candles flickered out, one by one." },
    { who: "boy",   text: "Oh no. Not him. Not on her birthday." },
    { who: "girl",  text: "T-the cake! Where did the Cake Crystal go?!" },
    { who: "husky", text: "*BARK!* (it's the CHAOS GOBLIN KING again!)" },
    { who: "narrator", text: "The Chaos Goblin King stole the Birthday Crystal\nand scattered its shards across four memory worlds." },
    { who: "boy",   text: "We have until midnight to bring them all back.\nReady, Moumi?" },
    { who: "girl",  text: "Ready. Let's make this the best birthday ever.\nIgloo — lead the way!" },
    { who: "husky", text: "*WOOF!!* (to the Memory Forest!)" },
  ];

  let cutsceneIdx = 0;
  let typingTimer = null;
  let typingDone = true;
  let typingTarget = "";

  function setPortrait(who) {
    const p = portraits[who] || portraits.narrator;
    dialogImg.src = p.src;
    dialogImg.alt = p.name;
    dialogName.textContent = p.name;
    dialogPortrait.style.borderColor =
      who === "girl"  ? "#ff5fae" :
      who === "boy"   ? "#5ff0ff" :
      who === "husky" ? "#ffd166" :
                        "#b46bff";
  }

  function speedDelay() {
    return settings.speed === "fast" ? 12 : settings.speed === "slow" ? 38 : 22;
  }

  function typeLine(text) {
    typingTarget = text;
    typingDone = false;
    dialogText.textContent = "";
    let i = 0;
    if (typingTimer) clearInterval(typingTimer);
    typingTimer = setInterval(() => {
      const ch = text[i++];
      dialogText.textContent += ch;
      if (ch && ch !== " " && ch !== "\n" && Math.random() < 0.35) {
        SFX.blip();
      }
      if (i >= text.length) {
        clearInterval(typingTimer);
        typingDone = true;
      }
    }, speedDelay());
  }

  function advanceCutscene() {
    if (!typingDone) {
      // skip to end of current line
      clearInterval(typingTimer);
      dialogText.textContent = typingTarget;
      typingDone = true;
      return;
    }
    cutsceneIdx++;
    if (cutsceneIdx >= introScript.length) {
      // cutscene ends → start the game
      enterWorld();
      return;
    }
    const line = introScript[cutsceneIdx];
    setPortrait(line.who);
    typeLine(line.text);
    SFX.confirm();
  }

  function startCutscene() {
    cutsceneIdx = 0;
    const line = introScript[0];
    setPortrait(line.who);
    typeLine(line.text);
    show("intro");
  }

  document.addEventListener("keydown", (e) => {
    if (!screens.intro.classList.contains("is-active")) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      advanceCutscene();
    } else if (e.key === "Escape") {
      enterWorld();
    }
  });

  // Tap anywhere on the cutscene (except interactive controls) to advance
  screens.intro.addEventListener("click", (e) => {
    if (e.target.closest("#skip-intro, #audio-toggle, .modal")) return;
    advanceCutscene();
  });
  document.getElementById("skip-intro").addEventListener("click", (e) => {
    e.stopPropagation();
    enterWorld();
  });

  /* ─── iOS / first-gesture audio unlock ───
     Mobile Safari requires the AudioContext to be created or resumed inside
     a user gesture. We attach a one-shot listener so the next tap or click
     anywhere wakes the audio system silently (without auto-starting music). */
  function unlockAudio() {
    try {
      const sfx = window.__sfx;
      if (sfx && sfx.init) sfx.init();
      if (sfx && sfx.ctx && sfx.ctx.state === "suspended") sfx.ctx.resume();
    } catch (_) { /* ignore */ }
  }
  document.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
  document.addEventListener("pointerdown", unlockAudio, { once: true });

  /* ═══════════════ Modal global ESC ═══════════════ */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!modal.hidden) closeModal();
    }
  });

  /* ═══════════════ entry points ═══════════════ */
  function screenFlash(then) {
    document.body.style.transition = "filter .35s ease";
    document.body.style.filter = "brightness(2.6) contrast(1.5)";
    setTimeout(() => {
      document.body.style.filter = "";
      then();
    }, 280);
  }

  function startNewGame() {
    screenFlash(() => {
      // Reset everything so a 2nd playthrough is clean
      if (spritesLoaded) resetGameState();
      startCutscene();
    });
  }

  function continueGame() {
    screenFlash(() => enterWorld({ fresh: false }));
  }

  /* ═══════════════════════════════════════════════════════════
     Memory Forest — playable mini-game
     ═══════════════════════════════════════════════════════════ */

  const worldCanvas = document.getElementById("world-canvas");
  const wctx = worldCanvas.getContext("2d");
  const worldHint = document.getElementById("world-hint");
  const toastEl = document.getElementById("toast");

  // Logical resolution for the pixel-art world; we upscale to fit
  const LW = 480; // logical width
  const LH = 240; // logical height

  let worldDPR = 1;
  let worldRunning = false;

  function fitWorldCanvas() {
    const rect = worldCanvas.parentElement.getBoundingClientRect();
    // Letterbox (contain) — preserves aspect, keeps the whole world visible.
    // The empty bands match the world's purple gradient so they feel cinematic.
    const cssScale = Math.max(0.5, Math.min(rect.width / LW, rect.height / LH));
    const drawW = Math.round(LW * cssScale);
    const drawH = Math.round(LH * cssScale);

    // chunky integer scale for the backing buffer (true pixel art look)
    worldDPR = Math.max(1, Math.floor(cssScale));
    worldCanvas.width  = LW * worldDPR;
    worldCanvas.height = LH * worldDPR;

    worldCanvas.style.position = "absolute";
    worldCanvas.style.width  = drawW + "px";
    worldCanvas.style.height = drawH + "px";
    // center horizontally; anchor to bottom so the ground stays at the bottom
    worldCanvas.style.left = "50%";
    worldCanvas.style.top  = "auto";
    worldCanvas.style.bottom = "0";
    worldCanvas.style.transform = "translateX(-50%)";

    wctx.imageSmoothingEnabled = false;
    wctx.setTransform(worldDPR, 0, 0, worldDPR, 0, 0);
  }

  /* Refit when the viewport changes for ANY reason — useful on Android where
     the URL bar slides in/out as you scroll, changing window.innerHeight. */
  function refit() { if (worldRunning) fitWorldCanvas(); }
  window.addEventListener("resize", refit);
  window.addEventListener("orientationchange", () => {
    // orientation needs a small delay so the new dimensions settle
    setTimeout(refit, 80);
    setTimeout(refit, 350);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", refit);
    window.visualViewport.addEventListener("scroll", refit);
  }

  // ── Player state ──
  const player = {
    x: 50,
    y: 0,
    w: 14,
    h: 22,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    walkPhase: 0,
    sprite: null,
  };

  // Pet (Mochi the husky) follows the player
  const pet = {
    x: 30,
    y: 0,
    w: 16,
    h: 12,
    target: 0,
    bob: 0,
    sprite: null,
  };

  // World data
  const GROUND_Y = LH - 38;
  const CAMERA_LEAD = 100;
  let camera = { x: 0 };

  /** @type {{x:number,y:number,t:number,taken:boolean,kind:string}[]} */
  let collectibles = [];

  /** @type {{x:number,y:number,phase:number,seed:number}[]} */
  let fireflies = [];

  /** @type {{x:number,h:number,sway:number,kind:number}[]} */
  let trees = [];

  /** @type {{x:number,y:number,vy:number,life:number,color:string}[]} */
  let worldSparks = [];

  // Counters
  let counts = { heart: 0, rose: 0, memory: 0 };
  let hp = 20, hpMax = 20;
  let xp = 12, xpMax = 100;
  let midnightMs = 11 * 60 * 1000 + 42 * 1000; // 11:42 remaining

  function refreshHUD() {
    document.getElementById("bar-hp").style.setProperty("--p", hp / hpMax);
    document.getElementById("bar-hp-text").textContent = `${hp} / ${hpMax}`;
    document.getElementById("bar-xp").style.setProperty("--p", xp / xpMax);
    document.getElementById("bar-xp-text").textContent = `${xp} / ${xpMax}`;
    document.getElementById("count-heart").textContent = counts.heart;
    document.getElementById("count-rose").textContent = counts.rose;
    document.getElementById("count-memory").textContent = counts.memory;
    const mins = Math.floor(midnightMs / 60000);
    const secs = Math.floor((midnightMs % 60000) / 1000);
    document.getElementById("hud-clock").textContent =
      String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function toast(msg, color = "#ff9fd6") {
    toastEl.textContent = msg;
    toastEl.style.borderColor = color;
    toastEl.style.boxShadow = `0 0 0 3px var(--night-0), 0 0 12px ${color}, 0 0 32px ${color}55`;
    toastEl.classList.add("is-show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("is-show"), 1600);
  }

  function seedWorld() {
    collectibles = [];
    // Hearts, roses, memory shards along the level
    const layout = [
      { x: 130, kind: "heart"  },
      { x: 190, kind: "heart"  },
      { x: 260, kind: "rose"   },
      { x: 320, kind: "memory" },
      { x: 400, kind: "heart"  },
      { x: 470, kind: "rose"   },
      { x: 540, kind: "heart"  },
      { x: 620, kind: "memory" },
      { x: 700, kind: "heart"  },
      { x: 780, kind: "rose"   },
      { x: 860, kind: "memory" },
      { x: 940, kind: "heart"  },
      { x: 1020, kind: "rose"  },
      { x: 1100, kind: "memory" },
    ];
    layout.forEach((c, i) => {
      // alternate ground-level pickups with jump-required pickups so first-time
      // players see feedback by just walking, and skilled players hunt the high ones
      const offsetCycle = [4, 18, 36];
      collectibles.push({
        x: c.x,
        y: GROUND_Y - 18 - offsetCycle[i % offsetCycle.length],
        t: Math.random() * Math.PI * 2,
        taken: false,
        kind: c.kind,
      });
    });

    fireflies = [];
    for (let i = 0; i < 30; i++) {
      fireflies.push({
        x: Math.random() * 1300,
        y: 40 + Math.random() * (GROUND_Y - 80),
        phase: Math.random() * Math.PI * 2,
        seed: 0.4 + Math.random() * 1.2,
      });
    }

    trees = [];
    for (let i = 0; i < 26; i++) {
      trees.push({
        x: i * 70 + Math.random() * 30 - 15,
        h: 60 + Math.floor(Math.random() * 50),
        sway: Math.random() * Math.PI * 2,
        kind: Math.floor(Math.random() * 3),
      });
    }
  }

  // ── Sprite preloading ──
  const sprites = {};
  function loadSprite(name, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { sprites[name] = img; resolve(img); };
      img.onerror = () => { sprites[name] = null; resolve(null); };
      img.src = src;
    });
  }

  async function preloadWorldSprites() {
    await Promise.all([
      loadSprite("girl",  "assets/sprites/girl_portrait.png"),
      loadSprite("husky", "assets/sprites/husky_portrait.png"),
      loadSprite("boy",   "assets/sprites/boy_portrait.png"),
    ]);
    player.sprite = sprites.girl;
    pet.sprite    = sprites.husky;
  }

  // ── Input ──
  const keys = { left: false, right: false, jump: false };

  function clearKeys() {
    keys.left = keys.right = keys.jump = false;
    document.querySelectorAll(".touch__btn.is-pressed")
      .forEach((b) => b.classList.remove("is-pressed"));
  }

  document.addEventListener("keydown", (e) => {
    if (!screens.world.classList.contains("is-active")) return;
    const k = e.key;
    if (k === "ArrowLeft"  || k === "a" || k === "A") keys.left = true;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = true;
    if (k === "ArrowUp"    || k === "w" || k === "W" || k === " ") {
      keys.jump = true;
      e.preventDefault();
    }
    if (k === "e" || k === "E") interact();
    if (k === "Escape") {
      worldRunning = false;
      clearKeys();
      show("landing");
    }
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key;
    if (k === "ArrowLeft"  || k === "a" || k === "A") keys.left = false;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = false;
    if (k === "ArrowUp"    || k === "w" || k === "W" || k === " ") keys.jump = false;
  });

  // Stuck-key safety: if the window loses focus mid-press the keyup never fires
  window.addEventListener("blur", clearKeys);
  window.addEventListener("visibilitychange", () => {
    if (document.hidden) clearKeys();
  });

  /* ─── Touch controls (mobile D-pad + action buttons) ───
     Wired via the Pointer Events API which handles mouse, touch and pen
     uniformly across iOS Safari, Android Chrome, Samsung Internet, Firefox
     Mobile, and desktop browsers — without the duplicated touch+synth-click
     events that broke Android in earlier revisions. */
  const touchBtns = document.querySelectorAll(".touch__btn");
  const activePointers = new Map(); // pointerId -> btn

  function pressTouch(btn, on) {
    if (!btn) return;
    btn.classList.toggle("is-pressed", on);
    const which = btn.dataset.touch;
    if (which === "left")  keys.left  = on;
    if (which === "right") keys.right = on;
    if (which === "jump")  keys.jump  = on;
    if (which === "interact" && on) interact();
    if (which === "back"     && on) {
      worldRunning = false;
      clearKeys();
      show("landing");
    }
  }

  touchBtns.forEach((btn) => {
    // The container has touch-action:none in CSS so the browser does not
    // also try to scroll/zoom. preventDefault here is belt-and-braces.
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (_) { /* old browsers */ }
      activePointers.set(e.pointerId, btn);
      pressTouch(btn, true);
      SFX.blip();
    });

    const release = (e) => {
      e.preventDefault();
      const prev = activePointers.get(e.pointerId);
      activePointers.delete(e.pointerId);
      pressTouch(prev || btn, false);
    };
    btn.addEventListener("pointerup",     release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave",  release);
    btn.addEventListener("lostpointercapture", () => pressTouch(btn, false));

    // Fallback for ancient browsers without Pointer Events
    if (!("onpointerdown" in window)) {
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault(); pressTouch(btn, true); SFX.blip();
      }, { passive: false });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault(); pressTouch(btn, false);
      }, { passive: false });
      btn.addEventListener("touchcancel", () => pressTouch(btn, false));
    }

    // Prevent the long-press context menu on Android
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  // If the user backgrounds the page mid-press, release all touch buttons
  window.addEventListener("pagehide",  clearKeys);
  document.addEventListener("pointercancel", clearKeys);

  // rotating interact hints so it feels alive
  const HINTS = [
    "IGLOO: *sniff sniff* …I smell a Memory Shard ahead!",
    "IGLOO: *tail wag* Manab says jump for the high hearts!",
    "IGLOO: *bork* Hidden roses smell like your favorite cake!",
    "IGLOO: *zoomies* Three shards. Then the Cake Crystal reforms!",
    "IGLOO: *boop* Happy Birthday, Moumita! ♥",
  ];
  let hintIdx = 0;
  function interact() {
    toast(HINTS[hintIdx % HINTS.length], "#ffd166");
    hintIdx++;
    SFX.heart();
  }

  // ── Physics + draw ──
  const GRAVITY = 0.55;
  const MOVE_SPEED = 2.0;
  const JUMP_VY = -8.4;

  function update(dt) {
    // Horizontal movement
    let ax = 0;
    if (keys.left)  ax -= 1;
    if (keys.right) ax += 1;
    if (ax !== 0) player.facing = ax;
    player.vx = ax * MOVE_SPEED;

    // Jump
    if (keys.jump && player.onGround) {
      player.vy = JUMP_VY;
      player.onGround = false;
      SFX.blip();
    }

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > 12) player.vy = 12;

    player.x += player.vx * (dt / 16);
    player.y += player.vy * (dt / 16);

    // Ground collision
    if (player.y + player.h >= GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    // Wrap walk phase
    if (Math.abs(player.vx) > 0.1) player.walkPhase += dt * 0.02;

    // Camera follows player
    const desired = player.x - CAMERA_LEAD;
    camera.x += (desired - camera.x) * 0.08;
    if (camera.x < 0) camera.x = 0;
    if (camera.x > 1200) camera.x = 1200;

    // Pet follows
    pet.target = player.x - player.facing * 26;
    pet.x += (pet.target - pet.x) * 0.06;
    pet.bob += dt * 0.006;
    pet.y = GROUND_Y - pet.h - 1 + Math.sin(pet.bob) * 1.5;

    // Collectibles
    for (const c of collectibles) {
      if (c.taken) continue;
      c.t += dt * 0.003;
      c.y += Math.sin(c.t) * 0.2;
      // collision (generous hitbox so floating pickups feel kind)
      if (
        Math.abs(c.x - (player.x + player.w / 2)) < 12 &&
        Math.abs(c.y - (player.y + player.h / 2)) < 22
      ) {
        c.taken = true;
        counts[c.kind] = (counts[c.kind] || 0) + 1;
        xp = Math.min(xpMax, xp + (c.kind === "memory" ? 22 : c.kind === "rose" ? 12 : 6));
        if (c.kind === "heart") hp = Math.min(hpMax, hp + 1);
        const labels = {
          heart:  "+1 HEART · +6 LOVE",
          rose:   "+1 ROSE · +12 LOVE",
          memory: "+1 MEMORY SHARD · +22 LOVE",
        };
        const colors = { heart: "#ff7fbf", rose: "#ff5f8f", memory: "#5ff0ff" };
        toast(labels[c.kind], colors[c.kind]);
        for (let i = 0; i < 12; i++) {
          worldSparks.push({
            x: c.x,
            y: c.y,
            vy: -1 - Math.random() * 2,
            vx: (Math.random() - 0.5) * 3,
            life: 1,
            color: colors[c.kind],
          });
        }
        SFX.pickup();
        refreshHUD();

        if (counts.memory >= 3 && !startedEnding) {
          startedEnding = true;
          setTimeout(showEnding, 900);
        }
      }
    }

    // Fireflies
    for (const f of fireflies) {
      f.phase += dt * 0.004 * f.seed;
      f.x += Math.cos(f.phase) * 0.3;
      f.y += Math.sin(f.phase * 0.7) * 0.2;
    }

    // Tree sway
    for (const t of trees) t.sway += dt * 0.0008;

    // sparks
    for (let i = worldSparks.length - 1; i >= 0; i--) {
      const s = worldSparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.08;
      s.life -= 0.02;
      if (s.life <= 0) worldSparks.splice(i, 1);
    }

    // clock
    midnightMs -= dt * 12; // accelerated so the timer is visible
    if (midnightMs < 0) midnightMs = 0;
    refreshHUD();
  }

  function drawBackground() {
    // sky gradient
    const grd = wctx.createLinearGradient(0, 0, 0, LH);
    grd.addColorStop(0, "#2a1554");
    grd.addColorStop(0.45, "#4a1d6d");
    grd.addColorStop(1, "#a04680");
    wctx.fillStyle = grd;
    wctx.fillRect(0, 0, LW, LH);

    // far moon
    wctx.save();
    wctx.translate(LW - 80, 50);
    wctx.fillStyle = "#fff4dc";
    wctx.beginPath();
    wctx.arc(0, 0, 18, 0, Math.PI * 2);
    wctx.fill();
    wctx.fillStyle = "rgba(255, 220, 170, 0.25)";
    wctx.beginPath();
    wctx.arc(0, 0, 30, 0, Math.PI * 2);
    wctx.fill();
    wctx.restore();

    // distant stars (parallax very slow)
    wctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 60; i++) {
      const x = ((i * 73) - camera.x * 0.1) % LW;
      const y = (i * 37) % 90;
      wctx.fillRect((x + LW) % LW, y, 1, 1);
    }

    // floating polaroid photos in the distance (Memory Forest motif)
    for (let i = 0; i < 4; i++) {
      const px = ((i * 260) - camera.x * 0.2) % (LW + 120);
      const py = 36 + (i % 2) * 14 + Math.sin(performance.now() * 0.001 + i) * 3;
      drawPolaroid((px + LW + 120) % (LW + 120) - 60, py, i);
    }

    // distant rolling forest silhouettes (parallax slow)
    drawForestSilhouette(0.35, "#1b0938", 40);
    drawForestSilhouette(0.6,  "#260b48", 32);
  }

  /* small pixel polaroid that floats in the background */
  function drawPolaroid(x, y, i) {
    wctx.save();
    wctx.translate(Math.round(x), Math.round(y));
    // slight tilt by drawing the inner photo offset
    // soft glow behind
    const tint = ["#5ff0ff", "#ff9fd6", "#ffd166", "#7df58f"][i % 4];
    wctx.fillStyle = tint + "22";
    wctx.fillRect(-10, -8, 20, 16);
    // paper frame
    wctx.fillStyle = "#f5ecd6";
    wctx.fillRect(-7, -6, 14, 12);
    // inner photo
    wctx.fillStyle = tint;
    wctx.fillRect(-6, -5, 12, 7);
    // tiny "scene" inside the photo: horizon + little chibi head dot
    wctx.fillStyle = "#1a0a3e";
    wctx.fillRect(-6, -2, 12, 4);
    wctx.fillStyle = "#fff4dc";
    wctx.fillRect(-1, -3, 2, 2); // moon
    wctx.fillStyle = "#ff9fd6";
    wctx.fillRect(3, 0, 1, 1);   // tiny heart
    // pin / tape
    wctx.fillStyle = "#ff5fae";
    wctx.fillRect(-1, -7, 2, 2);
    wctx.restore();
  }

  /* soft rolling forest silhouette built from pixel "bushes" */
  function drawForestSilhouette(speed, color, height) {
    wctx.fillStyle = color;
    const baseY = GROUND_Y - 2;
    const w = 18;
    const offset = ((camera.x * speed) % w + w) % w;
    for (let x = -w - offset; x < LW + w; x += w) {
      const h = height + Math.floor((Math.sin(x * 0.07) + Math.cos(x * 0.21)) * 4);
      // chunky pixel bush — slightly rounded by stacking smaller rects on top
      wctx.fillRect(x, baseY - h, w, h);
      wctx.fillRect(x + 2, baseY - h - 2, w - 4, 2);
      wctx.fillRect(x + 5, baseY - h - 4, w - 10, 2);
    }
  }

  function drawGround() {
    // ground dirt
    const grd = wctx.createLinearGradient(0, GROUND_Y, 0, LH);
    grd.addColorStop(0, "#3b1660");
    grd.addColorStop(1, "#1a0633");
    wctx.fillStyle = grd;
    wctx.fillRect(0, GROUND_Y, LW, LH - GROUND_Y);

    // grass top stripe
    wctx.fillStyle = "#5a2bc4";
    wctx.fillRect(0, GROUND_Y, LW, 3);
    wctx.fillStyle = "#7a47e4";
    wctx.fillRect(0, GROUND_Y, LW, 1);

    // grass tufts (parallax fast)
    for (let i = 0; i < 30; i++) {
      const baseX = (i * 24 - camera.x * 0.9) % (LW + 60);
      const x = (baseX + LW + 60) % (LW + 60) - 30;
      wctx.fillStyle = "#8a52ff";
      wctx.fillRect(x, GROUND_Y - 3, 2, 3);
      wctx.fillRect(x + 3, GROUND_Y - 2, 2, 2);
      wctx.fillRect(x - 3, GROUND_Y - 2, 2, 2);
    }

    // glowing flowers
    for (let i = 0; i < 10; i++) {
      const baseX = (i * 90 - camera.x * 0.9) % (LW + 100);
      const x = (baseX + LW + 100) % (LW + 100) - 50;
      const color = ["#ff9fd6", "#5ff0ff", "#ffd166", "#7df58f"][i % 4];
      wctx.fillStyle = color;
      wctx.fillRect(x, GROUND_Y - 6, 2, 2);
      wctx.fillStyle = color + "88";
      wctx.fillRect(x - 1, GROUND_Y - 7, 4, 4);
    }
  }

  function drawTrees() {
    // sort back-to-front by base x for nicer overlap
    for (const t of trees) {
      const x = Math.round(t.x - camera.x);
      if (x < -50 || x > LW + 50) continue;
      const sway = Math.floor(Math.sin(t.sway) * 1.5);

      // dark trunk (chunky pixels)
      wctx.fillStyle = "#1a0530";
      wctx.fillRect(x + 2, GROUND_Y - t.h + 8, 4, t.h - 8);
      wctx.fillStyle = "#2d0a44";
      wctx.fillRect(x + 3, GROUND_Y - t.h + 8, 2, t.h - 8);

      // pixel leafy crown — soft blob built from rounded rectangles
      const palettes = [
        { dark: "#1d6a82", mid: "#2bc6ff", light: "#b6f5ff" },
        { dark: "#8a3a72", mid: "#ff5fae", light: "#ff9fd6" },
        { dark: "#4a248a", mid: "#7d3ed9", light: "#b46bff" },
      ];
      const pal = palettes[t.kind];

      const cx = x + 4 + sway;
      const cy = GROUND_Y - t.h;

      // outer shadow blob
      wctx.fillStyle = pal.dark;
      wctx.fillRect(cx - 16, cy - 2, 32, 14);
      wctx.fillRect(cx - 14, cy - 6, 28, 4);
      wctx.fillRect(cx - 11, cy - 9, 22, 3);
      wctx.fillRect(cx - 7,  cy - 11, 14, 2);

      // mid color (main body)
      wctx.fillStyle = pal.mid;
      wctx.fillRect(cx - 14, cy - 1, 28, 11);
      wctx.fillRect(cx - 12, cy - 5, 24, 4);
      wctx.fillRect(cx - 9,  cy - 8, 18, 3);
      wctx.fillRect(cx - 5,  cy - 10, 10, 2);

      // top highlight cluster
      wctx.fillStyle = pal.light;
      wctx.fillRect(cx - 7,  cy - 8, 6, 3);
      wctx.fillRect(cx + 2,  cy - 6, 4, 2);
      wctx.fillRect(cx - 10, cy - 1, 4, 2);

      // little firefly dots on the crown
      wctx.fillStyle = "#fff4dc";
      wctx.fillRect(cx - 9, cy - 9, 1, 1);
      wctx.fillRect(cx + 6, cy - 4, 1, 1);
    }
  }

  function drawFireflies() {
    for (const f of fireflies) {
      const x = f.x - camera.x;
      if (x < -10 || x > LW + 10) continue;
      const t = (Math.sin(performance.now() * 0.003 + f.phase) + 1) / 2;
      const a = 0.3 + t * 0.7;
      wctx.fillStyle = `rgba(255, 240, 180, ${a})`;
      wctx.fillRect(Math.round(x), Math.round(f.y), 2, 2);
      wctx.fillStyle = `rgba(255, 220, 130, ${a * 0.4})`;
      wctx.fillRect(Math.round(x) - 1, Math.round(f.y) - 1, 4, 4);
    }
  }

  function drawHeartIcon(x, y, size, color) {
    const shape = [
      [0,1,1,0,1,1,0],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],
      [0,0,1,1,1,0,0],
      [0,0,0,1,0,0,0],
    ];
    wctx.fillStyle = color;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          wctx.fillRect(x + c * size, y + r * size, size, size);
        }
      }
    }
  }

  function drawCollectibles() {
    for (const c of collectibles) {
      if (c.taken) continue;
      const x = Math.round(c.x - camera.x);
      if (x < -20 || x > LW + 20) continue;
      const y = Math.round(c.y + Math.sin(c.t * 2) * 2);

      const glow = c.kind === "heart" ? "#ff7fbf" :
                   c.kind === "rose"  ? "#ff5f8f" :
                                        "#5ff0ff";

      // soft pulsing radial halo (no harsh edges)
      const pulse = 0.55 + Math.sin(c.t * 4) * 0.15;
      const r = 14;
      const grad = wctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0,    glow + "cc");
      grad.addColorStop(0.45, glow + "55");
      grad.addColorStop(1,    glow + "00");
      wctx.globalAlpha = pulse;
      wctx.fillStyle = grad;
      wctx.fillRect(x - r, y - r, r * 2, r * 2);
      wctx.globalAlpha = 1;

      if (c.kind === "heart") {
        drawHeartIcon(x - 7, y - 6, 2, glow);
        // sparkle dot
        wctx.fillStyle = "#ffffff";
        wctx.fillRect(x - 4, y - 4, 1, 1);
      } else if (c.kind === "rose") {
        // pixel rose with stem
        wctx.fillStyle = "#3a8a40";
        wctx.fillRect(x, y + 3, 1, 7);
        wctx.fillRect(x - 2, y + 5, 2, 2);
        wctx.fillRect(x + 1, y + 7, 2, 2);
        // bud
        wctx.fillStyle = "#a01840";
        wctx.fillRect(x - 4, y - 3, 9, 7);
        wctx.fillStyle = "#ff3f6f";
        wctx.fillRect(x - 3, y - 2, 7, 5);
        wctx.fillStyle = "#ff7fa3";
        wctx.fillRect(x - 1, y, 3, 2);
        wctx.fillStyle = "#ffffff";
        wctx.fillRect(x, y, 1, 1);
      } else {
        // memory shard — pulsing diamond crystal
        wctx.save();
        wctx.translate(x, y);
        wctx.rotate(c.t * 0.7);
        // outer dark
        wctx.fillStyle = "#1d6a82";
        wctx.fillRect(-7, -1, 14, 2);
        wctx.fillRect(-1, -7, 2, 14);
        // body
        wctx.fillStyle = "#5ff0ff";
        wctx.fillRect(-5, -1, 10, 2);
        wctx.fillRect(-1, -5, 2, 10);
        // core highlight
        wctx.fillStyle = "#ffffff";
        wctx.fillRect(-1, -1, 2, 2);
        wctx.restore();
      }
    }
  }

  function drawPlayer() {
    const px = Math.round(player.x - camera.x);
    const py = Math.round(player.y);
    const bob = !player.onGround ? 0 : Math.floor(Math.sin(player.walkPhase) * 2);

    // shadow
    wctx.fillStyle = "rgba(0,0,0,0.4)";
    wctx.fillRect(px + 1, GROUND_Y, player.w - 2, 2);

    if (player.sprite) {
      const img = player.sprite;
      // draw image scaled into player bounds, mirrored if facing left
      wctx.save();
      if (player.facing < 0) {
        wctx.translate(px + player.w, py + bob);
        wctx.scale(-1, 1);
        wctx.drawImage(img, 0, 0, player.w, player.h);
      } else {
        wctx.drawImage(img, px, py + bob, player.w, player.h);
      }
      wctx.restore();
    } else {
      // fallback rectangle
      wctx.fillStyle = "#ff9fd6";
      wctx.fillRect(px, py + bob, player.w, player.h);
    }

    // little glow under feet
    wctx.fillStyle = "rgba(255, 159, 214, 0.25)";
    wctx.fillRect(px - 2, GROUND_Y - 1, player.w + 4, 1);
  }

  function drawPet() {
    const px = Math.round(pet.x - camera.x);
    const py = Math.round(pet.y);
    wctx.fillStyle = "rgba(0,0,0,0.35)";
    wctx.fillRect(px, GROUND_Y, pet.w, 1);
    if (pet.sprite) {
      wctx.drawImage(pet.sprite, px, py, pet.w, pet.h);
    } else {
      wctx.fillStyle = "#ffffff";
      wctx.fillRect(px, py, pet.w, pet.h);
    }
  }

  function drawSparks() {
    for (const s of worldSparks) {
      const x = Math.round(s.x - camera.x);
      const y = Math.round(s.y);
      wctx.fillStyle = s.color;
      wctx.globalAlpha = Math.max(0, s.life);
      wctx.fillRect(x, y, 2, 2);
    }
    wctx.globalAlpha = 1;
  }

  function drawVignette() {
    const grd = wctx.createRadialGradient(LW / 2, LH / 2, LH * 0.35, LW / 2, LH / 2, LH * 0.85);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.55)");
    wctx.fillStyle = grd;
    wctx.fillRect(0, 0, LW, LH);
  }

  let lastFrame = performance.now();
  let rafId = 0;
  function frame(now) {
    rafId = 0;
    if (!worldRunning) return;
    const dt = Math.min(48, now - lastFrame);
    lastFrame = now;

    try {
      update(dt);
      drawBackground();
      drawForestSilhouette(0.7, "#15062e", 46);
      drawTrees();
      drawForestSilhouette(1.1, "#0a0220", 28);
      drawGround();
      drawCollectibles();
      drawFireflies();
      drawPet();
      drawPlayer();
      drawSparks();
      drawVignette();
    } catch (err) {
      // never crash the game from a rendering glitch
      console.error("frame error:", err);
    }

    rafId = requestAnimationFrame(frame);
  }

  let startedEnding = false;
  let spritesLoaded = false;

  function resetGameState() {
    counts = { heart: 0, rose: 0, memory: 0 };
    hp = hpMax;
    xp = 12;
    midnightMs = 11 * 60 * 1000 + 42 * 1000;
    player.x = 50;
    player.y = 0;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.onGround = false;
    pet.x = 30;
    pet.y = 0;
    camera.x = 0;
    worldSparks.length = 0;
    startedEnding = false;
    hintIdx = 0;
    clearKeys();
    seedWorld();
    refreshHUD();
  }

  async function enterWorld(opts = {}) {
    show("world");
    if (!spritesLoaded) {
      spritesLoaded = true;
      await preloadWorldSprites();
    }
    if (opts.fresh !== false) resetGameState();
    fitWorldCanvas();
    refreshHUD();
    worldRunning = true;
    lastFrame = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);

    setTimeout(() => {
      toast("Welcome to MEMORY FOREST. Collect Memory Shards!", "#5ff0ff");
    }, 350);
  }

  /* ═══════════════ ending ═══════════════ */
  function showEnding() {
    worldRunning = false;
    openModal("HAPPY BIRTHDAY", `
      <div class="credits">
        <p class="credits__line" style="font-family:var(--font-pixel); color:var(--gold-2); font-size:13px; text-shadow:0 0 8px #ffd16699;">
          ★ MEMORY SHARDS RESTORED ★
        </p>
        <img src="assets/sprites/cake_scene.png" alt="Birthday cake scene"
             style="width:100%; max-width:520px; margin: 18px auto; display:block;
                    image-rendering: pixelated;
                    border: 4px solid #ff5fae;
                    box-shadow: 0 0 0 4px #050214, 0 0 24px #ff5fae88;">
        <p class="credits__line">The Birthday Crystal glows again.</p>
        <p class="credits__line">Igloo barks. Manab slices the cake. Fireworks bloom.</p>
        <p class="credits__line" style="margin-top:18px; color:var(--pink-1); font-size:20px;">
          ♥ Happy Birthday, Moumita. ♥
        </p>
        <p class="credits__line" style="opacity:.7; margin-top:14px;">
          — love, Manab &amp; Igloo (and 32 bits of pixels)
        </p>
      </div>
    `);
    SFX.heart();
    setTimeout(() => SFX.confirm(), 300);
    setTimeout(() => SFX.heart(), 600);
  }
})();
