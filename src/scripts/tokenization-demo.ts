import { setupTokenizationAnimation } from './tokenization-animation.js';

export { setupTokenizationAnimation as setupTokenizationDemo };

document.querySelectorAll<HTMLElement>('[data-tokenization-demo]').forEach(setupTokenizationAnimation);
