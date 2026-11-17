import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPosts } from '../src/lib/post-search.ts';
import { extractSearchText } from '../src/lib/search-content.ts';

const posts = [
  { title: 'CS336 第一讲：Tokenization 与文本分词', description: '学习 BPE', category: '学习笔记', subcategory: 'CS336', topic: 'Tokenization', tags: ['分词', 'Unicode'], href: '/blog/cs336-tokenization/', searchText: '猫的 UTF-8 字节值为 231、140、171。' },
  { title: 'Unicode', description: '字符编码', category: '学习笔记', topic: '字符编码', tags: ['UTF-8'], href: '/blog/unicode/', searchText: extractSearchText('<p>Unicode 给<strong>猫</strong>分配码点 U+732B。</p>') },
  { title: 'ASCII', description: '七位编码', category: '学习笔记', topic: '字符编码', tags: ['ASCII'], href: '/blog/ascii/' },
];

test('search matches metadata and body terms in either order, ignoring case and whitespace', () => {
  assert.deepEqual(searchPosts(posts, 'CS336 BPE'), [posts[0]]);
  assert.deepEqual(searchPosts(posts, '  bPe\tcs336\n'), [posts[0]]);
  assert.deepEqual(searchPosts(posts, 'Unicode 猫'), [posts[0], posts[1]]);
  assert.deepEqual(searchPosts(posts, '猫 Unicode'), [posts[0], posts[1]]);
  assert.deepEqual(searchPosts(posts, 'Unicode 不存在的词'), []);
});

test('empty queries retain all posts and metadata-only entries remain searchable', () => {
  assert.deepEqual(searchPosts(posts, '  \n '), posts);
  assert.deepEqual(searchPosts(posts, 'ascii'), [posts[2]]);
});

test('search text preserves inline words, entities, code and block boundaries', () => {
  const html = '<p title="1 > 0">Uni<strong>code</strong> &amp; 猫</p><p><code>ord(&quot;猫&quot;) &lt; 40000</code></p><table><tr><td>码点</td><td>29483</td></tr></table>';
  const text = extractSearchText(html);
  assert.ok(text.includes('Unicode & 猫'));
  assert.ok(text.includes('ord("猫") < 40000'));
  assert.ok(text.includes('码点 29483'));
  assert.ok(!text.includes('title='));
});

test('search text excludes scripts, styles, comments and hidden HTML', () => {
  const html = '<p>可见正文</p><script>scriptSecret</script><style>.styleSecret{}</style><!--commentSecret--><p hidden>hiddenSecret</p>';
  assert.equal(extractSearchText(html), '可见正文');
});
