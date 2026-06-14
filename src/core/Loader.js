import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Optional asset-override pipeline. By default the game is 100% procedural and needs
// no files. If you later drop real models into /public/models and register them here,
// the rest of the game can call loadOverride('guard') to use them instead — no other
// code changes required.

const OVERRIDES = {
  // guard: 'models/guard.glb',
  // vip: 'models/vip.glb',
  // drone: 'models/drone.glb',
};

const loader = new GLTFLoader();
const cache = new Map();

export function hasOverride(key) {
  return Boolean(OVERRIDES[key]);
}

export function loadOverride(key) {
  if (!OVERRIDES[key]) return Promise.resolve(null);
  if (cache.has(key)) return Promise.resolve(cache.get(key).clone());
  return new Promise((resolve) => {
    loader.load(
      OVERRIDES[key],
      (gltf) => {
        cache.set(key, gltf.scene);
        resolve(gltf.scene.clone());
      },
      undefined,
      () => resolve(null) // fall back to procedural on any error
    );
  });
}
