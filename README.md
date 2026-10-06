# 灰羽 · Ash

一个功能很多、但看起来还是很安静的个人博客 —— 用 Astro 7 + Tailwind CSS v4 写成，部署在 **Cloudflare Pages** 上（纯静态，零成本）。

配色来自一张灰粉色调的猫猫插画：暖白纸底、灰褐、近黑墨色，再加一点点腮红粉当强调色。

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # 构建 + 生成搜索索引
pnpm serve        # 本地预览 dist/（含 /api 桩）
pnpm cf:deploy    # 部署到 Cloudflare Pages
```

---

## 目录

- [功能清单](#功能清单)
- [目录结构](#目录结构)
- [先改这四个地方](#先改这四个地方)
- [写文章](#写文章)
- [部署到 Cloudflare Pages](#部署到-cloudflare-pages)
- [开启浏览量 / 点赞（KV）](#开启浏览量--点赞kv)
- [开启匿名留言板](#开启匿名留言板kv同一套)
- [开启评论（Giscus）](#开启评论giscus)
- [开启访问统计](#开启访问统计)
- [部署到 Workers（SSR 模式）](#部署到-workersssr-模式)
- [部署到其它平台](#部署到其它平台)
- [常见问题与踩坑](#常见问题与踩坑)
- [快捷键](#快捷键)

---

## 功能清单

**内容与浏览**

- Markdown / MDX 写作，内容集合（Content Collections）+ Zod schema 校验
- 分类、标签、归档（时间线 + 年度页）、分页
- 文章目录（TOC，自动提取标题、滚动高亮）
- 相关文章推荐、上一篇 / 下一篇
- 阅读进度条、预计阅读时长、字数统计
- 代码块：双主题高亮（亮 Catppuccin Latte / 暗 Mocha）、语言标签、一键复制
- Callout 提示块（`> [!NOTE]` 这种写法）、KaTeX 数学公式、GFM 表格 / 任务列表 / 脚注
- 图片灯箱（点击放大、键盘翻页）
- 每页独立分享图（OG Image），构建期生成，社交平台预览不重样

**搜索与导航**

- Pagefind 构建期全文索引（中文可用）
- 命令面板 `⌘K` / `Ctrl+K`：搜文章 + 跳页面 + 切主题 + 复制链接
- 博客列表页即时过滤（标题 / 标签 / 摘要）、排序、卡片 / 列表视图切换
- 全站预取（viewport 策略），点击几乎瞬开

**设计**

- 两套主题 + 跟随系统，首屏前注入避免闪白
- 一套语义化设计令牌（`oklch` 色阶），换皮只改一个文件
- 亮 / 暗双主题代码高亮，纯 CSS 切换，零 JS
- 响应式（320px ~ 4K）、滚动进场动画、尊重 `prefers-reduced-motion`
- 焦点可见、跳转链接、语义化标签等无障碍基础
- 纸张颗粒质感、柔和阴影、圆角卡片

**数据与统计**

- 统计页：总字数、平均阅读时长、写作热力图、每年产量、分类占比、标签 Top 10、之最
- 浏览量 + 点赞（Cloudflare KV，边缘读写，可一键关闭）
- 匿名留言板：昵称 + 内容即时发布，支持**楼中楼回复**、`@` 跳转、自己删除、管理密码审核（同样用 KV）
- 访问统计接入位（Cloudflare Web Analytics / Umami）

**工程**

- 静态输出，产物可丢到任何托管；同时保留 SSR 开关
- RSS 全文订阅、sitemap、robots.txt、`llms.txt`
- JSON-LD 结构化数据、Twitter Card、canonical
- PWA manifest + 图标
- 安全响应头（`_headers` + Functions 中间件）、老链接 301 重定向
- 零客户端框架，交互全是原生 JS（手写脚本总计约 10KB）

---

## 目录结构

```text
ash-blog/
├─ astro.config.mjs          # 站点、Markdown 管线、Shiki、SSR 开关
├─ wrangler.toml             # Cloudflare Pages / KV 绑定
├─ wrangler.workers.toml.example  # 切 SSR（Workers）时替换上面那份
├─ functions/                # Cloudflare Pages Functions（边缘接口）
│  ├─ _middleware.js         # 安全响应头
│  └─ api/
│     ├─ _guestbook.js       # 留言板共享工具（KV 读写、限流、校验）
│     ├─ views.js            # 浏览量（含 30 分钟去重）
│     ├─ like.js             # 点赞
│     └─ guestbook/
│        ├─ index.js         # GET 楼层列表 / POST 发留言与回复
│        └─ [id].js          # DELETE 删除自己的留言（楼层连带回复）
├─ public/                   # 静态资源（favicon、OG 图、_headers、_redirects）
├─ scripts/                  # 构建辅助脚本（search 索引、图标、本地预览…）
└─ src/
   ├─ data/
   │  ├─ site.ts             # ★ 站点配置：名字、域名、导航、功能开关
   │  └─ about.ts            # ★ 关于页数据：技能、时间线、友链
   ├─ content/
   │  ├─ blog/               # ★ 文章（Markdown / MDX）
   │  └─ projects/           # ★ 项目
   ├─ content.config.ts      # 内容集合 schema
   ├─ styles/global.css      # ★ 设计令牌 + 组件类 + 正文排版
   ├─ layouts/
   │  ├─ BaseLayout.astro    # HTML 骨架、SEO、全局脚本
   │  └─ PostLayout.astro    # 文章页（TOC、分享、评论、相关文章）
   ├─ components/            # Header / Footer / PostCard / CommandPalette …
   ├─ lib/                   # blog 数据层、TOC 提取、搜索打分、工具函数
   └─ pages/                 # 路由（首页 / blog / tags / stats / …）
```

---

## 先改这四个地方

### 1. `src/data/site.ts` —— 站点身份与功能开关

```ts
export const SITE = {
	title: '灰羽 · Ash',                                    // 站点名
	tagline: '一只有点丧、但很温柔的技术猫',                  // 一句话签名
	description: '……',                                      // SEO 描述
	url: 'https://ash-blog.pages.dev',                      // ★ 换成你的正式域名
	lang: 'zh-CN',
	since: 2023,
};

export const AUTHOR = { name: 'Ash', nameZh: '灰羽', /* … */ };
```

> `SITE.url` 会影响 RSS、sitemap、canonical 和 OG 图的绝对地址，**部署前一定要改**。

功能开关都在同文件的 `FEATURES` 里，关掉某个功能只要把对应字段设为 `false` / 留空：

```ts
export const FEATURES = {
	search: true,
	commandPalette: true,
	readingProgress: true,
	toc: true,
	themeToggle: true,
	copyCode: true,
	relatedPosts: true,
	views: { enabled: true, apiBase: '' },   // 关掉：enabled: false
	comments: { enabled: false, repo: '', repoId: '', /* … */ },
	analytics: { cloudflareToken: '', umamiScript: '', umamiWebsiteId: '' },
	showCloudflareBadge: true,
};
```

### 2. `src/styles/global.css` —— 配色

想要别的颜色，只改 `:root` 和 `[data-theme='dark']` 里的这几个语义变量就行：

```css
:root {
	--c-bg: oklch(0.976 0.006 60);      /* 页面底色 */
	--c-surface: oklch(0.995 0.003 60); /* 卡片表面 */
	--c-text: oklch(0.268 0.020 320);   /* 正文 */
	--c-accent: oklch(0.702 0.106 8);   /* 强调色（现在是腮红粉） */
}
```

### 3. `src/data/about.ts` —— 关于页与友链

技能条、时间线、Now 列表、FAQ、友链，都是纯数据，改数组即可。

### 4. `public/` —— 图标与 OG 图

```bash
pnpm icons    # 由 public/favicon.svg 重新生成 PNG 图标与默认 OG 图
```

想换成自己的照片：把图丢进 `public/`，然后替换 `src/components/Mascot.astro` 里的 SVG 为 `<img>`（或直接改 `src/data/site.ts` 里的 `AUTHOR.avatar`）。

---

## 分享图（OG Image）

每篇文章、每个分类 / 标签 / 列表页都有自己的一张 1200×630 分享图，构建期由
`src/pages/og/[...path].png.ts` 生成（SVG 模板 + sharp 转 PNG，中文走系统字体栈，
所以仓库里不需要塞字体文件）：

```bash
pnpm build        # 顺便生成 dist/og/*.png
```

想在模板里加东西（比如作者头像、二维码），改 `src/lib/og.ts` 里的 `ogSvg()` 就行。

**生成 48 张图大约多花 20 秒。** 觉得不值就把开关关掉，全站统一用 `public/og-default.png`：

```ts
// src/data/site.ts
export const FEATURES = { /* … */ ogImages: false };
```

---

## 写文章

在 `src/content/blog/` 下新建 `.md` 或 `.mdx` 文件。**目录名会成为 URL 的一部分**：

```text
src/content/blog/2026/hello-world.md   →  /blog/2026/hello-world/
```

Frontmatter 字段（`src/content.config.ts` 里有完整定义）：

```yaml
---
title: 文章标题                       # 必填
description: 一句话摘要                # 会显示在卡片和 SEO 里
published: 2026-08-24                 # 必填，决定排序
updated: 2026-08-26                   # 可选，显示「更新于」
category: 工程                        # 默认「随笔」
tags: [Cloudflare, Workers]           # 会生成标签页
pinned: false                         # 置顶（首页「先看这几篇」优先）
draft: false                          # 草稿：生产构建自动隐藏
series: 边缘上的博客                   # 可选，系列名
links:                                # 可选，文末相关链接
  - label: 文档
    href: https://example.com
cover:                                # 可选，封面图（放 src/assets 里 import）
  src: ../../assets/cover.png
  alt: 封面说明
---
```

### Callout 提示块

```markdown
> [!NOTE] 小提示
> 正文支持 **加粗**、`代码` 等行内格式。

> [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION] / [!SUCCESS] / [!QUESTION] / [!BUG] / [!QUOTE]
```

### 数学公式

````markdown
行内：$h = \frac{N_{hit}}{N_{total}}$

块级：
$$
T_{p99} \approx \mu + 2.326\sigma
$$
````

### 代码块

````markdown
```ts title="src/lib/blog.ts" showLineNumbers
export const answer = 42;
```
````

亮 / 暗两套主题色由 Shiki 写在行内变量里（`--shiki-light` / `--shiki-dark`），CSS 按 `data-theme` 切换，**不需要任何 JavaScript**。

---

## 部署到 Cloudflare Pages

### 方式 A：连接 GitHub 仓库（推荐，推代码即发布）

1. 把项目推到 GitHub（先确认 `SITE.url` 改成了你的域名）
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
3. 选择仓库，构建配置填：

   | 配置项 | 值 |
   | --- | --- |
   | Framework preset | `Astro` |
   | Build command | `pnpm build` |
   | Build output directory | `dist` |
   | 环境变量 | `NODE_VERSION` = `22` |

4. 保存并部署。之后每次 `git push` 都会自动构建发布，PR 还会生成预览环境。

> 构建命令是 `pnpm build`（= `astro build && node scripts/pagefind.mjs`），
> 后半段负责生成搜索索引，**别漏掉**，否则搜索会退回内置 JSON 索引。

### 方式 B：本地命令行发布

```bash
pnpm add -g wrangler        # 或用项目里的 devDependency
wrangler login
pnpm build
pnpm cf:deploy              # = wrangler pages deploy dist --project-name ash-blog
```

### 绑定自定义域名

Pages 项目 → **Custom domains** → 添加你的域名，按提示在 DNS 里加 CNAME。
证书是自动签发的，不用管。

### 环境变量与密钥

| 变量 | 用途 | 必需 |
| --- | --- | --- |
| `NODE_VERSION` | 指定构建用的 Node 版本（建议 `22`） | 建议 |
| `CLOUDFLARE_API_TOKEN` | 仅 GitHub Actions 部署用 | 可选 |
| `CLOUDFLARE_ACCOUNT_ID` | 仅 GitHub Actions 部署用 | 可选 |

---

## 开启浏览量 / 点赞（KV）

静态站点没有数据库，但 Cloudflare 的 KV 足够便宜也足够快。**没绑定 KV 时接口返回 503，前端组件会自动隐藏，页面完全不受影响。**

### 步骤

1. 创建 KV 命名空间：

   ```bash
   wrangler login
   pnpm cf:kv:create      # = wrangler kv namespace create BLOG_KV
   ```

   输出里会有 `id = "xxxx"`。

2. 绑定到 Pages 项目（二选一）：

   **Dashboard**：Pages 项目 → **Settings → Functions → KV namespace bindings** → 添加
   变量名 `BLOG_KV`，选刚创建的命名空间。

   **wrangler.toml**：把 `id` 填进去，然后用 `pnpm cf:deploy` 发布：

   ```toml
   [[kv_namespaces]]
   binding = "BLOG_KV"
   id = "你的命名空间 id"
   ```

3. 完成。文章页底部会出现「👁 浏览量 / ♥ 点赞」。

### 接口说明

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/views?slug=/blog/xxx/` | `GET` | 只读计数 |
| `/api/views?slug=/blog/xxx/` | `POST` | 计数 +1（同一 IP 30 分钟内只记一次） |
| `/api/like` | `POST` | body：`{ slug, undo? }`，点赞或取消 |
| `/api/guestbook` | `GET` | 留言楼层 + 回复（见下一节） |
| `/api/guestbook` | `POST` | 发留言 / 回复 |
| `/api/guestbook/:id` | `DELETE` | 删除自己的留言（需发布时拿到的 token） |

数据结构就是 KV 里的一个 JSON：`{"views": 1204, "likes": 37}`。

> **注意：这只是防手滑**
> 换 IP 就能再刷。真要防刷得上 Turnstile 或限流。个人博客的浏览量不值得这份复杂度 —— 想通这点能省不少时间。

### 本地怎么测

`wrangler pages dev dist` 会启动带 KV 模拟的本地环境；或者用项目自带的零依赖预览服务器：

```bash
pnpm build
pnpm serve      # http://localhost:4321，/api 走内存桩
```

---

## 开启匿名留言板（KV，同一套）

`/guestbook/` 的留言板**已经默认打开**：访客填个昵称 + 内容就能发，不需要注册、不需要邮箱，
而且**别人可以在任意留言下面回复**（两层楼中楼）。

它和浏览量共用同一个 KV 命名空间，所以只要你做完上一节的 `BLOG_KV` 绑定，留言板就同时可用了。

### 三步走

1. 创建并绑定 KV（如果上一节已经做过就跳过）：

   ```bash
   pnpm cf:kv:create                 # = wrangler kv namespace create BLOG_KV
   ```

   Dashboard：Pages 项目 → **Settings → Functions → KV namespace bindings** → 变量名填 `BLOG_KV`。

2. 重新部署一次（绑定变更需要重新发布才生效）：

   ```bash
   pnpm build && pnpm cf:deploy
   ```

3. 打开 `/guestbook/`，随手发一条试试。

> 想看排版效果但还没部署？在本地跑 `pnpm build && pnpm serve`，
> 内置的预览服务器带了一套 `/api/guestbook` 桩和两条示例留言（含回复），可以直接点着玩。

### 留言板怎么工作的

| 能力 | 说明 |
| --- | --- |
| 发留言 | 昵称 + 内容，最长 600 字，无需登录 |
| 回复 | 每条留言左下角「回复」；回复「回复」时会自动挂到同一个楼层下，并显示 `@某某` |
| 结构 | **两层**：顶层「楼层」+ 楼层内的回复。不做无限缩进，手机上也能看清 |
| 跳转 | 每条留言都有 `#gb-xxxx` 锚点，点 `#` 复制链接；点 `@某某` 跳到那条留言 |
| 收起 | 楼层内回复超过 2 条时可以整体收起，状态记在本地 |
| 排序 | 「最新」（楼层按时间）/「热闹」（回复多的楼层在前） |
| 自己删 | 发布后会拿到一个凭证（存在浏览器里），2 分钟内可自己删掉 |
| 连带删除 | 删楼层时，楼里的回复会一起隐藏，不会留下孤儿回复 |
| 反刷 | 同一 IP 20 秒一条、每小时最多 12 条；honeypot 字段挡掉大部分脚本 |
| 隐私 | 只存 IP 的 SHA-256 前 32 位，不落明文 |

数据存在 KV 里，键名 `guestbook:<id>`，单条长这样：

```json
{
  "id": "m1x2y3-a1b2c3d4",
  "name": "路过的猫",
  "message": "配色好舒服",
  "parentId": null,
  "replyToId": null,
  "replyToName": null,
  "createdAt": 1791256230978,
  "ipHash": "…",
  "ua": "Mozilla/5.0 …",
  "tokenHash": "…",
  "hidden": false
}
```

`parentId` 为空 = 这是顶层楼层；不为空 = 它是某个楼层里的回复。

### 可选：管理密码

设置环境变量 `GUESTBOOK_ADMIN_PASSWORD`（Pages 项目 → Settings → Environment variables），
重新部署后留言板右上角会出现「管理」入口：

- 输入密码后，每条留言旁边都会多出「删除」按钮，可以隐藏任意刷屏内容
- 隐藏是软删除（内容清空 + 标记），记录保留便于排查
- 想**彻底**删掉：Cloudflare Dashboard → **Storage & Databases → KV** → 选命名空间 → 搜 `guestbook:` 前缀删掉对应键

本地想试这个功能：`GUESTBOOK_ADMIN_PASSWORD=你的密码 pnpm serve`（或写进 `.dev.vars`）。

### 可选：人机验证（Turnstile）

被机器人刷了再开也不迟。到 Cloudflare Dashboard → **Turnstile** 建一个站点，拿到一对密钥：

| 类型 | 变量名 | 值 |
| --- | --- | --- |
| 环境变量 | `TURNSTILE_SECRET_KEY` | Secret key（服务端校验用） |
| 环境变量 | `PUBLIC_TURNSTILE_SITE_KEY` | Site key（前端渲染组件用） |

两个都配好并重新部署后，表单下面会自动出现验证组件。只配一个不会生效，也不会报错。

### 想关掉？

```ts
// src/data/site.ts
export const FEATURES = {
  guestbook: { enabled: false, pageSize: 20, allowReply: true },
};
```

关掉后 `/guestbook/` 会显示一条说明，接口也不再被调用（Pages Functions 仍然存在，但没人访问）。

### 本地灌几条示例留言

```bash
pnpm gb:seed            # 写进本地模拟的 KV
pnpm gb:seed:remote     # 写进线上 KV（需要 wrangler 已登录、wrangler.toml 填了 id）
```

---

## 开启评论（Giscus）

评论存在 GitHub Discussions 里，免费、无后端、不需要数据库。

1. 建一个**公开**仓库，在 **Settings → General → Features** 里勾上 **Discussions**
2. 安装 [giscus App](https://github.com/apps/giscus)，授权给这个仓库
3. 打开 [giscus.app](https://giscus.app)，填入仓库名，它会生成 `repoId`、`categoryId`
4. 把值填进 `src/data/site.ts`：

   ```ts
   comments: {
     enabled: true,
     repo: 'your-name/your-repo',
     repoId: 'R_kgDOxxxxxxx',
     category: 'Announcements',
     categoryId: 'DIC_kwDOxxxxxxxx',
     mapping: 'pathname',
     /* 其余保持默认 */
   },
   ```

5. 评论区会出现在每篇文章底部和 `/guestbook/` 留言板

主题会自动跟随站点的亮 / 暗模式（用 giscus 的 catppuccin 主题）。

---

## 开启访问统计

在 `src/data/site.ts` 里填 token 即生效，留空则完全不输出脚本。

**Cloudflare Web Analytics**（推荐，免费且无需 cookie）：

```ts
analytics: { cloudflareToken: '你的 beacon token', /* … */ }
```

Dashboard → **Analytics & Logs → Web Analytics** → 添加站点，复制 token。

**Umami**（自托管或云端）：

```ts
analytics: {
	umamiScript: 'https://analytics.example.com/script.js',
	umamiWebsiteId: 'xxxxxxxx-xxxx-xxxx',
	/* … */
}
```

---

## 部署到 Workers（SSR 模式）

默认是**纯静态**（`output: 'static'`），这也是最省钱、最快的形态。如果你需要真正的服务端渲染（动态接口、按需渲染、A/B 测试），打开开关即可：

```bash
# Windows PowerShell
$env:ASTRO_SSR=1; pnpm build:ssr

# macOS / Linux / CI
ASTRO_SSR=1 pnpm build:ssr
```

这会挂上 `@astrojs/cloudflare` 适配器，产物变成 Worker 形态（`dist/server/entry.mjs` + `dist/client/`）。

> **注意：换一份 wrangler 配置**
> Pages 与 Workers 不能共用同一份配置文件：Pages 那份带 `pages_build_output_dir`，
> Workers 需要 `main` + `assets`。切换时替换一下即可：
>
> ```bash
> cp wrangler.workers.toml.example wrangler.toml     # Windows: Copy-Item
> wrangler deploy
> ```

两种模式共用同一套代码：`astro.config.mjs` 顶部用 `ASTRO_SSR` 环境变量切换 `output` 和适配器，图片服务也会自动从 sharp 切到 Cloudflare Images。

> **该选哪个**
> 个人博客 99% 的情况选静态就对了：构建一次全球分发、没有冷启动、免费额度用不完。
> 只有当你需要「按请求变化的内容」时才上 SSR。

---

## 部署到其它平台

产物是纯静态 HTML，`dist/` 可以直接丢给任何托管：

| 平台 | 做法 |
| --- | --- |
| Vercel | `vercel deploy`，输出目录 `dist` |
| Netlify | 构建命令 `pnpm build`，发布目录 `dist` |
| GitHub Pages | 用 Actions 构建后发布 `dist/`（注意设置 `base` 路径） |
| 自己的服务器 | `rsync -av dist/ user@host:/var/www/blog/` |
| 对象存储 + CDN | 上传 `dist/` 到 OSS / R2 / S3，开启静态网站托管 |

需要改的地方：

- `astro.config.mjs` 里把 `image.service` 设为 `undefined`（或设 `SKIP_SHARP=1` 环境变量），避免在非 Node 环境加载 sharp
- `SITE.url` 改成实际域名
- 不用 Pages Functions 的平台，浏览量组件会自动隐藏（或把 `FEATURES.views.apiBase` 指向一个独立的 Worker）

---

## 常见问题与踩坑

**改了 Markdown 插件 / Shiki 主题，页面没变化？**
Astro 会把渲染结果缓存到 `.astro/`，它不感知插件代码的变化。清一下再构建：

```bash
pnpm clean && pnpm build
```

**`pnpm check` 报 TypeScript 版本错误？**
`astro check` 目前支持到 TypeScript 6，项目里已把 `typescript` 固定在 `~6.0`。
如果你手动升到 TS 7，`astro check` 会直接拒绝运行（构建不受影响）。

**构建时提示找不到 `@astrojs/markdown-remark`？**
Astro 7 默认的 Markdown 处理器换成了 Sätteri，要用 `remarkPlugins` / `rehypePlugins` 必须显式安装它并在 `markdown.processor: unified({...})` 里挂插件。本项目已经配好。

**代码块在暗色模式下颜色不对？**
本项目用 Shiki 双主题（`themes: { light, dark }` + `defaultColor: false`），颜色写在行内 CSS 变量里，由 `src/styles/global.css` 中的 `.astro-code` 规则按 `data-theme` 切换。改了 Shiki 配置后记得 `pnpm clean`。

**页面首次加载闪一下白 / 黑？**
主题必须在**首屏绘制前**确定。`BaseLayout.astro` 里有一段 `is:inline` 脚本负责这件事，别改成普通 `<script>`（那会被延迟执行）。

**搜索在生产环境没结果？**
确认构建命令包含 `node scripts/pagefind.mjs`，并且 `dist/pagefind/` 被一起部署了。开发环境（`astro dev`）里 Pagefind 不存在，会自动退回 `/search-index.json`。

**部署后 OG 图 404？**
`/og/<path>.png` 是构建期生成的，检查 `dist/og/` 目录是否存在。也可以把 `Seo.astro` 里的默认图换成 `/og-default.png`。

**中文字体有点丑？**
正文走系统字体栈（保证加载速度）；标题用 Fraunces，代码用 JetBrains Mono，都由 Google Fonts 提供。想彻底离线自托管，把字体文件放 `public/fonts/` 再用 `@font-face` 引入。

**文章 URL 里带年份目录，能去掉吗？**
可以。把文章直接从 `src/content/blog/2026/xxx.md` 移到 `src/content/blog/xxx.md` 即可 —— URL 由文件路径决定。记得在 `public/_redirects` 里为老链接加 301。

---

## 快捷键

| 按键 | 作用 |
| --- | --- |
| `⌘K` / `Ctrl+K` | 打开命令面板 |
| `/` | 打开命令面板（不在输入框里时） |
| `↑` `↓` | 在命令面板里选择 |
| `↵` | 打开选中的结果 |
| `Esc` | 关闭面板 / 灯箱 |
| `←` `→` | 灯箱里翻上一张 / 下一张 |

---

## 许可

代码部分随意取用。文章内容（`src/content/` 下的 Markdown / MDX）为作者所有，转载请注明出处。
配色与吉祥物形象参考了公开的插画风格，仅用于个人站点示例。
