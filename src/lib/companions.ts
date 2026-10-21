export const BLOB_SIZE = 56;
export const PLANE_SIZE = 48;
export type Viewport = { width: number; height: number };
export type Point = { x: number; y: number };
export type Obstacle = { left: number; top: number; right: number; bottom: number };
export type BlobState = Point & { vx: number; vy: number; resting: boolean };
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function limits(view: Viewport, size: number) {
  return { left: 12, top: 12, right: Math.max(12, view.width - size - 12), bottom: Math.max(12, view.height - size - 24) };
}

export function fitPoint(point: Point, view: Viewport, size: number): Point {
  const box = limits(view, size);
  return { x: clamp(point.x, box.left, box.right), y: clamp(point.y, box.top, box.bottom) };
}

export function chooseSpawn(view: Viewport, size: number, obstacles: Obstacle[], random: () => number = Math.random): Point {
  const box = limits(view, size);
  const overlap = (point: Point) => obstacles.reduce((total, rect) => total
    + Math.max(0, Math.min(point.x + size + 12, rect.right) - Math.max(point.x - 12, rect.left))
    * Math.max(0, Math.min(point.y + size + 12, rect.bottom) - Math.max(point.y - 12, rect.top)), 0);
  let best = { x: box.left, y: box.bottom }, bestOverlap = Infinity;
  const consider = (point: Point) => {
    const amount = overlap(point);
    if (amount < bestOverlap) { best = point; bestOverlap = amount; }
    return amount === 0;
  };
  for (let attempt = 0; attempt < 80; attempt++) {
    const point = { x: box.left + clamp(random(), 0, 1) * (box.right - box.left), y: box.top + clamp(random(), 0, 1) * (box.bottom - box.top) };
    if (consider(point)) return point;
  }
  // A bounded scan also finds narrow patches of whitespace in smaller windows.
  for (let row = 0; row <= 16; row++) for (let column = 0; column <= 16; column++) {
    const point = { x: box.left + column / 16 * (box.right - box.left), y: box.top + row / 16 * (box.bottom - box.top) };
    if (consider(point)) return point;
  }
  return best;
}

export function advanceBlob(blob: BlobState, seconds: number, view: Viewport) {
  if (blob.resting || !Number.isFinite(seconds) || seconds <= 0) return;
  const box = limits(view, BLOB_SIZE);
  const steps = Math.ceil(Math.min(seconds, .05) * 120);
  const dt = Math.min(seconds, .05) / steps;
  for (let index = 0; index < steps; index++) {
    blob.vy += 1450 * dt;
    blob.x += blob.vx * dt;
    blob.y += blob.vy * dt;
    blob.vx *= Math.exp(-2.1 * dt);
    if (blob.x < box.left) { blob.x = box.left; blob.vx = Math.abs(blob.vx) * .4; }
    if (blob.x > box.right) { blob.x = box.right; blob.vx = -Math.abs(blob.vx) * .4; }
    if (blob.y < box.top) { blob.y = box.top; blob.vy = Math.abs(blob.vy) * .3; }
    if (blob.y >= box.bottom) {
      blob.y = box.bottom;
      blob.vy = blob.vy > 70 ? -blob.vy * .36 : 0;
      blob.vx *= Math.exp(-7 * dt);
      if (!blob.vy && Math.abs(blob.vx) < 8) { blob.vx = 0; blob.resting = true; break; }
    }
  }
}

export type Flight = { start: Point; first: Point; second: Point; end: Point; duration: number; startAngle: number };

export function createFlight(start: Point & { angle: number }, destination: Point, view: Viewport): Flight {
  const origin = fitPoint(start, view, PLANE_SIZE);
  const end = fitPoint(destination, view, PLANE_SIZE);
  const dx = end.x - origin.x;
  const arc = Math.min(120, view.height * .16);
  return {
    start: origin, end, startAngle: start.angle,
    first: fitPoint({ x: origin.x + dx * .3, y: origin.y - arc }, view, PLANE_SIZE),
    second: fitPoint({ x: origin.x + dx * .7, y: end.y - arc }, view, PLANE_SIZE),
    duration: clamp(Math.hypot(dx, end.y - origin.y) / 550, 1.1, 2.4),
  };
}

export function flightPose(flight: Flight, progress: number) {
  const t = clamp(Number.isFinite(progress) ? progress : 0, 0, 1), u = 1 - t;
  const { start: a, first: b, second: c, end: d } = flight;
  const x = u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x;
  const y = u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y;
  const dx = 3 * u * u * (b.x - a.x) + 6 * u * t * (c.x - b.x) + 3 * t * t * (d.x - c.x);
  const dy = 3 * u * u * (b.y - a.y) + 6 * u * t * (c.y - b.y) + 3 * t * t * (d.y - c.y);
  const target = Math.atan2(dy, dx) * 180 / Math.PI + 36;
  const turn = ((target - flight.startAngle + 180) % 360 + 360) % 360 - 180;
  return { x, y, angle: flight.startAngle + turn * Math.min(1, t / .16) };
}
