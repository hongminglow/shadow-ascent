// Small math helpers used across the game.

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const lerp = (a, b, t) => a + (b - a) * t;

// Frame-rate independent damping toward a target (0..1 smoothing per second-ish).
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const randRange = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(randRange(min, max + 1));

export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Shortest signed angular difference (radians) from a to b.
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Step `a` toward `b` by at most `maxStep` radians.
export function approachAngle(a, b, maxStep) {
  const d = angleDelta(a, b);
  if (Math.abs(d) <= maxStep) return b;
  return a + Math.sign(d) * maxStep;
}

export const dist2D = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
