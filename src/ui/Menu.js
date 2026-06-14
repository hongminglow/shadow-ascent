import * as THREE from 'three';
import { makeGuard, makeVIP, makeDrone, makeSecurityCamera, mat } from '../core/AssetFactory.js';

// Polished main menu: a slowly rotating 3D dossier diorama behind a DOM overlay.
// Showcases the entirely fictional VIP target and security team.
export class MainMenu {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.04);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 2.4, 7);
    this.camera.lookAt(0, 1.2, 0);

    this._buildDiorama();
    this._buildDom();

    this.onStart = null;
    this.time = 0;
  }

  _buildDiorama() {
    const turntable = new THREE.Group();
    this.turntable = turntable;
    this.scene.add(turntable);

    // Platform.
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.4, 0.3, 48),
      mat('menu_plate', { color: 0x14181f, roughness: 0.5, metalness: 0.5 })
    );
    plate.position.y = -0.15;
    plate.receiveShadow = true;
    turntable.add(plate);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.25, 0.04, 12, 64),
      mat('menu_ring', { color: 0xff3b3b, emissive: 0xff3b3b, emissiveIntensity: 1.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    turntable.add(ring);

    // VIP center stage.
    const vip = makeVIP();
    vip.position.set(0, 0, 0);
    turntable.add(vip);
    this.vip = vip;

    // Flanking guards.
    const g1 = makeGuard();
    g1.position.set(-2, 0, -0.4);
    g1.rotation.y = 0.6;
    turntable.add(g1);
    const g2 = makeGuard();
    g2.position.set(2, 0, -0.4);
    g2.rotation.y = -0.6;
    turntable.add(g2);

    // Security camera on a pole.
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8),
      mat('menu_pole', { color: 0x333, roughness: 0.6 })
    );
    pole.position.set(2.6, 1.2, 1.4);
    turntable.add(pole);
    const cam = makeSecurityCamera();
    cam.position.set(2.6, 2.4, 1.4);
    cam.rotation.y = -2.2;
    turntable.add(cam);
    this.menuCam = cam;

    // Hovering drone.
    const drone = makeDrone();
    drone.position.set(-2.4, 2.0, 1.2);
    turntable.add(drone);
    this.drone = drone;

    // Lighting — moody key + rim.
    this.scene.add(new THREE.AmbientLight(0x404a5a, 0.6));
    const key = new THREE.SpotLight(0xfff0d8, 60, 20, 0.6, 0.5, 1.5);
    key.position.set(3, 8, 6);
    key.target = vip;
    this.scene.add(key);
    const rim = new THREE.PointLight(0xff4040, 30, 14, 2);
    rim.position.set(-4, 3, -3);
    this.scene.add(rim);
    const fill = new THREE.PointLight(0x5080ff, 18, 14, 2);
    fill.position.set(4, 2, -2);
    this.scene.add(fill);
  }

  _buildDom() {
    const el = document.createElement('div');
    el.id = 'menu';
    el.className = 'overlay';
    el.innerHTML = `
      <div class="menu-title">
        <h1>Shadow Ascent</h1>
        <div class="sub">Five Floors · One Target</div>
      </div>

      <div class="menu-buttons">
        <button class="btn primary" id="btn-play">▶ Start Mission</button>
        <button class="btn" id="btn-how">How to Play</button>
        <button class="btn" id="btn-mute">Sound: On</button>
      </div>

      <div class="dossier">
        <div class="card target">
          <div class="tag">◈ Primary Target</div>
          <h3>Mr. Castellane</h3>
          <p>Reclusive financier holed up in the rooftop penthouse. Reach him and complete the contract.</p>
        </div>
        <div class="card">
          <div class="tag">Vanguard Detail</div>
          <h3>Guards</h3>
          <p>Patrol set routes with a limited cone of vision. Flank them, stay crouched, pick your moments.</p>
        </div>
        <div class="card">
          <div class="tag">Aerial Units</div>
          <h3>Recon Drones</h3>
          <p>Hovering sentries that raise the alarm and return fire. Shoot them out of the sky.</p>
        </div>
        <div class="card">
          <div class="tag">Surveillance Grid</div>
          <h3>Cameras</h3>
          <p>Sweeping lenses that trip the alarm on sight. One bullet ends them.</p>
        </div>
      </div>

      <div class="controls-list hidden" id="controls">
        <div><b>Move</b> W A S D</div>
        <div><b>Look</b> Mouse</div>
        <div><b>Sprint</b> Shift &nbsp; <b>Crouch</b> C (toggle)</div>
        <div><b>Flashlight</b> F &nbsp; <b>Reload</b> R</div>
        <div><b>Fire</b> Left Click &nbsp; <b>Aim</b> Right Click</div>
        <div><b>Pause</b> Esc &nbsp; <b>Interact</b> Walk into pickups &amp; the sniper</div>
      </div>

      <div class="fineprint">
        All characters, the target, and the security team are entirely fictional.
        Click the screen to lock the mouse · turn up your headphones for synthesized audio.
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;

    el.querySelector('#btn-play').addEventListener('click', () => this.onStart?.());
    el.querySelector('#btn-how').addEventListener('click', () => {
      el.querySelector('#controls').classList.toggle('hidden');
    });
    this.muteBtn = el.querySelector('#btn-mute');
    this.muteBtn.addEventListener('click', () => this.onToggleMute?.());
  }

  setMuteLabel(muted) {
    if (this.muteBtn) this.muteBtn.textContent = 'Sound: ' + (muted ? 'Off' : 'On');
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    this.time += dt;
    this.turntable.rotation.y += dt * 0.25;
    // Idle life.
    for (const r of this.drone.userData.rotors) r.rotation.y += dt * 30;
    this.drone.position.y = 2.0 + Math.sin(this.time * 1.6) * 0.1;
    this.menuCam.userData.sweepPivot.rotation.y = Math.sin(this.time * 0.8) * 0.6;
    this.vip.rotation.y = Math.sin(this.time * 0.5) * 0.15;
  }
}
