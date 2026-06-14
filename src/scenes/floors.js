// Data-driven floor definitions. Each floor is pure data; Building.js turns it into
// geometry, collision walls, enemies, and pickups. Walls are axis-aligned:
// { x, z, w, d, h } = center + size. The perimeter is generated automatically.
//
// Conventions: player spawns at the south (-Z) and the locked stair door is at the
// north (+Z). Clear every threat to unlock the door to the next floor.

export const FLOORS = [
  // ---------------------------------------------------------------- 1. BASEMENT
  {
    id: 1,
    name: 'B1 — Sublevel Storage',
    objective: 'Neutralize all security, reach the stairwell',
    theme: {
      floor: 0x20242b,
      wall: 0x2c3038,
      accent: 0x3a4150,
      fog: 0x0a0c10,
      fogDensity: 0.035,
      ambient: 0.35,
      hemi: 0.25,
      lights: [
        { x: -6, z: -4, color: 0xffd9a0, intensity: 14 },
        { x: 6, z: 6, color: 0xffd9a0, intensity: 14 },
        { x: 0, z: 10, color: 0xfff2d0, intensity: 10 },
      ],
    },
    bounds: { w: 24, d: 24 },
    spawn: { x: 0, z: -10, angle: 0 },
    stair: { x: 0, z: 11 },
    walls: [
      { x: -7.5, z: 0, w: 9, d: 0.6, h: 3.2 },
      { x: 6, z: 2, w: 0.6, d: 9, h: 3.2 },
      { x: -3, z: 7, w: 7, d: 0.6, h: 3.2 },
    ],
    props: [
      { kind: 'barrel', x: -6, z: -5 },
      { kind: 'barrel', x: -5, z: -5.8 },
      { kind: 'crate', x: 8, z: -6 },
      { kind: 'crate', x: 8.8, z: -5.2 },
      { kind: 'crate', x: -9, z: 6 },
      { kind: 'pillar', x: -6, z: 9 },
      { kind: 'pillar', x: 6, z: 9 },
      { kind: 'barrel', x: 4, z: 8 },
    ],
    guards: [
      { x: -6, z: -3, angle: 0, patrol: [{ x: -6, z: -3 }, { x: -6, z: 4 }, { x: 2, z: 4 }] },
      { x: 3, z: 8, angle: 3.1, patrol: [{ x: 3, z: 8 }, { x: -3, z: 9 }, { x: -3, z: 3 }] },
    ],
    cameras: [{ x: 10, z: -10, angle: -0.78, sweep: 0.7 }],
    drones: [],
    pickups: [
      { type: 'ammo', x: -9, z: -9 },
      { type: 'health', x: 9, z: 9 },
    ],
  },

  // ---------------------------------------------------------------- 2. LOBBY
  {
    id: 2,
    name: 'L1 — Grand Lobby',
    objective: 'Clear the atrium security and ascend',
    theme: {
      floor: 0x3a3d44,
      wall: 0x5a6068,
      accent: 0x8a9099,
      fog: 0x14181f,
      fogDensity: 0.02,
      ambient: 0.5,
      hemi: 0.5,
      lights: [
        { x: 0, z: 0, color: 0xfff4e0, intensity: 18 },
        { x: -8, z: 8, color: 0xcfe0ff, intensity: 12 },
        { x: 8, z: 8, color: 0xcfe0ff, intensity: 12 },
      ],
    },
    bounds: { w: 28, d: 24 },
    spawn: { x: 0, z: -10, angle: 0 },
    stair: { x: 0, z: 11 },
    walls: [
      { x: -10, z: 0, w: 0.6, d: 12, h: 3.4 },
      { x: 10, z: 0, w: 0.6, d: 12, h: 3.4 },
      { x: -5, z: 5, w: 6, d: 0.6, h: 3.4 },
      { x: 5, z: 5, w: 6, d: 0.6, h: 3.4 },
    ],
    props: [
      { kind: 'reception', x: 0, z: 7 },
      { kind: 'sofa', x: -7, z: -5 },
      { kind: 'sofa', x: 7, z: -5, rot: Math.PI },
      { kind: 'plant', x: -11, z: -10 },
      { kind: 'plant', x: 11, z: -10 },
      { kind: 'pillar', x: -6, z: 0 },
      { kind: 'pillar', x: 6, z: 0 },
      { kind: 'pillar', x: -6, z: 9 },
      { kind: 'pillar', x: 6, z: 9 },
    ],
    guards: [
      { x: -7, z: 2, angle: 1.57, patrol: [{ x: -7, z: -3 }, { x: -7, z: 6 }, { x: 0, z: 2 }] },
      { x: 7, z: 2, angle: -1.57, patrol: [{ x: 7, z: -3 }, { x: 7, z: 6 }, { x: 0, z: 3 }] },
      { x: 0, z: -6, angle: 0, patrol: [{ x: -4, z: -7 }, { x: 4, z: -7 }, { x: 0, z: -2 }] },
    ],
    cameras: [
      { x: -12, z: 10, angle: -2.3, sweep: 0.7 },
      { x: 12, z: 10, angle: 2.3, sweep: 0.7 },
    ],
    drones: [],
    pickups: [
      { type: 'ammo', x: -11, z: 9 },
      { type: 'health', x: 11, z: 9 },
      { type: 'ammo', x: 0, z: -10 },
    ],
  },

  // ---------------------------------------------------------------- 3. OFFICES
  {
    id: 3,
    name: 'F3 — Open Offices',
    objective: 'Sweep the cubicle floor of all threats',
    theme: {
      floor: 0x2e3138,
      wall: 0x44505c,
      accent: 0x6a98c0,
      fog: 0x10141a,
      fogDensity: 0.022,
      ambient: 0.45,
      hemi: 0.4,
      lights: [
        { x: -7, z: -6, color: 0xeaf0ff, intensity: 12 },
        { x: 7, z: -6, color: 0xeaf0ff, intensity: 12 },
        { x: -7, z: 7, color: 0xeaf0ff, intensity: 12 },
        { x: 7, z: 7, color: 0xeaf0ff, intensity: 12 },
      ],
    },
    bounds: { w: 28, d: 26 },
    spawn: { x: 0, z: -11, angle: 0 },
    stair: { x: 0, z: 12 },
    walls: [
      // cubicle maze (low-ish full-height partitions with gaps)
      { x: -6, z: -4, w: 0.5, d: 8, h: 2.6 },
      { x: 6, z: -4, w: 0.5, d: 8, h: 2.6 },
      { x: -2, z: -7, w: 8, d: 0.5, h: 2.6 },
      { x: 2, z: 0, w: 8, d: 0.5, h: 2.6 },
      { x: -6, z: 6, w: 0.5, d: 8, h: 2.6 },
      { x: 6, z: 6, w: 0.5, d: 8, h: 2.6 },
      { x: 0, z: 9, w: 6, d: 0.5, h: 2.6 },
    ],
    props: [
      { kind: 'desk', x: -9, z: -6 },
      { kind: 'desk', x: -9, z: 0 },
      { kind: 'desk', x: 9, z: -6 },
      { kind: 'desk', x: 9, z: 2 },
      { kind: 'desk', x: 0, z: -4 },
      { kind: 'desk', x: -3, z: 5 },
      { kind: 'plant', x: 11, z: 11 },
      { kind: 'plant', x: -11, z: 11 },
    ],
    guards: [
      { x: -8, z: -7, angle: 0, patrol: [{ x: -9, z: -8 }, { x: -9, z: 2 }, { x: -2, z: 2 }] },
      { x: 8, z: -7, angle: 0, patrol: [{ x: 9, z: -8 }, { x: 9, z: 4 }, { x: 2, z: 4 }] },
      { x: 0, z: 7, angle: 3.1, patrol: [{ x: -4, z: 8 }, { x: 4, z: 8 }, { x: 0, z: 3 }] },
    ],
    cameras: [{ x: -13, z: 12, angle: -2.2, sweep: 0.8 }],
    drones: [
      { x: 6, z: 8, y: 2.4, patrol: [{ x: 8, z: 8 }, { x: -8, z: 8 }, { x: 0, z: 0 }] },
    ],
    pickups: [
      { type: 'ammo', x: -12, z: -10 },
      { type: 'health', x: 12, z: -10 },
      { type: 'ammo', x: 0, z: 11 },
    ],
  },

  // ---------------------------------------------------------------- 4. SECURITY
  {
    id: 4,
    name: 'F4 — Security Wing',
    objective: 'Knock out the hardened security network',
    theme: {
      floor: 0x1c1f26,
      wall: 0x2a2f38,
      accent: 0xff5050,
      fog: 0x070a0e,
      fogDensity: 0.03,
      ambient: 0.32,
      hemi: 0.25,
      lights: [
        { x: -8, z: -7, color: 0xff8080, intensity: 10 },
        { x: 8, z: -7, color: 0x80a0ff, intensity: 10 },
        { x: 0, z: 4, color: 0xffffff, intensity: 12 },
        { x: 0, z: 11, color: 0xffd0d0, intensity: 10 },
      ],
    },
    bounds: { w: 30, d: 26 },
    spawn: { x: 0, z: -11, angle: 0 },
    stair: { x: 0, z: 12 },
    walls: [
      { x: -8, z: -2, w: 0.6, d: 14, h: 3.4 },
      { x: 8, z: -2, w: 0.6, d: 14, h: 3.4 },
      { x: 0, z: -6, w: 8, d: 0.6, h: 3.4 },
      { x: -4, z: 2, w: 0.6, d: 8, h: 3.4 },
      { x: 4, z: 2, w: 0.6, d: 8, h: 3.4 },
      { x: 0, z: 8, w: 10, d: 0.6, h: 3.4 },
    ],
    props: [
      { kind: 'server', x: -11, z: -6 },
      { kind: 'server', x: -11, z: -2 },
      { kind: 'server', x: 11, z: -6 },
      { kind: 'server', x: 11, z: -2 },
      { kind: 'server', x: -2, z: 4 },
      { kind: 'server', x: 2, z: 4 },
      { kind: 'crate', x: 0, z: -9 },
    ],
    guards: [
      { x: -10, z: -8, angle: 0, patrol: [{ x: -11, z: -9 }, { x: -11, z: 3 }, { x: -5, z: 3 }] },
      { x: 10, z: -8, angle: 0, patrol: [{ x: 11, z: -9 }, { x: 11, z: 3 }, { x: 5, z: 3 }] },
      { x: -2, z: 6, angle: 0, patrol: [{ x: -3, z: 6 }, { x: -3, z: 10 }, { x: 3, z: 10 }] },
      { x: 2, z: 6, angle: 3.1, patrol: [{ x: 3, z: 6 }, { x: 3, z: 10 }, { x: -3, z: 10 }] },
    ],
    cameras: [
      { x: -14, z: 12, angle: -2.2, sweep: 0.9 },
      { x: 14, z: 12, angle: 2.2, sweep: 0.9 },
    ],
    drones: [
      { x: -6, z: 0, y: 2.4, patrol: [{ x: -10, z: 0 }, { x: -10, z: 10 }, { x: 0, z: 6 }] },
      { x: 6, z: 0, y: 2.4, patrol: [{ x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 6 }] },
    ],
    pickups: [
      { type: 'health', x: -13, z: -10 },
      { type: 'ammo', x: 13, z: -10 },
      { type: 'health', x: 0, z: 11 },
      { type: 'ammo', x: -13, z: 11 },
    ],
  },

  // ---------------------------------------------------------------- 5. ROOFTOP
  {
    id: 5,
    name: 'ROOF — Skyline Penthouse',
    objective: 'Retrieve the sniper rifle, then eliminate the target',
    rooftop: true,
    theme: {
      floor: 0x33373f,
      wall: 0x474d57,
      accent: 0xffc14d,
      fog: 0x1a2230,
      fogDensity: 0.012,
      ambient: 0.55,
      hemi: 0.7,
      sky: true,
      lights: [
        { x: 0, z: 0, color: 0xffe6b0, intensity: 14 },
        { x: -10, z: 10, color: 0xbcd0ff, intensity: 10 },
        { x: 10, z: 10, color: 0xbcd0ff, intensity: 10 },
      ],
    },
    bounds: { w: 32, d: 30 },
    spawn: { x: 0, z: -12, angle: 0 },
    stair: null, // final floor — no exit
    walls: [
      { x: -8, z: -6, w: 0.6, d: 8, h: 1.2 }, // low roof parapets / AC units handled as props
      { x: 8, z: -6, w: 0.6, d: 8, h: 1.2 },
      { x: 0, z: 2, w: 10, d: 0.6, h: 1.4 },
    ],
    props: [
      { kind: 'crate', x: -10, z: -8 },
      { kind: 'crate', x: 10, z: -8 },
      { kind: 'pillar', x: -12, z: 12 },
      { kind: 'pillar', x: 12, z: 12 },
      { kind: 'plant', x: -6, z: 6 },
      { kind: 'plant', x: 6, z: 6 },
    ],
    // Sniper pedestal — pick it up to enable the kill.
    sniper: { x: 0, z: -6 },
    guards: [
      { x: -7, z: 6, angle: 1.57, patrol: [{ x: -8, z: 2 }, { x: -8, z: 10 }, { x: -2, z: 8 }] },
      { x: 7, z: 6, angle: -1.57, patrol: [{ x: 8, z: 2 }, { x: 8, z: 10 }, { x: 2, z: 8 }] },
    ],
    cameras: [],
    drones: [],
    pickups: [{ type: 'ammo', x: 0, z: -10 }],
    // The fictional VIP, exposed on the far side of the rooftop.
    vip: {
      x: 0,
      z: 11,
      angle: Math.PI,
      patrol: [{ x: -6, z: 11 }, { x: 6, z: 11 }, { x: 0, z: 8 }],
    },
  },
];
