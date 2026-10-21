import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://oolong050309.github.io',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { output: 'htmlAndMathml', strict: 'error' }]],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
