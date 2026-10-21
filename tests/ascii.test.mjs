import test from 'node:test';
import assert from 'node:assert/strict';
import { createAsciiCloud, createAsciiField, createAsciiPlanet, advanceAsciiGlyph } from '../src/lib/ascii.ts';

test('the ASCII field fills both margins across their full width and height at a bounded density', () => {
  for (const width of [84, 124, 284, 444, 1400]) for (const height of [600, 900, 1400]) for (const side of [0, 1]) {
    const cell = Math.max(8.8, Math.sqrt(width * height / 4200));
    const samples = createAsciiField(width, height, cell, side);
    const gridSize = Math.floor((width - 8) / cell) * Math.ceil(height / (cell * 1.65));
    assert.ok(samples.length > gridSize * .2 && samples.length < gridSize * .9);
    assert.ok(samples.length < 2400, 'very large monitors must not produce unbounded rendering work');
    for (const point of samples) {
      assert.ok(Object.values(point).every(Number.isFinite));
      assert.ok(Math.abs(point.x) < width / 2 && point.y > 0 && point.y < height);
    }
    for (let section = 0; section < 10; section++) {
      assert.ok(samples.some(point => Math.floor(point.y / height * 10) === section), 'every vertical section must have fragments');
    }
    for (let section = 0; section < 3; section++) {
      assert.ok(samples.some(point => Math.floor((point.x / width + .5) * 3) === section), 'fragments must span the whole margin');
    }
  }
});

test('cloud and planet samples remain finite, legible and bounded at desktop margin sizes', () => {
  for (const width of [90, 150, 258, 282, 312]) {
    const cell = Math.max(6.2, Math.min(8.5, (width + 18) / 24));
    for (const create of [createAsciiCloud, createAsciiPlanet]) {
      const samples = create(width, cell);
      assert.ok(samples.length > 20 && samples.length < 600);
      assert.ok(new Set(samples.map(sample => sample.y)).size >= 4);
      for (const sample of samples) {
        assert.ok(Object.values(sample).every(Number.isFinite));
        assert.ok(Math.abs(sample.x) <= width / 2);
        assert.ok(sample.tone > 0 && sample.tone <= 1);
      }
    }
    const planet = createAsciiPlanet(width, cell);
    assert.ok(planet.some(sample => sample.x < -width * .33), 'the ring must extend beyond the body on the left');
    assert.ok(planet.some(sample => sample.x > width * .33), 'the ring must extend beyond the body on the right');
  }
});

const glyph = () => ({ x: 100, y: 100, originX: 0, originY: 0, homeX: 100, homeY: 100, vx: 0, vy: 0, tone: .5, seed: .7 });
test('hover scatters a glyph, including a cursor directly over its center, then the spring reconstructs it', () => {
  for (const pointer of [{ x: 100, y: 100, energy: 1 }, { x: 96, y: 100, energy: 1 }]) {
    const point = glyph();
    for (let frame = 0; frame < 15; frame++) advanceAsciiGlyph(point, 1 / 30, pointer);
    assert.ok(Math.hypot(point.x - 100, point.y - 100) > 12);
    for (let frame = 0; frame < 180; frame++) advanceAsciiGlyph(point, 1 / 30, { ...pointer, energy: 0 });
    assert.ok(Math.hypot(point.x - 100, point.y - 100) < .001);
    assert.ok(Math.hypot(point.vx, point.vy) < .001);
  }
});

test('repeated scatter and frame stalls do not destabilize the glyphs', () => {
  const point = glyph();
  for (let frame = 0; frame < 1500; frame++) {
    advanceAsciiGlyph(point, frame % 50 === 0 ? 10 : 1 / 30, { x: 100 + Math.sin(frame) * 30, y: 100, energy: 1 });
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(Math.hypot(point.x - 100, point.y - 100) < 160);
  }
  const before = { ...point };
  for (const time of [0, -1, NaN, Infinity]) advanceAsciiGlyph(point, time, { x: 100, y: 100, energy: 1 });
  assert.deepEqual(point, before);
});
