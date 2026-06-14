import * as THREE from 'three';
import { makeDrone, makeMarker } from '../core/AssetFactory.js';
import { canSee } from '../ai/Vision.js';
import { resolveCircle } from '../core/Physics.js';
import { approachAngle, clamp, dist2D, randRange } from '../core/MathUtils.js';

const RADIUS = 0.35;
const VISION = { range: 12, fovDeg: 80 };

const _aim = new THREE.Vector3();
const _muzzle = new THREE.Vector3();

export class Drone {
  constructor(game, def) {
    this.game = game;
    this.x = def.x;
    this.z = def.z;
    this.y = def.y ?? 2.2;
    this.angle = def.angle ?? 0;
    this.patrol = def.patrol ?? [];
    this.waypointIndex = 0;

    this.group = makeDrone();
    this.group.position.set(this.x, this.y, this.z);

    this.alive = true;
    this.health = 40;
    this.detection = 0;
    this.state = 'patrol';
    this.lastKnown = { x: this.x, z: this.z };
    this.bobPhase = Math.random() * Math.PI * 2;
    this.fireTimer = 0;
    this.alarmCooldown = 0;

    const hb = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.4, 0.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hb.userData.threat = this;
    hb.position.copy(this.group.position);
    this.hitbox = hb;

    this.marker = makeMarker(0xff9030);
    this.marker.position.set(0, 0.6, 0);
    this.group.add(this.marker);

    game.scene.add(hb);
    game.scene.add(this.group);
    game.hittables.push(hb);
  }

  takeDamage(n, point, game) {
    if (!this.alive) return;
    this.health -= n;
    game.particles.spark(point || new THREE.Vector3(this.x, this.y, this.z));
    if (this.health <= 0) this._destroy(game);
  }

  _destroy(game) {
    this.alive = false;
    game.particles.explosion(new THREE.Vector3(this.x, this.y, this.z));
    game.audio.explosion();
    game.shake(0.5);
    const i = game.hittables.indexOf(this.hitbox);
    if (i >= 0) game.hittables.splice(i, 1);
    game.scene.remove(this.hitbox);
    game.scene.remove(this.group);
    game.onThreatNeutralized(this);
  }

  alertTo(pos) {
    if (!this.alive) return;
    this.state = 'hunt';
    this.lastKnown = { x: pos.x, z: pos.z };
  }

  update(dt, game) {
    if (!this.alive) return;
    const player = game.player;

    // Spin rotors + bob.
    for (const r of this.group.userData.rotors) r.rotation.y += dt * 40;
    this.bobPhase += dt * 2;
    const bobY = this.y + Math.sin(this.bobPhase) * 0.12;

    const vis = canSee(
      { x: this.x, z: this.z, angle: this.angle },
      { x: player.position.x, z: player.position.z },
      VISION,
      game.walls,
      player.crouchVisibility
    );

    if (this.alarmCooldown > 0) this.alarmCooldown -= dt;

    if (vis.seen && player.alive) {
      this.detection = clamp(this.detection + dt * 1.8, 0, 1);
      this.lastKnown = { x: player.position.x, z: player.position.z };
      if (this.detection >= 1) {
        this.state = 'hunt';
        if (this.alarmCooldown <= 0) {
          this.alarmCooldown = 3;
          game.raiseAlarm(this.lastKnown);
        }
      }
      this._setEye(0xff2a2a);
    } else {
      this.detection = clamp(this.detection - dt * 0.5, 0, 1);
      this._setEye(this.state === 'hunt' ? 0xffaa00 : 0xff2a2a);
    }

    if (this.state === 'patrol') this._patrol(dt, game);
    else this._hunt(dt, game, vis);

    this.group.position.set(this.x, bobY, this.z);
    this.group.rotation.y = approachAngle(this.group.rotation.y, this.angle, 5 * dt);
    this.hitbox.position.set(this.x, bobY, this.z);
  }

  _patrol(dt, game) {
    if (this.patrol.length === 0) {
      this.angle += dt * 0.5;
      return;
    }
    const wp = this.patrol[this.waypointIndex];
    if (dist2D(this.x, this.z, wp.x, wp.z) < 0.5) {
      this.waypointIndex = (this.waypointIndex + 1) % this.patrol.length;
      return;
    }
    this._moveToward(wp.x, wp.z, 2.2, dt, game.walls);
  }

  _hunt(dt, game, vis) {
    const player = game.player;
    const d = dist2D(this.x, this.z, this.lastKnown.x, this.lastKnown.z);
    if (vis.seen && player.alive) {
      this.lastKnown = { x: player.position.x, z: player.position.z };
      const dp = dist2D(this.x, this.z, player.position.x, player.position.z);
      if (dp > 5) this._moveToward(player.position.x, player.position.z, 3.2, dt, game.walls);
      else this.angle = Math.atan2(player.position.x - this.x, player.position.z - this.z);
      this._tryShoot(dt, game, dp);
    } else if (d > 0.6) {
      this._moveToward(this.lastKnown.x, this.lastKnown.z, 2.8, dt, game.walls);
    } else {
      this.angle += dt * 1.2; // scan
      this.detection -= dt * 0.2;
      if (this.detection <= 0) this.state = 'patrol';
    }
  }

  _tryShoot(dt, game, dp) {
    if (dp > 13) return;
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;
    this.fireTimer = randRange(1.1, 1.6);
    _muzzle.set(this.x, this.y - 0.05, this.z);
    game.player.getAimTarget(_aim);
    game.tracers.spawn(_muzzle, _aim.clone(), 0xff3333);
    game.audio.gunshot('pistol');
    const acc = clamp(0.45 - dp * 0.02, 0.1, 0.45);
    if (Math.random() < acc) game.player.takeDamage(randRange(5, 9));
  }

  _moveToward(tx, tz, speed, dt, walls) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return;
    const want = Math.min(speed * dt, d);
    const r = resolveCircle(this.x + (dx / d) * want, this.z + (dz / d) * want, RADIUS, walls);
    this.x = r.x;
    this.z = r.z;
    this.angle = Math.atan2(dx, dz);
  }

  _setEye(color) {
    const eye = this.group.userData.eye;
    if (eye.material.color.getHex() !== color) {
      eye.material = eye.material.clone();
      eye.material.color.set(color);
      eye.material.emissive.set(color);
    }
  }
}
