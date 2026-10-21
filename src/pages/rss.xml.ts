import type { APIRoute } from 'astro';
import { getPosts } from '../lib/content';
import { site } from '../config/site';

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] ?? char));

export const GET: APIRoute = ({ url }) => {
  const origin = new URL(import.meta.env.SITE || url.origin).origin;
  const items = getPosts().map(post => `<item><title>${escapeXml(post.title)}</title><link>${origin}${post.href}</link><guid>${origin}${post.href}</guid><description>${escapeXml(post.description)}</description><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(site.title)}</title><link>${origin}/</link><description>${escapeXml(site.description)}</description><language>zh-cn</language>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
