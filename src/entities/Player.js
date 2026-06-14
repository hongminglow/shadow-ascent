import * as THREE from 'three';
import { clamp, damp } from '../core/MathUtils.js';
import { resolveCircle } from '../core/Physics.js';
import { makePistol, makeSniper } from '../weapons/Weapon.js';

const STAND_EYE = 1.7;
const CROUCH_EYE = 1.05;
const RADIUS = 0.35;

export class Player {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;

    this.position = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.recoilPitch = 0;
    this.eye = STAND_EYE;

    this.maxHealth = 120;
    this.health = this.maxHealth;
    this.alive = true;

    this.speed2D = 0;
    this.sprinting = false;
    this.crouching = false;

    this.sensitivity = 0.0022;
    this.baseFov = 75;

    this.footTimer = 0;
    this.regenTimer = 0;

    // Weapons.
    this.pistol = makePistol();
    this.sniper = null;
    this.weapon = this.pistol;
    this.weapon.attach(this.camera);

    this.crouchToggled = false;

    // Toggleable flashlight that follows the view (child of the camera).
    this.flashlightOn = false;
    this.flashlight = new THREE.SpotLight(0xfff0d0, 0, 30, 0.6, 0.5, 1.4);
    this.flashlight.position.set(0.15, -0.05, 0);
    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(0, -0.05, -5);
    this.camera.add(flashTarget);
    this.camera.add(this.flashlight);
    this.flashlight.target = flashTarget;

    this._lastSway = { x: 0, y: 0 };
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 55 : 0;
    this.game.hud.toast(this.flashlightOn ? 'Flashlight on' : 'Flashlight off', 1.2);
  }

  reset(spawn) {
    this.position.set(spawn.x, 0, spawn.z);
    // Floor data uses the (sin,cos) heading convention; the camera looks down -Z,
    // so add PI to face the same world direction (spawn.angle 0 => look toward +Z).
    this.yaw = (spawn.angle ?? 0) + Math.PI;
    this.pitch = 0;
    this.recoilPitch = 0;
    this.health = this.maxHealth;
    this.alive = true;
    this.crouching = false;
    this.crouchToggled = false;
    this.sprinting = false;
    this.eye = STAND_EYE;
    // Top up the magazine on respawn so checkpoints feel fair.
    this.weapon.ammo = this.weapon.magSize;
    this.weapon.reloading = false;
    this._syncCamera(0);
  }

  giveSniper() {
    if (this.sniper) return;
    this.sniper = makeSniper();
    this.weapon.detach(this.camera);
    this.weapon = this.sniper;
    this.weapon.attach(this.camera);
  }

  get crouchVisibility() {
    if (this.crouching) return 0.6;
    if (this.sprinting) return 1.15;
    return 1.0;
  }

  addRecoil(amt) {
    this.recoilPitch += amt;
  }

  tryFire() {
    if (!this.alive || this.game.state !== 'playing') return;
    this.weapon.fire(this.game, this);
  }

  tryReload() {
    this.weapon.reload(this.game);
  }

  setAim(v) {
    this.weapon.setAimed(v);
  }

  takeDamage(n) {
    if (!this.alive) return;
    this.health -= n;
    this.regenTimer = 5; // delay before any regen
    this.game.hud.flashDamage();
    this.game.audio.hurt();
    this.game.shake(0.4);
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.game.onPlayerDeath();
    }
  }

  heal(n) {
    this.health = clamp(this.health + n, 0, this.maxHealth);
  }

  addAmmo(n) {
    this.weapon.addAmmo(n);
  }

  update(dt, input, walls) {
    if (!this.alive) return;

    // ---- Look ----
    const md = input.takeMouseDelta();
    const aimScale = this.weapon.aimed ? (this.weapon.isSniper ? 0.35 : 0.7) : 1;
    this.yaw -= md.x * this.sensitivity * aimScale;
    this.pitch -= md.y * this.sensitivity * aimScale;
    this.pitch = clamp(this.pitch, -1.45, 1.45);
    this._lastSway = { x: clamp(md.x * 0.02, -1, 1), y: clamp(md.y * 0.02, -1, 1) };
    input.lastSway = this._lastSway;

    // ---- Movement intent ----
    let ix = 0;
    let iz = 0;
    if (input.isDown('KeyW')) iz += 1;
    if (input.isDown('KeyS')) iz -= 1;
    if (input.isDown('KeyA')) ix -= 1;
    if (input.isDown('KeyD')) ix += 1;

    // Crouch is a toggle on C (avoids the browser's Ctrl-combo shortcuts).
    if (input.wasPressed('KeyC')) this.crouchToggled = !this.crouchToggled;
    this.crouching = this.crouchToggled;
    if (input.wasPressed('KeyF')) this.toggleFlashlight();
    this.sprinting = input.isDown('ShiftLeft') && iz > 0 && !this.crouching;

    let speed = 3.4;
    if (this.sprinting) speed = 5.6;
    if (this.crouching) speed = 1.9;
    if (this.weapon.aimed) speed *= 0.5;

    // Convert local intent to world using yaw. The camera's view direction is
    // (-sin yaw, -cos yaw) and its screen-right axis is (cos yaw, -sin yaw).
    const len = Math.hypot(ix, iz) || 1;
    ix /= len;
    iz /= len;
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const moveX = (fwdX * iz + rightX * ix) * speed;
    const moveZ = (fwdZ * iz + rightZ * ix) * speed;

    this.position.x += moveX * dt;
    this.position.z += moveZ * dt;

    // Collision resolution against walls.
    const resolved = resolveCircle(this.position.x, this.position.z, RADIUS, walls);
    this.position.x = resolved.x;
    this.position.z = resolved.z;

    this.speed2D = Math.hypot(moveX, moveZ);

    // ---- Footsteps (also a stealth tell: louder when sprinting) ----
    if (this.speed2D > 0.5) {
      this.footTimer -= dt;
      const interval = this.sprinting ? 0.32 : this.crouching ? 0.7 : 0.48;
      if (this.footTimer <= 0) {
        this.footTimer = interval;
        if (!this.crouching) this.game.audio.footstep();
      }
    }

    // ---- Crouch height ----
    const targetEye = this.crouching ? CROUCH_EYE : STAND_EYE;
    this.eye = damp(this.eye, targetEye, 12, dt);

    // ---- Health regen (gentle, after a delay out of damage) ----
    if (this.regenTimer > 0) this.regenTimer -= dt;
    else if (this.health < this.maxHealth) this.health = clamp(this.health + 6 * dt, 0, this.maxHealth);

    // ---- Recoil recovery + FOV (aim zoom) ----
    this.recoilPitch = damp(this.recoilPitch, 0, 9, dt);
    const targetFov = this.weapon.aimed ? (this.weapon.isSniper ? 22 : 55) : this.baseFov;
    this.camera.fov = damp(this.camera.fov, targetFov, 12, dt);
    this.camera.updateProjectionMatrix();

    this.weapon.update(dt, this, input);
    this._syncCamera(dt);
  }

  _syncCamera() {
    this.camera.position.set(this.position.x, this.eye, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch + this.recoilPitch;
    this.camera.rotation.z = 0;
  }

  // Aim point enemies shoot at (chest height).
  getAimTarget(out) {
    return out.set(this.position.x, this.position.y + 1.3, this.position.z);
  }
}
