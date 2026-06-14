import * as THREE from 'three';

// Manages short-lived tracer beams for both player and enemy fire.
export class Tracers {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.geo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
    // Cylinder is built along Y; we orient it along the shot direction.
  }

  spawn(from, to, color = 0xfff1a8) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geo, mat);
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.001) return;
    mesh.scale.y = len;
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.scene.add(mesh);
    this.active.push({ mesh, life: 0.06, mat });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.life -= dt;
      t.mat.opacity = Math.max(0, t.life / 0.06) * 0.9;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mat.dispose();
        this.active.splice(i, 1);
      }
    }
  }

  reset() {
    for (const t of this.active) {
      this.scene.remove(t.mesh);
      t.mat.dispose();
    }
    this.active.length = 0;
  }
}
