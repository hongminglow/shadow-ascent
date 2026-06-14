import * as THREE from 'three';
import { mat, makeProp, makePickup, makeStairDoor, makeStairs, makeSniperPickup, makeExitPad } from '../core/AssetFactory.js';
import { Guard } from '../entities/Guard.js';
import { SecurityCamera } from '../entities/SecurityCamera.js';
import { Drone } from '../entities/Drone.js';
import { VIP } from '../entities/VIP.js';

const WALL_H = 4;

// Builds one floor from its data into the game. Mutates game state (walls, threats, etc.)
export function buildFloor(game, def) {
  const group = new THREE.Group();
  game.floorGroup = group;
  game.scene.add(group);

  const t = def.theme;
  const { w, d } = def.bounds;

  // ---- Environment look ----
  game.scene.background = new THREE.Color(t.sky ? 0x9fc0e8 : t.fog);
  game.scene.fog = new THREE.FogExp2(t.fog, t.fogDensity);

  // ---- Floor plane ----
  const floorMat = mat('floorMat_' + def.id, { color: t.floor, roughness: 0.95, metalness: 0.05 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  game.solids.push(floor);

  // ---- Ceiling (skip for rooftop) ----
  if (!def.rooftop) {
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      mat('ceil_' + def.id, { color: new THREE.Color(t.wall).multiplyScalar(0.4), roughness: 1 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = WALL_H;
    group.add(ceil);
  }

  // ---- Wall helper ----
  const wallMat = mat('wallMat_' + def.id, { color: t.wall, roughness: 0.9, metalness: 0.05 });
  const addWall = (x, z, ww, dd, h) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat);
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    game.solids.push(m);
    game.walls.push({
      minX: x - ww / 2,
      maxX: x + ww / 2,
      minZ: z - dd / 2,
      maxZ: z + dd / 2,
    });
  };

  // Perimeter.
  addWall(0, -d / 2, w, 0.6, WALL_H);
  addWall(0, d / 2, w, 0.6, WALL_H);
  addWall(-w / 2, 0, 0.6, d, WALL_H);
  addWall(w / 2, 0, 0.6, d, WALL_H);

  // Interior walls.
  for (const wl of def.walls) addWall(wl.x, wl.z, wl.w, wl.d, wl.h);

  // ---- Lights ----
  const amb = new THREE.AmbientLight(0xffffff, t.ambient);
  group.add(amb);
  const hemi = new THREE.HemisphereLight(t.sky ? 0xbfd8ff : 0x556070, 0x14161b, t.hemi);
  group.add(hemi);

  // One shadow-casting key light + cheap fill point lights.
  const key = new THREE.DirectionalLight(0xffffff, t.sky ? 1.1 : 0.5);
  key.position.set(w * 0.3, 16, -d * 0.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sCam = key.shadow.camera;
  sCam.left = -w; sCam.right = w; sCam.top = d; sCam.bottom = -d;
  sCam.near = 1; sCam.far = 60;
  sCam.updateProjectionMatrix();
  key.shadow.bias = -0.0005;
  group.add(key);
  group.add(key.target);

  for (const l of t.lights || []) {
    const p = new THREE.PointLight(l.color, l.intensity, 18, 2);
    p.position.set(l.x, 3.2, l.z);
    group.add(p);
  }

  // ---- Props ----
  for (const pr of def.props) {
    const g = makeProp(pr.kind);
    g.position.set(pr.x, 0, pr.z);
    if (pr.rot) g.rotation.y = pr.rot;
    group.add(g);
    // Treat chunky props as bullet blockers.
    g.traverse((o) => { if (o.isMesh) game.solids.push(o); });
    // Add collision for the bulky ones.
    if (['crate', 'server', 'barrel', 'pillar', 'reception', 'desk'].includes(pr.kind)) {
      const sizes = {
        crate: [0.9, 0.9], server: [0.8, 0.9], barrel: [0.7, 0.7],
        pillar: [0.8, 0.8], reception: [3.2, 1.1], desk: [1.6, 0.8],
      };
      const [cw, cd] = sizes[pr.kind];
      game.walls.push({ minX: pr.x - cw / 2, maxX: pr.x + cw / 2, minZ: pr.z - cd / 2, maxZ: pr.z + cd / 2 });
    }
  }

  // ---- Distant skyline for the rooftop ----
  if (def.rooftop) addSkyline(group);

  // ---- Exit: stairwell doorway + ground-level trigger pad ----
  // The player can't jump/climb, so the exit is a flat glowing pad you walk onto
  // (when it turns green) rather than a staircase you have to climb.
  if (def.stair) {
    const sx = def.stair.x;
    const doorZ = def.stair.z;

    // Stairwell door set into the back, as set dressing for the "staircase" theme.
    const door = makeStairDoor();
    door.position.set(sx, 0, doorZ);
    group.add(door);
    game.stairDoor = door;

    // A short decorative flight visible behind the door — purely cosmetic, off the
    // player's path so it can't be mistaken for something to climb.
    const stairs = makeStairs();
    stairs.position.set(sx, 0, doorZ + 0.9);
    group.add(stairs);

    // The real trigger: a glowing pad on the floor, a couple of metres in front.
    const pad = makeExitPad();
    const padZ = doorZ - 2.4;
    pad.position.set(sx, 0.04, padZ);
    group.add(pad);
    game.exitPad = pad;
    game.stairPos = { x: sx, z: padZ };
  } else {
    game.stairDoor = null;
    game.exitPad = null;
    game.stairPos = null;
  }

  // ---- Pickups ----
  for (const pk of def.pickups) {
    const g = makePickup(pk.type);
    g.position.set(pk.x, 0.4, pk.z);
    group.add(g);
    game.pickups.push({ group: g, type: pk.type, x: pk.x, z: pk.z, picked: false });
  }

  // ---- Sniper pedestal (rooftop) ----
  if (def.sniper) {
    const ped = makeSniperPickup();
    ped.position.set(def.sniper.x, 0, def.sniper.z);
    group.add(ped);
    game.sniperPickup = { group: ped, x: def.sniper.x, z: def.sniper.z, picked: false };
  }

  // ---- Enemies ----
  const palettes = [
    { suit: 0x2b3340, accent: 0x3a4658, skin: 0xc89b76 },
    { suit: 0x33291f, accent: 0x4a3a2a, skin: 0xd1a987 },
    { suit: 0x222a33, accent: 0x445566, skin: 0xb98a64 },
  ];
  def.guards.forEach((gd, i) => game.threats.push(new Guard(game, gd, palettes[i % palettes.length])));
  def.cameras.forEach((cd) => game.threats.push(new SecurityCamera(game, cd)));
  def.drones.forEach((dd) => game.threats.push(new Drone(game, dd)));

  // ---- VIP (rooftop only) ----
  if (def.vip) {
    game.vip = new VIP(game, def.vip);
  }
}

function addSkyline(group) {
  const m = mat('skyline', { color: 0x223043, roughness: 1 });
  const positions = [
    [-30, -20, 18], [-22, -32, 26], [28, -24, 22], [34, 6, 30],
    [-34, 10, 24], [24, 30, 28], [-24, 34, 20], [6, -38, 34], [40, -10, 20],
  ];
  for (const [x, z, h] of positions) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), m);
    b.position.set(x, h / 2 - 6, z);
    group.add(b);
  }
}
