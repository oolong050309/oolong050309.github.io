// GitHub Pages caches HTML for ten minutes. Keep navigation on the current
// deployment while canonical URLs, feeds and comment mappings stay stable.
export const siteRevision = (import.meta.env?.PUBLIC_SITE_REVISION || '').slice(0, 12);

export function pageHref(href: string, revision = siteRevision): string {
  if (!revision || !href.startsWith('/') || href.startsWith('//')) return href;
  const url = new URL(href, 'https://navigation.invalid');
  if (!url.pathname.endsWith('/')) return href;
  url.searchParams.set('v', revision);
  return `${url.pathname}${url.search}${url.hash}`;
}
