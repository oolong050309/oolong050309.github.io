import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('dist');
const origin = 'https://oolong050309.github.io';
const pages = new Map();
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else if (entry.name.endsWith('.html')) {
      const relative = path.relative(output, path.dirname(file)).split(path.sep).filter(Boolean).join('/');
      const route = relative ? `/${relative}/` : '/';
      const html = await readFile(file, 'utf8');
      pages.set(route, { html, ids: new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])) });
    }
  }
}
await collect(output);
assert.ok(pages.size > 0, 'build the site before verifying it');
for (const route of ['/', '/blog/', '/projects/', '/now/', '/about/', '/blog/cnn-explained/']) {
  assert.ok(pages.has(route), `missing page: ${route}`);
}
let links = 0;
let commentPages = 0;
for (const [route, { html }] of pages) {
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  assert.equal(canonical?.[1], new URL(route, origin).href, `wrong canonical URL on ${route}`);
  assert.ok(!/\bnoindex\b/i.test(html), `production indexing is disabled on ${route}`);
  assert.ok(!/https?:\/\/(localhost|127\.0\.0\.1)(?:[:/]|\b)/i.test(html), `local URL published on ${route}`);
  const article = /^\/blog\/[^/]+\/$/.test(route);
  const widgets = [...html.matchAll(/<giscus-widget\b[^>]*>/g)];
  assert.equal(widgets.length, article ? 1 : 0, `wrong number of comment widgets on ${route}`);
  if (article) {
    const widget = widgets[0][0];
    assert.ok(widget.includes('repo="oolong050309/oolong050309.github.io"'), `wrong comment repository on ${route}`);
    assert.match(widget, /repoid="R_[^"]+"/, `missing comment repository ID on ${route}`);
    assert.match(widget, /categoryid="DIC_[^"]+"/, `missing discussion category ID on ${route}`);
    assert.ok(widget.includes('mapping="pathname"') && widget.includes('strict="1"'), `unstable comment mapping on ${route}`);
    assert.ok(widget.includes('reactionsenabled="1"'), `article reactions disabled on ${route}`);
    const backlink = html.match(/<meta\b[^>]*name="giscus:backlink"[^>]*content="([^"]+)"/);
    assert.equal(backlink?.[1], new URL(route, origin).href, `wrong discussion backlink on ${route}`);
    commentPages++;
  }
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const target = new URL(match[1].replaceAll('&amp;', '&'), `${origin}${route}`);
    if (target.origin !== origin) continue;
    const pathname = decodeURIComponent(target.pathname);
    const destination = pages.get(pathname);
    if (destination && target.hash) {
      assert.ok(destination.ids.has(decodeURIComponent(target.hash.slice(1))), `broken anchor ${target.href}`);
    } else if (!destination) {
      await access(path.join(output, pathname));
    }
    links++;
  }
}
const rss = await readFile(path.join(output, 'rss.xml'), 'utf8');
const feedLinks = [...rss.matchAll(/<(?:link|guid)>([^<]+)<\/(?:link|guid)>/g)].map(match => match[1]);
assert.ok(feedLinks.length > 1, 'RSS must contain article links');
for (const href of feedLinks) {
  const target = new URL(href);
  assert.equal(target.origin, origin, 'RSS must use the published domain');
  assert.ok(pages.has(target.pathname), `RSS links to a missing page: ${href}`);
}
assert.ok((await readFile(path.join(output, 'robots.txt'), 'utf8')).includes('Allow: /'));
console.log(`PASS: ${pages.size} production pages, ${links} local resources/anchors, ${commentPages} article comment widgets, canonical URLs, RSS links and crawler access.`);
