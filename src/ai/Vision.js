import { hasLineOfSight } from '../core/Physics.js';

// Determines whether an observer can see a target on the XZ plane.
// observer: { x, z, angle }  (angle: heading, forward = (sin a, cos a))
// opts: { range, fovDeg }
// crouchFactor (<=1) shrinks effective range when the player is crouching.
// Returns { seen, dist } so callers can scale reaction by distance.
export function canSee(observer, target, opts, walls, crouchFactor = 1) {
  const dx = target.x - observer.x;
  const dz = target.z - observer.z;
  const dist = Math.hypot(dx, dz);

  const effRange = opts.range * crouchFactor;
  if (dist > effRange || dist < 0.001) return { seen: false, dist };

  // Angle between observer forward and the direction to target.
  const fwdX = Math.sin(observer.angle);
  const fwdZ = Math.cos(observer.angle);
  const dot = (dx * fwdX + dz * fwdZ) / dist;
  const cosHalfFov = Math.cos((opts.fovDeg * Math.PI) / 180 / 2);
  if (dot < cosHalfFov) return { seen: false, dist };

  // Line of sight not blocked by walls.
  if (!hasLineOfSight(observer.x, observer.z, target.x, target.z, walls)) {
    return { seen: false, dist };
  }
  return { seen: true, dist };
}
