export const articleCategories = [
  { slug: 'fundamentals', label: '学习笔记', description: '记录学习中的概念理解、原理推导、问题整理与心得。' },
  { slug: 'development', label: '开发实践', description: '工具使用、项目实现、问题排查，以及解决实际问题的过程。' },
  { slug: 'research', label: '研究笔记', description: '论文阅读、实验复现、方法比较，以及研究中的问题与想法。' },
  { slug: 'notes', label: '随笔', description: '阅读、学习感想，以及生活里的小发现。' },
] as const;

export type PostCategory = typeof articleCategories[number]['label'];
export type CategorySlug = typeof articleCategories[number]['slug'];

export const articleSubcategories = [
  { slug: 'cs336', label: 'CS336', parent: 'fundamentals', description: 'CS336 的课程笔记、作业实践与学习心得。' },
] as const;

export type PostSubcategory = typeof articleSubcategories[number]['label'];
export type SubcategorySlug = typeof articleSubcategories[number]['slug'];

export function categoryHref(category: PostCategory) {
  const item = articleCategories.find(item => item.label === category);
  return item ? `/blog/category/${item.slug}/` : '/blog/';
}

export function subcategoryHref(subcategory: PostSubcategory) {
  const item = articleSubcategories.find(item => item.label === subcategory);
  return item ? `/blog/category/${item.slug}/` : '/blog/';
}
