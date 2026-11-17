import type { APIRoute } from 'astro';
import { getAllPosts } from '../lib/content';
import { pageHref, siteRevision } from '../lib/navigation';
import { extractSearchText } from '../lib/search-content';
import { tokenizationTrace } from '../lib/tokenization-demo';

export const GET: APIRoute = async () => {
  const posts = await Promise.all(getAllPosts().map(async post => ({
    title: post.title,
    description: post.description,
    category: post.category,
    subcategory: post.subcategory,
    topic: post.topic,
    tags: post.tags,
    href: pageHref(post.href),
    searchText: [
      extractSearchText(await post.compiledContent()),
      post.tokenizationDemo ? tokenizationTrace.text : '',
    ].filter(Boolean).join(' '),
  })));
  return new Response(JSON.stringify({ revision: siteRevision, posts }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
