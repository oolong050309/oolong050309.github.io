import { isMotionEnabled, onMotionChange } from './motion';
const revealed = new WeakSet<Element>();

// Progress updates share a single frame and do not run while the page is idle.
const progress = document.querySelector<HTMLElement>('[data-reading-progress]');
let progressFrame = 0;
function updateProgress() {
  progressFrame = 0;
  if (!progress) return;
  const range = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const value = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
  progress.hidden = range === 0;
  progress.style.transform = `scaleX(${value})`;
}
function scheduleProgress() {
  if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress);
}
window.addEventListener('scroll', scheduleProgress, { passive: true });
window.addEventListener('resize', scheduleProgress);
window.addEventListener('pageshow', scheduleProgress);
const sizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleProgress) : undefined;
sizeObserver?.observe(document.documentElement);
updateProgress();

function setupMotion() {
  if (!isMotionEnabled()) return () => {};

  const animations = new Set<Animation>();
  // Content is visible in the stylesheet. Missing JS or observer support never hides it.
  const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target as HTMLElement;
      observer?.unobserve(element);
      if (revealed.has(element) || element.contains(document.activeElement) || typeof element.animate !== 'function') return;
      revealed.add(element);
      const requestedDelay = Number(element.dataset.revealDelay || 0);
      const delay = Number.isFinite(requestedDelay) ? Math.min(160, Math.max(0, requestedDelay)) : 0;
      const animation = element.animate([
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 650, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
      animations.add(animation);
      const finished = () => animations.delete(animation);
      animation.finished.then(finished, finished);
    });
  }, { threshold: .12, rootMargin: '0px 0px -24px 0px' }) : undefined;
  document.querySelectorAll('[data-reveal]').forEach(element => {
    if (!revealed.has(element)) observer?.observe(element);
  });

  return () => {
    observer?.disconnect();
    animations.forEach(animation => animation.cancel());
    animations.clear();
  };
}

let cleanupMotion = setupMotion();
function refreshMotionPreference() {
  cleanupMotion();
  cleanupMotion = setupMotion();
}
const unsubscribeMotion = onMotionChange(refreshMotionPreference);

if (import.meta.hot) import.meta.hot.dispose(() => {
  cleanupMotion();
  sizeObserver?.disconnect();
  window.cancelAnimationFrame(progressFrame);
  window.removeEventListener('scroll', scheduleProgress);
  window.removeEventListener('resize', scheduleProgress);
  window.removeEventListener('pageshow', scheduleProgress);
  unsubscribeMotion();
});
