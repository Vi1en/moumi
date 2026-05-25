# Moumita's Birthday Adventure

A cinematic pixel-art birthday RPG built as a love letter.
Help **Moumita** (the Birthday Princess), **Manab** (the Champion), and
**Igloo** (the husky companion) restore the Birthday Crystal before midnight.

Open it live: <https://vi1en.github.io/moumi/>

## What's inside

- A cinematic landing page with a glowing moon, parallax mountains, animated
  hearts, twinkling stars, sky lanterns and a retro RPG menu.
- A typewriter cutscene with multiple speakers and character portraits.
- **4 chapters** of side-scrolling pixel-art adventure:
  - **I · Memory Forest** — thorn patches, pits, floating platforms, Goblins,
    Alarm Clock Monsters, mini-boss **Frosting Slime** (3 phases).
  - **II · School Chaos Dungeon** — rain weather, spike traps, flying
    textbooks, **Detention Demon** boss.
  - **III · Meme City** — neon buildings, Troll mobs, **Troll Lord** boss.
  - **IV · Dream Sky Kingdom** — cloud-platforming gauntlet ending in the
    final boss **Chaos Goblin King**.
- **Combat:**
  - Heart projectile attack (`X` / pink touch button).
  - Igloo's bark stun-AoE on a 5-second cooldown (`Z` / paw touch button).
  - Stomp enemies by landing on them while falling.
- **Progression:** Love Energy unlocks abilities — double-jump at 100,
  dash (`Shift`) at 250, spread-shot hearts at 500.
- **Difficulty modes** in Settings: Cozy / Adventure / Goblin Lord.
- **Real stakes:** an HP bar that can hit zero, a midnight countdown that
  ends the run, wilting roses, checkpoint respawn after falling into pits.
- A hidden **love letter** in every chapter — find them all.
- A character gallery, settings, and credits modal.
- A tiny live chiptune (no audio files — generated via WebAudio).
- A full CRT overlay: scanlines, vignette, noise, and occasional flicker.

## Mobile support

The whole site is responsive and works on phones:

- Touch overlay shows a D-pad plus three action buttons (♥ heart shot,
  🐾 Igloo bark, ✕ back) inside the game world.
- Touch buttons display a circular cooldown sweep so you know when they're
  ready to fire again.
- Tap anywhere on the cutscene to advance dialogue.
- The audio toggle and CRT can be turned off in **Settings**.

## Running locally

No build step. Just serve the folder over HTTP:

```bash
python3 -m http.server 4321
# open http://localhost:4321/
```

## Project layout

```
.
├── index.html
├── image.png                  # the master sprite sheet
├── _extract_sprites.py        # regenerates the cropped sprites
└── assets/
    ├── css/styles.css
    ├── js/landing.js          # starfield, heart particles, audio, menu nav
    ├── js/game.js             # cutscene engine + Memory Forest game
    └── sprites/               # extracted from image.png
        ├── boy_portrait.png
        ├── girl_portrait.png
        ├── husky_portrait.png
        ├── hero_group.png
        ├── cake_scene.png
        ├── share_scene.png
        └── birthday_full.png
```

## Re-generating sprites

If you swap out `image.png` for a new sprite sheet, re-run:

```bash
python3 _extract_sprites.py
```

(Adjust the crop boxes inside the script to match your new sheet.)

## Credits

Directed by **Manab**.
Starring **Moumita** as the Birthday Princess.
Co-starring **Igloo the Husky** (very good boy).
Soundtrack: *Birthday Lullaby in A minor* (square + triangle waves, no files).

♥ Happy Birthday, Moumita ♥
