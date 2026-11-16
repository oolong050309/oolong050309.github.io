# Pip 个人网站

使用 Astro、TypeScript、原生 CSS 和 Markdown。PC 多页面个人站：黑白配色、居中内容、顶部导航，以博客阅读为主。

正式网址：https://oolong050309.github.io/ 。源码仓库：https://github.com/oolong050309/oolong050309.github.io 。

## 本地开发

当前锁定 Astro 7.4.1，包含站点地图依赖在内需要 Node.js 22.22.1 及以上的兼容版本，建议使用 Node.js 24。

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

GitHub Pages 的 HTML 响应有约 10 分钟缓存，部署后可能出现某个分类已更新、另一个分类仍显示旧内容的情况。部署工作流会将提交 SHA 注入 `PUBLIC_SITE_REVISION`；站内导航、分类、文章入口和搜索结果通过 `src/lib/navigation.ts` 自动携带同一版本参数，避免从新页面跳入另一份旧缓存。canonical、RSS、站点地图和 giscus 的 pathname 保持原始地址。已有的旧标签页需要刷新一次才能使用新版导航；这个机制不会远程清除浏览器已缓存的旧页面。

本地验证部署版本行为可运行 `PUBLIC_SITE_REVISION=local-check npm run build`，再运行 `PUBLIC_SITE_REVISION=local-check npm run check:build`。不设置该变量时，本地链接保持简洁地址。构建检查会核对导航和搜索结果的版本一致性。

## 自动站点地图

通过 Astro 官方 `@astrojs/sitemap` 集成，在每次 `npm run build` 时根据实际生成的页面自动更新站点地图。新增或删除文章、分类和其他页面后，推送到 `main` 触发部署，清单会随网站一起更新，无需手动维护网址列表。

- 站点地图入口：[sitemap-index.xml](https://oolong050309.github.io/sitemap-index.xml)。
- 页面清单：`sitemap-0.xml`；页面较多时，集成会自动拆分成多个文件。
- `public/robots.txt` 与生产页面的 `<head>` 均声明站点地图入口；修改正式域名时，也需同步更新 `robots.txt` 中的地址。
- `npm run check:build` 会校验站点地图覆盖全部实际页面、没有重复或失效网址，并检查 `robots.txt` 的声明。此检查同样在 GitHub Actions 部署前执行。

站点地图仅在生产构建中生成，可用 `npm run build` 后的 `npm run preview` 本地查看。向 Google Search Console 或 Bing Webmaster Tools 提交时，使用上面的站点地图入口；生成并发布站点地图不等于已在这些平台提交，也不保证收录或排名。

## 当前范围

- PC 首页：个人介绍、最近三篇文章、作品与实验、此刻、关于的精选内容和入口。
- 独立栏目页面：文章 `/blog/`、作品 `/projects/`、此刻 `/now/`、关于 `/about/`；导航标明当前栏目，点击 Pip 标识返回首页。
- 一级分类依次为「学习笔记」「开发实践」「研究笔记」「随笔」：学习笔记整理概念理解、原理推导与学习心得，其中「CS336」是课程子分类；开发实践记录工具使用、项目实现与问题排查；研究笔记记录论文阅读、实验复现和方法比较；随笔放阅读与生活。
- 分类支持篇数统计、独立地址与无脚本访问。学习笔记包含所有课程子分类的文章，进入后可选择「全部笔记」或「CS336」。示例文章已移除；CS336 已发布 Tokenization 笔记，并提供中英文版本。
- Markdown 可填写多个 tags；主主题 topic 会自动纳入标签，标签同时进入全站搜索。
- 首页展示已填写的「此刻」近况；标记 pending 的条目保留在配置中，不展示给访客。
- 作品列表目前为空，首页和作品栏目保留入口并展示空状态；原 Pip 网站项目卡片和介绍页面已移除。后续可在 `src/config/projects.ts` 添加正式作品。
- 全站内容统一白底，公式不加边框，通过留白与正文分隔；代码和表格保留必要的细线。
- 黑白动效：首屏错落入场、区块滚动渐显、文章悬停反馈、导航下划线和细线阅读进度。
- 首页右侧的立体粒子球自动运行，支持鼠标拨动、点击脉冲与标题字符动效。
- 首页两侧仅使用 ASCII 字符：贯穿屏幕的字符碎片、短字符块与弯曲字符带填充留白，字符云与行星作为深色轮廓穿插其中。所有字符都能被鼠标拨散并弹性归位，片段缓慢漂浮、错时换字。绘制严格裁切在正文两侧，装饰层不阻挡链接、滚动或宠物操作。30fps、像素比上限 2；空间不足或标签页隐藏时停止，系统减少动态效果时保留静态字符。
- 首页常驻小黑团与纸飞机，每次加载随机选择留白位置，优先避开导航、正文、粒子球与彼此，直接点击即可互动。黑团的眼睛会看向鼠标，点击会弹跳，拖动时身体拉伸，松手后落下并停在页面底部；纸飞机点击后沿弧线飞到另一侧，再次点击可以改变航线。
- 两个物件只占各自的小块点击区域，页面链接与滚动保持正常。物件静止时没有脚本动画循环；失焦、隐藏标签页或缩放窗口时收拢到稳定位置。系统减少动态效果时保留静态表情与位置反馈。
- PC 排版采用更大的字体层级与 960px 内容宽度，首页文章标题 20px、文章正文 18px；使用本机系统字体，不额外加载远程字体。
- 动效尊重系统的「减少动态效果」偏好，滚动渐显只播放一次，未启用脚本时内容仍正常显示。
- 文章搜索，支持 Ctrl / Cmd + K 和 `/` 快捷键。
- Markdown 文章支持正文目录、代码复制与数学公式。没有文章时，首页、分类与搜索显示空状态。
- RSS 订阅输出，文章链接使用正式域名。
- 文章底部提供 giscus 评论与点赞／表情反应，读者使用 GitHub 账号参与。

当前没有专门制作手机端布局。旧版小电脑组件保留在源码中，当前页面不使用。

## 修改内容

- 个人名称与站点描述：`src/config/site.ts`。
- 「此刻」的更新日期、在做／在学／在玩近况和接下来计划：`src/config/now.ts`，首页与此刻页面共用这些内容。
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
- 评论区：`src/components/Comments.astro`；仓库与讨论分类：`src/config/comments.ts`。

在 `src/content/blog/` 新建 Markdown 文件即可发布文章。正式文章的 frontmatter 中将 `sample` 设为 `false`；首页、分类、搜索、RSS 和站点地图会在构建时自动更新。

## 双语文章

每个语言版本使用独立的 Markdown 文件和 slug。`language` 可选 `zh-CN` 或 `en`，默认为中文；译文通过 `translationOf` 指向原文的 slug。文章顶部的「中文 / English」链接在两个完整静态页面之间切换，无需 JavaScript。页面输出各自的 `lang`、canonical 和互相对应的 hreflang 链接，站点地图包含两个版本。

首页、分类列表和 RSS 只展示原文，译文不重复计数；全站搜索可以找到两个版本。英文详情页的阅读时间、目录、搜索、代码复制和评论提示使用英文。评论与点赞共用原文的讨论：原文沿用 pathname，译文通过 specific 映射到原文路径，切换语言不会拆成两个讨论区。当前没有提供整站语言切换。

CS336 Tokenization 的原文位于 `src/content/blog/cs336-tokenization.md`，英文译文位于 `src/content/blog/cs336-tokenization-en.md`。

## 评论与点赞

文章使用 [giscus](https://giscus.app/zh-CN)，评论和文章反应保存在 `oolong050309/oolong050309.github.io` 仓库的 GitHub Discussions 中。网站仍为静态生成，无需新增服务器、数据库或网站账号系统。

仓库需要保持公开、启用 Discussions，并为当前仓库安装 [giscus GitHub App](https://github.com/apps/giscus)。配置放在 `src/config/comments.ts`，包含公开的仓库 ID 和 Announcements 讨论分类 ID，不需要访问令牌。

每篇文章以 `pathname` 严格匹配自己的讨论，文章标题修改不影响评论；已发布文章应保持 slug 稳定。第一次有人留言或发送反应时，giscus 自动创建对应讨论，不必预先为每篇文章开帖。管理员可在仓库 Discussions 中管理评论。

评论组件只出现在文章详情页，语言随文章版本切换，使用浅色主题和懒加载，包含文章反应与回复输入框。禁用脚本或加载失败时，页面保留 GitHub 讨论区入口。开发和生产环境的同一路径共用评论；`giscus:backlink` 始终指向正式文章网址，避免在讨论中留下 localhost 链接。本地验证时不要提交测试评论或点赞，以免写入真实讨论。

使用官方 `giscus` Web Component，由 Astro 将客户端代码随网站打包，避免额外请求远程 `client.js`；评论内容和登录仍由 giscus 与 GitHub 提供。

## 文章分类与标签

每篇文章选择一个一级 category，填写「学习笔记」「开发实践」「研究笔记」或「随笔」。CS336 是「学习笔记」下的子分类，通过可选的 subcategory 字段指定；不属于某门课的学习笔记可以省略这个字段。子分类文章同时出现在父分类总列表中，搜索也支持子分类名称。构建时会检查子分类是否属于所填的一级分类。topic 是主要主题，tags 可进一步细分。例如 CS336 笔记的元信息片段：

```yaml
category: "学习笔记"
subcategory: "CS336"
topic: "课程笔记"
tags: ["CS336"]
```

一级分类地址为 `/blog/category/fundamentals/`、`/blog/category/development/`、`/blog/category/research/`、`/blog/category/notes/`。「学习笔记」的 CS336 子分类沿用 `/blog/category/cs336/` 地址，顶部选中父分类，第二行显示子分类筛选。文章详情同时提供父分类与子分类链接。文章 slug、网址和对应的 giscus 评论保持不变。

## LaTeX 数学公式

Markdown 支持行内公式 `$Y_{i,j}$`，以及单独成行的公式：

```tex
$$
Y_{i,j} = b + \sum_{u=0}^{K_h-1} \sum_{v=0}^{K_w-1} w_{u,v}\,X_{i+u,j+v}
$$
```

公式通过 Astro 官方 Unified Markdown 处理器与 KaTeX 在构建时排版，生成可阅读的 HTML 和 MathML。公式样式与字体随网站本地打包，无需访问外部 CDN。
