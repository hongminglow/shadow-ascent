import * as THREE from 'three';
import { makeVIP } from '../core/AssetFactory.js';
import { resolveCircle } from '../core/Physics.js';
import { approachAngle, dist2D, randRange } from '../core/MathUtils.js';

const RADIUS = 0.4;

// The fictional VIP target ("Mr. Castellane"). The objective, not a stealth threat.
export class VIP {
  constructor(game, def) {
    this.game = game;
    this.x = def.x;
    this.z = def.z;
    this.angle = def.angle ?? Math.PI;
    this.patrol = def.patrol ?? [];
    this.waypointIndex = 0;
    this.waitTimer = 1;

    this.group = makeVIP();
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.angle;

    this.alive = true;
    this.health = 200;
    this.panicked = false;
    this.walkPhase = 0;
    this.deathTime = 0;

    const hb = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.85, 0.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hb.position.y = 0.92;
    hb.userData.threat = this;
    this.group.add(hb);
    this.hitbox = hb;

    game.scene.add(this.group);
    game.hittables.push(hb);
  }

  panic() {
    this.panicked = true;
  }

  takeDamage(n, point, game) {
    if (!this.alive) return;
    this.health -= n;
    game.particles.blood(point || new THREE.Vector3(this.x, 1.3, this.z));
    if (this.health <= 0) this._die(game);
  }

  _die(game) {
    this.alive = false;
    this.deathTime = 0;
    const i = game.hittables.indexOf(this.hitbox);
    if (i >= 0) game.hittables.splice(i, 1);
    this.hitbox.userData.threat = null;
    game.onVIPKilled();
  }

  update(dt, game) {
    if (!this.alive) {
      this.deathTime += dt;
      const t = Math.min(1, this.deathTime / 0.6);
      this.group.rotation.x = -(Math.PI / 2) * t;
      return;
    }

    if (game.alarmActive) this.panicked = true;

    if (this.panicked) {
      // Pace nervously between patrol points faster — a moving target.
      this._paceFast(dt, game);
    } else {
      // Calm idle: subtle sway and occasional turn.
      this.walkPhase += dt;
      this.group.rotation.y = this.angle + Math.sin(this.walkPhase * 0.5) * 0.3;
      this.group.position.y = Math.sin(this.walkPhase * 1.5) * 0.01;
    }
  }

  _paceFast(dt, game) {
    if (this.patrol.length === 0) {
      this.group.rotation.y += dt * 2;
      return;
    }
    const wp = this.patrol[this.waypointIndex];
    if (dist2D(this.x, this.z, wp.x, wp.z) < 0.5) {
      this.waypointIndex = (this.waypointIndex + 1) % this.patrol.length;
    }
    const dx = wp.x - this.x;
    const dz = wp.z - this.z;
    const d = Math.hypot(dx, dz) || 1;
    const speed = 3.4;
    const r = resolveCircle(this.x + (dx / d) * speed * dt, this.z + (dz / d) * speed * dt, RADIUS, game.walls);
    this.x = r.x;
    this.z = r.z;
    this.angle = approachAngle(this.angle, Math.atan2(dx, dz), 8 * dt);

    this.walkPhase += dt * 8;
    const p = this.group.userData.parts;
    const s = Math.sin(this.walkPhase) * 0.6;
    p.leftLeg.rotation.x = s;
    p.rightLeg.rotation.x = -s;
    p.leftArm.rotation.x = -s * 0.6;
    p.rightArm.rotation.x = s * 0.6;

    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.angle;
  }
}
