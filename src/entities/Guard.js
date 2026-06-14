import * as THREE from 'three';
import { makeGuard, makeMarker } from '../core/AssetFactory.js';
import { canSee } from '../ai/Vision.js';
import { resolveCircle } from '../core/Physics.js';
import { approachAngle, angleDelta, dist2D, clamp, randRange } from '../core/MathUtils.js';

const RADIUS = 0.4;
const VISION = { range: 14, fovDeg: 100 };
const FIRE_RANGE = 16;

const _aim = new THREE.Vector3();
const _gun = new THREE.Vector3();

export class Guard {
  constructor(game, def, palette) {
    this.game = game;
    this.group = makeGuard(palette);
    this.x = def.x;
    this.z = def.z;
    this.angle = def.angle ?? 0;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.angle;

    this.patrol = def.patrol ?? [];
    this.waypointIndex = 0;
    this.waitTimer = 0;

    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.alive = true;
    this.state = 'patrol';

    this.detection = 0;
    this.lastKnown = { x: this.x, z: this.z };
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.reactionTimer = 0;
    this.fireTimer = 0;
    this.scanPhase = randRange(0, Math.PI * 2);

    this.walkPhase = randRange(0, Math.PI * 2);
    this.deathTime = 0;

    // Transparent hitbox for player raycasts.
    const hb = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.85, 0.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hb.position.y = 0.92;
    hb.userData.threat = this;
    this.group.add(hb);
    this.hitbox = hb;

    // Through-wall locator marker.
    this.marker = makeMarker(0xff5050);
    this.marker.position.set(0, 2.4, 0);
    this.group.add(this.marker);

    game.scene.add(this.group);
    game.hittables.push(hb);
  }

  takeDamage(n, point, game) {
    if (!this.alive) return;
    this.health -= n;
    // Being shot instantly alerts and reveals the player.
    this._becomeAlert(true);
    if (this.health <= 0) this._die(game);
  }

  _becomeAlert(hard = false) {
    if (this.state === 'dead') return;
    const wasCalm = this.state === 'patrol';
    this.state = 'alert';
    this.detection = 1;
    this.lastKnown = { x: this.game.player.position.x, z: this.game.player.position.z };
    if (hard || wasCalm) {
      this.game.raiseAlarm(this.lastKnown);
      this.reactionTimer = randRange(0.25, 0.5);
    }
  }

  _die(game) {
    this.alive = false;
    this.state = 'dead';
    this.deathTime = 0;
    if (this.marker) this.marker.visible = false;
    // Remove from raycast targets and threat tally.
    const i = game.hittables.indexOf(this.hitbox);
    if (i >= 0) game.hittables.splice(i, 1);
    this.hitbox.userData.threat = null;
    game.onThreatNeutralized(this);
    game.particles.blood(new THREE.Vector3(this.x, 1.2, this.z));
  }

  // External alert (alarm broadcast from a camera or another guard).
  alertTo(pos) {
    if (!this.alive) return;
    if (this.state === 'patrol') {
      this.state = 'search';
      this.searchTimer = 6;
    }
    this.lastKnown = { x: pos.x, z: pos.z };
  }

  update(dt, game) {
    if (!this.alive) {
      this._updateDeath(dt);
      return;
    }

    const player = game.player;
    const walls = game.walls;

    // ---- Perception ----
    const vis = canSee(
      { x: this.x, z: this.z, angle: this.angle },
      { x: player.position.x, z: player.position.z },
      VISION,
      walls,
      player.crouchVisibility
    );

    if (vis.seen && player.alive) {
      // Detection builds faster the closer the player is.
      const rate = 1.6 + (1 - vis.dist / VISION.range) * 2.2;
      this.detection = clamp(this.detection + dt * rate, 0, 1);
      this.lastKnown = { x: player.position.x, z: player.position.z };
      this.loseSightTimer = 0;
      if (this.detection >= 1 && this.state !== 'alert') this._becomeAlert();
    } else {
      this.detection = clamp(this.detection - dt * 0.5, 0, 1);
      this.loseSightTimer += dt;
    }

    switch (this.state) {
      case 'patrol':
        this._patrol(dt, walls);
        break;
      case 'alert':
        this._alert(dt, game, vis);
        break;
      case 'search':
        this._search(dt, walls);
        break;
    }

    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.angle;
  }

  _moveToward(tx, tz, speed, dt, walls) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    const nx = dx / d;
    const nz = dz / d;
    const want = Math.min(speed * dt, d);
    let px = this.x + nx * want;
    let pz = this.z + nz * want;
    const r = resolveCircle(px, pz, RADIUS, walls);
    // Simple unstick: if a wall ate most of the motion, try sidestepping.
    const moved = dist2D(this.x, this.z, r.x, r.z);
    if (moved < want * 0.3) {
      const sx = -nz;
      const sz = nx;
      const r2 = resolveCircle(this.x + sx * want, this.z + sz * want, RADIUS, walls);
      this.x = r2.x;
      this.z = r2.z;
    } else {
      this.x = r.x;
      this.z = r.z;
    }
    // Face travel direction.
    this.angle = approachAngle(this.angle, Math.atan2(dx, dz), 6 * dt);
    this._animWalk(dt, speed);
    return moved;
  }

  _patrol(dt, walls) {
    if (this.patrol.length === 0) {
      // Idle scanning sweep.
      this.scanPhase += dt * 0.6;
      this.angle += Math.sin(this.scanPhase) * dt * 0.8;
      this._animIdle(dt);
      return;
    }
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this._animIdle(dt);
      return;
    }
    const wp = this.patrol[this.waypointIndex];
    const d = dist2D(this.x, this.z, wp.x, wp.z);
    if (d < 0.4) {
      this.waypointIndex = (this.waypointIndex + 1) % this.patrol.length;
      this.waitTimer = randRange(0.5, 1.6);
      return;
    }
    this._moveToward(wp.x, wp.z, 1.5, dt, walls);
  }

  _alert(dt, game, vis) {
    const player = game.player;
    const distToPlayer = dist2D(this.x, this.z, player.position.x, player.position.z);

    if (vis.seen && player.alive) {
      this.loseSightTimer = 0;
      // Keep a fighting distance: approach if far, hold if close.
      if (distToPlayer > 7) {
        this._moveToward(player.position.x, player.position.z, 3.0, dt, game.walls);
      } else {
        this._faceTarget(player.position.x, player.position.z, dt);
        this._animAim(dt);
      }
      this._tryShoot(dt, game, distToPlayer);
    } else {
      // Lost sight — head to last known position, then drop to search.
      this._moveToward(this.lastKnown.x, this.lastKnown.z, 2.6, dt, game.walls);
      if (this.loseSightTimer > 3.0) {
        this.state = 'search';
        this.searchTimer = 5;
      }
    }
  }

  _search(dt, walls) {
    const d = dist2D(this.x, this.z, this.lastKnown.x, this.lastKnown.z);
    if (d > 0.5) {
      this._moveToward(this.lastKnown.x, this.lastKnown.z, 2.2, dt, walls);
    } else {
      // Look around at the last known spot.
      this.scanPhase += dt * 1.5;
      this.angle += Math.sin(this.scanPhase) * dt * 1.6;
      this._animIdle(dt);
      this.searchTimer -= dt;
      if (this.searchTimer <= 0) {
        this.state = 'patrol';
        this.detection = 0;
        this.waitTimer = 0.5;
      }
    }
  }

  _faceTarget(tx, tz, dt) {
    this.angle = approachAngle(this.angle, Math.atan2(tx - this.x, tz - this.z), 8 * dt);
  }

  _tryShoot(dt, game, distToPlayer) {
    if (distToPlayer > FIRE_RANGE) return;
    // Must be roughly facing the player.
    const facing = Math.abs(angleDelta(this.angle, Math.atan2(game.player.position.x - this.x, game.player.position.z - this.z)));
    if (facing > 0.4) return;

    if (this.reactionTimer > 0) {
      this.reactionTimer -= dt;
      return;
    }
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;
    this.fireTimer = randRange(0.8, 1.2);

    // Hit chance falls off with distance and improves up close. Forgiving by design.
    const acc = clamp(0.62 - distToPlayer * 0.025, 0.12, 0.62);
    _gun.set(this.x + Math.sin(this.angle) * 0.35, 1.4, this.z + Math.cos(this.angle) * 0.35);
    game.player.getAimTarget(_aim);
    game.tracers.spawn(_gun, _aim.clone(), 0xff8844);
    game.audio.gunshot('pistol');
    if (Math.random() < acc) {
      game.player.takeDamage(randRange(7, 12));
    }
  }

  // ---- Animation helpers ----
  _animWalk(dt, speed) {
    this.walkPhase += dt * (4 + speed);
    const a = 0.5;
    const p = this.group.userData.parts;
    const s = Math.sin(this.walkPhase) * a;
    p.leftLeg.rotation.x = s;
    p.rightLeg.rotation.x = -s;
    p.leftArm.rotation.x = -s * 0.5;
    p.rightArm.rotation.x = s * 0.5;
  }

  _animIdle(dt) {
    const p = this.group.userData.parts;
    p.leftLeg.rotation.x *= 1 - Math.min(1, dt * 6);
    p.rightLeg.rotation.x *= 1 - Math.min(1, dt * 6);
    p.leftArm.rotation.x *= 1 - Math.min(1, dt * 6);
    p.rightArm.rotation.x *= 1 - Math.min(1, dt * 6);
  }

  _animAim(dt) {
    const p = this.group.userData.parts;
    // Raise the gun arm forward.
    p.rightArm.rotation.x = approachAngle(p.rightArm.rotation.x, -1.4, 10 * dt);
    p.leftArm.rotation.x = approachAngle(p.leftArm.rotation.x, -1.1, 10 * dt);
    p.leftLeg.rotation.x *= 1 - Math.min(1, dt * 6);
    p.rightLeg.rotation.x *= 1 - Math.min(1, dt * 6);
  }

  _updateDeath(dt) {
    this.deathTime += dt;
    // Tip over.
    const t = Math.min(1, this.deathTime / 0.6);
    this.group.rotation.x = -(Math.PI / 2) * t;
    this.group.position.y = -0.0;
  }
}
