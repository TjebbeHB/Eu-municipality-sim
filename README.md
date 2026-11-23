# Voxelstad: Mayor of a Paper Town

A third-person voxel adventure about running a mid-sized European municipality, one passport, bin and pothole at a time, and then rebuilding it on digital and sovereign technology.

**Play it in the browser: https://tjebbehb.github.io/Eu-municipality-sim/**

No install, no build step. Works on desktop (keyboard and mouse) and on touch screens.

## The story

Three weeks ago, ransomware took Voxelstad's server room. The mayor resigned and the town has run on paper ever since. This morning the council elected you. You have five days until the vote of confidence.

- **Day 1, Paper town.** Do the work by hand: carry forms to the Archive, haul bins to the depot, patch potholes you only hear about when residents complain.
- **Day 2, The first cable.** Permits and home care land on your desk. Mevrouw De Wit asks whether there will still be a person behind the counter. Victor Sterling of Monolith Systems offers a limousine.
- **Day 3, The offer.** Passport season. The mayor of Dijkveen invites you into the Commons, a shared open stack. Monolith counters with an exclusive contract.
- **Day 4, The price of convenience.** A storm, a licensing letter, and someone trying passwords on the old remote login.
- **Night 4, The night of the ransom.** The attackers are back. Run from building to building and pull the uplinks before the files encrypt.
- **Day 5, Open Town Day.** Half the province visits. The council votes. One of five endings.

## How it plays

Each day is a timed service shift. Residents show up with requests, and every request is a small physical errand in the town. Serve people quickly to build a streak multiplier. Trust rises when you deliver and falls when people give up waiting.

Each evening is calm. Talk to people, make choices, and spend the budget at the Lab. Every system you fund takes a chore off your hands the next morning:

| Investment | What changes in the town |
|---|---|
| EU Digital Identity Wallet | A kiosk appears on the square. Half of document requests settle themselves. |
| Once-only data exchange | No more walking to the Archive. Documents are issued in one step. |
| Smart bins and collector bot | Bins show on the map. A small electric collector drives the round. |
| Digital twin and repair drone | Potholes are reported instantly. A drone patches them. |
| Digital permit desk | Decide applications in one step instead of four. |
| Shared care case system | You still visit people at home. The paperwork is gone. |
| Workplace and cloud | Every counter action is 30% faster. The open build adds backups. |
| NIS2 security baseline | The night attack spreads at half speed and nothing is lost for good. |
| Governed AI assistant | A further quarter of requests are answered before they reach you. |
| The mayoral cargo bike | Faster, tireless, carries three things. |

Four of these can be bought two ways. The **open build** costs more up front and belongs to the town. The **Monolith** product is cheap today and billed every day after, on terms Monolith can change. That choice shapes the budget, the night attack and the ending.

## Controls

| Key | Action |
|---|---|
| W A S D or arrows | Walk, or steer the truck |
| Mouse | Look around. Click the town to capture the mouse, or drag. |
| E (hold) | Interact, pick up, hand over |
| Shift | Sprint |
| Space | Jump |
| V or scroll wheel | First or third person, zoom |
| M | Sound on or off |
| Esc or P | Pause |

On touch screens a joystick and action buttons appear automatically.

Progress saves at the start of each day in the browser's local storage.

## What is real in here

The task portfolio and the technology choices follow research into what European municipalities actually do and what is being rolled out in 2025 and 2026: the EU Digital Identity Wallet under eIDAS 2.0, the Once-Only Technical System, Schleswig-Holstein's move to an open-source workplace, Gaia-X and sovereign cloud, NIS2 obligations for local government, and AI Act rules for public-service assistants. See [docs/research.md](docs/research.md) for notes and sources.

Voxelstad, Dijkveen, Monolith Systems and every character are fictional.

## Repository layout

```
index.html        page shell and HUD markup
css/style.css     interface styles
js/core.js        shared helpers and promise-based waiting
js/audio.js       synthesised sound effects and generative music
js/world.js       the voxel town, colliders and named places
js/entities.js    characters, vehicles, markers
js/ui.js          HUD, dialogue, menus, minimap
js/game.js        requests, automation, economy, day, evening and night rules
js/story.js       the five-day script and the endings
js/main.js        renderer, input, player, truck, camera, frame loop
classic/          the earlier top-down management sim
docs/research.md  research notes and sources
```

Plain JavaScript with [three.js](https://threejs.org) r128 loaded from a CDN. To run locally, serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Add `?day=3&cash=300` to the URL to jump to a later day while testing.
