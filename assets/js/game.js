/* ──────────────────────────────────────────────────────────────────────
   game.js
   - Screen transitions (landing → cutscene → world)
   - Dialogue cutscene engine (typewriter, portraits, multi-speaker)
   - Modal popups for gallery / settings / credits
   - PIXEL ADVENTURE ENGINE — 4 levels, enemies, bosses, abilities, hazards
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
  try { console.log("[birthday] build 2026-05-26-b · touch=%s android=%s ios=%s",
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
        setTimeout(() => {
          if (!el.classList.contains("is-active")) el.hidden = true;
        }, 650);
      }
    });
    document.body.classList.toggle("in-world",  name === "world");
    document.body.classList.toggle("in-intro",  name === "intro");
    document.body.classList.toggle("in-landing", name === "landing");
  }

  /* ═══════════════ menu actions ═══════════════ */
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
    music:      false,
    crt:        true,
    speed:      "normal",
    difficulty: "adventure", // "cozy" | "adventure" | "goblin"
  };

  // mapping difficulty → numeric multipliers
  const DIFF_PROFILES = {
    cozy:      { label: "COZY",        enemyHp: 0.6, dmg: 0.5, timeMul: 0.5, color: "#5ff0ff" },
    adventure: { label: "ADVENTURE",   enemyHp: 1.0, dmg: 1.0, timeMul: 1.0, color: "#ffd166" },
    goblin:    { label: "GOBLIN LORD", enemyHp: 1.6, dmg: 1.5, timeMul: 1.5, color: "#ff5fae" },
  };
  function difficultyProfile() {
    return DIFF_PROFILES[settings.difficulty] || DIFF_PROFILES.adventure;
  }

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
        <div class="settings-row">
          <span class="settings-row__name">DIFFICULTY</span>
          <button data-set="difficulty">${difficultyProfile().label}</button>
        </div>
        <div class="settings-row" style="opacity:.7">
          <span class="settings-row__name">SAVE SLOT</span>
          <span class="settings-row__value">★ Slot 01 · Auto-Save</span>
        </div>
      </div>
    `);
  }

  // single delegated handler for the settings modal
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
    } else if (key === "difficulty") {
      const cycle = ["cozy", "adventure", "goblin"];
      const i = (cycle.indexOf(settings.difficulty) + 1) % cycle.length;
      settings.difficulty = cycle[i];
      b.textContent = difficultyProfile().label;
      try { localStorage.setItem("moumi.difficulty", settings.difficulty); } catch (_) {}
    }
    SFX.blip();
  });

  // Restore difficulty from previous sessions
  try {
    const saved = localStorage.getItem("moumi.difficulty");
    if (saved && DIFF_PROFILES[saved]) settings.difficulty = saved;
  } catch (_) {}

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
      clearInterval(typingTimer);
      dialogText.textContent = typingTarget;
      typingDone = true;
      return;
    }
    cutsceneIdx++;
    if (cutsceneIdx >= introScript.length) {
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

  screens.intro.addEventListener("click", (e) => {
    if (e.target.closest("#skip-intro, #audio-toggle, .modal")) return;
    advanceCutscene();
  });
  document.getElementById("skip-intro").addEventListener("click", (e) => {
    e.stopPropagation();
    enterWorld();
  });

  /* ─── iOS / first-gesture audio unlock ─── */
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
      if (spritesLoaded) resetGameState({ levelId: "forest" });
      startCutscene();
    });
  }

  function continueGame() {
    // If the player never started a run, Continue acts like New Game so they
    // don't end up in an empty world.
    screenFlash(() => enterWorld({ fresh: !levelData }));
  }

  /* ═══════════════════════════════════════════════════════════
     PIXEL ADVENTURE ENGINE
     4 chapters · enemies · bosses · combat · abilities · hazards
     ═══════════════════════════════════════════════════════════ */

  const worldCanvas = document.getElementById("world-canvas");
  const wctx = worldCanvas.getContext("2d");
  const worldEl = document.getElementById("world");
  const worldHint = document.getElementById("world-hint");
  const toastEl = document.getElementById("toast");

  const bossBarEl   = document.getElementById("boss-bar");
  const bossBarName = document.getElementById("boss-bar-name");
  const bossBarFill = document.getElementById("boss-bar-fill");

  const chapterCard  = document.getElementById("chapter-card");
  const chapCardChap = document.getElementById("chapter-card-chap");
  const chapCardName = document.getElementById("chapter-card-name");
  const chapCardSub  = document.getElementById("chapter-card-sub");

  const overlay      = document.getElementById("game-overlay");
  const overlayTitle = document.getElementById("game-overlay-title");
  const overlayBody  = document.getElementById("game-overlay-body");
  const overlayRetry = document.getElementById("game-overlay-retry");
  const overlayMenu  = document.getElementById("game-overlay-menu");
  const hudClockEl   = document.querySelector(".hud__clock");
  const hudAbilities = document.getElementById("hud-abilities");

  // Logical resolution for the pixel-art world; we upscale to fit.
  const LW = 480;
  const LH = 240;
  const GROUND_Y = LH - 38;

  let worldDPR = 1;
  let worldRunning = false;

  function fitWorldCanvas() {
    const rect = worldCanvas.parentElement.getBoundingClientRect();
    const cssScale = Math.max(0.5, Math.min(rect.width / LW, rect.height / LH));
    const drawW = Math.round(LW * cssScale);
    const drawH = Math.round(LH * cssScale);

    worldDPR = Math.max(1, Math.floor(cssScale));
    worldCanvas.width  = LW * worldDPR;
    worldCanvas.height = LH * worldDPR;

    worldCanvas.style.position = "absolute";
    worldCanvas.style.width  = drawW + "px";
    worldCanvas.style.height = drawH + "px";
    worldCanvas.style.left = "50%";
    worldCanvas.style.top  = "auto";
    worldCanvas.style.bottom = "0";
    worldCanvas.style.transform = "translateX(-50%)";

    wctx.imageSmoothingEnabled = false;
    wctx.setTransform(worldDPR, 0, 0, worldDPR, 0, 0);
  }

  function refit() { if (worldRunning) fitWorldCanvas(); }
  window.addEventListener("resize", refit);
  window.addEventListener("orientationchange", () => {
    setTimeout(refit, 80);
    setTimeout(refit, 350);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", refit);
    window.visualViewport.addEventListener("scroll", refit);
  }

  /* ═══════════════════════════════════════════════════════════
     LEVEL DATA
     Each level is a packaged scene with collectibles, enemies,
     platforms, hazards, boss, weather and palette.
     ═══════════════════════════════════════════════════════════ */
  const LEVELS = [
    {
      id: "forest",
      chapter: "I",
      name: "MEMORY FOREST",
      sub: "guide Moumita to the Frosting Slime",
      width: 1600,
      bgKind: "forest",
      weather: "calm",
      palette: {
        skyTop: "#2a1554", skyMid: "#4a1d6d", skyBot: "#a04680",
        ground1: "#3b1660", ground2: "#1a0633",
        grassMid: "#5a2bc4", grassTop: "#7a47e4", grassTuft: "#8a52ff",
        forestFar1: "#1b0938", forestFar2: "#260b48", forestNear: "#0a0220",
      },
      collectibles: [
        { x: 130,  kind: "heart"  },
        { x: 220,  kind: "rose"   },
        { x: 320,  kind: "memory" },
        { x: 460,  kind: "heart"  },
        { x: 560,  kind: "rose"   },
        { x: 700,  kind: "memory", y: GROUND_Y - 70 }, // floating up on platform
        { x: 880,  kind: "heart"  },
        { x: 1040, kind: "rose"   },
        { x: 1200, kind: "memory" },
        { x: 1320, kind: "heart"  },
      ],
      hazards: [
        { type: "thorn", x: 380, w: 30 },
        { type: "pit",   x: 760, w: 60 },
        { type: "thorn", x: 1080, w: 24 },
      ],
      platforms: [
        { x: 420, y: GROUND_Y - 50, w: 60, h: 6 },
        { x: 680, y: GROUND_Y - 36, w: 64, h: 6 }, // bridge over pit
        { x: 1000, y: GROUND_Y - 60, w: 70, h: 6 },
      ],
      enemies: [
        { type: "goblin", x: 280, range: 30 },
        { type: "goblin", x: 600, range: 35 },
        { type: "alarm",  x: 920, y: GROUND_Y - 70, range: 24 },
        { type: "goblin", x: 1180, range: 40 },
      ],
      boss: { type: "slime", name: "FROSTING SLIME", x: 1500, hp: 14 },
      secret: { x: 1100, y: GROUND_Y - 100, letter: 1 }, // hidden love letter
      next: "school",
    },

    {
      id: "school",
      chapter: "II",
      name: "SCHOOL CHAOS DUNGEON",
      sub: "dodge flying textbooks & alarm monsters",
      width: 1600,
      bgKind: "school",
      weather: "rain",
      palette: {
        skyTop: "#10182e", skyMid: "#1d2746", skyBot: "#36365e",
        ground1: "#22243e", ground2: "#0e0f1c",
        grassMid: "#3b3c5c", grassTop: "#5d5e84", grassTuft: "#9090b8",
        forestFar1: "#1a1d33", forestFar2: "#262a44", forestNear: "#0a0b16",
      },
      collectibles: [
        { x: 140,  kind: "heart"  },
        { x: 240,  kind: "memory" },
        { x: 360,  kind: "rose"   },
        { x: 520,  kind: "heart", y: GROUND_Y - 80 },
        { x: 660,  kind: "memory" },
        { x: 820,  kind: "heart"  },
        { x: 980,  kind: "rose"   },
        { x: 1120, kind: "memory" },
        { x: 1280, kind: "heart"  },
      ],
      hazards: [
        { type: "thorn", x: 300, w: 28 },
        { type: "pit",   x: 560, w: 50 },
        { type: "spike", x: 880, w: 40 }, // spike trap (bigger thorn)
        { type: "pit",   x: 1180, w: 70 },
      ],
      platforms: [
        { x: 480, y: GROUND_Y - 70, w: 60, h: 6 },
        { x: 600, y: GROUND_Y - 36, w: 60, h: 6 }, // pit bridge
        { x: 1180, y: GROUND_Y - 50, w: 80, h: 6 }, // pit bridge
        { x: 800, y: GROUND_Y - 80, w: 50, h: 6 },
      ],
      enemies: [
        { type: "alarm",  x: 200, y: GROUND_Y - 50, range: 20 },
        { type: "goblin", x: 420, range: 30 },
        { type: "alarm",  x: 720, y: GROUND_Y - 70, range: 28 },
        { type: "goblin", x: 960, range: 30 },
        { type: "alarm",  x: 1300, y: GROUND_Y - 80, range: 30 },
        { type: "textbook", x: 380, range: 80 }, // flies horizontally
        { type: "textbook", x: 1000, range: 100 },
      ],
      boss: { type: "demon", name: "DETENTION DEMON", x: 1500, hp: 18 },
      secret: { x: 880, y: GROUND_Y - 120, letter: 2 },
      next: "meme",
    },

    {
      id: "meme",
      chapter: "III",
      name: "MEME CITY",
      sub: "chase trolls through the neon streets",
      width: 1600,
      bgKind: "meme",
      weather: "calm",
      palette: {
        skyTop: "#1a0040", skyMid: "#400a60", skyBot: "#702380",
        ground1: "#1b0a2a", ground2: "#080213",
        grassMid: "#380e60", grassTop: "#5a169c", grassTuft: "#a04edc",
        forestFar1: "#22094a", forestFar2: "#360e6c", forestNear: "#0a0220",
      },
      collectibles: [
        { x: 150,  kind: "heart" },
        { x: 300,  kind: "rose"  },
        { x: 470,  kind: "memory" },
        { x: 600,  kind: "heart"  },
        { x: 760,  kind: "heart", y: GROUND_Y - 70 },
        { x: 900,  kind: "memory" },
        { x: 1080, kind: "rose"   },
        { x: 1240, kind: "memory" },
        { x: 1380, kind: "heart"  },
      ],
      hazards: [
        { type: "spike", x: 380, w: 40 },
        { type: "pit",   x: 660, w: 60 },
        { type: "thorn", x: 1020, w: 30 },
        { type: "pit",   x: 1280, w: 70 },
      ],
      platforms: [
        { x: 240, y: GROUND_Y - 60, w: 60, h: 6 },
        { x: 720, y: GROUND_Y - 40, w: 70, h: 6 },
        { x: 1300, y: GROUND_Y - 50, w: 80, h: 6 },
        { x: 850, y: GROUND_Y - 100, w: 50, h: 6 },
      ],
      enemies: [
        { type: "goblin", x: 200, range: 40 },
        { type: "troll",  x: 540, range: 60 }, // bigger goblin variant
        { type: "goblin", x: 800, range: 30 },
        { type: "troll",  x: 1100, range: 60 },
        { type: "alarm",  x: 1200, y: GROUND_Y - 80, range: 30 },
        { type: "textbook", x: 600, range: 80 },
      ],
      boss: { type: "trolllord", name: "TROLL LORD", x: 1500, hp: 22 },
      secret: { x: 850, y: GROUND_Y - 140, letter: 3 },
      next: "sky",
    },

    {
      id: "sky",
      chapter: "IV",
      name: "DREAM SKY KINGDOM",
      sub: "ascend to face the Chaos Goblin King",
      width: 1700,
      bgKind: "sky",
      weather: "calm",
      palette: {
        skyTop: "#3a1e6b", skyMid: "#6d3a9e", skyBot: "#ff9fd6",
        ground1: "#7a47e4", ground2: "#3b1660",
        grassMid: "#a36cff", grassTop: "#caa1ff", grassTuft: "#ffd7ff",
        forestFar1: "#caa1ff", forestFar2: "#a36cff", forestNear: "#7a47e4",
      },
      collectibles: [
        { x: 150,  kind: "heart"  },
        { x: 280,  kind: "memory" },
        { x: 420,  kind: "rose", y: GROUND_Y - 70 },
        { x: 580,  kind: "heart", y: GROUND_Y - 110 },
        { x: 740,  kind: "memory" },
        { x: 900,  kind: "heart", y: GROUND_Y - 80 },
        { x: 1080, kind: "rose"   },
        { x: 1260, kind: "memory" },
        { x: 1400, kind: "heart"  },
      ],
      hazards: [
        { type: "pit",   x: 360, w: 80 },
        { type: "pit",   x: 660, w: 100 },
        { type: "spike", x: 960, w: 50 },
        { type: "pit",   x: 1200, w: 90 },
      ],
      platforms: [
        { x: 330, y: GROUND_Y - 50, w: 60, h: 6 },
        { x: 440, y: GROUND_Y - 80, w: 60, h: 6 },
        { x: 660, y: GROUND_Y - 30, w: 90, h: 6 }, // long bridge
        { x: 560, y: GROUND_Y - 110, w: 60, h: 6 },
        { x: 860, y: GROUND_Y - 90, w: 60, h: 6 },
        { x: 1180, y: GROUND_Y - 60, w: 100, h: 6 },
        { x: 1380, y: GROUND_Y - 90, w: 60, h: 6 },
      ],
      enemies: [
        { type: "goblin", x: 200, range: 30 },
        { type: "alarm",  x: 480, y: GROUND_Y - 80, range: 40 },
        { type: "troll",  x: 820, range: 50 },
        { type: "alarm",  x: 1080, y: GROUND_Y - 90, range: 30 },
        { type: "goblin", x: 1380, range: 50 },
        { type: "textbook", x: 1200, range: 120 },
      ],
      boss: { type: "king", name: "CHAOS GOBLIN KING", x: 1600, hp: 30 },
      secret: { x: 580, y: GROUND_Y - 160, letter: 4 },
      next: null,
    },
  ];

  function getLevel(id) {
    return LEVELS.find((l) => l.id === id) || LEVELS[0];
  }

  /* ═══════════════════════════════════════════════════════════
     PLAYER / PET / STATE
     ═══════════════════════════════════════════════════════════ */
  const player = {
    x: 50, y: 0, w: 14, h: 22,
    vx: 0, vy: 0,
    onGround: false, facing: 1, walkPhase: 0,
    sprite: null,
    invincibleMs: 0,
    attackCdMs: 0,
    barkCdMs: 0,
    dashCdMs: 0,
    dashMs: 0,    // active dash duration
    dashDir: 1,
    jumpsLeft: 1, // for double jump
    state: "alive", // "alive" | "dead"
  };

  const pet = {
    x: 30, y: 0, w: 16, h: 12,
    target: 0, bob: 0,
    sprite: null,
    barkRingMs: 0,
  };

  let camera = { x: 0 };
  let levelData = null; // active level
  let levelId = "forest";

  /** @type {{x:number,y:number,t:number,taken:boolean,kind:string,wilt:number,visible:number}[]} */
  let collectibles = [];

  /** @type {{x:number,y:number,phase:number,seed:number}[]} */
  let fireflies = [];

  /** @type {{x:number,h:number,sway:number,kind:number}[]} */
  let trees = [];

  /** @type {{x:number,y:number,vy:number,vx:number,life:number,color:string,kind?:string}[]} */
  let worldSparks = [];

  /** @type {{x:number,y:number,vx:number,vy:number,life:number,owner:string,damage:number,t:number}[]} */
  let projectiles = [];

  /** @type {{type:string,x:number,y:number,w:number,h:number,vx:number,vy:number,spawnX:number,spawnY:number,range:number,hp:number,maxHp:number,facing:number,stunMs:number,hurtMs:number,phase:number,fireCd:number,damage:number,xp:number,dead:boolean,extra?:object}[]} */
  let enemies = [];

  /** @type {{type:string,x:number,y:number,w:number,h:number,hp:number,maxHp:number,phase:number,phaseT:number,stunMs:number,hurtMs:number,fireCd:number,name:string,dead:boolean,extra?:object,vx:number,vy:number,facing:number,onGround:boolean}|null} */
  let boss = null;

  /** @type {{type:string,x:number,y:number,w:number,h:number}[]} */
  let hazards = [];

  /** @type {{x:number,y:number,w:number,h:number}[]} */
  let platforms = [];

  /** @type {{x:number,y:number,collected:boolean,letter:number}|null} */
  let secret = null;

  // Counters & stats
  let counts = { heart: 0, rose: 0, memory: 0 };
  let hp = 20, hpMax = 20;
  let xp = 0, xpMax = 1000;
  let midnightMs = 11 * 60 * 1000 + 42 * 1000; // 11:42 game-clock remaining (accelerated)

  // Abilities (unlocked by XP)
  const ABILITY_THRESHOLDS = { doubleJump: 100, dash: 250, spreadShot: 500 };
  let abilities = { doubleJump: false, dash: false, spreadShot: false };

  // Game state
  let gameState = "playing"; // playing | chapter_complete | game_over | victory | boss_intro
  let bossIntroMs = 0;
  let startedEnding = false;
  let spritesLoaded = false;
  let hintIdx = 0;
  let checkpoint = { x: 50, y: GROUND_Y - 22 };
  let weatherDrops = []; // rain droplets

  // Damage flash on world
  let damageGlitchMs = 0;

  /* ─── HUD ─── */
  function refreshHUD() {
    document.getElementById("bar-hp").style.setProperty("--p", Math.max(0, hp) / hpMax);
    document.getElementById("bar-hp-text").textContent = `${Math.max(0, Math.floor(hp))} / ${hpMax}`;
    document.getElementById("bar-xp").style.setProperty("--p", Math.min(1, xp / xpMax));
    document.getElementById("bar-xp-text").textContent = `${Math.floor(xp)} / ${xpMax}`;
    document.getElementById("count-heart").textContent = counts.heart;
    document.getElementById("count-rose").textContent = counts.rose;
    document.getElementById("count-memory").textContent = counts.memory;

    const mins = Math.floor(midnightMs / 60000);
    const secs = Math.floor((midnightMs % 60000) / 1000);
    document.getElementById("hud-clock").textContent =
      String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    if (hudClockEl) {
      hudClockEl.classList.toggle("is-low", midnightMs <= 60_000); // last "minute"
    }

    // Ability icons
    if (hudAbilities) {
      hudAbilities.querySelectorAll(".ability").forEach((node) => {
        const key = node.dataset.ability;
        node.classList.toggle("is-unlocked", !!abilities[key]);
      });
    }
  }

  function toast(msg, color = "#ff9fd6") {
    toastEl.textContent = msg;
    toastEl.style.borderColor = color;
    toastEl.style.boxShadow = `0 0 0 3px var(--night-0), 0 0 12px ${color}, 0 0 32px ${color}55`;
    toastEl.classList.add("is-show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("is-show"), 1600);
  }

  /* ═══════════════════════════════════════════════════════════
     LEVEL LOADING
     ═══════════════════════════════════════════════════════════ */
  function loadLevel(id) {
    levelId = id;
    levelData = getLevel(id);

    collectibles = (levelData.collectibles || []).map((c, i) => {
      const offsetCycle = [4, 18, 36];
      return {
        x: c.x,
        y: c.y != null ? c.y : (GROUND_Y - 18 - offsetCycle[i % offsetCycle.length]),
        t: Math.random() * Math.PI * 2,
        taken: false,
        kind: c.kind,
        wilt: 0,      // 0..1 (only roses use this)
        visible: 0,   // ms it has been on screen
      };
    });

    hazards = (levelData.hazards || []).map((h) => ({
      type: h.type,
      x: h.x,
      y: GROUND_Y - (h.type === "thorn" ? 8 : h.type === "spike" ? 12 : 0),
      w: h.w,
      h: h.type === "pit" ? LH - GROUND_Y + 80 : (h.type === "spike" ? 12 : 8),
    }));

    platforms = (levelData.platforms || []).map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h }));

    const profile = difficultyProfile();
    enemies = (levelData.enemies || []).map((e) => makeEnemy(e, profile));

    if (levelData.boss) {
      boss = makeBoss(levelData.boss, profile);
    } else {
      boss = null;
    }

    secret = levelData.secret ? { ...levelData.secret, collected: false } : null;

    // Trees / fireflies (visual decoration tuned per level)
    fireflies = [];
    const fireflyCount = levelData.bgKind === "sky" ? 18 : 30;
    for (let i = 0; i < fireflyCount; i++) {
      fireflies.push({
        x: Math.random() * levelData.width,
        y: 40 + Math.random() * (GROUND_Y - 80),
        phase: Math.random() * Math.PI * 2,
        seed: 0.4 + Math.random() * 1.2,
      });
    }

    trees = [];
    const treeCount = levelData.bgKind === "meme" ? 32 :
                      levelData.bgKind === "sky"  ? 0 : 28;
    for (let i = 0; i < treeCount; i++) {
      trees.push({
        x: i * 70 + Math.random() * 30 - 15,
        h: 60 + Math.floor(Math.random() * 50),
        sway: Math.random() * Math.PI * 2,
        kind: Math.floor(Math.random() * 3),
      });
    }

    // Reset world state
    worldSparks.length = 0;
    projectiles.length = 0;
    weatherDrops.length = 0;
    if (levelData.weather === "rain") {
      for (let i = 0; i < 50; i++) {
        weatherDrops.push({
          x: Math.random() * (LW + 100) - 50,
          y: Math.random() * LH,
          len: 4 + Math.random() * 5,
          speed: 4 + Math.random() * 3,
        });
      }
    }

    camera.x = 0;
    player.x = 50;
    player.y = GROUND_Y - player.h;
    player.vx = 0; player.vy = 0;
    player.facing = 1; player.onGround = true;
    player.invincibleMs = 600;
    player.jumpsLeft = abilities.doubleJump ? 2 : 1;
    checkpoint = { x: player.x, y: player.y };

    // Boss bar hidden until boss appears on screen
    if (bossBarEl) bossBarEl.hidden = true;

    showChapterCard(levelData);
    refreshHUD();
    updateAbilityVisibility();
  }

  function makeEnemy(spec, profile) {
    const baseDmg = 2;
    if (spec.type === "goblin") {
      return {
        type: "goblin", x: spec.x, y: GROUND_Y - 14, w: 14, h: 14,
        vx: 0.55, vy: 0,
        spawnX: spec.x, spawnY: GROUND_Y - 14,
        range: spec.range || 30,
        hp: Math.max(1, Math.round(1 * profile.enemyHp)), maxHp: 1,
        facing: 1, stunMs: 0, hurtMs: 0, phase: 0, fireCd: 0,
        damage: Math.max(1, Math.round(baseDmg * profile.dmg)), xp: 18,
        dead: false,
      };
    }
    if (spec.type === "troll") {
      return {
        type: "troll", x: spec.x, y: GROUND_Y - 18, w: 18, h: 18,
        vx: 0.4, vy: 0,
        spawnX: spec.x, spawnY: GROUND_Y - 18,
        range: spec.range || 50,
        hp: Math.max(1, Math.round(3 * profile.enemyHp)), maxHp: 3,
        facing: 1, stunMs: 0, hurtMs: 0, phase: 0, fireCd: 0,
        damage: Math.max(1, Math.round(3 * profile.dmg)), xp: 35,
        dead: false,
      };
    }
    if (spec.type === "alarm") {
      const yc = spec.y != null ? spec.y : GROUND_Y - 60;
      return {
        type: "alarm", x: spec.x, y: yc, w: 14, h: 14,
        vx: 0, vy: 0,
        spawnX: spec.x, spawnY: yc,
        range: spec.range || 24,
        hp: Math.max(1, Math.round(2 * profile.enemyHp)), maxHp: 2,
        facing: 1, stunMs: 0, hurtMs: 0,
        phase: Math.random() * Math.PI * 2, fireCd: 1500 + Math.random() * 1200,
        damage: Math.max(1, Math.round(baseDmg * profile.dmg)), xp: 28,
        dead: false,
      };
    }
    if (spec.type === "textbook") {
      const yc = GROUND_Y - 80;
      return {
        type: "textbook", x: spec.x, y: yc, w: 18, h: 12,
        vx: 1.4, vy: 0,
        spawnX: spec.x, spawnY: yc,
        range: spec.range || 80,
        hp: Math.max(1, Math.round(2 * profile.enemyHp)), maxHp: 2,
        facing: 1, stunMs: 0, hurtMs: 0,
        phase: Math.random() * Math.PI * 2, fireCd: 0,
        damage: Math.max(1, Math.round(baseDmg * profile.dmg)), xp: 22,
        dead: false,
      };
    }
    // fallback
    return makeEnemy({ ...spec, type: "goblin" }, profile);
  }

  function makeBoss(spec, profile) {
    const hp = Math.max(4, Math.round((spec.hp || 14) * profile.enemyHp));
    return {
      type: spec.type, name: spec.name,
      x: spec.x, y: GROUND_Y - 36, w: 36, h: 32,
      hp, maxHp: hp,
      phase: 1, phaseT: 0,
      stunMs: 0, hurtMs: 0, fireCd: 1200,
      dead: false,
      vx: 0, vy: 0,
      facing: -1,
      onGround: true,
      extra: { jumpCd: 1400, walkDir: -1 },
    };
  }

  /* ═══════════════════════════════════════════════════════════
     INPUT (keyboard + touch with action buttons)
     ═══════════════════════════════════════════════════════════ */
  const keys = {
    left: false, right: false, jump: false,
    attack: false, bark: false, dash: false,
  };

  function clearKeys() {
    keys.left = keys.right = keys.jump = false;
    keys.attack = keys.bark = keys.dash = false;
    document.querySelectorAll(".touch__btn.is-pressed")
      .forEach((b) => b.classList.remove("is-pressed"));
  }

  document.addEventListener("keydown", (e) => {
    if (!screens.world.classList.contains("is-active")) return;
    const k = e.key;
    if (k === "ArrowLeft"  || k === "a" || k === "A") keys.left = true;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = true;
    if (k === "ArrowUp"    || k === "w" || k === "W" || k === " ") {
      // Edge-triggered jump (so double-jump fires on press, not hold)
      tryJump();
      keys.jump = true;
      e.preventDefault();
    }
    if (k === "x" || k === "X") { keys.attack = true; tryAttack(); }
    if (k === "z" || k === "Z") { keys.bark = true; tryBark(); }
    if (k === "Shift") { tryDash(); }
    if (k === "Escape") {
      worldRunning = false;
      clearKeys();
      hideOverlay();
      show("landing");
    }
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key;
    if (k === "ArrowLeft"  || k === "a" || k === "A") keys.left = false;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = false;
    if (k === "ArrowUp"    || k === "w" || k === "W" || k === " ") keys.jump = false;
    if (k === "x" || k === "X") keys.attack = false;
    if (k === "z" || k === "Z") keys.bark = false;
  });

  window.addEventListener("blur", clearKeys);
  window.addEventListener("visibilitychange", () => {
    if (document.hidden) clearKeys();
  });

  /* ─── Touch controls — Pointer Events API ─── */
  const touchBtns = document.querySelectorAll(".touch__btn");
  const activePointers = new Map();

  function pressTouch(btn, on) {
    if (!btn) return;
    btn.classList.toggle("is-pressed", on);
    const which = btn.dataset.touch;
    if (which === "left")   keys.left  = on;
    if (which === "right")  keys.right = on;
    if (which === "jump") {
      if (on) tryJump();
      keys.jump = on;
    }
    if (which === "attack" && on) tryAttack();
    if (which === "bark"   && on) tryBark();
    if (which === "back"   && on) {
      worldRunning = false;
      clearKeys();
      hideOverlay();
      show("landing");
    }
  }

  touchBtns.forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
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

    if (!("onpointerdown" in window)) {
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault(); pressTouch(btn, true); SFX.blip();
      }, { passive: false });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault(); pressTouch(btn, false);
      }, { passive: false });
      btn.addEventListener("touchcancel", () => pressTouch(btn, false));
    }

    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  window.addEventListener("pagehide", clearKeys);
  document.addEventListener("pointercancel", clearKeys);

  // Update cooldown indicator on touch buttons
  function setTouchCd(name, ratio /* 0..1 (full → ready) */, locked) {
    const btn = document.querySelector(`.touch__btn[data-touch="${name}"]`);
    if (!btn) return;
    btn.classList.toggle("is-locked", !!locked);
    btn.classList.toggle("is-ready", ratio >= 1);
    const cd = btn.querySelector(".touch__cd");
    if (cd) cd.style.setProperty("--cd", String(1 - Math.min(1, Math.max(0, ratio))));
  }

  /* ═══════════════════════════════════════════════════════════
     COMBAT ACTIONS
     ═══════════════════════════════════════════════════════════ */
  const HEART_CD = 350;     // ms between heart shots
  const BARK_CD  = 5000;    // ms between barks
  const DASH_CD  = 1100;    // ms between dashes
  const DASH_MS  = 200;     // dash duration
  const DASH_SPEED = 5.6;

  function tryAttack() {
    if (gameState !== "playing" && gameState !== "boss_intro") return;
    if (player.attackCdMs > 0) return;
    player.attackCdMs = HEART_CD;
    fireHeart(player.facing);
    if (abilities.spreadShot) {
      fireHeart(player.facing, -0.35);
      fireHeart(player.facing,  0.35);
    }
    SFX.heart();
  }

  function fireHeart(dir, slope = 0) {
    projectiles.push({
      x: player.x + player.w / 2 + dir * 8,
      y: player.y + player.h / 2 - 2,
      vx: dir * 4.2,
      vy: slope * 2,
      life: 1400, t: 0,
      owner: "player",
      damage: 1,
    });
  }

  function tryBark() {
    if (gameState !== "playing" && gameState !== "boss_intro") return;
    if (player.barkCdMs > 0) return;
    player.barkCdMs = BARK_CD;
    pet.barkRingMs = 360;
    // stun all enemies near the pet
    const r = 90;
    enemies.forEach((e) => {
      if (e.dead) return;
      if (Math.hypot(e.x - pet.x, e.y - pet.y) < r) {
        e.stunMs = 1500;
        e.hurtMs = 250;
      }
    });
    if (boss && !boss.dead && Math.hypot(boss.x - pet.x, boss.y - pet.y) < r) {
      boss.stunMs = 900;
      boss.hurtMs = 200;
    }
    SFX.confirm();
  }

  function tryJump() {
    if (gameState !== "playing" && gameState !== "boss_intro") return;
    if (player.onGround) {
      player.vy = -8.4;
      player.onGround = false;
      player.jumpsLeft = abilities.doubleJump ? 1 : 0; // one extra in air
      SFX.blip();
    } else if (player.jumpsLeft > 0 && abilities.doubleJump) {
      player.vy = -7.4;
      player.jumpsLeft -= 1;
      // little sparkle ring
      for (let i = 0; i < 10; i++) {
        worldSparks.push({
          x: player.x + player.w / 2 + Math.cos(i / 10 * Math.PI * 2) * 8,
          y: player.y + player.h - 2 + Math.sin(i / 10 * Math.PI * 2) * 4,
          vx: Math.cos(i / 10 * Math.PI * 2) * 1.2,
          vy: Math.sin(i / 10 * Math.PI * 2) * 1.2,
          life: 0.8,
          color: "#b46bff",
        });
      }
      SFX.heart();
    }
  }

  function tryDash() {
    if (!abilities.dash) return;
    if (player.dashCdMs > 0 || player.dashMs > 0) return;
    player.dashCdMs = DASH_CD;
    player.dashMs = DASH_MS;
    player.dashDir = player.facing;
    player.invincibleMs = Math.max(player.invincibleMs, DASH_MS);
    SFX.confirm();
    for (let i = 0; i < 8; i++) {
      worldSparks.push({
        x: player.x + player.w / 2,
        y: player.y + player.h / 2,
        vx: -player.dashDir * (1 + Math.random() * 1.5),
        vy: (Math.random() - 0.5) * 1.2,
        life: 0.6,
        color: "#ffd166",
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SPRITE PRELOAD
     ═══════════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════════
     COLLISIONS / HELPERS
     ═══════════════════════════════════════════════════════════ */
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function damagePlayer(amount, source) {
    if (player.invincibleMs > 0 || gameState !== "playing" && gameState !== "boss_intro") return;
    hp -= amount;
    player.invincibleMs = 900;
    damageGlitchMs = 320;
    worldEl.classList.add("is-hurt");
    setTimeout(() => worldEl.classList.remove("is-hurt"), 320);
    // small knockback away from source
    if (source) {
      const dir = (player.x + player.w / 2) > (source.x + (source.w || 0) / 2) ? 1 : -1;
      player.vx = dir * 2.4;
      player.vy = -3.2;
    }
    SFX.blip();
    SFX.blip();
    if (hp <= 0) {
      hp = 0;
      doGameOver("you ran out of love. the chaos goblin king laughs cruelly.");
    }
    refreshHUD();
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    xp = Math.min(xpMax, xp + e.xp);
    for (let i = 0; i < 14; i++) {
      worldSparks.push({
        x: e.x + e.w / 2, y: e.y + e.h / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: -1 - Math.random() * 2.4,
        life: 1, color: "#ff9fd6",
      });
    }
    SFX.heart();
    checkAbilityUnlocks();
    refreshHUD();
  }

  function killBoss() {
    if (!boss || boss.dead) return;
    boss.dead = true;
    xp = Math.min(xpMax, xp + 150);
    for (let i = 0; i < 30; i++) {
      worldSparks.push({
        x: boss.x + boss.w / 2,
        y: boss.y + boss.h / 2,
        vx: (Math.random() - 0.5) * 5,
        vy: -2 - Math.random() * 3,
        life: 1.4,
        color: ["#ff9fd6", "#5ff0ff", "#ffd166", "#b46bff"][i % 4],
      });
    }
    if (bossBarEl) bossBarEl.hidden = true;
    SFX.heart();
    SFX.confirm();
    checkAbilityUnlocks();
    refreshHUD();
    // brief celebration then chapter complete
    setTimeout(() => {
      const nextId = levelData && levelData.next;
      if (nextId) {
        chapterComplete();
      } else {
        victory();
      }
    }, 950);
  }

  function checkAbilityUnlocks() {
    Object.entries(ABILITY_THRESHOLDS).forEach(([k, threshold]) => {
      if (!abilities[k] && xp >= threshold) {
        abilities[k] = true;
        if (k === "doubleJump") player.jumpsLeft = Math.max(player.jumpsLeft, 1);
        const labels = {
          doubleJump: "★ ABILITY UNLOCKED · DOUBLE JUMP",
          dash:       "★ ABILITY UNLOCKED · DASH (shift)",
          spreadShot: "★ ABILITY UNLOCKED · SPREAD HEARTS",
        };
        toast(labels[k] || k, "#b46bff");
        // pop animation on HUD icon
        if (hudAbilities) {
          const node = hudAbilities.querySelector(`[data-ability="${k}"]`);
          if (node) {
            node.classList.add("is-new");
            setTimeout(() => node.classList.remove("is-new"), 1000);
          }
        }
      }
    });
    updateAbilityVisibility();
  }

  function updateAbilityVisibility() {
    if (!hudAbilities) return;
    hudAbilities.querySelectorAll(".ability").forEach((node) => {
      const key = node.dataset.ability;
      node.classList.toggle("is-unlocked", !!abilities[key]);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     UPDATE LOOP
     ═══════════════════════════════════════════════════════════ */
  const GRAVITY = 0.55;
  const MOVE_SPEED = 2.0;

  function update(dt) {
    if (gameState === "game_over" || gameState === "victory" || gameState === "chapter_complete") return;

    // Tick player cooldowns and timers
    if (player.attackCdMs > 0) player.attackCdMs = Math.max(0, player.attackCdMs - dt);
    if (player.barkCdMs   > 0) player.barkCdMs   = Math.max(0, player.barkCdMs   - dt);
    if (player.dashCdMs   > 0) player.dashCdMs   = Math.max(0, player.dashCdMs   - dt);
    if (player.dashMs     > 0) player.dashMs     = Math.max(0, player.dashMs     - dt);
    if (player.invincibleMs > 0) player.invincibleMs = Math.max(0, player.invincibleMs - dt);

    if (damageGlitchMs > 0) damageGlitchMs = Math.max(0, damageGlitchMs - dt);
    if (pet.barkRingMs > 0) pet.barkRingMs = Math.max(0, pet.barkRingMs - dt);

    // Touch cooldown overlays
    setTouchCd("attack", 1 - (player.attackCdMs / HEART_CD));
    setTouchCd("bark",   1 - (player.barkCdMs / BARK_CD));

    updatePlayer(dt);
    updatePet(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateProjectiles(dt);
    updateCollectibles(dt);
    updateSparks(dt);
    updateClock(dt);
    updateWeather(dt);

    // Camera follow with level-aware clamp
    const CAMERA_LEAD = 100;
    const desired = player.x - CAMERA_LEAD;
    camera.x += (desired - camera.x) * 0.08;
    if (camera.x < 0) camera.x = 0;
    const maxCamX = Math.max(0, (levelData ? levelData.width : 1300) - LW);
    if (camera.x > maxCamX) camera.x = maxCamX;

    // Check boss arena trigger: when player nears boss x
    if (boss && !boss.dead && Math.abs(player.x - boss.x) < 220) {
      if (bossBarEl && bossBarEl.hidden) {
        bossBarEl.hidden = false;
        bossBarName.textContent = boss.name;
      }
      if (bossBarFill) bossBarFill.style.setProperty("--p", Math.max(0, boss.hp) / boss.maxHp);
    }
  }

  function updatePlayer(dt) {
    let ax = 0;
    if (keys.left)  ax -= 1;
    if (keys.right) ax += 1;
    if (ax !== 0 && player.dashMs <= 0) player.facing = ax;

    if (player.dashMs > 0) {
      player.vx = player.dashDir * DASH_SPEED;
    } else {
      player.vx = ax * MOVE_SPEED;
    }

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > 12) player.vy = 12;

    // Horizontal move first
    player.x += player.vx * (dt / 16);
    // Then vertical with platform support
    player.y += player.vy * (dt / 16);

    // Floor (ground level) collision — but only if not over a pit
    const overPit = isOverPit(player.x + player.w / 2);
    if (!overPit && player.y + player.h >= GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.jumpsLeft = abilities.doubleJump ? 1 : 0;
    }

    // Platform top collision (only when falling)
    if (player.vy >= 0) {
      for (const p of platforms) {
        if (player.x + player.w < p.x || player.x > p.x + p.w) continue;
        const prevBottom = (player.y - player.vy * (dt / 16)) + player.h;
        const curBottom  = player.y + player.h;
        if (prevBottom <= p.y + 1 && curBottom >= p.y) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.jumpsLeft = abilities.doubleJump ? 1 : 0;
        }
      }
    }

    // Fall into pit → checkpoint respawn + damage
    if (player.y > LH + 40) {
      damagePlayer(4, null);
      player.x = checkpoint.x;
      player.y = checkpoint.y - 4;
      player.vx = 0; player.vy = 0;
      toast("you fell! returning to checkpoint…", "#ff5fae");
      return;
    }

    // Move checkpoint forward as the player progresses safely (not over a pit)
    if (player.onGround && !overPit && player.x > checkpoint.x + 60) {
      checkpoint = { x: player.x, y: player.y };
    }

    // Walk phase
    if (Math.abs(player.vx) > 0.1) player.walkPhase += dt * 0.02;

    // Hazard collision
    for (const h of hazards) {
      if (h.type === "pit") continue; // pit handled by gravity
      const box = { x: h.x, y: h.y, w: h.w, h: h.h };
      if (aabb(playerBox(), box)) {
        damagePlayer(h.type === "spike" ? 3 : 2, { x: h.x, y: h.y });
      }
    }

    // World bounds
    if (player.x < 0) player.x = 0;
    const maxX = (levelData ? levelData.width : 1300) - player.w;
    if (player.x > maxX) player.x = maxX;
  }

  function playerBox() {
    return { x: player.x, y: player.y, w: player.w, h: player.h };
  }

  function isOverPit(centerX) {
    for (const h of hazards) {
      if (h.type !== "pit") continue;
      if (centerX >= h.x && centerX <= h.x + h.w) {
        // check if there's a platform covering this region at any safe height
        for (const p of platforms) {
          if (centerX >= p.x && centerX <= p.x + p.w) {
            // platform exists over the pit — not over it for ground purposes
            // but the floor still gives way; player stays on the platform via platform-top logic
            // so we still return true here to keep the floor open
          }
        }
        return true;
      }
    }
    return false;
  }

  function updatePet(dt) {
    pet.target = player.x - player.facing * 26;
    pet.x += (pet.target - pet.x) * 0.06;
    pet.bob += dt * 0.006;
    pet.y = GROUND_Y - pet.h - 1 + Math.sin(pet.bob) * 1.5;
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.hurtMs > 0) e.hurtMs = Math.max(0, e.hurtMs - dt);
      if (e.stunMs > 0) { e.stunMs = Math.max(0, e.stunMs - dt); continue; }

      if (e.type === "goblin" || e.type === "troll") {
        e.x += e.vx * (dt / 16);
        if (e.x > e.spawnX + e.range) { e.vx = -Math.abs(e.vx); e.facing = -1; }
        if (e.x < e.spawnX - e.range) { e.vx =  Math.abs(e.vx); e.facing =  1; }
      } else if (e.type === "alarm") {
        e.phase += dt * 0.005;
        e.y = e.spawnY + Math.sin(e.phase) * e.range;
        // periodic sound-wave projectile
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = 2200 + Math.random() * 1200;
          const dir = player.x < e.x ? -1 : 1;
          projectiles.push({
            x: e.x + e.w / 2, y: e.y + e.h / 2,
            vx: dir * 2.0, vy: 0,
            life: 1600, t: 0,
            owner: "enemy",
            damage: 2,
            kind: "sound",
          });
        }
      } else if (e.type === "textbook") {
        e.x += e.vx * (dt / 16);
        if (e.x > e.spawnX + e.range) { e.vx = -Math.abs(e.vx); e.facing = -1; }
        if (e.x < e.spawnX - e.range) { e.vx =  Math.abs(e.vx); e.facing =  1; }
        e.phase += dt * 0.01;
        e.y = e.spawnY + Math.sin(e.phase) * 8;
      }

      // contact with player
      if (aabb(playerBox(), e)) {
        // stomp check: player falling onto top of enemy
        const prevBottom = (player.y - player.vy * (dt / 16)) + player.h;
        if (player.vy > 0.5 && prevBottom <= e.y + 4) {
          e.hp -= 1;
          e.hurtMs = 220;
          player.vy = -5.4;
          for (let i = 0; i < 8; i++) {
            worldSparks.push({
              x: e.x + e.w / 2, y: e.y,
              vx: (Math.random() - 0.5) * 2,
              vy: -Math.random() * 2,
              life: 0.8,
              color: "#fff4dc",
            });
          }
          if (e.hp <= 0) killEnemy(e);
        } else if (player.invincibleMs <= 0) {
          damagePlayer(e.damage, e);
        }
      }
    }
  }

  function updateBoss(dt) {
    if (!boss || boss.dead) return;
    if (boss.hurtMs > 0) boss.hurtMs = Math.max(0, boss.hurtMs - dt);
    if (boss.stunMs > 0) { boss.stunMs = Math.max(0, boss.stunMs - dt); return; }

    boss.phaseT += dt;
    boss.fireCd -= dt;

    // boss only acts when player is in arena (close)
    const inArena = Math.abs(player.x - boss.x) < 280;

    // Per-type AI
    if (boss.type === "slime") {
      // bounces, occasionally jumps toward player
      boss.vy += GRAVITY;
      if (boss.vy > 12) boss.vy = 12;
      boss.y += boss.vy * (dt / 16);
      if (boss.y + boss.h >= GROUND_Y) {
        boss.y = GROUND_Y - boss.h;
        boss.vy = 0;
        boss.onGround = true;
      }
      if (inArena) {
        boss.extra.jumpCd -= dt;
        if (boss.extra.jumpCd <= 0 && boss.onGround) {
          boss.extra.jumpCd = 900 - boss.phase * 100;
          const dir = player.x < boss.x ? -1 : 1;
          boss.vx = dir * (1.5 + boss.phase * 0.5);
          boss.vy = -6.5 - boss.phase * 0.3;
          boss.onGround = false;
          boss.facing = dir;
        }
        boss.x += boss.vx * (dt / 16);
        if (boss.onGround) boss.vx *= 0.86;
        if (boss.fireCd <= 0) {
          boss.fireCd = 1400 - boss.phase * 150;
          const dir = player.x < boss.x ? -1 : 1;
          for (let i = -1; i <= 1; i++) {
            projectiles.push({
              x: boss.x + boss.w / 2, y: boss.y + 6,
              vx: dir * (1.8 + i * 0.4), vy: -2.4 + i * 0.4,
              life: 1800, t: 0,
              owner: "enemy", damage: 2, kind: "frost",
            });
          }
        }
      }
    } else if (boss.type === "demon") {
      // hovers, throws textbook projectiles in 3-shot bursts
      boss.phaseT += dt * 0.001;
      boss.y = GROUND_Y - 60 + Math.sin(boss.phaseT) * 14;
      if (inArena) {
        if (boss.fireCd <= 0) {
          boss.fireCd = 1700 - boss.phase * 200;
          const dir = player.x < boss.x ? -1 : 1;
          for (let i = 0; i < 3; i++) setTimeout(() => {
            if (boss && !boss.dead) {
              projectiles.push({
                x: boss.x + boss.w / 2, y: boss.y + 6,
                vx: dir * 2.4, vy: 0,
                life: 1800, t: 0,
                owner: "enemy", damage: 2, kind: "book",
              });
            }
          }, i * 160);
        }
        // drifts sideways toward player
        const dir = player.x < boss.x ? -1 : 1;
        boss.x += dir * 0.4 * (dt / 16);
        boss.facing = dir;
      }
    } else if (boss.type === "trolllord") {
      // hops in big arcs, throws speech bubbles
      boss.vy += GRAVITY * 0.9;
      boss.y += boss.vy * (dt / 16);
      if (boss.y + boss.h >= GROUND_Y) {
        boss.y = GROUND_Y - boss.h;
        boss.vy = 0;
        boss.onGround = true;
      }
      if (inArena) {
        boss.extra.jumpCd -= dt;
        if (boss.extra.jumpCd <= 0 && boss.onGround) {
          boss.extra.jumpCd = 1200;
          const dir = player.x < boss.x ? -1 : 1;
          boss.vx = dir * 2.4;
          boss.vy = -8.4;
          boss.onGround = false;
          boss.facing = dir;
        }
        boss.x += boss.vx * (dt / 16);
        if (boss.onGround) boss.vx *= 0.84;
        if (boss.fireCd <= 0) {
          boss.fireCd = 900;
          const dir = player.x < boss.x ? -1 : 1;
          projectiles.push({
            x: boss.x + boss.w / 2, y: boss.y + 8,
            vx: dir * 3.0, vy: -1.5,
            life: 1800, t: 0,
            owner: "enemy", damage: 2, kind: "bubble",
          });
        }
      }
    } else if (boss.type === "king") {
      // moves & summons goblin adds + dark orbs
      boss.phaseT += dt * 0.001;
      boss.y = GROUND_Y - 36 - Math.sin(boss.phaseT) * 6;
      if (inArena) {
        const dir = player.x < boss.x ? -1 : 1;
        boss.x += dir * 0.5 * (dt / 16);
        boss.facing = dir;
        if (boss.fireCd <= 0) {
          boss.fireCd = 1100;
          for (let i = -1; i <= 1; i++) {
            projectiles.push({
              x: boss.x + boss.w / 2, y: boss.y + 10,
              vx: dir * (2.2 + Math.abs(i) * 0.4),
              vy: i * 0.8,
              life: 2000, t: 0,
              owner: "enemy", damage: 3, kind: "orb",
            });
          }
        }
        // summon a goblin add at low HP
        if (boss.hp < boss.maxHp * 0.5 && boss.extra.jumpCd === undefined) boss.extra.jumpCd = 6000;
        if (boss.extra.jumpCd !== undefined) {
          boss.extra.jumpCd -= dt;
          if (boss.extra.jumpCd <= 0 && enemies.filter((e) => !e.dead).length < 5) {
            boss.extra.jumpCd = 7000;
            enemies.push(makeEnemy({ type: "goblin", x: boss.x - 70, range: 60 }, difficultyProfile()));
          }
        }
      }
    }

    // contact damage
    if (inArena && aabb(playerBox(), boss)) {
      if (player.invincibleMs <= 0) damagePlayer(3, boss);
    }
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt;
      p.t += dt * 0.01;
      if (p.kind === "frost" || p.kind === "orb") p.vy += 0.12; // small gravity

      // player heart projectiles hit enemies + boss
      if (p.owner === "player") {
        let hitSomething = false;
        for (const e of enemies) {
          if (e.dead) continue;
          if (aabb(p, { x: e.x, y: e.y, w: e.w, h: e.h })) {
            e.hp -= p.damage;
            e.hurtMs = 220;
            spawnHitSparks(p.x, p.y, "#ff9fd6");
            if (e.hp <= 0) killEnemy(e);
            hitSomething = true;
            break;
          }
        }
        if (!hitSomething && boss && !boss.dead) {
          if (aabb(p, { x: boss.x, y: boss.y, w: boss.w, h: boss.h }) &&
              Math.abs(player.x - boss.x) < 280) {
            boss.hp -= p.damage;
            boss.hurtMs = 220;
            spawnHitSparks(p.x, p.y, "#ff9fd6");
            // boss phase transitions
            if (boss.type === "slime") {
              const phaseHp = boss.maxHp / 3;
              const newPhase = 3 - Math.floor(boss.hp / phaseHp);
              if (newPhase > boss.phase) {
                boss.phase = newPhase;
                // split into smaller slimes (mini adds)
                for (let s = 0; s < 2; s++) {
                  enemies.push(makeEnemy({ type: "goblin", x: boss.x + s * 20 - 10, range: 40 }, difficultyProfile()));
                }
              }
            }
            if (boss.hp <= 0) killBoss();
            hitSomething = true;
          }
        }
        if (hitSomething) { p.life = 0; }
      } else {
        // enemy projectile hits player
        if (aabb(p, playerBox())) {
          damagePlayer(p.damage, p);
          p.life = 0;
        }
      }

      // remove if expired or far off-screen
      if (p.life <= 0 || p.x < camera.x - 80 || p.x > camera.x + LW + 80 || p.y > LH + 60) {
        projectiles.splice(i, 1);
      }
    }
  }

  function spawnHitSparks(x, y, color) {
    for (let i = 0; i < 5; i++) {
      worldSparks.push({
        x, y,
        vx: (Math.random() - 0.5) * 2.4,
        vy: -1 - Math.random() * 1.5,
        life: 0.7,
        color,
      });
    }
  }

  function updateCollectibles(dt) {
    for (const c of collectibles) {
      if (c.taken) continue;
      c.t += dt * 0.003;
      c.y += Math.sin(c.t) * 0.18;

      // mark as on-screen for wilt logic
      const sx = c.x - camera.x;
      if (sx > -30 && sx < LW + 30) c.visible += dt;

      // roses wilt over time if uncollected
      if (c.kind === "rose" && c.visible > 6000) {
        c.wilt = Math.min(1, c.wilt + dt * 0.0008);
        if (c.wilt >= 1) c.taken = true;
      }

      if (
        Math.abs(c.x - (player.x + player.w / 2)) < 14 &&
        Math.abs(c.y - (player.y + player.h / 2)) < 24
      ) {
        c.taken = true;
        counts[c.kind] = (counts[c.kind] || 0) + 1;
        const gain = c.kind === "memory" ? 28 : c.kind === "rose" ? 14 : 8;
        xp = Math.min(xpMax, xp + gain);
        if (c.kind === "heart") hp = Math.min(hpMax, hp + 1);
        const labels = {
          heart:  `+1 HEART · +${gain} LOVE`,
          rose:   `+1 ROSE · +${gain} LOVE`,
          memory: `+1 MEMORY SHARD · +${gain} LOVE`,
        };
        const colors = { heart: "#ff7fbf", rose: "#ff5f8f", memory: "#5ff0ff" };
        toast(labels[c.kind], colors[c.kind]);
        spawnHitSparks(c.x, c.y, colors[c.kind]);
        SFX.pickup();
        refreshHUD();
        checkAbilityUnlocks();
      }
    }

    // Secret room — pick up love letter when very close
    if (secret && !secret.collected) {
      if (Math.abs(secret.x - (player.x + player.w / 2)) < 12 &&
          Math.abs(secret.y - (player.y + player.h / 2)) < 18) {
        secret.collected = true;
        openLoveLetter(secret.letter);
      }
    }
  }

  function updateSparks(dt) {
    for (let i = worldSparks.length - 1; i >= 0; i--) {
      const s = worldSparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.08;
      s.life -= 0.02 * (dt / 16);
      if (s.life <= 0) worldSparks.splice(i, 1);
    }
  }

  function updateClock(dt) {
    const profile = difficultyProfile();
    midnightMs -= dt * 12 * profile.timeMul;
    if (midnightMs < 0) {
      midnightMs = 0;
      if (gameState === "playing" || gameState === "boss_intro") {
        doGameOver("midnight struck. the birthday is lost… retry?");
      }
    }
    refreshHUD();
  }

  function updateWeather(dt) {
    if (!levelData || levelData.weather !== "rain") return;
    for (const d of weatherDrops) {
      d.y += d.speed;
      d.x -= 1;
      if (d.y > LH || d.x < -20) {
        d.x = camera.x % LW + Math.random() * LW;
        d.y = -10;
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  function drawBackground() {
    const p = (levelData && levelData.palette) || LEVELS[0].palette;
    const grd = wctx.createLinearGradient(0, 0, 0, LH);
    grd.addColorStop(0, p.skyTop);
    grd.addColorStop(0.5, p.skyMid);
    grd.addColorStop(1, p.skyBot);
    wctx.fillStyle = grd;
    wctx.fillRect(0, 0, LW, LH);

    // Time-of-day tint based on midnight clock (gets darker as we approach midnight)
    const t = 1 - Math.min(1, midnightMs / (11 * 60_000)); // 0 → 1 as time runs out
    if (t > 0) {
      wctx.fillStyle = `rgba(255,80,80,${t * 0.18})`;
      wctx.fillRect(0, 0, LW, LH);
    }

    // moon — color shifts to red as time runs out
    wctx.save();
    wctx.translate(LW - 80, 50);
    const moonR = 255, moonG = Math.floor(244 - t * 100), moonB = Math.floor(220 - t * 140);
    wctx.fillStyle = `rgb(${moonR},${moonG},${moonB})`;
    wctx.beginPath();
    wctx.arc(0, 0, 18, 0, Math.PI * 2);
    wctx.fill();
    wctx.fillStyle = `rgba(${moonR}, ${moonG}, ${moonB}, 0.25)`;
    wctx.beginPath();
    wctx.arc(0, 0, 30, 0, Math.PI * 2);
    wctx.fill();
    wctx.restore();

    // stars
    wctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 60; i++) {
      const x = ((i * 73) - camera.x * 0.1) % LW;
      const y = (i * 37) % 90;
      wctx.fillRect((x + LW) % LW, y, 1, 1);
    }

    // floating polaroids in the forest level
    if (levelData && levelData.bgKind === "forest") {
      for (let i = 0; i < 4; i++) {
        const px = ((i * 260) - camera.x * 0.2) % (LW + 120);
        const py = 36 + (i % 2) * 14 + Math.sin(performance.now() * 0.001 + i) * 3;
        drawPolaroid((px + LW + 120) % (LW + 120) - 60, py, i);
      }
    }

    // distant silhouettes
    if (!levelData || levelData.bgKind !== "sky") {
      drawForestSilhouette(0.35, (levelData && levelData.palette.forestFar1) || "#1b0938", 40);
      drawForestSilhouette(0.6,  (levelData && levelData.palette.forestFar2) || "#260b48", 32);
    } else {
      // sky kingdom: floating cloud bands
      drawCloudBand(0.35, 60, "rgba(255,200,230,0.35)");
      drawCloudBand(0.6,  100, "rgba(180,160,255,0.45)");
    }

    // building rooftops in meme city
    if (levelData && levelData.bgKind === "meme") {
      drawNeonBuildings(0.5, "#1e0540", 70);
      drawNeonBuildings(0.85, "#2a075a", 50);
    }
  }

  function drawCloudBand(speed, height, color) {
    wctx.fillStyle = color;
    const baseY = GROUND_Y - 18;
    const w = 26;
    const offset = ((camera.x * speed) % w + w) % w;
    for (let x = -w - offset; x < LW + w; x += w) {
      const h = height + Math.floor(Math.sin(x * 0.04) * 8 + Math.cos(x * 0.13) * 4);
      wctx.fillRect(x, baseY - h, w, h);
      wctx.fillRect(x + 4, baseY - h - 4, w - 8, 4);
      wctx.fillRect(x + 9, baseY - h - 8, w - 18, 4);
    }
  }

  function drawNeonBuildings(speed, color, height) {
    wctx.fillStyle = color;
    const baseY = GROUND_Y - 2;
    const w = 26;
    const offset = ((camera.x * speed) % w + w) % w;
    let neonI = 0;
    for (let x = -w - offset; x < LW + w; x += w) {
      const h = height + Math.floor(Math.sin(x * 0.08) * 14);
      wctx.fillStyle = color;
      wctx.fillRect(x, baseY - h, w - 2, h);
      // windows
      const palette = ["#ff5fae", "#5ff0ff", "#ffd166", "#7df58f"];
      const wc = palette[neonI++ % palette.length];
      for (let r = 4; r < h - 6; r += 8) {
        for (let c = 2; c < w - 6; c += 7) {
          if (((x + r + c) | 0) % 3 === 0) {
            wctx.fillStyle = wc;
            wctx.fillRect(x + c, baseY - h + r, 2, 2);
          }
        }
      }
    }
  }

  function drawPolaroid(x, y, i) {
    wctx.save();
    wctx.translate(Math.round(x), Math.round(y));
    const tint = ["#5ff0ff", "#ff9fd6", "#ffd166", "#7df58f"][i % 4];
    wctx.fillStyle = tint + "22";
    wctx.fillRect(-10, -8, 20, 16);
    wctx.fillStyle = "#f5ecd6";
    wctx.fillRect(-7, -6, 14, 12);
    wctx.fillStyle = tint;
    wctx.fillRect(-6, -5, 12, 7);
    wctx.fillStyle = "#1a0a3e";
    wctx.fillRect(-6, -2, 12, 4);
    wctx.fillStyle = "#fff4dc";
    wctx.fillRect(-1, -3, 2, 2);
    wctx.fillStyle = "#ff9fd6";
    wctx.fillRect(3, 0, 1, 1);
    wctx.fillStyle = "#ff5fae";
    wctx.fillRect(-1, -7, 2, 2);
    wctx.restore();
  }

  function drawForestSilhouette(speed, color, height) {
    wctx.fillStyle = color;
    const baseY = GROUND_Y - 2;
    const w = 18;
    const offset = ((camera.x * speed) % w + w) % w;
    for (let x = -w - offset; x < LW + w; x += w) {
      const h = height + Math.floor((Math.sin(x * 0.07) + Math.cos(x * 0.21)) * 4);
      wctx.fillRect(x, baseY - h, w, h);
      wctx.fillRect(x + 2, baseY - h - 2, w - 4, 2);
      wctx.fillRect(x + 5, baseY - h - 4, w - 10, 2);
    }
  }

  function drawGround() {
    const p = (levelData && levelData.palette) || LEVELS[0].palette;
    const grd = wctx.createLinearGradient(0, GROUND_Y, 0, LH);
    grd.addColorStop(0, p.ground1);
    grd.addColorStop(1, p.ground2);
    wctx.fillStyle = grd;
    wctx.fillRect(0, GROUND_Y, LW, LH - GROUND_Y);

    wctx.fillStyle = p.grassMid;
    wctx.fillRect(0, GROUND_Y, LW, 3);
    wctx.fillStyle = p.grassTop;
    wctx.fillRect(0, GROUND_Y, LW, 1);

    for (let i = 0; i < 30; i++) {
      const baseX = (i * 24 - camera.x * 0.9) % (LW + 60);
      const x = (baseX + LW + 60) % (LW + 60) - 30;
      wctx.fillStyle = p.grassTuft;
      wctx.fillRect(x, GROUND_Y - 3, 2, 3);
      wctx.fillRect(x + 3, GROUND_Y - 2, 2, 2);
      wctx.fillRect(x - 3, GROUND_Y - 2, 2, 2);
    }

    // Carve out pits (cover ground with sky/abyss)
    for (const h of hazards) {
      if (h.type !== "pit") continue;
      const x = Math.round(h.x - camera.x);
      // void
      const grdPit = wctx.createLinearGradient(0, GROUND_Y, 0, LH);
      grdPit.addColorStop(0, "rgba(5,2,20,0.85)");
      grdPit.addColorStop(1, "rgba(0,0,0,1)");
      wctx.fillStyle = grdPit;
      wctx.fillRect(x, GROUND_Y, h.w, LH - GROUND_Y + 4);
      // tiny stars inside
      wctx.fillStyle = "rgba(95,240,255,0.5)";
      for (let i = 0; i < 4; i++) {
        wctx.fillRect(x + 6 + i * 8 + ((i * 13) % 5), GROUND_Y + 12 + (i % 3) * 6, 1, 1);
      }
    }
  }

  function drawHazards() {
    for (const h of hazards) {
      const x = Math.round(h.x - camera.x);
      if (x < -40 || x > LW + 40) continue;
      if (h.type === "thorn") {
        // pixel thorn cluster
        wctx.fillStyle = "#34053a";
        wctx.fillRect(x, GROUND_Y - 4, h.w, 4);
        for (let i = 0; i < h.w; i += 4) {
          const xi = x + i;
          wctx.fillStyle = "#a01840";
          wctx.beginPath();
          wctx.moveTo(xi, GROUND_Y - 4);
          wctx.lineTo(xi + 2, GROUND_Y - 4 - 5);
          wctx.lineTo(xi + 4, GROUND_Y - 4);
          wctx.fill();
          wctx.fillStyle = "#ff3f6f";
          wctx.fillRect(xi + 1, GROUND_Y - 6, 1, 2);
        }
      } else if (h.type === "spike") {
        wctx.fillStyle = "#222040";
        wctx.fillRect(x, GROUND_Y - 6, h.w, 6);
        for (let i = 0; i < h.w; i += 5) {
          const xi = x + i;
          wctx.fillStyle = "#d6d6f0";
          wctx.beginPath();
          wctx.moveTo(xi, GROUND_Y - 6);
          wctx.lineTo(xi + 2, GROUND_Y - 6 - 9);
          wctx.lineTo(xi + 5, GROUND_Y - 6);
          wctx.fill();
          wctx.fillStyle = "#ffffff";
          wctx.fillRect(xi + 1, GROUND_Y - 13, 1, 2);
        }
      }
      // pits drawn as part of ground void
    }
  }

  function drawPlatforms() {
    for (const p of platforms) {
      const x = Math.round(p.x - camera.x);
      if (x < -40 || x > LW + 40) continue;
      // pixel floating platform
      wctx.fillStyle = "#2a0a4e";
      wctx.fillRect(x, p.y, p.w, p.h);
      wctx.fillStyle = "#5a2bc4";
      wctx.fillRect(x, p.y, p.w, 2);
      wctx.fillStyle = "#7a47e4";
      wctx.fillRect(x, p.y, p.w, 1);
      // glowy underside dots
      wctx.fillStyle = "#ff9fd6";
      for (let i = 6; i < p.w - 4; i += 12) {
        wctx.fillRect(x + i, p.y + p.h, 1, 2);
      }
    }
  }

  function drawTrees() {
    if (!levelData) return;
    if (levelData.bgKind === "sky" || levelData.bgKind === "meme") return;
    for (const t of trees) {
      const x = Math.round(t.x - camera.x);
      if (x < -50 || x > LW + 50) continue;
      const sway = Math.floor(Math.sin(t.sway) * 1.5);

      wctx.fillStyle = "#1a0530";
      wctx.fillRect(x + 2, GROUND_Y - t.h + 8, 4, t.h - 8);
      wctx.fillStyle = "#2d0a44";
      wctx.fillRect(x + 3, GROUND_Y - t.h + 8, 2, t.h - 8);

      const palettes = [
        { dark: "#1d6a82", mid: "#2bc6ff", light: "#b6f5ff" },
        { dark: "#8a3a72", mid: "#ff5fae", light: "#ff9fd6" },
        { dark: "#4a248a", mid: "#7d3ed9", light: "#b46bff" },
      ];
      const pal = palettes[t.kind];

      const cx = x + 4 + sway;
      const cy = GROUND_Y - t.h;

      wctx.fillStyle = pal.dark;
      wctx.fillRect(cx - 16, cy - 2, 32, 14);
      wctx.fillRect(cx - 14, cy - 6, 28, 4);
      wctx.fillRect(cx - 11, cy - 9, 22, 3);
      wctx.fillRect(cx - 7,  cy - 11, 14, 2);

      wctx.fillStyle = pal.mid;
      wctx.fillRect(cx - 14, cy - 1, 28, 11);
      wctx.fillRect(cx - 12, cy - 5, 24, 4);
      wctx.fillRect(cx - 9,  cy - 8, 18, 3);
      wctx.fillRect(cx - 5,  cy - 10, 10, 2);

      wctx.fillStyle = pal.light;
      wctx.fillRect(cx - 7,  cy - 8, 6, 3);
      wctx.fillRect(cx + 2,  cy - 6, 4, 2);
      wctx.fillRect(cx - 10, cy - 1, 4, 2);

      wctx.fillStyle = "#fff4dc";
      wctx.fillRect(cx - 9, cy - 9, 1, 1);
      wctx.fillRect(cx + 6, cy - 4, 1, 1);
    }
  }

  function drawFireflies() {
    for (const f of fireflies) {
      const x = f.x - camera.x;
      if (x < -10 || x > LW + 10) continue;
      const tt = (Math.sin(performance.now() * 0.003 + f.phase) + 1) / 2;
      const a = 0.3 + tt * 0.7;
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

      const baseColor = c.kind === "heart" ? "#ff7fbf" :
                        c.kind === "rose"  ? "#ff5f8f" :
                                              "#5ff0ff";

      const pulse = 0.55 + Math.sin(c.t * 4) * 0.15;
      const r = 14;
      const grad = wctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0,    baseColor + "cc");
      grad.addColorStop(0.45, baseColor + "55");
      grad.addColorStop(1,    baseColor + "00");
      wctx.globalAlpha = pulse * (c.kind === "rose" ? (1 - c.wilt) : 1);
      wctx.fillStyle = grad;
      wctx.fillRect(x - r, y - r, r * 2, r * 2);
      wctx.globalAlpha = 1;

      if (c.kind === "heart") {
        drawHeartIcon(x - 7, y - 6, 2, baseColor);
        wctx.fillStyle = "#ffffff";
        wctx.fillRect(x - 4, y - 4, 1, 1);
      } else if (c.kind === "rose") {
        // tinted by wilt
        const alpha = 1 - c.wilt;
        wctx.globalAlpha = alpha;
        wctx.fillStyle = "#3a8a40";
        wctx.fillRect(x, y + 3, 1, 7);
        wctx.fillRect(x - 2, y + 5, 2, 2);
        wctx.fillRect(x + 1, y + 7, 2, 2);
        wctx.fillStyle = "#a01840";
        wctx.fillRect(x - 4, y - 3, 9, 7);
        wctx.fillStyle = "#ff3f6f";
        wctx.fillRect(x - 3, y - 2, 7, 5);
        wctx.fillStyle = "#ff7fa3";
        wctx.fillRect(x - 1, y, 3, 2);
        wctx.fillStyle = "#ffffff";
        wctx.fillRect(x, y, 1, 1);
        wctx.globalAlpha = 1;
      } else {
        wctx.save();
        wctx.translate(x, y);
        wctx.rotate(c.t * 0.7);
        wctx.fillStyle = "#1d6a82";
        wctx.fillRect(-7, -1, 14, 2);
        wctx.fillRect(-1, -7, 2, 14);
        wctx.fillStyle = "#5ff0ff";
        wctx.fillRect(-5, -1, 10, 2);
        wctx.fillRect(-1, -5, 2, 10);
        wctx.fillStyle = "#ffffff";
        wctx.fillRect(-1, -1, 2, 2);
        wctx.restore();
      }
    }

    if (secret && !secret.collected) {
      const x = Math.round(secret.x - camera.x);
      if (x > -20 && x < LW + 20) {
        // hidden floating envelope (sparkles to give a tiny clue)
        const y = Math.round(secret.y + Math.sin(performance.now() * 0.003) * 2);
        wctx.globalAlpha = 0.4 + Math.sin(performance.now() * 0.004) * 0.3;
        wctx.fillStyle = "#fff4dc";
        wctx.fillRect(x - 7, y - 5, 14, 10);
        wctx.fillStyle = "#ff5fae";
        wctx.beginPath();
        wctx.moveTo(x - 7, y - 5);
        wctx.lineTo(x, y);
        wctx.lineTo(x + 7, y - 5);
        wctx.fill();
        wctx.globalAlpha = 1;
      }
    }
  }

  function drawEnemies() {
    for (const e of enemies) {
      if (e.dead) continue;
      const x = Math.round(e.x - camera.x);
      if (x < -50 || x > LW + 50) continue;
      const y = Math.round(e.y);

      // hurt flash
      const flash = e.hurtMs > 0 && (Math.floor(e.hurtMs / 60) % 2 === 0);

      // shadow
      wctx.fillStyle = "rgba(0,0,0,0.35)";
      wctx.fillRect(x + 1, GROUND_Y, e.w - 2, 2);

      if (e.type === "goblin") {
        // body
        wctx.fillStyle = flash ? "#ffffff" : "#4a248a";
        wctx.fillRect(x, y, e.w, e.h);
        // belly
        wctx.fillStyle = flash ? "#ffffff" : "#7d3ed9";
        wctx.fillRect(x + 3, y + 3, e.w - 6, e.h - 5);
        // eyes
        wctx.fillStyle = "#ffd166";
        wctx.fillRect(x + 3, y + 4, 2, 2);
        wctx.fillRect(x + 9, y + 4, 2, 2);
        // teeth grin
        wctx.fillStyle = "#ffffff";
        wctx.fillRect(x + 4, y + 9, 6, 2);
        wctx.fillStyle = e.facing > 0 ? "#34053a" : "#34053a";
        wctx.fillRect(x + 5, y + 9, 1, 2);
        wctx.fillRect(x + 8, y + 9, 1, 2);
      } else if (e.type === "troll") {
        wctx.fillStyle = flash ? "#ffffff" : "#1a3a70";
        wctx.fillRect(x, y, e.w, e.h);
        wctx.fillStyle = flash ? "#ffffff" : "#2a5ab0";
        wctx.fillRect(x + 3, y + 3, e.w - 6, e.h - 5);
        wctx.fillStyle = "#ff5fae";
        wctx.fillRect(x + 4, y + 5, 2, 2);
        wctx.fillRect(x + 12, y + 5, 2, 2);
        wctx.fillStyle = "#5ff0ff";
        wctx.fillRect(x + 4, y + 12, e.w - 8, 2);
        wctx.fillStyle = "#ffffff";
        wctx.fillRect(x + 6, y + 12, 1, 2);
        wctx.fillRect(x + 10, y + 12, 1, 2);
      } else if (e.type === "alarm") {
        // alarm clock monster: round-ish body
        wctx.fillStyle = flash ? "#ffffff" : "#ffd166";
        wctx.fillRect(x, y + 2, e.w, e.h - 4);
        wctx.fillRect(x + 1, y + 1, e.w - 2, e.h - 2);
        // bells
        wctx.fillStyle = "#a07a30";
        wctx.fillRect(x + 1, y, 3, 2);
        wctx.fillRect(x + e.w - 4, y, 3, 2);
        // face
        wctx.fillStyle = "#1a0a3e";
        wctx.fillRect(x + 4, y + 5, 2, 2);
        wctx.fillRect(x + 9, y + 5, 2, 2);
        wctx.fillRect(x + 5, y + 9, 4, 1);
        // tick lines
        if (((performance.now() * 0.004) | 0) % 2 === 0) {
          wctx.fillStyle = "#ff5fae";
          wctx.fillRect(x + 6, y + 7, 2, 1);
        }
      } else if (e.type === "textbook") {
        wctx.fillStyle = flash ? "#ffffff" : "#c03f3f";
        wctx.fillRect(x, y, e.w, e.h);
        wctx.fillStyle = flash ? "#ffffff" : "#ff7f7f";
        wctx.fillRect(x + 1, y + 1, e.w - 2, 2);
        wctx.fillStyle = "#fff4dc";
        wctx.fillRect(x + 2, y + 4, e.w - 4, e.h - 6);
        wctx.fillStyle = "#1a0a3e";
        wctx.fillRect(x + 3, y + 6, 4, 1);
        wctx.fillRect(x + 3, y + 8, 6, 1);
      }
    }
  }

  function drawBoss() {
    if (!boss || boss.dead) return;
    const x = Math.round(boss.x - camera.x);
    if (x < -100 || x > LW + 100) return;
    const y = Math.round(boss.y);
    const flash = boss.hurtMs > 0 && (Math.floor(boss.hurtMs / 60) % 2 === 0);
    const stunned = boss.stunMs > 0;

    wctx.fillStyle = "rgba(0,0,0,0.4)";
    wctx.fillRect(x + 2, GROUND_Y, boss.w - 4, 3);

    if (boss.type === "slime") {
      wctx.fillStyle = flash ? "#ffffff" : (boss.phase === 1 ? "#ff9fd6" : boss.phase === 2 ? "#ff5fae" : "#ff2d8b");
      // body
      wctx.fillRect(x, y + 4, boss.w, boss.h - 6);
      wctx.fillRect(x + 3, y + 2, boss.w - 6, boss.h - 4);
      wctx.fillRect(x + 6, y, boss.w - 12, boss.h - 6);
      // shine
      wctx.fillStyle = "#fff4dc";
      wctx.fillRect(x + 8, y + 4, 4, 2);
      // eyes
      wctx.fillStyle = "#1a0a3e";
      wctx.fillRect(x + 10, y + 14, 3, 4);
      wctx.fillRect(x + 22, y + 14, 3, 4);
      wctx.fillStyle = "#ffffff";
      wctx.fillRect(x + 11, y + 14, 1, 1);
      wctx.fillRect(x + 23, y + 14, 1, 1);
      // mouth
      wctx.fillStyle = "#34053a";
      wctx.fillRect(x + 14, y + 22, 8, 2);
    } else if (boss.type === "demon") {
      wctx.fillStyle = flash ? "#ffffff" : "#5a168a";
      wctx.fillRect(x, y, boss.w, boss.h);
      // horns
      wctx.fillStyle = "#1a0530";
      wctx.fillRect(x + 4, y - 5, 4, 6);
      wctx.fillRect(x + boss.w - 8, y - 5, 4, 6);
      // glasses
      wctx.fillStyle = "#000";
      wctx.fillRect(x + 6, y + 10, 8, 4);
      wctx.fillRect(x + boss.w - 14, y + 10, 8, 4);
      wctx.fillStyle = "#ff5fae";
      wctx.fillRect(x + 8, y + 11, 4, 2);
      wctx.fillRect(x + boss.w - 12, y + 11, 4, 2);
      // grin
      wctx.fillStyle = "#fff";
      wctx.fillRect(x + 10, y + 20, 16, 2);
      wctx.fillStyle = "#000";
      wctx.fillRect(x + 14, y + 20, 1, 2);
      wctx.fillRect(x + 22, y + 20, 1, 2);
    } else if (boss.type === "trolllord") {
      wctx.fillStyle = flash ? "#ffffff" : "#207050";
      wctx.fillRect(x, y, boss.w, boss.h);
      wctx.fillStyle = flash ? "#ffffff" : "#40a070";
      wctx.fillRect(x + 3, y + 3, boss.w - 6, boss.h - 6);
      // crown
      wctx.fillStyle = "#ffd166";
      wctx.fillRect(x + 8, y - 6, 4, 6);
      wctx.fillRect(x + 16, y - 6, 4, 6);
      wctx.fillRect(x + 24, y - 6, 4, 6);
      // eyes (giant trollface eyes)
      wctx.fillStyle = "#000";
      wctx.fillRect(x + 8, y + 8, 6, 6);
      wctx.fillRect(x + 22, y + 8, 6, 6);
      wctx.fillStyle = "#fff";
      wctx.fillRect(x + 10, y + 9, 2, 2);
      wctx.fillRect(x + 24, y + 9, 2, 2);
      // grin
      wctx.fillStyle = "#fff";
      wctx.fillRect(x + 8, y + 20, 20, 4);
      wctx.fillStyle = "#000";
      wctx.fillRect(x + 12, y + 22, 2, 2);
      wctx.fillRect(x + 22, y + 22, 2, 2);
    } else if (boss.type === "king") {
      wctx.fillStyle = flash ? "#ffffff" : "#1a0a3e";
      wctx.fillRect(x, y, boss.w, boss.h);
      wctx.fillStyle = flash ? "#ffffff" : "#3a1a78";
      wctx.fillRect(x + 3, y + 3, boss.w - 6, boss.h - 4);
      // crown
      wctx.fillStyle = "#ffd166";
      wctx.fillRect(x + 4, y - 8, 4, 8);
      wctx.fillRect(x + 14, y - 12, 4, 12);
      wctx.fillRect(x + 24, y - 8, 4, 8);
      wctx.fillRect(x, y - 4, boss.w, 4);
      // eyes (red glowing)
      wctx.fillStyle = "#ff2d8b";
      wctx.fillRect(x + 8, y + 10, 4, 4);
      wctx.fillRect(x + 22, y + 10, 4, 4);
      wctx.fillStyle = "#fff";
      wctx.fillRect(x + 9, y + 11, 1, 1);
      wctx.fillRect(x + 23, y + 11, 1, 1);
      // fangs
      wctx.fillStyle = "#fff";
      wctx.fillRect(x + 10, y + 22, 2, 4);
      wctx.fillRect(x + 22, y + 22, 2, 4);
      // dark aura
      const grad = wctx.createRadialGradient(x + boss.w/2, y + boss.h/2, 4, x + boss.w/2, y + boss.h/2, 32);
      grad.addColorStop(0, "rgba(255, 45, 139, 0.0)");
      grad.addColorStop(1, "rgba(255, 45, 139, 0.4)");
      wctx.fillStyle = grad;
      wctx.fillRect(x - 16, y - 16, boss.w + 32, boss.h + 32);
    }

    // Stun stars
    if (stunned) {
      wctx.fillStyle = "#ffd166";
      for (let i = 0; i < 3; i++) {
        const sx = x + boss.w / 2 + Math.cos(performance.now() * 0.005 + i * 2) * 14;
        const sy = y - 6 + Math.sin(performance.now() * 0.005 + i * 2) * 3;
        wctx.fillRect(sx - 1, sy, 2, 2);
        wctx.fillRect(sx, sy - 1, 1, 4);
      }
    }
  }

  function drawProjectiles() {
    for (const p of projectiles) {
      const x = Math.round(p.x - camera.x);
      const y = Math.round(p.y);
      if (x < -20 || x > LW + 20) continue;
      if (p.owner === "player") {
        // heart projectile
        drawHeartIcon(x - 4, y - 3, 1, "#ff5fae");
        wctx.fillStyle = "rgba(255,159,214,0.55)";
        wctx.fillRect(x - 3, y - 2, 7, 5);
      } else {
        if (p.kind === "frost") {
          wctx.fillStyle = "#b6f5ff";
          wctx.fillRect(x - 2, y - 2, 4, 4);
          wctx.fillStyle = "#5ff0ff";
          wctx.fillRect(x - 1, y - 1, 2, 2);
        } else if (p.kind === "sound") {
          const a = Math.sin(p.t * 4) * 0.5 + 0.5;
          wctx.fillStyle = `rgba(255, 209, 102, ${0.4 + a * 0.5})`;
          wctx.fillRect(x - 4, y - 2, 8, 4);
        } else if (p.kind === "book") {
          wctx.fillStyle = "#c03f3f";
          wctx.fillRect(x - 4, y - 3, 8, 6);
          wctx.fillStyle = "#fff4dc";
          wctx.fillRect(x - 3, y - 2, 6, 4);
        } else if (p.kind === "bubble") {
          wctx.fillStyle = "rgba(255,255,255,0.85)";
          wctx.fillRect(x - 5, y - 4, 10, 8);
          wctx.fillStyle = "#34053a";
          wctx.fillRect(x - 3, y - 1, 6, 2);
        } else if (p.kind === "orb") {
          const grad = wctx.createRadialGradient(x, y, 0, x, y, 8);
          grad.addColorStop(0, "rgba(255, 45, 139, 1)");
          grad.addColorStop(1, "rgba(255, 45, 139, 0)");
          wctx.fillStyle = grad;
          wctx.fillRect(x - 8, y - 8, 16, 16);
          wctx.fillStyle = "#ffffff";
          wctx.fillRect(x - 1, y - 1, 2, 2);
        } else {
          wctx.fillStyle = "#ff5fae";
          wctx.fillRect(x - 2, y - 2, 4, 4);
        }
      }
    }
  }

  function drawWeather() {
    if (!levelData || levelData.weather !== "rain") return;
    wctx.strokeStyle = "rgba(180, 200, 255, 0.6)";
    wctx.lineWidth = 1;
    for (const d of weatherDrops) {
      wctx.beginPath();
      wctx.moveTo(d.x, d.y);
      wctx.lineTo(d.x - 1, d.y + d.len);
      wctx.stroke();
    }
  }

  function drawPlayer() {
    const px = Math.round(player.x - camera.x);
    const py = Math.round(player.y);
    const bob = !player.onGround ? 0 : Math.floor(Math.sin(player.walkPhase) * 2);

    wctx.fillStyle = "rgba(0,0,0,0.4)";
    wctx.fillRect(px + 1, GROUND_Y, player.w - 2, 2);

    // invincibility flicker
    const flicker = player.invincibleMs > 0 && (Math.floor(player.invincibleMs / 60) % 2 === 0);

    if (player.sprite) {
      const img = player.sprite;
      wctx.save();
      if (flicker) wctx.globalAlpha = 0.45;
      if (player.facing < 0) {
        wctx.translate(px + player.w, py + bob);
        wctx.scale(-1, 1);
        wctx.drawImage(img, 0, 0, player.w, player.h);
      } else {
        wctx.drawImage(img, px, py + bob, player.w, player.h);
      }
      wctx.globalAlpha = 1;
      wctx.restore();
    } else {
      wctx.fillStyle = "#ff9fd6";
      wctx.fillRect(px, py + bob, player.w, player.h);
    }

    // dash trail
    if (player.dashMs > 0) {
      wctx.fillStyle = "rgba(255, 209, 102, 0.4)";
      wctx.fillRect(px - player.dashDir * 6, py + 4, player.w, player.h - 6);
    }

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

    // bark ring
    if (pet.barkRingMs > 0) {
      const r = 90 * (1 - pet.barkRingMs / 360);
      const a = pet.barkRingMs / 360;
      wctx.strokeStyle = `rgba(95, 240, 255, ${a})`;
      wctx.lineWidth = 2;
      wctx.beginPath();
      wctx.arc(px + pet.w / 2, py + pet.h / 2, r, 0, Math.PI * 2);
      wctx.stroke();
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

  function drawGlitch() {
    if (damageGlitchMs <= 0) return;
    const a = damageGlitchMs / 320;
    // RGB-split slice
    wctx.fillStyle = `rgba(255, 60, 60, ${a * 0.18})`;
    wctx.fillRect(0, 0, LW, LH);
    for (let i = 0; i < 4; i++) {
      const y = Math.random() * LH;
      const h = 2 + Math.random() * 4;
      wctx.fillStyle = `rgba(255, 255, 255, ${a * 0.35})`;
      wctx.fillRect(0, y, LW, h);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     FRAME LOOP
     ═══════════════════════════════════════════════════════════ */
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
      // Mid silhouettes only for ground-based scenes
      if (levelData && levelData.bgKind !== "sky") {
        drawForestSilhouette(0.7, (levelData.palette && levelData.palette.forestNear) || "#15062e", 46);
        drawTrees();
        drawForestSilhouette(1.1, "#0a0220", 28);
      }
      drawGround();
      drawHazards();
      drawPlatforms();
      drawCollectibles();
      drawFireflies();
      drawProjectiles();
      drawEnemies();
      drawBoss();
      drawPet();
      drawPlayer();
      drawWeather();
      drawSparks();
      drawVignette();
      drawGlitch();
    } catch (err) {
      console.error("frame error:", err);
    }

    rafId = requestAnimationFrame(frame);
  }

  /* ═══════════════════════════════════════════════════════════
     OVERLAY (game over / chapter complete / victory)
     ═══════════════════════════════════════════════════════════ */
  function showOverlay({ kind, title, body, retryLabel, menuLabel, retryHandler, menuHandler }) {
    if (!overlay) return;
    overlay.classList.toggle("game-overlay--chapter", kind === "chapter");
    overlay.classList.toggle("game-overlay--victory", kind === "victory");
    overlayTitle.textContent = title;
    overlayBody.innerHTML = body;
    if (overlayRetry) {
      overlayRetry.textContent = retryLabel || "RETRY";
      overlayRetry.onclick = (e) => {
        e.preventDefault();
        SFX.confirm();
        hideOverlay();
        (retryHandler || (() => {}))();
      };
    }
    if (overlayMenu) {
      overlayMenu.textContent = menuLabel || "MAIN MENU";
      overlayMenu.onclick = (e) => {
        e.preventDefault();
        SFX.blip();
        hideOverlay();
        worldRunning = false;
        clearKeys();
        (menuHandler || (() => show("landing")))();
      };
    }
    overlay.hidden = false;
  }
  function hideOverlay() {
    if (overlay) overlay.hidden = true;
  }

  function doGameOver(reason) {
    if (gameState === "game_over") return;
    gameState = "game_over";
    if (bossBarEl) bossBarEl.hidden = true;
    showOverlay({
      kind: "gameover",
      title: "GAME OVER",
      body: `<div style="font-size:14px; opacity:.8; margin-bottom:8px;">${reason}</div>
             <div>chapter <strong>${(levelData && levelData.chapter) || "I"}</strong> — ${(levelData && levelData.name) || ""}</div>
             <div style="opacity:.7; margin-top:8px;">love energy: ${Math.floor(xp)} · shards: ${counts.memory}</div>`,
      retryLabel: "RETRY CHAPTER",
      retryHandler: () => {
        gameState = "playing";
        resetForRetry();
      },
    });
  }

  function chapterComplete() {
    if (gameState === "chapter_complete") return;
    gameState = "chapter_complete";
    const nextId = levelData.next;
    showOverlay({
      kind: "chapter",
      title: `CHAPTER ${levelData.chapter} COMPLETE`,
      body: `<div style="margin-bottom:8px;">${(levelData.name).toLowerCase()} restored ♥</div>
             <div style="opacity:.85;">memory shards: <strong>${counts.memory}</strong></div>
             <div style="opacity:.85;">love energy: <strong>${Math.floor(xp)}</strong></div>
             <div style="margin-top:10px; opacity:.7;">next: <strong>${getLevel(nextId).name}</strong></div>`,
      retryLabel: "CONTINUE",
      retryHandler: () => {
        gameState = "playing";
        // full heal between chapters, keep XP / counts
        hp = hpMax;
        loadLevel(nextId);
      },
      menuLabel: "MAIN MENU",
    });
  }

  function victory() {
    if (gameState === "victory") return;
    gameState = "victory";
    if (bossBarEl) bossBarEl.hidden = true;
    showOverlay({
      kind: "victory",
      title: "★ BIRTHDAY CRYSTAL RESTORED ★",
      body: `
        <div style="margin-bottom:12px;">Moumita, Manab, and Igloo defeated the Chaos Goblin King.<br/>
        The candles relight. Fireworks bloom over the kingdom.</div>
        <img src="assets/sprites/cake_scene.png" alt="Birthday cake"
             style="width:80%; max-width:380px; image-rendering: pixelated;
                    border: 3px solid #ff5fae; box-shadow: 0 0 0 3px #050214, 0 0 18px #ff5fae88;
                    margin: 0 auto; display:block;" />
        <div style="margin-top:14px; color:#ff9fd6; font-size:18px;">♥ Happy Birthday, Moumita ♥</div>
        <div style="opacity:.7; margin-top:6px;">— love, Manab & Igloo (and 32 bits of pixels)</div>
        <div style="opacity:.7; margin-top:6px;">love energy: ${Math.floor(xp)} · shards: ${counts.memory} · roses: ${counts.rose}</div>`,
      retryLabel: "PLAY AGAIN",
      retryHandler: () => {
        resetGameState({ levelId: "forest" });
        gameState = "playing";
      },
    });
    SFX.heart();
    setTimeout(() => SFX.confirm(), 300);
    setTimeout(() => SFX.heart(), 600);
  }

  function openLoveLetter(letterId) {
    const letters = {
      1: {
        title: "TO MOUMITA · LETTER #1",
        body: `the way you laugh at your own jokes before you finish them<br/>
               makes the whole day feel sun-warm.<br/><br/>
               i'd find this memory forest a hundred times to keep that laugh safe. — m`,
      },
      2: {
        title: "TO MOUMITA · LETTER #2",
        body: `every alarm clock you hate, i'll throw across the dungeon.<br/>
               sleep in. i'll make tea. igloo will guard the door.<br/><br/>
               you deserve every slow morning. — m`,
      },
      3: {
        title: "TO MOUMITA · LETTER #3",
        body: `the city is loud. you make it quiet.<br/>
               the world is mean. you make it kind.<br/><br/>
               wherever you go, that's where i live. — m`,
      },
      4: {
        title: "TO MOUMITA · LETTER #4",
        body: `at the edge of the sky kingdom, i wrote this on a star:<br/>
               <strong>"i love you the most, on every birthday, forever."</strong><br/><br/>
               read it whenever the night gets too big. — m`,
      },
    };
    const L = letters[letterId] || letters[1];
    openModal(L.title, `<div class="credits"><p class="credits__line">${L.body}</p></div>`);
    SFX.heart();
    setTimeout(() => SFX.heart(), 300);
    toast("you found a hidden love letter!", "#ff5fae");
  }

  /* ═══════════════════════════════════════════════════════════
     CHAPTER CARD (cinematic title flash)
     ═══════════════════════════════════════════════════════════ */
  function showChapterCard(level) {
    if (!chapterCard) return;
    chapCardChap.textContent = `CHAPTER ${level.chapter}`;
    chapCardName.textContent = level.name;
    chapCardSub.textContent  = level.sub;
    chapterCard.hidden = false;
    chapterCard.style.animation = "none";
    void chapterCard.offsetWidth;
    chapterCard.style.animation = "";
    setTimeout(() => { if (chapterCard) chapterCard.hidden = true; }, 2300);
  }

  /* ═══════════════════════════════════════════════════════════
     STATE RESET / ENTRY
     ═══════════════════════════════════════════════════════════ */
  function resetForRetry() {
    // retry chapter: keep XP, refill HP, reset enemies + boss + collectibles for level
    hp = hpMax;
    midnightMs = Math.max(midnightMs, 5 * 60 * 1000); // ensure at least 5 min remaining on retry
    loadLevel(levelData ? levelData.id : "forest");
  }

  function resetGameState(opts = {}) {
    counts = { heart: 0, rose: 0, memory: 0 };
    hp = hpMax;
    xp = 0;
    abilities = { doubleJump: false, dash: false, spreadShot: false };
    midnightMs = 11 * 60 * 1000 + 42 * 1000;
    startedEnding = false;
    hintIdx = 0;
    enemies = [];
    boss = null;
    projectiles = [];
    worldSparks = [];
    clearKeys();
    loadLevel(opts.levelId || "forest");
    gameState = "playing";
    hideOverlay();
    refreshHUD();
  }

  async function enterWorld(opts = {}) {
    show("world");
    if (!spritesLoaded) {
      spritesLoaded = true;
      await preloadWorldSprites();
    }
    if (opts.fresh !== false) resetGameState({ levelId: "forest" });
    fitWorldCanvas();
    refreshHUD();
    worldRunning = true;
    lastFrame = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);
    hideOverlay();
  }
})();
