import * as THREE from 'three';
import { randRange } from '../core/MathUtils.js';

// Pooled particle system using a single THREE.Points cloud. Cheap and self-contained.
const MAX = 600;

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    this.gravity = new Float32Array(MAX);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geo = geo;

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // start all dead (off screen)
    for (let i = 0; i < MAX; i++) {
      this.positions[i * 3 + 1] = -9999;
    }
  }

  _spawn(x, y, z, vx, vy, vz, life, color, grav) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.colors[i * 3] = color.r;
    this.colors[i * 3 + 1] = color.g;
    this.colors[i * 3 + 2] = color.b;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.gravity[i] = grav;
  }

  burst(pos, opts = {}) {
    const {
      count = 12,
      color = new THREE.Color(0xffaa33),
      speed = 4,
      life = 0.4,
      spread = 1,
      grav = 6,
      up = 0,
    } = opts;
    for (let i = 0; i < count; i++) {
      const vx = randRange(-1, 1) * speed * spread;
      const vy = (randRange(-0.3, 1) + up) * speed * spread;
      const vz = randRange(-1, 1) * speed * spread;
      this._spawn(pos.x, pos.y, pos.z, vx, vy, vz, life * randRange(0.6, 1.2), color, grav);
    }
  }

  muzzleFlash(pos, dir) {
    const c = new THREE.Color(0xffdd66);
    for (let i = 0; i < 6; i++) {
      this._spawn(
        pos.x,
        pos.y,
        pos.z,
        dir.x * 6 + randRange(-1, 1),
        dir.y * 6 + randRange(-1, 1),
        dir.z * 6 + randRange(-1, 1),
        0.08,
        c,
        0
      );
    }
  }

  impact(pos, normalColor = 0xcccccc) {
    this.burst(pos, { count: 10, color: new THREE.Color(normalColor), speed: 3, life: 0.3, grav: 8 });
  }

  blood(pos) {
    this.burst(pos, { count: 14, color: new THREE.Color(0x8a1020), speed: 3, life: 0.45, grav: 10, up: 0.4 });
  }

  spark(pos) {
    this.burst(pos, { count: 16, color: new THREE.Color(0xffcc44), speed: 5, life: 0.4, grav: 6 });
  }

  explosion(pos) {
    this.burst(pos, { count: 40, color: new THREE.Color(0xff7722), speed: 7, life: 0.6, grav: 5, up: 0.5 });
    this.burst(pos, { count: 20, color: new THREE.Color(0x333333), speed: 3, life: 0.9, grav: -1, up: 0.8 });
  }

  update(dt) {
    const pos = this.positions;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        pos[i * 3 + 1] = -9999;
        continue;
      }
      this.vel[i * 3 + 1] -= this.gravity[i] * dt;
      pos[i * 3] += this.vel[i * 3] * dt;
      pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      // fade via darkening color
      const f = this.life[i] / this.maxLife[i];
      this.colors[i * 3] *= 1; // keep hue; size material handles look
      void f;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  reset() {
    for (let i = 0; i < MAX; i++) {
      this.life[i] = 0;
      this.positions[i * 3 + 1] = -9999;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
