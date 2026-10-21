export const articleCategories = [
  { slug: 'research', label: '研究笔记', description: '围绕深度学习，记录原理理解、论文阅读和实验复现。' },
  { slug: 'development', label: '开发实践', description: '编程、计算机基础、工具使用，以及把项目做出来的过程。' },
  { slug: 'notes', label: '随笔', description: '阅读、学习感想，以及生活里的小发现。' },
] as const;

export type PostCategory = typeof articleCategories[number]['label'];
export type CategorySlug = typeof articleCategories[number]['slug'];

export function categoryHref(category: PostCategory) {
  const item = articleCategories.find(item => item.label === category);
  return item ? `/blog/category/${item.slug}/` : '/blog/';
}
