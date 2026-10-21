import { advanceAsciiGlyph, ASCII_SYMBOLS, createAsciiCloud, createAsciiField, createAsciiPlanet, type AsciiGlyph, type AsciiSample } from '../lib/ascii';
import { isMotionEnabled, onMotionChange } from './motion';

type GlyphGroup = { kind: 'field' | 'cloud' | 'planet'; centerX: number; centerY: number; cell: number; glyphs: AsciiGlyph[] };
type Installation = { left: number; right: number; groups: GlyphGroup[] };

export function initSideAtmosphere() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-side-atmosphere]');
  const shell = document.querySelector<HTMLElement>('.page-shell');
  const context = canvas?.getContext('2d');
  if (!canvas || !shell || !context) return () => {};
  const surface = canvas, page = shell, ctx = context;
  const pointer = { x: 0, y: 0, energy: 0 };
  let installations: Installation[] = [];
  let width = 0, height = 0, elapsed = 0, frame = 0, lastPaint = -Infinity, suspended = false;

  function inMargin(x: number, y: number) {
    return y >= 0 && y <= height && installations.some(side => x >= side.left && x <= side.right);
  }
  function drawGroup(group: GlyphGroup, moving: boolean, delta: number) {
    const field = group.kind === 'field';
    ctx.font = `${(group.cell * (field ? 1.44 : 1.55)).toFixed(2)}px "Cascadia Code", Consolas, "SFMono-Regular", monospace`;
    const phase = group.kind === 'cloud' ? 0 : 2.4;
    const bob = moving && !field ? Math.sin(elapsed * .65 + phase) * 6 : 0;
    const angle = moving && !field ? Math.sin(elapsed * .25 + phase) * .03 : 0;
    const sin = Math.sin(angle), cos = Math.cos(angle);
    for (const glyph of group.glyphs) {
      const sway = moving && field ? Math.sin(elapsed * .24 + glyph.originY * .008 + glyph.seed * 3) * 2.5 : 0;
      glyph.homeX = group.centerX + glyph.originX * cos - glyph.originY * sin + sway;
      glyph.homeY = group.centerY + glyph.originX * sin + glyph.originY * cos + bob;
      if (moving) advanceAsciiGlyph(glyph, delta, pointer);
      else { glyph.x = glyph.homeX; glyph.y = glyph.homeY; glyph.vx = 0; glyph.vy = 0; }
      const drift = Math.hypot(glyph.x - glyph.homeX, glyph.y - glyph.homeY);
      const tick = Math.floor(elapsed * (field ? .9 : 1.7) + glyph.seed * 17);
      const palette = glyph.tone > .55 ? '01/+' : '.+/01';
      const symbol = drift > 10 ? ASCII_SYMBOLS[(tick + Math.floor(glyph.seed * 91)) % ASCII_SYMBOLS.length] : palette[(tick + Math.floor(glyph.seed * 31)) % palette.length];
      const shimmer = field ? .92 + Math.sin(elapsed * .3 + glyph.seed * 9) * .08 : 1;
      const alpha = Math.min(.82, glyph.tone * shimmer + Math.min(drift / 200, .13));
      ctx.fillStyle = `rgba(28,28,28,${alpha.toFixed(3)})`;
      ctx.fillText(symbol, glyph.x, glyph.y);
    }
  }
  function draw(delta = 0) {
    ctx.clearRect(0, 0, width, height);
    const moving = isMotionEnabled();
    pointer.energy = moving ? Math.max(0, pointer.energy - delta * 1.35) : 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const side of installations) {
      ctx.save(); ctx.beginPath();
      // All fragments and displaced glyphs remain outside the reading column.
      ctx.rect(side.left, 0, side.right - side.left, height); ctx.clip();
      side.groups.forEach(group => drawGroup(group, moving, delta));
      ctx.restore();
    }
  }
  function canRun() { return isMotionEnabled() && installations.length > 0 && !document.hidden && !suspended; }
  function stop() { window.cancelAnimationFrame(frame); frame = 0; lastPaint = -Infinity; }
  function animate(time: number) {
    frame = 0;
    if (!canRun()) return;
    const interval = time - lastPaint;
    if (interval >= 1000 / 30) {
      const delta = Number.isFinite(lastPaint) ? Math.min(.06, interval / 1000) : 0;
      lastPaint = time; elapsed += delta; draw(delta);
    }
    frame = window.requestAnimationFrame(animate);
  }
  function start() { if (canRun() && !frame) frame = window.requestAnimationFrame(animate); }
  function makeGroup(samples: AsciiSample[], kind: GlyphGroup['kind'], centerX: number, centerY: number, cell: number): GlyphGroup {
    return { kind, centerX, centerY, cell, glyphs: samples.map(sample => ({
      ...sample, originX: sample.x, originY: sample.y,
      x: centerX + sample.x, y: centerY + sample.y,
      homeX: centerX + sample.x, homeY: centerY + sample.y, vx: 0, vy: 0,
    })) };
  }
  function resize() {
    stop();
    width = document.documentElement.clientWidth || window.innerWidth; height = window.innerHeight;
    const rect = page.getBoundingClientRect();
    const margins = [
      { left: 12, right: rect.left - 24, kind: 'cloud' as const, y: .3 },
      { left: rect.right + 24, right: width - 12, kind: 'planet' as const, y: .68 },
    ];
    installations = margins.filter(margin => margin.right - margin.left >= 64).map((margin, index) => {
      const span = margin.right - margin.left, centerX = (margin.left + margin.right) / 2;
      const cell = Math.max(6.2, Math.min(8.5, span / 24));
      const shapeWidth = Math.min(312, span - 18);
      const samples = margin.kind === 'cloud' ? createAsciiCloud(shapeWidth, cell) : createAsciiPlanet(shapeWidth, cell);
      const centerY = Math.max(100, Math.min(height - 100, height * margin.y));
      // Bound the amount of text on very large monitors while filling the full margin.
      const fieldCell = Math.max(8.8, Math.sqrt(span * height / 4200));
      const shapeTop = Math.min(...samples.map(sample => sample.y)) + centerY - 12;
      const shapeBottom = Math.max(...samples.map(sample => sample.y)) + centerY + 12;
      const shapeLeft = Math.min(...samples.map(sample => sample.x)) - 10;
      const shapeRight = Math.max(...samples.map(sample => sample.x)) + 10;
      const field = createAsciiField(span, height, fieldCell, index).filter(sample =>
        sample.y < shapeTop || sample.y > shapeBottom || sample.x < shapeLeft || sample.x > shapeRight);
      return { left: margin.left, right: margin.right, groups: [
        makeGroup(field, 'field', centerX, 0, fieldCell),
        makeGroup(samples, margin.kind, centerX, centerY, cell),
      ] };
    });
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    pointer.energy = 0; draw(); start();
  }
  function move(event: PointerEvent) {
    pointer.x = event.clientX; pointer.y = event.clientY;
    pointer.energy = isMotionEnabled() && event.pointerType === 'mouse' && inMargin(pointer.x, pointer.y) ? 1 : 0;
  }
  function leave() { pointer.energy = 0; }
  function refresh() { stop(); leave(); draw(); start(); }
  function pageHide() { suspended = true; stop(); leave(); }
  function pageShow() { suspended = false; refresh(); }

  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('blur', leave);
  document.addEventListener('pointerleave', leave);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  const unsubscribe = onMotionChange(refresh);
  resize();

  return () => {
    stop(); unsubscribe();
    window.removeEventListener('pointermove', move);
    window.removeEventListener('blur', leave);
    document.removeEventListener('pointerleave', leave);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('pageshow', pageShow);
    ctx.clearRect(0, 0, width, height);
  };
}

const cleanupAtmosphere = initSideAtmosphere();
if (import.meta.hot) import.meta.hot.dispose(cleanupAtmosphere);
