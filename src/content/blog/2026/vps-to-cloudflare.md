---
title: 博客迁移记：从 VPS 到 Cloudflare Pages
description: 关掉那台每个月 5 美元的 VPS 之后，我把博客搬到了 Cloudflare Pages。记录迁移过程、踩到的坑，以及一年下来的实际账单。
published: 2026-02-09
category: 工程
tags: [Cloudflare, 部署, 运维]
---

那台 VPS 我续费了三年。它跑着一个 Nginx、一个 Node 进程、一个自动续期的 certbot 定时任务，以及一块我自己都忘了里面有什么的挂载盘。

终于在某次半夜收到「磁盘写满」告警之后，我决定把它关掉。

## 迁移前的状态

```text
VPS：1 核 1G，每月 $5
  ├── Nginx 反代
  ├── Node SSR 进程（PM2 守着，崩过 7 次）
  ├── SQLite 存浏览量
  ├── certbot 自动续证书
  └── 我自己写的部署脚本（用 rsync + ssh）

每月维护成本：约 40 分钟
```

真正的问题不是钱，是**那 40 分钟**。每次想改点东西，都要先回忆起部署脚本怎么用的。

## 迁移步骤

### 1. 内容搬出来

原来文章存在 SQLite 里，写了个脚本导出成 Markdown：

```js
const rows = db.prepare('SELECT * FROM posts ORDER BY published_at DESC').all();
for (const row of rows) {
	const frontmatter = [
		'---',
		`title: ${row.title}`,
		`description: ${row.summary ?? ''}`,
		`published: ${row.published_at}`,
		`category: ${row.category}`,
		`tags: [${(row.tags ?? '').split(',').filter(Boolean).join(', ')}]`,
		'---',
		'',
	].join('\n');
	await writeFile(`src/content/blog/${slug}.md`, frontmatter + row.body);
}
```

### 2. 浏览量数据别丢

导出成 JSON，写进 KV：

```bash
pnpm exec wrangler kv key put --binding=BLOG_KV \
  "post:/blog/hello-world/" '{"views":1204,"likes":37}'
```

### 3. 接上 Pages

在 Dashboard 里连上 GitHub 仓库，构建配置：

```text
Build command:       pnpm build
Build output dir:    dist
Node version:        22
环境变量：            NODE_VERSION=22
```

> [!WARNING] 构建环境的 Node 版本
> Pages 默认的 Node 版本可能比你本地旧。一定要显式设 `NODE_VERSION`，
> 否则会遇到「本地能构建，线上报语法错误」这种玄学问题。

## 踩到的三个坑

**坑一：大小写敏感。** 本地 macOS 不区分大小写，Linux 构建机区分。`import Foo from './foo'` 在本地能跑，线上就报错。加了个 lint 规则强制检查。

**坑二：重定向没配。** 老站点的 URL 是 `/post/123`，新站是 `/blog/slug/`。忘了配重定向，搜索引擎里的链接全变 404。后来用 `public/_redirects` 补上：

```text
/post/:id    /blog/:id    301
```

**坑三：构建缓存。** Pages 会缓存 `node_modules`，有时依赖更新了但缓存没失效。遇到过一次「代码改了，构建产物没变」，加了 `pnpm install --force` 才排查出来。

## 一年后的账单

| 项目 | 用量 | 费用 |
| --- | --- | --- |
| Pages 构建 | 380 次 | $0 |
| Pages 请求 | 约 90 万次 | $0 |
| Functions 请求 | 约 12 万次 | $0 |
| KV 读 / 写 | 210 万 / 3.4 万 | $0 |
| 域名 | 1 个 | $11 / 年 |
| **合计** | | **$11 / 年** |

从每月 5 美元 + 40 分钟维护，变成每年 11 美元 + 0 分钟维护。

## 现在的部署流程

```bash
git add .
git commit -m "post: 新文章"
git push
```

完事。CI 会在两分钟内完成构建、生成搜索索引、部署到全球节点。

> [!TIP] 迁移的判断标准
> 如果一个服务的「维护时间 × 你的时薪」已经超过它的年费，就该考虑换掉了。
> 对我来说 40 分钟/月 × 12 个月 = 8 小时，怎么算都不划算。

现在唯一的运维工作是：每年续一次域名。
