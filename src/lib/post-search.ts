export type SearchPost = { title: string; description: string; category: string; topic: string; tags: string[]; href: string };

export function searchPosts(posts: SearchPost[], query = '') {
  const normalized = query.trim().toLocaleLowerCase();
  return posts.filter(post => `${post.title} ${post.description} ${post.category} ${post.topic} ${post.tags.join(' ')}`.toLocaleLowerCase().includes(normalized));
}
