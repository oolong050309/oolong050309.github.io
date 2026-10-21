import type { MarkdownInstance } from 'astro';
import type { PostCategory } from '../config/categories';

export interface PostMeta {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  category: PostCategory;
  topic: string;
  tags?: string[];
  minutes: number;
  sample: boolean;
}

const files = import.meta.glob<MarkdownInstance<PostMeta>>('../content/blog/*.md', { eager: true });

export function getPosts() {
  return Object.values(files)
    .map((file) => ({
      ...file.frontmatter,
      tags: [...new Set([file.frontmatter.topic, ...(Array.isArray(file.frontmatter.tags) ? file.frontmatter.tags : [])].filter(tag => typeof tag === 'string' && tag.trim()))],
      href: `/blog/${file.frontmatter.slug}/`,
      Content: file.Content,
      headings: file.getHeadings(),
    }))
    .sort((a, b) => new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf());
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai',
  }).format(new Date(value)).replaceAll('/', '.');
}
