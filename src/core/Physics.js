// Lightweight 2D (XZ-plane) collision + line-of-sight against axis-aligned wall boxes.
// Walls are full-height blockers represented as rectangles: { minX, maxX, minZ, maxZ }.

// Resolve a circle (cx, cz, radius) against all wall boxes. Returns corrected {x, z}.
export function resolveCircle(cx, cz, radius, walls) {
  let x = cx;
  let z = cz;
  for (const w of walls) {
    // Closest point on the box to the circle center.
    const nearestX = Math.max(w.minX, Math.min(x, w.maxX));
    const nearestZ = Math.max(w.minZ, Math.min(z, w.maxZ));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    const d2 = dx * dx + dz * dz;

    if (d2 < radius * radius) {
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = (radius - d) / d;
        x += dx * push;
        z += dz * push;
      } else {
        // Center is inside the box — push out along the smallest penetration axis.
        const left = Math.abs(x - w.minX);
        const right = Math.abs(w.maxX - x);
        const top = Math.abs(z - w.minZ);
        const bottom = Math.abs(w.maxZ - z);
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = w.minX - radius;
        else if (m === right) x = w.maxX + radius;
        else if (m === top) z = w.minZ - radius;
        else z = w.maxZ + radius;
      }
    }
  }
  return { x, z };
}

// Does the segment (ax,az)->(bx,bz) intersect the rectangle?
function segIntersectsRect(ax, az, bx, bz, r) {
  // Quick accept: either endpoint inside.
  if (ax >= r.minX && ax <= r.maxX && az >= r.minZ && az <= r.maxZ) return true;
  if (bx >= r.minX && bx <= r.maxX && bz >= r.minZ && bz <= r.maxZ) return true;

  // Test against the four edges of the rectangle.
  return (
    segSeg(ax, az, bx, bz, r.minX, r.minZ, r.maxX, r.minZ) ||
    segSeg(ax, az, bx, bz, r.maxX, r.minZ, r.maxX, r.maxZ) ||
    segSeg(ax, az, bx, bz, r.maxX, r.maxZ, r.minX, r.maxZ) ||
    segSeg(ax, az, bx, bz, r.minX, r.maxZ, r.minX, r.minZ)
  );
}

// Segment-segment intersection test.
function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = cross(dx - cx, dy - cy, ax - cx, ay - cy);
  const d2 = cross(dx - cx, dy - cy, bx - cx, by - cy);
  const d3 = cross(bx - ax, by - ay, cx - ax, cy - ay);
  const d4 = cross(bx - ax, by - ay, dx - ax, dy - ay);
  if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return true;
  return false;
}

const cross = (ax, ay, bx, by) => ax * by - ay * bx;

// True if a clear line exists between the two points (no wall blocks it).
export function hasLineOfSight(ax, az, bx, bz, walls) {
  for (const w of walls) {
    if (segIntersectsRect(ax, az, bx, bz, w)) return false;
  }
  return true;
}
