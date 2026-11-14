export const articleCategories = [
  { slug: 'fundamentals', label: '基础知识', description: '计算机与数学基础、课程学习、概念理解和原理推导。' },
  { slug: 'development', label: '开发实践', description: '工具使用、项目实现、问题排查，以及解决实际问题的过程。' },
  { slug: 'research', label: '研究笔记', description: '论文阅读、实验复现、方法比较，以及研究中的问题与想法。' },
  { slug: 'notes', label: '随笔', description: '阅读、学习感想，以及生活里的小发现。' },
] as const;

export type PostCategory = typeof articleCategories[number]['label'];
export type CategorySlug = typeof articleCategories[number]['slug'];

export function categoryHref(category: PostCategory) {
  const item = articleCategories.find(item => item.label === category);
  return item ? `/blog/category/${item.slug}/` : '/blog/';
}
