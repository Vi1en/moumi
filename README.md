# Moumita's Birthday Adventure

A cinematic pixel-art birthday RPG built as a love letter.
Help **Moumita** (the Birthday Princess), **Manab** (the Champion), and
**Igloo** (the husky companion) restore the Birthday Crystal before midnight.

Open it live: <https://vi1en.github.io/moumi/>

## What's inside

- A cinematic landing page with a glowing moon, parallax mountains, animated
  hearts, twinkling stars, sky lanterns and a retro RPG menu.
- A typewriter cutscene with multiple speakers and character portraits.
- A playable Memory Forest side-scroller with:
  - HP / Love Energy bars and a midnight countdown,
  - Floating hearts, roses, and rotating memory shards,
  - A husky companion that follows you everywhere,
  - Soft glowing collectibles with pickup sparks,
  - A fireworks-cake ending when you gather all three Memory Shards.
- A character gallery, settings, and credits modal.
- A tiny live chiptune (no audio files — generated via WebAudio).
- A full CRT overlay: scanlines, vignette, noise, and occasional flicker.

## Mobile support

The whole site is responsive and works on phones:

- A floating touch D-pad and action buttons appear inside the game world
  on touch devices.
- Tap the **PRESS START** prompt or the menu items to navigate.
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
