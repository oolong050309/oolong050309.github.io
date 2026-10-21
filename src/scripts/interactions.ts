import './effects';
import { searchPosts, type SearchPost } from '../lib/post-search';

const posts: SearchPost[] = JSON.parse(document.querySelector('#search-data')?.textContent || '[]');
const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-input');
const results = document.querySelector<HTMLElement>('#search-results');

function renderSearch(query = '') {
  if (!results) return;
  const matches = searchPosts(posts, query);
  results.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-search';
    empty.textContent = '没有找到相关文章，试试其他关键词。';
    results.append(empty);
  }
  matches.forEach(post => {
    const link = document.createElement('a');
    link.href = post.href;
    link.className = 'search-result';
    const topic = document.createElement('span');
    topic.className = 'search-result-category';
    topic.textContent = `${post.category} / ${post.topic}`;
    const title = document.createElement('strong');
    title.textContent = post.title;
    link.append(topic, title);
    results.append(link);
  });
}
function openSearch() {
  if (input) input.value = '';
  renderSearch();
  if (!dialog?.open) dialog?.showModal();
  input?.focus();
}
document.querySelectorAll('[data-search-open]').forEach(button => button.addEventListener('click', openSearch));
document.querySelector('[data-close-search]')?.addEventListener('click', () => dialog?.close());
input?.addEventListener('input', () => renderSearch(input.value));
dialog?.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
document.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  const editing = target.matches('input, textarea') || target.isContentEditable;
  if ((event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !editing && !event.altKey && !event.ctrlKey && !event.metaKey)) {
    event.preventDefault();
    if (dialog?.open) dialog.close(); else openSearch();
  }
});

document.querySelectorAll<HTMLElement>('.prose pre').forEach(pre => {
  const wrapper = document.createElement('div');
  wrapper.className = 'code-wrapper';
  pre.before(wrapper);
  wrapper.append(pre);
  const copy = document.createElement('button');
  copy.className = 'copy-code';
  copy.type = 'button';
  copy.textContent = '复制';
  copy.setAttribute('aria-label', '复制代码');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.querySelector('code')?.textContent || ''); copy.textContent = '已复制'; }
    catch { copy.textContent = '请手动复制'; }
    window.setTimeout(() => { copy.textContent = '复制'; }, 2000);
  });
  wrapper.append(copy);
});
