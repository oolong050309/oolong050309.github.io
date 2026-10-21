export const ASCII_SYMBOLS = '01/+.';
export type AsciiSample = { x: number; y: number; tone: number; seed: number };
export type AsciiGlyph = AsciiSample & { originX: number; originY: number; homeX: number; homeY: number; vx: number; vy: number };
export type AsciiPointer = { x: number; y: number; energy: number };

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const seedAt = (column: number, row: number) => ((column * 73 + row * 157 + column * row * 19) % 997) / 997;

export function createAsciiField(width: number, height: number, cell: number, side = 0): AsciiSample[] {
  const columns = Math.max(4, Math.floor((width - 8) / cell));
  const rows = Math.max(2, Math.ceil(height / (cell * 1.65)));
  const samples: AsciiSample[] = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const x = (column - (columns - 1) / 2) * cell;
    const y = (row + .5) * cell * 1.65;
    if (y >= height - 3) continue;
    const seed = seedAt(column + side * 41, row + 13);
    const block = seedAt(Math.floor(column / 8) + side * 23, Math.floor(row / 7) + 7);
    const localX = column % 8, localY = row % 7;
    const fragmentWidth = 3 + Math.floor(block * 4), fragmentHeight = 2 + Math.floor(block * 3);
    const offsetX = Math.floor(block * 13) % 2, offsetY = Math.floor(block * 19) % 3;
    const fx = localX - offsetX, fy = localY - offsetY;
    const inside = fx >= 0 && fy >= 0 && fx < fragmentWidth && fy < fragmentHeight;
    const mode = Math.floor(block * 31) % 3;
    const fragment = inside && (mode === 0 ? fx <= fy * 1.5 + 1 : mode === 1 ? (fx + fy) % 4 !== 0 : Math.abs(fx - fy * 1.2) < 1.9);
    const t = y / height;
    const ribbonA = Math.sin(t * 7 + side * 2) * width * .18 - width * .2;
    const ribbonB = Math.cos(t * 5.5 + side + .7) * width * .16 + width * .22;
    const ribbon = Math.min(Math.abs(x - ribbonA), Math.abs(x - ribbonB)) < cell * 1.15 && seed > .12;
    if (!fragment && !ribbon && seed < .9) continue;
    samples.push({ x, y, tone: ribbon ? .25 + seed * .17 : fragment ? .17 + seed * .18 : .12 + seed * .08, seed });
  }
  return samples;
}

export function createAsciiCloud(width: number, cell: number): AsciiSample[] {
  const columns = Math.max(11, Math.floor(width / cell));
  const rows = Math.max(7, Math.round(columns * .34));
  const samples: AsciiSample[] = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const u = -1.25 + column / (columns - 1) * 2.5;
    const v = -.8 + row / (rows - 1) * 1.35;
    const field = Math.min(
      ((u + .13) / .56) ** 2 + ((v + .13) / .57) ** 2,
      ((u + .65) / .51) ** 2 + ((v - .02) / .34) ** 2,
      ((u - .55) / .61) ** 2 + (v / .4) ** 2,
      Math.max(Math.abs(u) / .82, Math.abs(v - .15) / .22),
    );
    if (field > 1 || v > .37) continue;
    const seed = seedAt(column, row);
    // Sparse interior cells keep the cloud light while preserving its silhouette.
    if (field < .58 && seed < .16) continue;
    samples.push({ x: (column - (columns - 1) / 2) * cell, y: (row - (rows - 1) / 2) * cell * 1.55, tone: .3 + clamp(field, 0, 1) * .38, seed });
  }
  return samples;
}

export function createAsciiPlanet(width: number, cell: number): AsciiSample[] {
  const columns = Math.max(11, Math.floor(width / cell));
  const rows = Math.max(7, Math.ceil(columns * .58));
  const radius = width * .29, ringX = width * .48, ringY = width * .135;
  const tilt = -.38, sin = Math.sin(tilt), cos = Math.cos(tilt);
  const samples: AsciiSample[] = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const x = (column - (columns - 1) / 2) * cell;
    const y = (row - (rows - 1) / 2) * cell * 1.55;
    const disk = (x * x + y * y) / (radius * radius);
    const rx = x * cos + y * sin, ry = -x * sin + y * cos;
    const angle = Math.atan2(ry / ringY, rx / ringX);
    const nearRing = Math.hypot(rx - ringX * Math.cos(angle), ry - ringY * Math.sin(angle)) < cell * .63;
    const seed = seedAt(column, row);
    if (disk <= 1) {
      const depth = Math.sqrt(1 - disk);
      const light = clamp(.55 + x / radius * .24 - y / radius * .13, .12, .9);
      samples.push({ x, y, tone: nearRing && ry > 0 ? .75 : .24 + depth * light * .55, seed });
    } else if (nearRing) {
      samples.push({ x, y, tone: ry > 0 ? .69 : .36, seed });
    }
  }
  return samples;
}

export function advanceAsciiGlyph(glyph: AsciiGlyph, seconds: number, pointer: AsciiPointer) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const steps = Math.ceil(Math.min(.06, seconds) * 120), dt = Math.min(.06, seconds) / steps;
  for (let step = 0; step < steps; step++) {
    let ax = (glyph.homeX - glyph.x) * 34 - glyph.vx * 8.5;
    let ay = (glyph.homeY - glyph.y) * 34 - glyph.vy * 8.5;
    const dx = glyph.x - pointer.x, dy = glyph.y - pointer.y, distance = Math.hypot(dx, dy);
    if (pointer.energy > 0 && distance < 98) {
      const angle = distance > .01 ? Math.atan2(dy, dx) : glyph.seed * Math.PI * 2;
      const force = (1 - distance / 98) ** 2 * 5200 * pointer.energy;
      ax += Math.cos(angle) * force; ay += Math.sin(angle) * force;
    }
    glyph.vx += ax * dt; glyph.vy += ay * dt;
    glyph.x += glyph.vx * dt; glyph.y += glyph.vy * dt;
  }
}
