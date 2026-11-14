import test from 'node:test';
import assert from 'node:assert/strict';
import { pageHref } from '../src/lib/navigation.ts';

test('a new deployment navigates to a fresh cache key for every category', () => {
  for (const path of ['/blog/', ...['fundamentals', 'development', 'research', 'notes', 'cs336'].map(slug => `/blog/category/${slug}/`)]) {
    const previous = pageHref(path, 'previous');
    const current = pageHref(path, 'current');
    assert.notEqual(current, previous);
    assert.equal(new URL(current, 'https://example.com').pathname, path);
    assert.equal(new URL(current, 'https://example.com').searchParams.get('v'), 'current');
  }
});

test('version updates preserve navigation parameters and article anchors', () => {
  const link = pageHref('/blog/a-note/?tag=CS336&v=old#comments', 'new');
  const url = new URL(link, 'https://example.com');
  assert.equal(url.searchParams.get('tag'), 'CS336');
  assert.deepEqual(url.searchParams.getAll('v'), ['new']);
  assert.equal(url.hash, '#comments');
  assert.equal(pageHref(link, 'new'), link);
});

test('feeds, downloads, external links, same-page anchors and local development remain unchanged', () => {
  for (const href of ['/rss.xml', '/sitemap-index.xml', '/favicon.svg', '#top', 'https://github.com/', '//github.com/', 'mailto:hello@example.com']) {
    assert.equal(pageHref(href, 'new'), href);
  }
  assert.equal(pageHref('/blog/', ''), '/blog/');
});
