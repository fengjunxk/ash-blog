---
title: 给博客加全文搜索：Pagefind 的两百行替代方案
description: 静态站点做搜索，最容易想到的是 FlexSearch 或 Algolia。这次我选了 Pagefind，顺手对比一下几种方案在中文场景下的实际表现。
published: 2026-08-14
category: 工程
tags: [搜索, Pagefind, 静态站点, 性能]
---

博客写多了以后，自己都找不到以前写过什么。加搜索这件事拖了半年，最近终于做完了。

## 方案对比

| 方案 | 索引位置 | 中文分词 | 额外服务 | 首次加载 |
| --- | --- | --- | --- | --- |
| Algolia | 云端 | 好 | 需要 | 网络请求 |
| FlexSearch | 浏览器 | 需自己处理 | 无 | 全量索引 |
| Lunr | 浏览器 | 一般 | 无 | 全量索引 |
| **Pagefind** | 构建期 | 内置 | 无 | 按需分片 |

关键区别在最后一行：Pagefind 把索引**切成很多小片**，搜索时只加载命中的那几片。文章越多，这个优势越明显。

## 装起来只要三步

```bash
pnpm add -D pagefind
```

```json title="package.json"
{
	"scripts": {
		"build": "astro build && pagefind --site dist"
	}
}
```

```js title="搜索调用"
const pagefind = await import('/pagefind/pagefind.js');
await pagefind.init();
const results = await pagefind.search('cloudflare');
```

就这样，没有配置文件，没有 API key。

> [!NOTE] 中文能用吗
> 可以。Pagefind 内部用 jieba 的 WASM 版本做分词，中文搜索的词组召回率比 Lunr 那种纯前缀匹配好得多。
> 但它对「同义词」无能为力 —— 搜「边缘计算」不会命中只写了「Workers」的文章。

## 部署后的一个坑

Pagefind 生成的 `/pagefind/pagefind.js` 是**运行时动态加载**的，所以：

1. 构建顺序必须是 `astro build` **之后**再跑 `pagefind`
2. 开发环境（`astro dev`）里这个文件不存在，得准备兜底方案

我的做法是双轨：生产用 Pagefind，开发环境和它加载失败时退回一份构建期生成的 JSON 索引。

```js
// 优先 Pagefind，失败就退回本地 JSON 索引
let merged = localSearch(query);
try {
	const pf = await import('/pagefind/pagefind.js');
	const res = await pf.search(query);
	merged = mergeResults(local, res.results);
} catch {
	/* 保持本地结果 */
}
```

本地兜底索引只有几十 KB，用中文按二元组分词 + 字段加权（标题 30 分、标签 14 分、正文每次命中 5 分），效果意外地够用。

## 构建时间

加索引之前 4.2 秒，之后 5.1 秒。多出来的不到一秒换来全文搜索，这个交易我觉得很划算。

```
[build] 42 page(s) built in 4.21s
Running Pagefind v1.5.2
Indexed 42 pages, 186 words
[build] Complete!
```

## 还能更好吗

有几个想法，但暂时不做：

- **搜索历史**：把最近搜过的词存在 localStorage，命令面板打开时展示
- **键盘优先**：现在 `↑↓` 能选，`⌘K` 能开，但还不支持在结果里 `Tab` 跳分组
- **语义搜索**：用 Workers AI 做向量检索，不过对个人博客来说属于过度设计

> [!TIP] 判断要不要做某个功能
> 问自己：「没有它，我会不会少写文章？」如果答案是不会，那就先别做。
> 搜索是少数几个影响了「我愿不愿意继续写」的功能之一 —— 因为找不到旧文，就不想写新的。

现在按 `⌘K` 能搜到所有文章了。有问题欢迎来[留言板](/guestbook/)聊。
