export type SearchPost = { title: string; description: string; category: string; subcategory?: string; topic: string; tags: string[]; href: string; searchText?: string };

export function searchPosts(posts: SearchPost[], query = '') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return posts;
  return posts.filter((post) => {
    const haystack = `${post.title} ${post.description} ${post.category} ${post.subcategory || ''} ${post.topic} ${post.tags.join(' ')} ${post.searchText || ''}`.toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}
