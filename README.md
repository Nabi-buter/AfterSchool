# AFTER SCHOOL: LAST BELL

> 마지막 종이 울린 뒤, 진짜 수업이 시작된다.

A survival roguelite in the "bullet heaven" style (you move, attacks fire on their own), set in Eclipse High School after the 5 PM bell. It runs in the browser on desktop (keyboard) and mobile (touch joystick).

## Run

```bash
npm install
npm run dev       # development server
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

## Content

| | |
|---|---|
| Stages | 5: Classroom, Hallway, Gym, Science Lab, Rooftop. Each has its own layout, obstacles, enemy mix, and length (10–15 min). |
| Characters | 8, each with a starting weapon, a passive, and a playstyle. 3 are available at the start; 5 unlock through play. |
| Weapons | 20 base weapons, 20 evolutions (a max-level weapon plus its paired passive), and 6 unions (two max-level weapons merge into one, freeing a slot). |
| Passives | 20 |
| Field items | 9 kinds (heal, full heal, coins, magnet, freeze clock, screen-clear bell, energy drink…), dropped by enemies and by breakable trash cans and boxes. |
| Enemies | 17 regular enemies across 14 behaviours (chase, dash, ranged, bomber, splitter, swarm, mimic, summoner, blink, hazard…), plus elite mid-bosses. |
| Bosses | 5. Each has 3 phases, telegraphed attacks, and dodgeable ring waves with safe gaps. |
| Systems | Schedule events (break, lunch, night study, exam, cleaning), clubs with character affinity, 12 synergies, chests, revives. |
| Meta | Permanent upgrades, codex, 21 achievements, 3 daily missions per calendar day, per-stage best records, and a versioned save in localStorage. |

## Architecture

```
src/game/data/      content as data (weapons, passives, characters, enemies, stages, meta)
src/game/core/      Game loop, world pools, spatial hash, input
src/game/systems/   weapons, enemy AI, boss patterns, stage layouts
src/game/render/    pixel maps → sprites, stage art, canvas renderer
src/game/audio/     WebAudio synth SFX + step-sequenced BGM
src/meta/           versioned save + Zustand meta store (progression, achievements, missions)
src/ui/             React screens; the HUD updates the DOM through refs, not React re-renders
```

The game loop never re-renders React. Entities live in fixed-size object pools, and collision uses a uniform spatial hash.

## Assets & licenses

The sprites, icons and backgrounds are pixel maps drawn in code. All music and sound effects are synthesized at runtime, with no external audio files. The fonts are Pretendard, Galmuri11 and Space Grotesk, all under the SIL Open Font License 1.1.
