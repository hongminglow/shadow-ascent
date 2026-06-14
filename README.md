# Shadow Ascent

A complete 3D stealth-action game built with **Three.js** and **Vite**. Infiltrate a
5-floor tower from the basement to the rooftop, neutralize the security on each floor,
grab the sniper rifle, and eliminate the (entirely fictional) VIP target.

> All characters, the target ("Mr. Castellane"), and the security team are completely
> fictional and not based on any real person.

## Run it

```bash
npm install
npm run dev      # opens http://localhost:5173
```

Build a production bundle:

```bash
npm run build
npm run preview
```

Requires Node 18+ (developed on Node 24). No asset downloads — all 3D models, sound
effects, and levels are generated procedurally at runtime, so it works fully offline.

## How to play

| Action | Control |
| --- | --- |
| Move | `W A S D` |
| Look | Mouse (click the screen to lock the cursor) |
| Sprint | `Shift` (louder — easier to spot) |
| Crouch | `C` — toggle (quieter — harder to spot) |
| Flashlight | `F` — toggle |
| Fire | Left Mouse |
| Aim / Scope | Right Mouse |
| Reload | `R` |
| Pause | `Esc` |
| Pick up items / sniper | Walk into them |

**Goal:** Each floor's stairwell door stays locked until every guard, camera, and drone
on that floor is neutralized. Clear all five floors, retrieve the sniper rifle on the
rooftop, and take the shot.

## Project layout

```
src/
  main.js                 App bootstrap, render loop, state switching
  core/
    Game.js               Orchestrator: state machine, floor flow, alarm, shake
    Input.js              Keyboard/mouse + pointer-lock
    Physics.js            2D circle collision + line-of-sight
    AssetFactory.js       All procedural meshes (characters, weapons, props)
    Loader.js             Optional GLTF override hook (drop in real .glb art)
    MathUtils.js          Small math helpers
  scenes/
    floors.js             Data-driven definitions for all 5 floors
    Building.js           Turns floor data into geometry, lights, enemies, pickups
  entities/
    Player.js  Guard.js  SecurityCamera.js  Drone.js  VIP.js
  ai/
    Vision.js             FOV + range + line-of-sight detection
  weapons/
    Weapon.js             Pistol + sniper (hitscan, recoil, reload, ADS)
    Projectiles.js        Tracer beams
  systems/
    Audio.js              Web Audio synthesized SFX (no files)
    Particles.js          Pooled GPU particle cloud
  ui/
    Menu.js  HUD.js  Overlays.js  styles.css
```

## Design notes

- **Stealth AI:** guards/cameras/drones build a detection meter over time within a vision
  cone, with line-of-sight blocked by walls. They escalate patrol → alert → search →
  give up. Crouching shrinks how far you can be seen; sprinting widens it.
- **Balance:** generous health with slow regen, frequent ammo/health pickups, forgiving
  enemy accuracy that falls off with range, and per-floor checkpoints.
- **Upgrading visuals:** the game is procedural, but `src/core/Loader.js` exposes an
  override map — drop `.glb` files into `public/models`, register them, and they replace
  the procedural meshes with no other code changes.
