# Pip 个人网站

使用 Astro、TypeScript、原生 CSS 和 Markdown。PC 多页面个人站：黑白配色、居中内容、顶部导航，以博客阅读为主。

正式网址：https://oolong050309.github.io/ 。源码仓库：https://github.com/oolong050309/oolong050309.github.io 。

## 本地开发

当前锁定 Astro 7.4.1，需要 Node.js 22.22.0 及以上的兼容版本，建议使用 Node.js 24。

```sh
npm ci
npm run dev
```

开发地址为 `http://127.0.0.1:4321/`。

```sh
npm run check
npm test
npm run build
npm run check:build
```

## GitHub Pages 部署

仓库根目录就是本项目目录。推送到 `main` 或手动运行 `Publish Pip` 会触发 `.github/workflows/deploy.yml`：安装锁定依赖、构建、类型检查、交互测试和产物链接校验，全部通过后发布到 GitHub Pages。

仓库的 Settings → Pages → Source 使用 GitHub Actions。部署环境为 `github-pages`，Node.js 24，静态产物目录为 `dist/`。`node_modules/`、`dist/`、`.astro/` 和本地环境文件不会提交到仓库。

正式域名配置在 `astro.config.mjs` 的 `site`；RSS 和 canonical 链接使用这一地址。生产构建允许搜索引擎收录，本地开发保留 noindex。修改文章或样式后提交并推送即可更新，不需要手动上传 `dist/`。

## 当前范围

- PC 首页：个人介绍、最近三篇文章、作品与实验、此刻、关于的精选内容和入口。
- 独立栏目页面：文章 `/blog/`、作品 `/projects/`、此刻 `/now/`、关于 `/about/`；导航标明当前栏目，点击 Pip 标识返回首页。
- 文章分类：「研究笔记」放深度学习、论文阅读和实验复现；「开发实践」放编程、计算机基础、工具和项目；「随笔」放阅读与生活。
- 分类支持篇数统计、独立地址与无脚本访问。现有预览文章归入研究笔记（1 篇）、开发实践（3 篇）与随笔（2 篇）。
- Markdown 可填写多个 tags；主主题 topic 会自动纳入标签，标签同时进入全站搜索。
- 首页展示已填写的「此刻」近况；标记 pending 的条目保留在配置中，不展示给访客。
- 作品区展示真实的 Pip 网站项目，并提供项目介绍页面。
- 全站内容统一白底，公式不加边框，通过留白与正文分隔；代码、表格和 CNN 图解保留必要的细线。
- 黑白动效：首屏错落入场、区块滚动渐显、文章悬停反馈、导航下划线和细线阅读进度。
- 首页右侧的立体粒子球自动运行，支持鼠标拨动、点击脉冲与标题字符动效。
- 首页两侧仅使用 ASCII 字符：贯穿屏幕的字符碎片、短字符块与弯曲字符带填充留白，字符云与行星作为深色轮廓穿插其中。所有字符都能被鼠标拨散并弹性归位，片段缓慢漂浮、错时换字。绘制严格裁切在正文两侧，装饰层不阻挡链接、滚动或宠物操作。30fps、像素比上限 2；空间不足或标签页隐藏时停止，系统减少动态效果时保留静态字符。
- 首页常驻小黑团与纸飞机，每次加载随机选择留白位置，优先避开导航、正文、粒子球与彼此，直接点击即可互动。黑团的眼睛会看向鼠标，点击会弹跳，拖动时身体拉伸，松手后落下并停在页面底部；纸飞机点击后沿弧线飞到另一侧，再次点击可以改变航线。
- 两个物件只占各自的小块点击区域，页面链接与滚动保持正常。物件静止时没有脚本动画循环；失焦、隐藏标签页或缩放窗口时收拢到稳定位置。系统减少动态效果时保留静态表情与位置反馈。
- PC 排版采用更大的字体层级与 960px 内容宽度，首页文章标题 20px、文章正文 18px；使用本机系统字体，不额外加载远程字体。
- 动效尊重系统的「减少动态效果」偏好，滚动渐显只播放一次，未启用脚本时内容仍正常显示。
- 文章搜索，支持 Ctrl / Cmd + K 和 `/` 快捷键。
- 六篇原创示例 Markdown 文章，正文目录与代码复制。CNN 入门文章位于 `/blog/cnn-explained/`，包含原创黑白图解、公式、尺寸表和 PyTorch 结构示例。
- RSS 订阅输出，文章链接使用正式域名。

现有文章、日期和阅读时长用于展示排版，已按 sample 标记显示示例说明；正式文章设为 sample: false。当前没有专门制作手机端布局。旧版小电脑组件保留在源码中，当前页面不使用。

## 修改内容

- 个人名称与站点描述：`src/config/site.ts`。
- 「此刻」的更新日期和近况：`src/config/now.ts`，在学与在读暂留待填写。
- 作品列表：`src/config/projects.ts`；关于介绍：`src/config/about.ts`。
- 首页：`src/pages/index.astro`。
- Markdown 文章：`src/content/blog/`。
- 分类名称与介绍：`src/config/categories.ts`。
- 共享样式：`src/styles/global.css`。
- 滚动渐显与阅读进度：`src/scripts/effects.ts`。
- 首页小物件：`src/components/HomeCompanions.astro`；交互：`src/scripts/companions.ts`；落地物理与飞行路径：`src/lib/companions.ts`；测试：`tests/companions.test.mjs`。
- 首页粒子特效：`src/components/ParticleOrb.astro` 与 `src/scripts/particle-orb.ts`。
- 首页两侧字符场：`src/components/SideAtmosphere.astro`、`src/scripts/side-atmosphere.ts` 与 `src/lib/ascii.ts`。
- 统一动效偏好：`src/scripts/motion.ts`。
- 导航与页脚：`src/layouts/BaseLayout.astro`。

当前示例文章仍带有示例标记；替换为正式文章时将 frontmatter 中的 `sample` 改为 `false`。

## 文章分类与标签

每篇文章选择一个 category，填写「研究笔记」「开发实践」或「随笔」。topic 是主要主题，tags 可进一步细分。例如研究文章的元信息片段：

```yaml
category: "研究笔记"
topic: "深度学习"
tags: ["论文阅读", "实验复现"]
```

对应分类地址为 `/blog/category/research/`、`/blog/category/development/`、`/blog/category/notes/`。文章详情里的分类可点击返回对应列表。

## LaTeX 数学公式

Markdown 支持行内公式 `$Y_{i,j}$`，以及单独成行的公式：

```tex
$$
Y_{i,j} = b + \sum_{u=0}^{K_h-1} \sum_{v=0}^{K_w-1} w_{u,v}\,X_{i+u,j+v}
$$
```

公式通过 Astro 官方 Unified Markdown 处理器与 KaTeX 在构建时排版，生成可阅读的 HTML 和 MathML。公式样式与字体随网站本地打包，无需访问外部 CDN。CNN 示例文章包含求和、上下标、分式与向下取整符号的展示。

CNN 示例文章顶部另有「字体试读」区，使用相同样文比较六组本机字体。组件为 `src/components/FontPreview.astro`，仅在 `cnn-explained` 且 `sample: true` 时显示，并提供目录入口；改为正式文章后自动隐藏。
