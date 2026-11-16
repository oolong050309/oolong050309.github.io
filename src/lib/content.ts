import type { MarkdownInstance } from 'astro';
import { articleCategories, articleSubcategories, type PostCategory, type PostSubcategory } from '../config/categories';

export interface PostMeta {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  category: PostCategory;
  subcategory?: PostSubcategory;
  topic: string;
  tags?: string[];
  minutes: number;
  sample: boolean;
  language?: 'zh-CN' | 'en';
  translationOf?: string;
}

const files = import.meta.glob<MarkdownInstance<PostMeta>>('../content/blog/*.md', { eager: true });

export function getAllPosts() {
  const posts = Object.values(files)
    .map((file) => {
      const post = file.frontmatter;
      const category = articleCategories.find(item => item.label === post.category);
      if (!category) throw new Error(`Unknown category in article: ${post.slug}`);
      if (post.subcategory) {
        const subcategory = articleSubcategories.find(item => item.label === post.subcategory);
        if (!subcategory || subcategory.parent !== category.slug) {
          throw new Error(`Subcategory does not belong to category in article: ${post.slug}`);
        }
      }
      return {
        ...post,
        language: post.language || 'zh-CN' as const,
        tags: [...new Set([post.topic, ...(Array.isArray(post.tags) ? post.tags : [])].filter(tag => typeof tag === 'string' && tag.trim()))],
        href: `/blog/${post.slug}/`,
        Content: file.Content,
        headings: file.getHeadings(),
      };
    })
    .sort((a, b) => new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf());
  const slugs = new Set<string>();
  for (const post of posts) {
    if (slugs.has(post.slug)) throw new Error(`Duplicate article slug: ${post.slug}`);
    slugs.add(post.slug);
    if (post.translationOf) {
      const original = posts.find(item => item.slug === post.translationOf && !item.translationOf);
      if (!original || original.language === post.language) throw new Error(`Invalid article translation: ${post.slug}`);
    }
  }
  return posts;
}

// Translations have their own pages, but count as one article in archives and RSS.
export function getPosts() {
  return getAllPosts().filter(post => !post.translationOf);
}

export function formatDate(value: string, language = 'zh-CN') {
  return new Intl.DateTimeFormat(language, {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai',
  }).format(new Date(value)).replaceAll('/', '.');
}
