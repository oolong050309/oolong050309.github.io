import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('dist');
const origin = 'https://oolong050309.github.io';
const revision = (process.env.PUBLIC_SITE_REVISION || '').slice(0, 12);
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
for (const route of ['/', '/blog/', '/projects/', '/now/', '/about/', ...['fundamentals', 'development', 'research', 'notes', 'cs336'].map(slug => `/blog/category/${slug}/`)]) {
  assert.ok(pages.has(route), `missing page: ${route}`);
}
let links = 0;
let commentPages = 0;
for (const [route, { html }] of pages) {
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  assert.equal(canonical?.[1], new URL(route, origin).href, `wrong canonical URL on ${route}`);
  if (revision) {
    assert.ok(html.includes(`<meta name="site-revision" content="${revision}">`), `wrong deployment version on ${route}`);
    // Check native navigation links, including use without JavaScript.
    for (const nav of html.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/g)) {
      for (const link of nav[1].matchAll(/\bhref="([^\"]+)"/g)) {
        if (!link[1].startsWith('/') || link[1].startsWith('//')) continue;
        const target = new URL(link[1].replaceAll('&amp;', '&'), origin);
        assert.equal(target.searchParams.get('v'), revision, `stale navigation link ${target.href} on ${route}`);
      }
    }
    const searchData = html.match(/<script\b[^>]*id="search-data"[^>]*>([^<]*)<\/script>/);
    for (const post of JSON.parse(searchData?.[1] || '[]')) {
      assert.equal(new URL(post.href, origin).searchParams.get('v'), revision, `stale search result on ${route}`);
    }
  }
  assert.ok(!/\bnoindex\b/i.test(html), `production indexing is disabled on ${route}`);
  assert.ok(!/https?:\/\/(localhost|127\.0\.0\.1)(?:[:/]|\b)/i.test(html), `local URL published on ${route}`);
  const article = /^\/blog\/[^/]+\/$/.test(route);
  const widgets = [...html.matchAll(/<giscus-widget\b[^>]*>/g)];
  assert.equal(widgets.length, article ? 1 : 0, `wrong number of comment widgets on ${route}`);
  if (article) {
    const widget = widgets[0][0];
    const translationOf = html.match(/data-translation-of="([^"]+)"/)?.[1];
    assert.ok(widget.includes('repo="oolong050309/oolong050309.github.io"'), `wrong comment repository on ${route}`);
    assert.match(widget, /repoid="R_[^"]+"/, `missing comment repository ID on ${route}`);
    assert.match(widget, /categoryid="DIC_[^"]+"/, `missing discussion category ID on ${route}`);
    assert.ok(widget.includes('strict="1"'), `non-strict comment mapping on ${route}`);
    if (translationOf) {
      assert.ok(widget.includes('mapping="specific"') && widget.includes(`term="/blog/${translationOf}/"`), `translation must share the original discussion on ${route}`);
      assert.ok(pages.has(`/blog/${translationOf}/`), `missing original article on ${route}`);
    } else {
      assert.ok(widget.includes('mapping="pathname"'), `unstable comment mapping on ${route}`);
    }
    assert.ok(widget.includes('reactionsenabled="1"'), `article reactions disabled on ${route}`);
    const backlink = html.match(/<meta\b[^>]*name="giscus:backlink"[^>]*content="([^"]+)"/);
    assert.equal(backlink?.[1], new URL(route, origin).href, `wrong discussion backlink on ${route}`);
    const language = html.match(/<html\b[^>]*lang="([^"]+)"/)?.[1];
    assert.ok(language === 'zh-CN' || language === 'en', `missing article language on ${route}`);
    assert.ok(widget.includes(`lang="${language}"`), `wrong discussion language on ${route}`);
    for (const alternate of html.matchAll(/<link\b[^>]*rel="alternate"[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)) {
      const target = new URL(alternate[2]);
      const translated = pages.get(target.pathname);
      assert.equal(target.origin, origin, `external article translation on ${route}`);
      assert.ok(translated, `missing article translation on ${route}`);
      assert.ok(translated.html.includes(`<html lang="${alternate[1]}"`), `wrong translated page language on ${route}`);
      assert.ok(translated.html.includes(`hreflang="${language}" href="${origin}${route}"`), `translation must link back to ${route}`);
    }
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
const articleURLs = [...pages.entries()].filter(([route, { html }]) => /^\/blog\/[^/]+\/$/.test(route) && !html.includes('data-translation-of=')).map(([route]) => new URL(route, origin).href);
assert.deepEqual([...feedLinks].sort(), [`${origin}/`, ...articleURLs.flatMap(href => [href, href])].sort(), 'RSS must contain exactly the published articles, including an empty feed when there are none');
for (const href of feedLinks) {
  const target = new URL(href);
  assert.equal(target.origin, origin, 'RSS must use the published domain');
  assert.ok(pages.has(target.pathname), `RSS links to a missing page: ${href}`);
}
const sitemapIndex = await readFile(path.join(output, 'sitemap-index.xml'), 'utf8');
assert.match(sitemapIndex, /<sitemapindex\b/, 'missing sitemap index');
const sitemapFiles = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.ok(sitemapFiles.length > 0, 'sitemap index must contain a sitemap');
const sitemapURLs = new Set();
for (const href of sitemapFiles) {
  const target = new URL(href);
  assert.equal(target.origin, origin, 'sitemap index must use the published domain');
  const sitemap = await readFile(path.join(output, decodeURIComponent(target.pathname)), 'utf8');
  assert.match(sitemap, /<urlset\b/, `invalid sitemap: ${href}`);
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const pageURL = match[1].replaceAll('&amp;', '&');
    assert.ok(!sitemapURLs.has(pageURL), `duplicate sitemap URL: ${pageURL}`);
    sitemapURLs.add(pageURL);
  }
}
const expectedURLs = [...pages.keys()].map(route => new URL(route, origin).href);
assert.deepEqual([...sitemapURLs].sort(), expectedURLs.sort(), 'sitemap must include exactly the published pages');
const robots = await readFile(path.join(output, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Allow: /'));
assert.ok(robots.split(/\r?\n/).includes(`Sitemap: ${origin}/sitemap-index.xml`), 'robots.txt must advertise the sitemap');
console.log(`PASS: ${pages.size} production pages, ${links} local resources/anchors, ${commentPages} article comment widgets, ${sitemapURLs.size} sitemap URLs, canonical URLs, RSS links and crawler access.`);
