import * as THREE from 'three';

// Central factory for all procedural geometry. Stylized-realistic look built from
// primitives with PBR materials, ready for shadows. Each builder returns a THREE.Group
// (origin at the floor for characters) and stuffs animation handles into userData.parts.

const matCache = new Map();
export function mat(key, opts) {
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial(opts);
  matCache.set(key, m);
  return m;
}

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, material, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, material, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function pivotLimb(limbMesh, px, py, pz) {
  const pivot = new THREE.Object3D();
  pivot.position.set(px, py, pz);
  pivot.add(limbMesh);
  return pivot;
}

// ----------------------------------------------------------------------------
// Humanoid characters (guards, VIP). Faces +Z by default; set group.rotation.y.
// ----------------------------------------------------------------------------
function buildHumanoid({ suit, accent, skin, helmet = false, weapon = null }) {
  const g = new THREE.Group();
  const suitMat = mat('suit_' + suit, { color: suit, roughness: 0.7, metalness: 0.15 });
  const accentMat = mat('accent_' + accent, { color: accent, roughness: 0.5, metalness: 0.3 });
  const skinMat = mat('skin_' + skin, { color: skin, roughness: 0.85 });

  // Torso (slightly tapered).
  const torso = cyl(0.18, 0.22, 0.7, suitMat, 12);
  torso.position.y = 1.25;
  g.add(torso);

  // Chest accent (vest / lapels).
  const vest = box(0.34, 0.4, 0.16, accentMat);
  vest.position.set(0, 1.32, 0.06);
  g.add(vest);

  // Head + neck.
  const neck = cyl(0.07, 0.07, 0.1, skinMat, 8);
  neck.position.y = 1.62;
  g.add(neck);
  const head = sphere(0.14, skinMat, 16);
  head.position.y = 1.78;
  g.add(head);

  if (helmet) {
    const hel = sphere(0.16, accentMat, 16);
    hel.scale.set(1, 0.8, 1);
    hel.position.y = 1.82;
    g.add(hel);
    // visor
    const visor = box(0.26, 0.07, 0.06, mat('visor', { color: 0x111418, roughness: 0.2, metalness: 0.6 }));
    visor.position.set(0, 1.78, 0.12);
    g.add(visor);
  } else {
    // hair / head accent
    const hair = sphere(0.145, mat('hair', { color: 0x20242c, roughness: 0.9 }), 12);
    hair.scale.set(1, 0.6, 1);
    hair.position.y = 1.86;
    g.add(hair);
  }

  // Arms.
  const armMatU = suitMat;
  const makeArm = (side) => {
    const upper = cyl(0.06, 0.055, 0.36, armMatU, 8);
    upper.position.y = -0.18;
    const hand = sphere(0.06, skinMat, 8);
    hand.position.y = -0.4;
    const pivot = pivotLimb(upper, side * 0.26, 1.5, 0);
    pivot.add(hand);
    g.add(pivot);
    return pivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Optional weapon in right hand.
  if (weapon === 'pistol') {
    const gun = new THREE.Group();
    const body = box(0.05, 0.09, 0.16, mat('gunmetal', { color: 0x16181d, roughness: 0.4, metalness: 0.8 }));
    const barrel = box(0.035, 0.035, 0.1, mat('gunmetal'));
    barrel.position.set(0, 0.02, 0.12);
    gun.add(body, barrel);
    gun.position.set(0, -0.42, 0.12);
    rightArm.add(gun);
  } else if (weapon === 'rifle') {
    const gun = new THREE.Group();
    const body = box(0.05, 0.08, 0.5, mat('gunmetal'));
    body.position.z = 0.16;
    gun.add(body);
    gun.position.set(0, -0.42, 0.1);
    rightArm.add(gun);
  }

  // Legs.
  const makeLeg = (side) => {
    const leg = cyl(0.075, 0.06, 0.85, mat('pants_' + suit, { color: new THREE.Color(suit).multiplyScalar(0.6), roughness: 0.8 }), 8);
    leg.position.y = -0.42;
    const foot = box(0.12, 0.08, 0.22, mat('boot', { color: 0x0c0d10, roughness: 0.6 }));
    foot.position.set(0, -0.85, 0.05);
    const pivot = pivotLimb(leg, side * 0.1, 0.9, 0);
    pivot.add(foot);
    g.add(pivot);
    return pivot;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  g.userData.parts = { head, torso, leftArm, rightArm, leftLeg, rightLeg };
  return g;
}

export function makeGuard(palette = {}) {
  const g = buildHumanoid({
    suit: palette.suit ?? 0x2b3340,
    accent: palette.accent ?? 0x3a4658,
    skin: palette.skin ?? 0xc89b76,
    helmet: true,
    weapon: 'pistol',
  });
  return g;
}

export function makeVIP() {
  const g = buildHumanoid({
    suit: 0x141414, // sharp black suit
    accent: 0x8a1f2b, // crimson tie/pocket-square
    skin: 0xd2a883,
    helmet: false,
    weapon: null,
  });
  // Subtle gold cufflink accent on chest.
  const pin = sphere(0.03, mat('gold', { color: 0xd4af37, roughness: 0.3, metalness: 0.9 }));
  pin.position.set(0.08, 1.4, 0.14);
  g.add(pin);
  g.userData.isVIP = true;
  return g;
}

// ----------------------------------------------------------------------------
// Security camera — wall/ceiling mounted. userData.sweepPivot rotates.
// ----------------------------------------------------------------------------
export function makeSecurityCamera() {
  const g = new THREE.Group();
  const body = mat('cam_body', { color: 0x20242b, roughness: 0.5, metalness: 0.5 });

  const mount = cyl(0.05, 0.05, 0.18, body, 8);
  mount.rotation.z = Math.PI / 2;
  mount.position.set(0, 0, 0);
  g.add(mount);

  const sweepPivot = new THREE.Object3D();
  g.add(sweepPivot);

  const cam = box(0.22, 0.2, 0.32, body);
  cam.position.set(0, 0, 0.2);
  sweepPivot.add(cam);

  const lens = cyl(0.07, 0.07, 0.08, mat('lens', { color: 0x0a0c10, roughness: 0.1, metalness: 0.9, emissive: 0x110000 }), 12);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, 0.38);
  sweepPivot.add(lens);

  // Status LED (turns red when active/alarmed).
  const led = sphere(0.025, mat('cam_led', { color: 0x33ff66, emissive: 0x33ff66, emissiveIntensity: 1.5 }));
  led.position.set(0.08, 0.08, 0.32);
  sweepPivot.add(led);

  g.userData.sweepPivot = sweepPivot;
  g.userData.led = led;
  g.userData.lens = lens;
  return g;
}

// ----------------------------------------------------------------------------
// Surveillance drone. userData.rotors spin.
// ----------------------------------------------------------------------------
export function makeDrone() {
  const g = new THREE.Group();
  const body = mat('drone_body', { color: 0x1a1d23, roughness: 0.4, metalness: 0.6 });
  const arm = mat('drone_arm', { color: 0x2a2f38, roughness: 0.5, metalness: 0.5 });

  const hull = sphere(0.22, body, 16);
  hull.scale.set(1, 0.6, 1);
  g.add(hull);

  const eye = sphere(0.08, mat('drone_eye', { color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 2 }));
  eye.position.set(0, -0.05, 0.18);
  g.add(eye);

  const rotors = [];
  const offsets = [
    [0.3, 0.3],
    [-0.3, 0.3],
    [0.3, -0.3],
    [-0.3, -0.3],
  ];
  for (const [ox, oz] of offsets) {
    const a = cyl(0.02, 0.02, 0.32, arm, 6);
    a.rotation.z = Math.PI / 2;
    a.position.set(ox * 0.5, 0.02, oz * 0.5);
    a.lookAt(new THREE.Vector3(ox, 0.02, oz));
    g.add(a);
    const rotor = cyl(0.16, 0.16, 0.01, mat('rotor', { color: 0x0c0d10, roughness: 0.6, transparent: true, opacity: 0.5 }), 12);
    rotor.position.set(ox, 0.08, oz);
    g.add(rotor);
    rotors.push(rotor);
  }
  g.userData.rotors = rotors;
  g.userData.eye = eye;
  return g;
}

// ----------------------------------------------------------------------------
// First-person weapon view models (attached to the camera).
// ----------------------------------------------------------------------------
export function makePistolViewModel() {
  const g = new THREE.Group();
  const metal = mat('vm_metal', { color: 0x15171c, roughness: 0.35, metalness: 0.85 });
  const grip = mat('vm_grip', { color: 0x23262d, roughness: 0.7, metalness: 0.2 });

  const slide = box(0.07, 0.09, 0.34, metal);
  slide.position.set(0, 0, -0.1);
  g.add(slide);
  const barrel = box(0.045, 0.045, 0.12, metal);
  barrel.position.set(0, 0.01, -0.3);
  g.add(barrel);
  const handle = box(0.07, 0.18, 0.09, grip);
  handle.position.set(0, -0.13, 0.04);
  handle.rotation.x = -0.25;
  g.add(handle);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.01, -0.38);
  g.add(muzzle);

  g.userData.muzzle = muzzle;
  g.scale.setScalar(1.0);
  return g;
}

export function makeSniperViewModel() {
  const g = new THREE.Group();
  const metal = mat('snipe_metal', { color: 0x101216, roughness: 0.3, metalness: 0.9 });
  const stockMat = mat('snipe_stock', { color: 0x2a2118, roughness: 0.8, metalness: 0.1 });

  const body = box(0.06, 0.08, 0.7, metal);
  body.position.set(0, 0, -0.15);
  g.add(body);
  const barrel = box(0.03, 0.03, 0.5, metal);
  barrel.position.set(0, 0.005, -0.55);
  g.add(barrel);
  const stock = box(0.06, 0.12, 0.22, stockMat);
  stock.position.set(0, -0.02, 0.22);
  g.add(stock);
  const scope = cyl(0.04, 0.04, 0.26, metal, 12);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.1, -0.1);
  g.add(scope);
  const mag = box(0.05, 0.12, 0.08, metal);
  mag.position.set(0, -0.1, -0.05);
  g.add(mag);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.005, -0.82);
  g.add(muzzle);

  g.userData.muzzle = muzzle;
  return g;
}

// ----------------------------------------------------------------------------
// Pickups & props.
// ----------------------------------------------------------------------------
export function makePickup(type) {
  const g = new THREE.Group();
  if (type === 'health') {
    const m = mat('pk_health', { color: 0x1d2a22, roughness: 0.5, metalness: 0.3, emissive: 0x113322, emissiveIntensity: 0.4 });
    const base = box(0.3, 0.18, 0.3, m);
    g.add(base);
    const crossMat = mat('pk_cross', { color: 0x44e08a, emissive: 0x44e08a, emissiveIntensity: 1.2 });
    const v = box(0.06, 0.18, 0.06, crossMat);
    v.position.y = 0.14;
    const h = box(0.18, 0.06, 0.06, crossMat);
    h.position.y = 0.14;
    g.add(v, h);
  } else {
    const m = mat('pk_ammo', { color: 0x2a2718, roughness: 0.5, metalness: 0.4 });
    const base = box(0.3, 0.16, 0.22, m);
    g.add(base);
    const stripe = box(0.32, 0.04, 0.24, mat('pk_ammo_stripe', { color: 0xffcc33, emissive: 0xffcc33, emissiveIntensity: 0.8 }));
    stripe.position.y = 0.05;
    g.add(stripe);
  }
  g.userData.type = type;
  return g;
}

export function makeSniperPickup() {
  const g = new THREE.Group();
  // A glowing pedestal holding the sniper rifle.
  const stand = cyl(0.3, 0.4, 0.9, mat('ped', { color: 0x14171c, roughness: 0.6, metalness: 0.4 }), 16);
  stand.position.y = 0.45;
  g.add(stand);
  const top = cyl(0.45, 0.45, 0.08, mat('ped_top', { color: 0x2a2f38, roughness: 0.4, metalness: 0.6 }), 16);
  top.position.y = 0.92;
  g.add(top);
  const rifle = makeSniperViewModel();
  rifle.scale.setScalar(1.1);
  rifle.rotation.y = Math.PI / 2;
  rifle.position.set(0, 1.15, 0);
  g.add(rifle);
  const glow = new THREE.PointLight(0xffcc33, 6, 5, 2);
  glow.position.set(0, 1.4, 0);
  g.add(glow);
  g.userData.rifle = rifle;
  return g;
}

export function makeStairDoor() {
  // A heavy security door marking the route to the next floor.
  const g = new THREE.Group();
  const frame = mat('door_frame', { color: 0x2c3340, roughness: 0.6, metalness: 0.5 });
  const panelMat = mat('door_panel', { color: 0x9a2222, roughness: 0.5, metalness: 0.5, emissive: 0x330808, emissiveIntensity: 0.5 });

  const left = box(0.3, 3.0, 0.4, frame);
  left.position.set(-1.0, 1.5, 0);
  const right = box(0.3, 3.0, 0.4, frame);
  right.position.set(1.0, 1.5, 0);
  const top = box(2.3, 0.4, 0.4, frame);
  top.position.set(0, 2.8, 0);
  const panel = box(1.7, 2.8, 0.2, panelMat);
  panel.position.set(0, 1.4, 0);
  g.add(left, right, top, panel);

  // Status light above the door (red = locked, green = open).
  const statusMat = mat('door_status', { color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 2 });
  const status = sphere(0.12, statusMat);
  status.position.set(0, 3.05, 0.1);
  g.add(status);

  g.userData.panel = panel;
  g.userData.status = status;
  g.userData.panelMat = panelMat;
  return g;
}

export function makeStairs() {
  const g = new THREE.Group();
  const m = mat('stairs', { color: 0x3a4150, roughness: 0.8, metalness: 0.2 });
  for (let i = 0; i < 6; i++) {
    const step = box(2.2, 0.2, 0.4, m);
    step.position.set(0, 0.1 + i * 0.2, -i * 0.4);
    g.add(step);
  }
  return g;
}

// Glowing floor pad that marks the actual exit trigger. Walk onto it (when green)
// to ascend. Uses per-instance materials so its colour can be switched on unlock.
export function makeExitPad() {
  const g = new THREE.Group();
  const discMat = new THREE.MeshStandardMaterial({
    color: 0x250a0a, roughness: 0.5, metalness: 0.3, emissive: 0x330000, emissiveIntensity: 0.6,
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.08, 36), discMat);
  disc.receiveShadow = true;
  g.add(disc);

  const ringMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff3333, emissiveIntensity: 1.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.08, 12, 44), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);

  // Upward chevrons hint "go up".
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0xff6666, emissive: 0xff5555, emissiveIntensity: 1.3 });
  const arrows = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Mesh(new THREE.ConeGeometry(0.4 - i * 0.06, 0.18, 4), arrowMat);
    a.position.y = 0.12 + i * 0.16;
    arrows.add(a);
  }
  g.add(arrows);

  const light = new THREE.PointLight(0xff3333, 4, 7, 2);
  light.position.set(0, 1.2, 0);
  g.add(light);

  g.userData = { discMat, ringMat, arrowMat, light, arrows };
  return g;
}

// A small marker that always renders on top (through walls) so the player can
// locate remaining threats and never get soft-locked hunting the last enemy.
export function makeMarker(color) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.34, 4),
    new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.92 })
  );
  m.rotation.x = Math.PI; // tip points down at the threat
  m.renderOrder = 999;
  return m;
}

// Decorative props for room variety.
export function makeProp(kind) {
  const g = new THREE.Group();
  switch (kind) {
    case 'desk': {
      const top = box(1.6, 0.08, 0.8, mat('desk', { color: 0x3b2f24, roughness: 0.6 }));
      top.position.y = 0.75;
      const leg = mat('desk_leg', { color: 0x222, roughness: 0.5, metalness: 0.4 });
      for (const [x, z] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) {
        const l = box(0.08, 0.75, 0.08, leg);
        l.position.set(x, 0.375, z);
        g.add(l);
      }
      g.add(top);
      break;
    }
    case 'server': {
      const rack = box(0.8, 2.0, 0.9, mat('server', { color: 0x14171c, roughness: 0.5, metalness: 0.5 }));
      rack.position.y = 1.0;
      g.add(rack);
      for (let i = 0; i < 8; i++) {
        const led = box(0.05, 0.05, 0.02, mat('server_led' + (i % 3), {
          color: [0x33ff66, 0xffcc33, 0xff4444][i % 3],
          emissive: [0x33ff66, 0xffcc33, 0xff4444][i % 3],
          emissiveIntensity: 1.4,
        }));
        led.position.set(0.3, 0.3 + i * 0.2, 0.46);
        g.add(led);
      }
      break;
    }
    case 'crate': {
      const c = box(0.9, 0.9, 0.9, mat('crate', { color: 0x4a3b28, roughness: 0.85 }));
      c.position.y = 0.45;
      g.add(c);
      break;
    }
    case 'barrel': {
      const b = cyl(0.35, 0.35, 1.0, mat('barrel', { color: 0x553311, roughness: 0.7, metalness: 0.3 }), 14);
      b.position.y = 0.5;
      g.add(b);
      break;
    }
    case 'pillar': {
      const p = cyl(0.4, 0.4, 4.0, mat('pillar', { color: 0x55606e, roughness: 0.9 }), 16);
      p.position.y = 2.0;
      g.add(p);
      break;
    }
    case 'sofa': {
      const base = box(1.8, 0.4, 0.8, mat('sofa', { color: 0x33405a, roughness: 0.9 }));
      base.position.y = 0.3;
      const back = box(1.8, 0.6, 0.2, mat('sofa'));
      back.position.set(0, 0.6, -0.3);
      g.add(base, back);
      break;
    }
    case 'plant': {
      const pot = cyl(0.18, 0.22, 0.35, mat('pot', { color: 0x2a2a2a, roughness: 0.8 }), 10);
      pot.position.y = 0.18;
      const leaves = sphere(0.35, mat('leaves', { color: 0x2f7a3f, roughness: 0.9 }), 10);
      leaves.position.y = 0.6;
      leaves.scale.set(1, 1.3, 1);
      g.add(pot, leaves);
      break;
    }
    case 'reception': {
      const desk = box(3.0, 1.1, 0.9, mat('recep', { color: 0x2a3340, roughness: 0.5, metalness: 0.3 }));
      desk.position.y = 0.55;
      const top = box(3.2, 0.08, 1.1, mat('recep_top', { color: 0x3a4658, roughness: 0.3, metalness: 0.5 }));
      top.position.y = 1.12;
      g.add(desk, top);
      break;
    }
    default:
      break;
  }
  return g;
}
