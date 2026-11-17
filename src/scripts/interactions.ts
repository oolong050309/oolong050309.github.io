import './effects';
import { searchPosts, type SearchPost } from '../lib/post-search';
import { siteRevision } from '../lib/navigation';

let posts: SearchPost[] = JSON.parse(document.querySelector('#search-data')?.textContent || '[]');
const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-input');
const results = document.querySelector<HTMLElement>('#search-results');
const english = document.documentElement.lang === 'en';
let indexRequest: Promise<void> | undefined;
let indexLoading = false;
let indexFailed = false;

function loadSearchIndex(): Promise<void> {
  if (indexRequest) return indexRequest;
  indexLoading = true;
  indexFailed = false;
  const url = new URL('/search-index.json', window.location.href);
  if (siteRevision) url.searchParams.set('v', siteRevision);
  indexRequest = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('Search index unavailable');
      return response.json();
    })
    .then((index: { revision: string; posts: SearchPost[] }) => {
      if (index.revision !== siteRevision || !Array.isArray(index.posts)) {
        throw new Error('Search index revision mismatch');
      }
      posts = index.posts;
    })
    .catch(() => {
      indexFailed = true;
      indexRequest = undefined;
    })
    .finally(() => {
      indexLoading = false;
      if (dialog?.open) renderSearch(input?.value || '');
    });
  return indexRequest;
}

function renderSearch(query = '') {
  if (!results) return;
  const matches = searchPosts(posts, query);
  results.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-search';
    empty.textContent = indexLoading ? (english ? 'Searching…' : '正在搜索…')
      : indexFailed ? (english ? 'Full-text search is unavailable. Close and reopen search to retry.' : '正文搜索暂不可用，请关闭搜索后重试。')
      : posts.length ? (english ? 'No matching articles. Try another keyword.' : '没有找到相关文章，试试其他关键词。')
      : (english ? 'No articles published yet.' : '还没有公开的文章，敬请期待。');
    results.append(empty);
  }
  matches.forEach(post => {
    const link = document.createElement('a');
    link.href = post.href;
    link.className = 'search-result';
    const topic = document.createElement('span');
    topic.className = 'search-result-category';
    topic.textContent = [post.category, post.subcategory, post.topic].filter(Boolean).join(' / ');
    const title = document.createElement('strong');
    title.textContent = post.title;
    link.append(topic, title);
    results.append(link);
  });
  if (indexFailed) {
    const notice = document.createElement('p');
    notice.className = 'empty-search';
    notice.textContent = english ? 'Showing title and tag matches. Reopen search to retry full-text search.' : '当前仅检索标题和标签，重新打开搜索可重试正文检索。';
    results.append(notice);
  }
}
function openSearch() {
  if (input) input.value = '';
  if (!dialog?.open) dialog?.showModal();
  void loadSearchIndex();
  renderSearch();
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
  copy.textContent = english ? 'Copy' : '复制';
  copy.setAttribute('aria-label', english ? 'Copy code' : '复制代码');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.querySelector('code')?.textContent || ''); copy.textContent = english ? 'Copied' : '已复制'; }
    catch { copy.textContent = english ? 'Copy manually' : '请手动复制'; }
    window.setTimeout(() => { copy.textContent = english ? 'Copy' : '复制'; }, 2000);
  });
  wrapper.append(copy);
});
