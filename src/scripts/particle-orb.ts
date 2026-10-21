import { isMotionEnabled, onMotionChange } from './motion';

type Particle = { x: number; y: number; z: number; offsetX: number; offsetY: number };
export function createParticles(count = 620): Particle[] {
  const angle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index + .5) * 2 / count;
    const ring = Math.sqrt(1 - y * y);
    return { x: Math.cos(index * angle) * ring, y, z: Math.sin(index * angle) * ring, offsetX: 0, offsetY: 0 };
  });
}

export function initParticleOrb() {
  const stage = document.querySelector<HTMLElement>('[data-orb-stage]');
  const trigger = document.querySelector<HTMLButtonElement>('[data-orb-trigger]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-orb-canvas]');
  if (!stage || !trigger || !canvas) return () => {};
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const ctx = context;
  const particles = createParticles();
  const pointer = { x: 160, y: 160, active: false };
  let frame = 0;
  let lastDraw = -Infinity;
  let elapsed = 0;
  let pulseStart = -Infinity;
  let visible = true;
  let angleX = .23;
  let angleY = 0;
  let scrambleFrame = 0;
  let scrambleStart = 0;
  let lastScramblePaint = -Infinity;
  let lastScramble = -Infinity;
  const name = document.querySelector<HTMLElement>('[data-scramble]');
  const originalName = name?.textContent || 'Pip';

  function resize() {
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas!.width = Math.round(320 * ratio);
    canvas!.height = Math.round(320 * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(0);
  }

  function draw(delta: number) {
    ctx.clearRect(0, 0, 320, 320);
    const targetX = pointer.active ? (pointer.y / 320 - .5) * -.45 : .23;
    angleX += (targetX - angleX) * Math.min(1, delta * 6);
    angleY = elapsed * .19 + (pointer.active ? (pointer.x / 320 - .5) * .35 : 0);
    const sinY = Math.sin(angleY), cosY = Math.cos(angleY);
    const sinX = Math.sin(angleX), cosX = Math.cos(angleX);
    const pulse = Math.max(0, Math.min(1, (elapsed - pulseStart) / 1.15));
    const pulseScale = 1 + Math.sin(pulse * Math.PI) * .19;

    ctx.save();
    ctx.translate(160, 160);
    ctx.rotate(-.48 + Math.sin(elapsed * .15) * .12);
    ctx.strokeStyle = 'rgba(30,30,30,.24)';
    ctx.lineWidth = .65;
    ctx.setLineDash([1.5, 5]);
    ctx.lineDashOffset = -elapsed * 9;
    ctx.beginPath();
    ctx.ellipse(0, 0, 148, 53, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (pulse > 0 && pulse < 1) {
      ctx.strokeStyle = `rgba(25,25,25,${(1 - pulse) * .48})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(160, 160, 25 + pulse * 132, 0, Math.PI * 2); ctx.stroke();
    }

    for (const particle of particles) {
      const x = particle.x * cosY + particle.z * sinY;
      const z1 = particle.z * cosY - particle.x * sinY;
      const y = particle.y * cosX - z1 * sinX;
      const z = particle.y * sinX + z1 * cosX;
      const projection = 3 / (3 - z);
      const px = 160 + x * 103 * projection * pulseScale;
      const py = 160 + y * 103 * projection * pulseScale;
      const dx = px - pointer.x, dy = py - pointer.y;
      const distance = Math.hypot(dx, dy);
      const force = pointer.active && distance < 78 ? (1 - distance / 78) ** 2 * 27 : 0;
      const ease = Math.min(1, delta * 12);
      particle.offsetX += ((distance ? dx / distance * force : 0) - particle.offsetX) * ease;
      particle.offsetY += ((distance ? dy / distance * force : 0) - particle.offsetY) * ease;
      const depth = (z + 1) / 2;
      ctx.fillStyle = `rgba(18,18,18,${.16 + depth * .76})`;
      ctx.beginPath();
      ctx.arc(px + particle.offsetX, py + particle.offsetY, .55 + depth * 1.05, 0, Math.PI * 2);
      ctx.fill();
    }

    const satellite = elapsed * .37;
    ctx.fillStyle = '#252525';
    ctx.beginPath(); ctx.arc(160 + Math.cos(satellite) * 139, 160 + Math.sin(satellite) * 62, 2.4, 0, Math.PI * 2); ctx.fill();
  }

  function canRun() { return isMotionEnabled() && visible && !document.hidden; }
  function animate(time: number) {
    frame = 0;
    if (!canRun()) return;
    const interval = time - lastDraw;
    if (interval >= 1000 / 30) {
      const delta = Number.isFinite(lastDraw) ? Math.min(.06, interval / 1000) : 0;
      lastDraw = time;
      elapsed += delta;
      draw(delta);
    }
    frame = window.requestAnimationFrame(animate);
  }
  function stop() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    lastDraw = -Infinity;
  }
  function start() {
    if (canRun() && !frame) frame = window.requestAnimationFrame(animate);
  }
  function stopScramble() {
    window.cancelAnimationFrame(scrambleFrame);
    scrambleFrame = 0;
    if (name) name.textContent = originalName;
  }
  function paintScramble(time: number) {
    scrambleFrame = 0;
    if (!canRun()) { stopScramble(); return; }
    const progress = Math.min(1, (time - scrambleStart) / 650);
    if (progress === 1) { stopScramble(); return; }
    if (time - lastScramblePaint > 45 && name) {
      lastScramblePaint = time;
      const resolved = Math.floor(progress * originalName.length);
      const symbols = '01/<>_+{}';
      name.textContent = [...originalName].map((letter, index) => index < resolved ? letter : symbols[Math.floor(Math.random() * symbols.length)]).join('');
    }
    scrambleFrame = window.requestAnimationFrame(paintScramble);
  }
  function scramble() {
    const time = performance.now();
    if (!name || !canRun() || time - lastScramble < 900) return;
    lastScramble = time;
    if (!name.style.width) name.style.width = `${name.getBoundingClientRect().width}px`;
    stopScramble();
    scrambleStart = time;
    lastScramblePaint = -Infinity;
    scrambleFrame = window.requestAnimationFrame(paintScramble);
  }
  function pulse() {
    if (!canRun()) return;
    pulseStart = elapsed;
    scramble();
  }
  function movePointer(event: PointerEvent) {
    if (!isMotionEnabled() || event.pointerType !== 'mouse') return;
    const rect = trigger!.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = (event.clientX - rect.left) / rect.width * 320;
    pointer.y = (event.clientY - rect.top) / rect.height * 320;
    pointer.active = true;
  }
  function leavePointer() { pointer.active = false; }
  function updateState() {
    const enabled = isMotionEnabled();
    document.documentElement.dataset.motion = enabled ? 'on' : 'paused';
    trigger!.disabled = !enabled;
    stage!.classList.toggle('is-live', enabled);
    leavePointer();
    if (enabled) start(); else { stop(); stopScramble(); }
  }
  function visibilityChanged() {
    if (canRun()) start(); else { stop(); stopScramble(); leavePointer(); }
  }
  const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    visibilityChanged();
  }, { threshold: .05 }) : undefined;

  trigger.addEventListener('pointermove', movePointer);
  trigger.addEventListener('pointerleave', leavePointer);
  trigger.addEventListener('click', pulse);
  name?.addEventListener('pointerenter', scramble);
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('resize', resize);
  observer?.observe(stage);
  const unsubscribe = onMotionChange(updateState);
  resize();
  updateState();
  scramble();

  return () => {
    stop(); stopScramble(); unsubscribe(); observer?.disconnect();
    trigger.removeEventListener('pointermove', movePointer);
    trigger.removeEventListener('pointerleave', leavePointer);
    trigger.removeEventListener('click', pulse);
    name?.removeEventListener('pointerenter', scramble);
    document.removeEventListener('visibilitychange', visibilityChanged);
    window.removeEventListener('resize', resize);
    if (name) name.style.removeProperty('width');
    stage.classList.remove('is-live');
    trigger.disabled = true;
  };
}

const cleanupOrb = initParticleOrb();
if (import.meta.hot) import.meta.hot.dispose(cleanupOrb);
