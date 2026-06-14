import * as THREE from 'three';
import { makeSecurityCamera, makeMarker } from '../core/AssetFactory.js';
import { canSee } from '../ai/Vision.js';
import { clamp } from '../core/MathUtils.js';

const VISION = { range: 13, fovDeg: 55 };

export class SecurityCamera {
  constructor(game, def) {
    this.game = game;
    this.x = def.x;
    this.z = def.z;
    this.y = def.y ?? 2.7;
    this.baseAngle = def.angle ?? 0;
    this.sweep = def.sweep ?? 0.8;
    this.sweepSpeed = def.sweepSpeed ?? 0.6;

    this.group = makeSecurityCamera();
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.baseAngle;

    this.alive = true;
    this.health = 30;
    this.detection = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.alarmCooldown = 0;

    // hitbox
    const hb = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hb.position.copy(this.group.position);
    hb.position.z += 0.0;
    hb.userData.threat = this;
    this._syncHitbox();
    game.scene.add(hb);
    this.hitbox = hb;

    this.marker = makeMarker(0xffd040);
    this.marker.position.set(0, 0.6, 0);
    this.group.add(this.marker);

    game.scene.add(this.group);
    game.hittables.push(hb);
  }

  _syncHitbox() {
    this.hitbox?.position.set(this.x, this.y, this.z);
  }

  takeDamage(n, point, game) {
    if (!this.alive) return;
    this.health -= n;
    game.particles.spark(point || new THREE.Vector3(this.x, this.y, this.z));
    if (this.health <= 0) this._destroy(game);
  }

  _destroy(game) {
    this.alive = false;
    if (this.marker) this.marker.visible = false;
    game.particles.explosion(new THREE.Vector3(this.x, this.y, this.z));
    game.audio.explosion();
    const i = game.hittables.indexOf(this.hitbox);
    if (i >= 0) game.hittables.splice(i, 1);
    game.scene.remove(this.hitbox);
    // Hang the camera limp.
    const pivot = this.group.userData.sweepPivot;
    pivot.rotation.x = -1.2;
    const led = this.group.userData.led;
    led.material = led.material.clone();
    led.material.emissiveIntensity = 0;
    led.material.color.set(0x222222);
    game.onThreatNeutralized(this);
  }

  update(dt, game) {
    if (!this.alive) return;
    this.phase += dt * this.sweepSpeed;
    const sweepRot = Math.sin(this.phase) * this.sweep;
    const pivot = this.group.userData.sweepPivot;
    pivot.rotation.y = sweepRot;

    const worldAngle = this.baseAngle + sweepRot;
    const player = game.player;
    const vis = canSee(
      { x: this.x, z: this.z, angle: worldAngle },
      { x: player.position.x, z: player.position.z },
      VISION,
      game.walls,
      player.crouchVisibility
    );

    if (this.alarmCooldown > 0) this.alarmCooldown -= dt;

    if (vis.seen && player.alive && game.spawnGrace <= 0) {
      this.detection = clamp(this.detection + dt * 1.4, 0, 1);
      this._setLed(this.detection >= 1 ? 0xff2a2a : 0xffcc33);
      if (this.detection >= 1 && this.alarmCooldown <= 0) {
        this.alarmCooldown = 2.5;
        game.raiseAlarm({ x: player.position.x, z: player.position.z });
      }
    } else {
      this.detection = clamp(this.detection - dt * 0.6, 0, 1);
      if (this.detection <= 0.01) this._setLed(0x33ff66);
    }
  }

  _setLed(color) {
    const led = this.group.userData.led;
    if (led.material.color.getHex() !== color) {
      led.material = led.material.clone();
      led.material.color.set(color);
      led.material.emissive.set(color);
      led.material.emissiveIntensity = 1.5;
    }
  }
}
