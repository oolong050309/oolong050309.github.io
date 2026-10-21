import { advanceBlob, BLOB_SIZE, chooseSpawn, clamp, createFlight, fitPoint, flightPose, limits, PLANE_SIZE, type BlobState, type Flight, type Obstacle } from '../lib/companions';
import { isMotionEnabled, onMotionChange } from './motion';

function initCompanions() {
  const rootElement = document.querySelector<HTMLElement>('[data-home-companions]');
  const blobElement = rootElement?.querySelector<HTMLButtonElement>('[data-blob-companion]');
  const planeElement = rootElement?.querySelector<HTMLButtonElement>('[data-paper-plane]');
  const gazeElement = rootElement?.querySelector<SVGGElement>('[data-blob-gaze]');
  const shapeElement = rootElement?.querySelector<HTMLElement>('[data-blob-shape]');
  if (!rootElement || !blobElement || !planeElement || !gazeElement || !shapeElement) return () => {};
  const root = rootElement, blobButton = blobElement, planeButton = planeElement, gaze = gazeElement, shape = shapeElement;
  const viewport = () => ({ width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight });
  let view = viewport();
  const obstacles: Obstacle[] = Array.from(document.querySelectorAll<HTMLElement>('.site-header, .hero-copy, [data-orb-stage], .section-heading, .post-item, .project-link, .now-item, .about-section, .site-footer'))
    .map(element => element.getBoundingClientRect())
    .filter(rect => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < view.width && rect.top < view.height);
  const blob: BlobState = { ...chooseSpawn(view, BLOB_SIZE, obstacles), vx: 0, vy: 0, resting: true };
  let plane = { ...chooseSpawn(view, PLANE_SIZE, [...obstacles, { left: blob.x - 12, top: blob.y - 12, right: blob.x + BLOB_SIZE + 12, bottom: blob.y + BLOB_SIZE + 12 }]), angle: Math.random() * 16 - 8 };
  let flight: { path: Flight; elapsed: number } | null = null;
  let drag: { id: number; offsetX: number; offsetY: number; startX: number; startY: number; lastTime: number; moved: boolean } | null = null;
  let frame = 0, lastTime = 0, ignoreClick = false;
  let mouse = { x: view.width / 2, y: view.height / 2 };
  let squash: Animation | undefined;

  function paint() {
    blobButton.style.transform = 'translate3d(' + blob.x + 'px,' + blob.y + 'px,0)';
    planeButton.style.transform = 'translate3d(' + plane.x + 'px,' + plane.y + 'px,0) rotate(' + plane.angle + 'deg)';
    const dx = mouse.x - blob.x - BLOB_SIZE / 2, dy = mouse.y - blob.y - BLOB_SIZE / 2;
    const distance = Math.max(1, Math.hypot(dx, dy));
    gaze.setAttribute('transform', 'translate(' + (isMotionEnabled() ? dx / distance * 2 : 0) + ' ' + (isMotionEnabled() ? dy / distance * 2 : 0) + ')');
  }
  function schedule() {
    if (!document.hidden && !frame) frame = window.requestAnimationFrame(tick);
  }
  function tick(time: number) {
    frame = 0;
    if (document.hidden) return;
    const dt = lastTime ? Math.min(.04, (time - lastTime) / 1000) : 0;
    lastTime = time;
    if (!drag) advanceBlob(blob, dt, view);
    if (flight) {
      flight.elapsed += dt;
      const progress = Math.min(1, flight.elapsed / flight.path.duration);
      plane = flightPose(flight.path, progress);
      if (progress === 1) { flight = null; planeButton.classList.remove('is-flying'); }
    }
    paint();
    if ((!blob.resting && !drag) || flight) schedule(); else lastTime = 0;
  }
  function settle() {
    window.cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    if (drag) releaseDrag(true);
    blob.y = limits(view, BLOB_SIZE).bottom; blob.vx = 0; blob.vy = 0; blob.resting = true;
    if (flight) plane = flightPose(flight.path, 1);
    flight = null; planeButton.classList.remove('is-flying'); squash?.cancel(); paint();
  }
  function bounce(event: MouseEvent) {
    if (ignoreClick && event.detail !== 0) { ignoreClick = false; return; }
    squash?.cancel();
    if (!isMotionEnabled()) { blobButton.classList.toggle('is-curious'); return; }
    blob.vy = -330; blob.vx *= .3; blob.resting = false;
    if (typeof shape.animate === 'function') squash = shape.animate([
      { transform: 'scale(1.14,.82)' }, { transform: 'scale(.94,1.08)', offset: .4 }, { transform: 'scale(1)' },
    ], { duration: 420, easing: 'ease-out' });
    schedule();
  }
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || drag) return;
    ignoreClick = false; squash?.cancel();
    drag = { id: event.pointerId, offsetX: event.clientX - blob.x, offsetY: event.clientY - blob.y, startX: event.clientX, startY: event.clientY, lastTime: performance.now(), moved: false };
    blob.vx = 0; blob.vy = 0; blob.resting = true;
    blobButton.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent) {
    mouse = { x: event.clientX, y: event.clientY };
    if (drag && event.pointerId === drag.id) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
      if (drag.moved) {
        const point = fitPoint({ x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY }, view, BLOB_SIZE);
        const time = performance.now(), dt = Math.max(.008, (time - drag.lastTime) / 1000);
        blob.vx = clamp(blob.vx * .4 + (point.x - blob.x) / dt * .6, -450, 450);
        blob.vy = clamp(blob.vy * .4 + (point.y - blob.y) / dt * .6, -650, 650);
        blob.x = point.x; blob.y = point.y; drag.lastTime = time;
        blobButton.classList.add('is-dragging');
        blobButton.style.setProperty('--blob-tilt', clamp(blob.vx / 60, -8, 8) + 'deg');
      }
    }
    schedule();
  }
  function releaseDrag(cancelled = false) {
    if (!drag) return;
    const ended = drag; drag = null;
    blobButton.classList.remove('is-dragging'); blobButton.style.removeProperty('--blob-tilt');
    if (blobButton.hasPointerCapture(ended.id)) blobButton.releasePointerCapture(ended.id);
    ignoreClick = ended.moved || cancelled;
    if (ended.moved || cancelled) {
      if (isMotionEnabled() && !cancelled) { blob.resting = false; schedule(); }
      else { blob.y = limits(view, BLOB_SIZE).bottom; blob.vx = 0; blob.vy = 0; blob.resting = true; paint(); }
    }
  }
  function pointerUp(event: PointerEvent) { if (drag?.id === event.pointerId) releaseDrag(); }
  function pointerCancel(event: PointerEvent) { if (drag?.id === event.pointerId) releaseDrag(true); }
  function fly() {
    const destination = { x: plane.x > view.width / 2 ? 28 : view.width - 104, y: plane.y > view.height * .35 ? view.height * .24 : view.height * .48 };
    const path = createFlight(plane, destination, view);
    if (!isMotionEnabled()) { plane = flightPose(path, 1); paint(); return; }
    flight = { path, elapsed: 0 }; planeButton.classList.add('is-flying'); schedule();
  }
  function resize() {
    const previous = view; view = viewport();
    settle();
    Object.assign(blob, fitPoint(blob, view, BLOB_SIZE));
    plane = { ...fitPoint({ x: plane.x / previous.width * view.width, y: plane.y / previous.height * view.height }, view, PLANE_SIZE), angle: plane.angle };
    paint();
  }
  function visibilityChanged() {
    root.classList.toggle('is-hidden', document.hidden);
    if (document.hidden) settle();
  }
  function motionChanged() { if (!isMotionEnabled()) settle(); else paint(); }
  const unsubscribe = onMotionChange(motionChanged);
  blobButton.addEventListener('pointerdown', pointerDown);
  blobButton.addEventListener('pointerup', pointerUp);
  blobButton.addEventListener('pointercancel', pointerCancel);
  blobButton.addEventListener('lostpointercapture', pointerCancel);
  blobButton.addEventListener('click', bounce);
  planeButton.addEventListener('click', fly);
  window.addEventListener('pointermove', pointerMove);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', settle);
  document.addEventListener('visibilitychange', visibilityChanged);
  paint(); root.classList.add('is-positioned');
  return () => {
    settle(); unsubscribe();
    blobButton.removeEventListener('pointerdown', pointerDown);
    blobButton.removeEventListener('pointerup', pointerUp);
    blobButton.removeEventListener('pointercancel', pointerCancel);
    blobButton.removeEventListener('lostpointercapture', pointerCancel);
    blobButton.removeEventListener('click', bounce);
    planeButton.removeEventListener('click', fly);
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('resize', resize);
    window.removeEventListener('blur', settle);
    document.removeEventListener('visibilitychange', visibilityChanged);
  };
}

const cleanup = initCompanions();
if (import.meta.hot) import.meta.hot.dispose(cleanup);
