import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { Particles } from '../systems/Particles.js';
import { Tracers } from '../weapons/Projectiles.js';
import { HUD } from '../ui/HUD.js';
import { buildFloor } from '../scenes/Building.js';
import { FLOORS } from '../scenes/floors.js';
import { dist2D, clamp } from './MathUtils.js';

const _tmp = new THREE.Vector3();

export class Game {
  constructor(renderer, input, audio) {
    this.renderer = renderer;
    this.input = input;
    this.audio = audio;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
    this.scene.add(this.camera); // so the first-person weapon (camera child) renders

    this.particles = new Particles(this.scene);
    this.tracers = new Tracers(this.scene);
    this.hud = new HUD();
    this.player = new Player(this);

    // Per-floor state.
    this.walls = [];
    this.solids = [];
    this.hittables = [];
    this.threats = [];
    this.pickups = [];
    this.vip = null;
    this.sniperPickup = null;
    this.stairDoor = null;
    this.stairPos = null;
    this.floorGroup = null;

    this.currentFloorIndex = 0;
    this.checkpointFloor = 0;
    this.state = 'idle'; // idle | playing | paused | win | lose

    this.alarmActive = false;
    this.alarmTimer = 0;
    this.stairUnlocked = false;
    this.exitPad = null;
    this.padPulse = 0;
    this.spawnGrace = 0;
    this.trauma = 0;

    this.onWin = null;
    this.onLose = null;

    this._wireInput();
  }

  _wireInput() {
    this.input.onFire = () => this.player.tryFire();
    this.input.onAimDown = () => {
      this.player.setAim(true);
      if (this.player.weapon.isSniper) this.hud.setScope(true);
    };
    this.input.onAimUp = () => {
      this.player.setAim(false);
      this.hud.setScope(false);
    };
    this.input.onPause = () => this.togglePause();
    this.input.onLockChange = (locked) => {
      if (this.state === 'playing' && !locked) this.togglePause();
    };
  }

  // ---------------- lifecycle ----------------
  startNewGame() {
    this.checkpointFloor = 0;
    this.loadFloor(0);
    this.state = 'playing';
    this.hud.show();
    this.input.setEnabled(true);
    this.input.lock();
    this.audio.ambientOn();
  }

  loadFloor(index) {
    this.clearFloor();
    this.currentFloorIndex = clamp(index, 0, FLOORS.length - 1);
    const def = FLOORS[this.currentFloorIndex];

    buildFloor(this, def);
    this.player.reset(def.spawn);

    this.stairUnlocked = false;
    this.alarmActive = false;
    this.alarmTimer = 0;
    this.spawnGrace = 2.0; // brief grace so you're not detected the instant you spawn
    this.audio.alarmOff();
    this.hud.setAlarm(false);
    this.hud.setScope(false);
    this.hud.setPrompt('');

    this.hud.setFloor(`${def.name}`);
    this.hud.setObjective(def.objective);
    this._updateThreatHud();
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    this.hud.setAmmo(this.player.weapon.ammo, this.player.weapon.reserve, this.player.weapon.name);

    this.isRooftop = !!def.rooftop;
    if (this.isRooftop) this.hud.toast('Find the sniper rifle, then take the shot.', 3.5);
    else if (this.currentFloorIndex === 0) this.hud.toast('F = flashlight · C = crouch · it gets dark down here.', 4);
  }

  clearFloor() {
    if (this.floorGroup) {
      this._disposeGroup(this.floorGroup);
      this.scene.remove(this.floorGroup);
      this.floorGroup = null;
    }
    for (const t of this.threats) {
      if (t.group) {
        this._disposeGroup(t.group);
        this.scene.remove(t.group);
      }
      if (t.hitbox) this.scene.remove(t.hitbox);
    }
    if (this.vip) {
      this._disposeGroup(this.vip.group);
      this.scene.remove(this.vip.group);
    }
    this.threats.length = 0;
    this.walls.length = 0;
    this.solids.length = 0;
    this.hittables.length = 0;
    this.pickups.length = 0;
    this.vip = null;
    this.sniperPickup = null;
    this.stairDoor = null;
    this.exitPad = null;
    this.stairPos = null;
    this.padPulse = 0;
    this.particles.reset();
    this.tracers.reset();
  }

  _disposeGroup(group) {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      // materials are cached/shared in AssetFactory; don't dispose globally
    });
  }

  // ---------------- alarm / threats ----------------
  raiseAlarm(pos) {
    this.alarmTimer = 9;
    if (!this.alarmActive) {
      this.alarmActive = true;
      this.audio.alarmOn();
      this.hud.setAlarm(true);
    }
    for (const t of this.threats) {
      if (t.alive && t.alertTo) t.alertTo(pos);
    }
    if (this.vip) this.vip.panic();
  }

  // A guard engages on sight: flash the cue and shout to nearby guards only.
  onGuardEngage(guard) {
    this.hud.spotted();
    this.notifyLocal(guard.lastKnown, 12, guard);
    if (this.vip) this.vip.panic();
  }

  // Alert any guards/drones within `radius` of a position (a shout or a gunshot).
  notifyLocal(pos, radius, source = null) {
    for (const t of this.threats) {
      if (!t.alive || t === source || !t.alertTo) continue;
      if (dist2D(pos.x, pos.z, t.x, t.z) <= radius) t.alertTo(pos);
    }
  }

  // Gunfire is loud — nearby enemies investigate the source.
  makeNoise(pos, radius) {
    this.notifyLocal(pos, radius);
    if (this.vip) this.vip.panic();
  }

  onThreatNeutralized() {
    const alive = this._aliveThreats();
    this._updateThreatHud();
    if (alive === 0) {
      this.alarmActive = false;
      this.alarmTimer = 0;
      this.audio.alarmOff();
      this.hud.setAlarm(false);
      this.onFloorClear();
    }
  }

  _aliveThreats() {
    let n = 0;
    for (const t of this.threats) if (t.alive) n++;
    return n;
  }

  _updateThreatHud() {
    this.hud.setThreats(this._aliveThreats());
  }

  onFloorClear() {
    if (this.stairDoor) {
      this.stairUnlocked = true;
      // Door status light -> green, and slide the panel open so the way reads as clear.
      const status = this.stairDoor.userData.status;
      status.material = status.material.clone();
      status.material.color.set(0x33ff66);
      status.material.emissive.set(0x33ff66);
      this.stairDoor.userData.panel.visible = false;
      // Recolour the exit pad to green.
      if (this.exitPad) {
        const u = this.exitPad.userData;
        u.ringMat.color.set(0x33ff77); u.ringMat.emissive.set(0x33ff77);
        u.arrowMat.color.set(0x66ffaa); u.arrowMat.emissive.set(0x33ff77);
        u.discMat.emissive.set(0x0a2a14);
        u.light.color.set(0x33ff77);
      }
      this.audio.doorOpen();
      this.hud.toast('Floor secure — step onto the green pad to ascend.', 3.5);
    } else if (this.isRooftop) {
      this.hud.toast('Guards down. The target is exposed — take the shot.', 3.5);
    }
  }

  advanceFloor() {
    const next = this.currentFloorIndex + 1;
    if (next >= FLOORS.length) return;
    this.checkpointFloor = next;
    this.audio.doorOpen();
    this.loadFloor(next);
  }

  onPlayerDeath() {
    this.state = 'lose';
    this.audio.alarmOff();
    this.audio.ambientOff();
    this.audio.lose();
    this.input.setEnabled(false);
    this.input.unlock();
    this.hud.hide();
    this.onLose?.();
  }

  onVIPKilled() {
    this.state = 'win';
    this.audio.alarmOff();
    this.audio.ambientOff();
    this.audio.win();
    this.input.setEnabled(false);
    this.input.unlock();
    this.hud.toast('TARGET ELIMINATED', 2);
    this.shake(1);
    // brief beat before the screen
    setTimeout(() => {
      this.hud.hide();
      this.onWin?.();
    }, 1400);
  }

  retryFromCheckpoint() {
    this.loadFloor(this.checkpointFloor);
    this.state = 'playing';
    this.hud.show();
    this.input.setEnabled(true);
    this.input.lock();
    this.audio.ambientOn();
  }

  // ---------------- pause ----------------
  togglePause() {
    // Debounce: Esc fires both a keydown and a pointer-lock change in the same instant.
    const now = performance.now();
    if (now - (this._lastToggle || 0) < 250) return;
    this._lastToggle = now;

    if (this.state === 'playing') {
      this.state = 'paused';
      this.input.setEnabled(false);
      this.input.unlock();
      this.audio.alarmOff();
      this._pausedAlarm = this.alarmActive;
      this.onPauseChange?.(true);
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.input.setEnabled(true);
      this.input.lock();
      if (this._pausedAlarm && this.alarmActive) this.audio.alarmOn();
      this.onPauseChange?.(false);
    }
  }

  // ---------------- helpers used by weapons/entities ----------------
  getBulletColliders() {
    return this.hittables.concat(this.solids);
  }

  shake(amt) {
    this.trauma = Math.min(1, this.trauma + amt);
  }

  _applyShake(dt) {
    if (this.trauma <= 0) return;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const s = this.trauma * this.trauma;
    this.camera.rotation.x += (Math.random() - 0.5) * 0.06 * s;
    this.camera.rotation.y += (Math.random() - 0.5) * 0.06 * s;
    this.camera.position.y += (Math.random() - 0.5) * 0.05 * s;
  }

  // ---------------- per-frame ----------------
  update(dt) {
    if (this.state !== 'playing') return;

    if (this.spawnGrace > 0) this.spawnGrace -= dt;

    this.player.update(dt, this.input, this.walls);

    for (const t of this.threats) t.update(dt, this);
    if (this.vip) this.vip.update(dt, this);

    this._updatePickups(dt);
    this._updateExit(dt);

    if (this.alarmActive) {
      this.alarmTimer -= dt;
      if (this.alarmTimer <= 0) {
        this.alarmActive = false;
        this.audio.alarmOff();
        this.hud.setAlarm(false);
      }
    }

    this.particles.update(dt);
    this.tracers.update(dt);

    this._applyShake(dt);

    this.hud.setHealth(this.player.health, this.player.maxHealth);
    this.hud.setAmmo(this.player.weapon.ammo, this.player.weapon.reserve, this.player.weapon.name);
    this.hud.update(dt);

    if (this.input.wasPressed('KeyR')) this.player.tryReload();

    this.input.endFrame();
  }

  _updatePickups(dt) {
    const px = this.player.position.x;
    const pz = this.player.position.z;
    for (const pk of this.pickups) {
      if (pk.picked) continue;
      pk.bob = (pk.bob || 0) + dt;
      pk.group.rotation.y += dt * 1.5;
      pk.group.position.y = 0.4 + Math.sin(pk.bob * 2 + pk.x) * 0.06;
      if (dist2D(px, pz, pk.x, pk.z) < 1.2) {
        pk.picked = true;
        pk.group.visible = false;
        this.audio.pickup();
        if (pk.type === 'health') {
          this.player.heal(40);
          this.hud.toast('+40 Health');
        } else {
          this.player.addAmmo(30);
          this.hud.toast('+30 Ammo');
        }
      }
    }

    if (this.sniperPickup && !this.sniperPickup.picked) {
      this.sniperPickup.group.rotation.y += dt * 0.8;
      if (dist2D(px, pz, this.sniperPickup.x, this.sniperPickup.z) < 2.0) {
        this.sniperPickup.picked = true;
        if (this.sniperPickup.group.userData.rifle) this.sniperPickup.group.userData.rifle.visible = false;
        this.player.giveSniper();
        this.audio.pickup();
        this.hud.setObjective('Eliminate the target — Mr. Castellane');
        this.hud.toast('Sniper acquired. Aim (RMB) and fire.', 3);
      }
    }
  }

  _updateExit(dt) {
    if (!this.stairPos) {
      this.hud.setPrompt('');
      return;
    }
    const d = dist2D(this.player.position.x, this.player.position.z, this.stairPos.x, this.stairPos.z);

    if (!this.stairUnlocked) {
      this.hud.setPrompt(d < 5 ? '🔒 Stairwell locked — neutralize all threats on this floor' : '');
      return;
    }

    // Pulse the pad so it's unmistakable.
    if (this.exitPad) {
      this.padPulse += dt * 4;
      const s = 1 + Math.sin(this.padPulse) * 0.06;
      this.exitPad.scale.set(s, 1, s);
      this.exitPad.userData.arrows.position.y = 0.1 + (Math.sin(this.padPulse) * 0.5 + 0.5) * 0.15;
    }

    if (d < 1.8) {
      this.hud.setPrompt('');
      this.advanceFloor();
      return;
    }
    this.hud.setPrompt(d < 6 ? '⬆ Stairwell open — step onto the green pad to ascend' : '');
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
