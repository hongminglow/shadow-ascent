import * as THREE from 'three';
import { makePistolViewModel, makeSniperViewModel } from '../core/AssetFactory.js';
import { clamp, damp } from '../core/MathUtils.js';

const _ndc = new THREE.Vector2();
const _ray = new THREE.Raycaster();
const _muzzleWorld = new THREE.Vector3();
const _far = new THREE.Vector3();

export class Weapon {
  constructor(cfg) {
    this.cfg = cfg;
    this.name = cfg.name;
    this.magSize = cfg.magSize;
    this.ammo = cfg.magSize;
    this.reserve = cfg.reserve;
    this.damage = cfg.damage;
    this.fireDelay = 1 / cfg.fireRate;
    this.reloadTime = cfg.reloadTime;
    this.spread = cfg.spread;
    this.recoilKick = cfg.recoilKick;
    this.isSniper = !!cfg.isSniper;

    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.viewModel = null;
    this.aimed = false;

    // view-model animation state
    this._kick = 0;
    this._bob = 0;
    this._sway = new THREE.Vector2();
    this._basePos = new THREE.Vector3();
  }

  attach(camera) {
    this.viewModel = this.cfg.makeViewModel();
    // Resting position: lower-right of the screen.
    this._basePos.set(0.22, -0.2, -0.55);
    if (this.isSniper) this._basePos.set(0.18, -0.18, -0.5);
    this.viewModel.position.copy(this._basePos);
    this.viewModel.rotation.set(0, Math.PI, 0); // face away from camera
    camera.add(this.viewModel);
  }

  detach(camera) {
    if (this.viewModel) camera.remove(this.viewModel);
    this.viewModel = null;
  }

  canFire() {
    return !this.reloading && this.cooldown <= 0 && this.ammo > 0;
  }

  fire(game, player) {
    if (this.reloading) return false;
    if (this.ammo <= 0) {
      this.reload(game);
      return false;
    }
    if (this.cooldown > 0) return false;

    this.ammo--;
    this.cooldown = this.fireDelay;
    this._kick = 1;

    const camera = game.camera;
    const spread = this.aimed && this.isSniper ? 0.0006 : this.spread;
    _ndc.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
    _ray.setFromCamera(_ndc, camera);

    const colliders = game.getBulletColliders();
    const hits = _ray.intersectObjects(colliders, false);

    // Muzzle world position for the tracer origin.
    if (this.viewModel?.userData?.muzzle) {
      this.viewModel.userData.muzzle.getWorldPosition(_muzzleWorld);
    } else {
      camera.getWorldPosition(_muzzleWorld);
    }

    let endPoint;
    if (hits.length > 0) {
      const hit = hits[0];
      endPoint = hit.point.clone();
      const threat = hit.object.userData.threat;
      if (threat && threat.alive) {
        const headshot = hit.point.y > threat.group.position.y + 1.55;
        threat.takeDamage(headshot ? this.damage * 2.2 : this.damage, hit.point, game);
        game.particles.blood(hit.point);
        game.hud.hitMarker();
        game.audio.hitConfirm();
      } else {
        game.particles.impact(hit.point);
      }
    } else {
      _far.set(_ndc.x, _ndc.y, 1).unproject(camera);
      endPoint = camera.getWorldPosition(new THREE.Vector3()).add(
        _far.sub(camera.getWorldPosition(new THREE.Vector3())).normalize().multiplyScalar(120)
      );
    }

    game.tracers.spawn(_muzzleWorld, endPoint, this.isSniper ? 0xff5544 : 0xfff1a8);
    game.particles.muzzleFlash(_muzzleWorld, _ray.ray.direction);
    game.audio.gunshot(this.isSniper ? 'sniper' : 'pistol');

    // Recoil kicks the camera up; sniper kicks harder.
    player.addRecoil(this.recoilKick);
    game.shake(this.isSniper ? 0.5 : 0.18);
    return true;
  }

  reload(game) {
    if (this.reloading || this.ammo === this.magSize || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = this.reloadTime;
    game.audio.reload();
  }

  _finishReload() {
    const need = this.magSize - this.ammo;
    const take = Math.min(need, this.reserve);
    this.ammo += take;
    this.reserve -= take;
    this.reloading = false;
  }

  addAmmo(n) {
    this.reserve += n;
  }

  update(dt, player, input) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this._finishReload();
    }
    if (!this.viewModel) return;

    // Recoil recovery.
    this._kick = damp(this._kick, 0, 12, dt);

    // Weapon bob from movement, sway from look.
    const moving = player.speed2D > 0.5 ? 1 : 0;
    this._bob += dt * (player.sprinting ? 14 : 9) * moving;
    const bobAmt = (this.aimed ? 0.004 : 0.02) * moving;
    const swayTarget = input ? input.lastSway : { x: 0, y: 0 };
    this._sway.x = damp(this._sway.x, swayTarget.x, 10, dt);
    this._sway.y = damp(this._sway.y, swayTarget.y, 10, dt);

    const aimPos = this.isSniper
      ? new THREE.Vector3(0, -0.045, -0.28)
      : new THREE.Vector3(0, -0.06, -0.35);
    const target = this.aimed ? aimPos : this._basePos;

    this.viewModel.position.x = damp(this.viewModel.position.x, target.x + this._sway.x * 0.04, 12, dt);
    this.viewModel.position.y =
      damp(this.viewModel.position.y, target.y + Math.sin(this._bob) * bobAmt - this._sway.y * 0.04, 12, dt) -
      this._kick * 0.05;
    this.viewModel.position.z = damp(this.viewModel.position.z, target.z + this._kick * 0.12, 12, dt);
    this.viewModel.rotation.x = -this._kick * 0.35;
  }

  setAimed(v) {
    // Both weapons can aim down sights; only the sniper drives the scope overlay (HUD checks isSniper).
    this.aimed = !!v;
  }
}

export function makePistol() {
  return new Weapon({
    name: 'M9 Sidearm',
    magSize: 12,
    reserve: 60,
    damage: 45,
    fireRate: 5,
    reloadTime: 1.1,
    spread: 0.012,
    recoilKick: 0.02,
    isSniper: false,
    makeViewModel: makePistolViewModel,
  });
}

export function makeSniper() {
  return new Weapon({
    name: 'XR-7 Sniper',
    magSize: 5,
    reserve: 15,
    damage: 250,
    fireRate: 1.1,
    reloadTime: 1.8,
    spread: 0.02,
    recoilKick: 0.08,
    isSniper: true,
    makeViewModel: makeSniperViewModel,
  });
}
