---
title: 你好，世界（以及这个博客的第一篇文章）
description: 关于这个站点为什么存在、用了什么技术、以及我打算在这儿写点什么。
published: 2026-07-18
category: 随笔
tags: [博客, Astro, Cloudflare]
pinned: true
---

每次搭新博客，第一篇文章都最难写。既不想写「Hello World」这么敷衍，又不想一上来就长篇大论。

最后决定：就把这个站点本身讲清楚吧。

## 为什么要重新做一个博客

之前那个站点是四年前搭的，主题装了又卸、插件越堆越多，构建一次要四十多秒。更糟的是，我已经不太敢改它了 —— 动一行样式，不知道哪里会塌。

所以这次的原则很简单：

- **内容用 Markdown 写**，不碰数据库，随时能搬走
- **样式自己写**，只有一个设计令牌文件，改一处全站生效
- **能静态就静态**，托管在全球边缘节点上，访问快、还不要钱
- **功能该有的都有**，但每一个都能一行配置关掉

> [!NOTE] 关于配色
> 这个站的配色来自一张我很喜欢的插画：暖白的纸底、灰褐色的毛发、近黑的针织帽，还有一点点腮红粉。
> 粉只用在最需要被看到的地方 —— 链接、强调、以及那几颗飘着的小爱心。

## 技术栈

| 部分 | 选择 | 为什么 |
| --- | --- | --- |
| 框架 | Astro 7 | 默认零 JS，需要交互的地方再局部水合 |
| 样式 | Tailwind CSS v4 | `@theme` 写设计令牌，不用再维护一份配置 |
| 搜索 | Pagefind | 构建期生成索引，前端只加载几百 KB |
| 评论 | Giscus | 存在 GitHub Discussions 里，不依赖任何后端 |
| 统计 | Cloudflare KV | 浏览量和点赞，边缘读写，延迟个位数毫秒 |
| 托管 | Cloudflare Pages | 免费、全球 CDN、推上去就发布 |

## 一小段代码

写文章时最常用的还是代码块。这里的主题是 Catppuccin 的 Latte / Mocha，亮暗色各自一套：

```ts title="src/lib/blog.ts"
export async function getPosts(options: { includeDrafts?: boolean } = {}): Promise<Post[]> {
	const includeDrafts = options.includeDrafts ?? !import.meta.env.PROD;
	const posts = await getCollection('blog', ({ data }) => includeDrafts || !data.draft);
	return posts.sort(sortPosts);
}
```

终端命令就长这样：

```bash
# 本地开发
pnpm dev

# 构建（含搜索索引）
pnpm build

# 部署到 Cloudflare Pages
pnpm cf:deploy
```

## 会写些什么

大概会是这几类：

1. **工程笔记** —— 踩过的坑、为什么这么选、以及事后觉得该怎么做
2. **Cloudflare 相关** —— 边缘计算、Workers、KV，最近很上头
3. **设计随笔** —— 排版、配色、交互细节，纯个人审美
4. **生活碎片** —— 偶尔写点不那么技术的东西

> [!TIP] 订阅方式
> 不想隔三差五来翻的话，直接用 [RSS](/rss.xml) 订阅就好。没有算法，也没有推送打扰。

## 最后

如果你也在搭自己的博客，希望这里的某些实现能给你一点灵感 —— 所有代码都在仓库里，随便看。

就这样，第一篇写完 ✦
