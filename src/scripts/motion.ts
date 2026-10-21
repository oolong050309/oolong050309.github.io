export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribers = new Set<() => void>();
export function isMotionEnabled() {
  return !reduceMotion.matches;
}

function notify() {
  document.documentElement.dataset.motion = isMotionEnabled() ? 'on' : 'paused';
  subscribers.forEach(callback => callback());
}

export function onMotionChange(callback: () => void) {
  subscribers.add(callback);
  return () => { subscribers.delete(callback); };
}

reduceMotion.addEventListener('change', notify);
notify();

if (import.meta.hot) import.meta.hot.dispose(() => {
  reduceMotion.removeEventListener('change', notify);
  subscribers.clear();
});
