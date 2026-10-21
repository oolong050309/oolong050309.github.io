import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceBlob, BLOB_SIZE, chooseSpawn, createFlight, fitPoint, flightPose, limits, PLANE_SIZE } from '../src/lib/companions.ts';

const overlaps = (point, size, rect) => point.x - 12 < rect.right && point.x + size + 12 > rect.left
  && point.y - 12 < rect.bottom && point.y + size + 12 > rect.top;

test('random spawns vary while avoiding page content and the other companion', () => {
  const view = { width: 1440, height: 900 };
  const content = [
    { left: 240, top: 24, right: 1200, bottom: 100 },
    { left: 240, top: 170, right: 800, bottom: 460 },
    { left: 880, top: 150, right: 1200, bottom: 470 },
    { left: 240, top: 570, right: 1200, bottom: 900 },
  ];
  let seed = 42;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const positions = new Set();
  for (let load = 0; load < 30; load++) {
    const blob = chooseSpawn(view, BLOB_SIZE, content, random);
    const obstacles = [...content, { left: blob.x - 12, top: blob.y - 12, right: blob.x + BLOB_SIZE + 12, bottom: blob.y + BLOB_SIZE + 12 }];
    const plane = chooseSpawn(view, PLANE_SIZE, obstacles, random);
    for (const [point, size, excluded] of [[blob, BLOB_SIZE, content], [plane, PLANE_SIZE, obstacles]]) {
      const box = limits(view, size);
      assert.ok(point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom);
      assert.ok(excluded.every(rect => !overlaps(point, size, rect)));
    }
    positions.add(`${blob.x},${blob.y}`);
  }
  assert.equal(positions.size, 30);
});

test('spawn fallback finds whitespace when repeated random candidates are obstructed', () => {
  const content = [{ left: 150, top: 0, right: 700, bottom: 600 }];
  const point = chooseSpawn({ width: 800, height: 600 }, BLOB_SIZE, content, () => .5);
  assert.ok(!overlaps(point, BLOB_SIZE, content[0]));
});

test('fully occupied viewport still yields a finite bounded spawn in a bounded search', () => {
  const view = { width: 800, height: 600 }, box = limits(view, BLOB_SIZE);
  let calls = 0;
  const point = chooseSpawn(view, BLOB_SIZE, [{ left: 0, top: 0, right: 800, bottom: 600 }], () => { calls++; return .5; });
  assert.equal(calls, 160);
  assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  assert.ok(point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom);
});

test('the blob falls, bounces and eventually rests with no residual velocity', () => {
  const view = { width: 1440, height: 900 };
  const blob = { x: 400, y: 100, vx: 420, vy: -300, resting: false };
  const box = limits(view, BLOB_SIZE);
  for (let frame = 0; frame < 1200 && !blob.resting; frame++) {
    advanceBlob(blob, 1 / 60, view);
    assert.ok(blob.x >= box.left && blob.x <= box.right);
    assert.ok(blob.y >= box.top && blob.y <= box.bottom);
  }
  assert.equal(blob.resting, true);
  assert.equal(blob.y, box.bottom);
  assert.equal(blob.vx, 0); assert.equal(blob.vy, 0);
  const atRest = { ...blob };
  advanceBlob(blob, 1, view);
  assert.deepEqual(blob, atRest);
});

test('a click-sized jump rises then returns to the same floor', () => {
  const view = { width: 1280, height: 800 }, floor = limits(view, BLOB_SIZE).bottom;
  const blob = { x: 28, y: floor, vx: 0, vy: -330, resting: false };
  advanceBlob(blob, .04, view);
  assert.ok(blob.y < floor - 5);
  for (let frame = 0; frame < 600 && !blob.resting; frame++) advanceBlob(blob, 1 / 60, view);
  assert.equal(blob.resting, true); assert.equal(blob.y, floor);
});

test('throwing toward screen edges stays bounded, including after window shrink', () => {
  const view = { width: 800, height: 600 };
  for (const vx of [-450, 450]) {
    const blob = { x: vx < 0 ? 13 : 731, y: 13, vx, vy: -650, resting: false };
    for (let frame = 0; frame < 500; frame++) advanceBlob(blob, 1 / 60, view);
    const point = fitPoint(blob, { width: 500, height: 400 }, BLOB_SIZE);
    assert.ok(point.x >= 12 && point.x + BLOB_SIZE < 500);
    assert.ok(point.y >= 12 && point.y + BLOB_SIZE < 400);
  }
});

test('plane flights begin at the clicked position, land exactly, and remain in view', () => {
  for (const view of [{ width: 1440, height: 900 }, { width: 800, height: 600 }]) {
    const start = { x: view.width - 104, y: 180, angle: -6 };
    const flight = createFlight(start, { x: 28, y: view.height * .48 }, view);
    assert.deepEqual({ x: flightPose(flight, 0).x, y: flightPose(flight, 0).y }, { x: start.x, y: start.y });
    assert.deepEqual({ x: flightPose(flight, 1).x, y: flightPose(flight, 1).y }, flight.end);
    const box = limits(view, PLANE_SIZE);
    for (let index = 0; index <= 100; index++) {
      const pose = flightPose(flight, index / 100);
      assert.ok(pose.x >= box.left - .001 && pose.x <= box.right + .001);
      assert.ok(pose.y >= box.top - .001 && pose.y <= box.bottom + .001);
      assert.ok(Number.isFinite(pose.angle));
    }
  }
});

test('redirecting a plane mid-flight preserves its position and limits the turn', () => {
  const view = { width: 1440, height: 900 };
  const first = createFlight({ x: 1200, y: 200, angle: 999 }, { x: 28, y: 400 }, view);
  const current = flightPose(first, .45);
  const redirected = createFlight(current, { x: 1300, y: 200 }, view);
  const begin = flightPose(redirected, 0);
  assert.equal(begin.x, current.x); assert.equal(begin.y, current.y); assert.equal(begin.angle, current.angle);
  assert.ok(Math.abs(flightPose(redirected, 1).angle - current.angle) <= 180.001);
});

test('invalid elapsed time cannot corrupt the blob state', () => {
  const blob = { x: 100, y: 100, vx: 10, vy: 10, resting: false };
  const snapshot = { ...blob };
  for (const delta of [0, -1, NaN, Infinity]) advanceBlob(blob, delta, { width: 800, height: 600 });
  assert.deepEqual(blob, snapshot);
});
