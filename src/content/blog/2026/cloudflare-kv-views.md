---
title: 用 Cloudflare Pages + KV 给静态博客加上浏览量和点赞
description: 静态站点也能有动态数据。这篇记录怎么用 Pages Functions 和 KV 做一个零成本、边缘读写的计数服务，包括去重、防刷和优雅降级。
published: 2026-07-25
updated: 2026-08-02
category: 工程
tags: [Cloudflare, Workers, 边缘计算, 静态站点]
series: 边缘上的博客
---

静态博客最尴尬的地方：什么都好，就是「没有后端」。想看个浏览量、收个点赞，就得挂个第三方服务，或者忍受一个慢吞吞的 Serverless 冷启动。

Cloudflare Pages 上其实有个很轻的解法：**Pages Functions + KV**。不用新开项目，不用管服务器，写完推到 `functions/` 目录就生效。

## 整体思路

```text
浏览器
  └── POST /api/views?slug=/blog/xxx/     ← 前端组件一进页面就调
        └── Pages Function（跑在最近的边缘节点）
              ├── 读 KV：post:/blog/xxx/  → { views, likes }
              ├── 用 KV 的 TTL 做 30 分钟去重
              └── 写回 KV，返回最新计数
```

KV 是最终一致的键值存储，读写都发生在离用户最近的节点，**读延迟通常个位数毫秒**。对于「浏览量」这种稍微旧一点也无所谓的场景，简直完美。

> [!IMPORTANT] KV 不适合什么
> 需要强一致、需要事务、需要复杂查询的场景（比如订单、库存、积分兑换）请不要用 KV。
> 那种需求该上 D1 或者 Durable Objects。

## 第一步：建一个 KV 命名空间

```bash
# 需要先安装 wrangler 并登录
pnpm add -D wrangler
pnpm exec wrangler login

# 创建命名空间，记下输出的 id
pnpm exec wrangler kv namespace create BLOG_KV
```

输出会长这样：

```toml
[[kv_namespaces]]
binding = "BLOG_KV"
id = "a1b2c3d4e5f60718293a4b5c6d7e8f90"
```

把这段贴进项目根目录的 `wrangler.toml`。如果你是用 Dashboard 部署（连 GitHub 仓库那种），也可以直接在 **Settings → Functions → KV namespace bindings** 里绑定，变量名写 `BLOG_KV`。

## 第二步：写接口

Pages Functions 用文件路径当路由：`functions/api/views.js` 就对应 `/api/views`。

```js title="functions/api/views.js"
export const onRequestPost = async ({ request, env }) => {
	if (!env.BLOG_KV) {
		return new Response(JSON.stringify({ error: 'kv_not_bound' }), { status: 503 });
	}

	const slug = new URL(request.url).searchParams.get('slug') ?? '/';
	const key = `post:${slug}`;

	const stats = { views: 0, likes: 0, ...JSON.parse((await env.BLOG_KV.get(key)) ?? '{}') };

	// 用「IP + 时间片」当去重键，借用 KV 的过期自动清理
	const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
	const bucket = Math.floor(Date.now() / (30 * 60 * 1000));
	const seenKey = `seen:${slug}:${ip}:${bucket}`;

	if (!(await env.BLOG_KV.get(seenKey))) {
		await env.BLOG_KV.put(seenKey, '1', { expirationTtl: 1860 });
		stats.views += 1;
		await env.BLOG_KV.put(key, JSON.stringify(stats));
	}

	return new Response(JSON.stringify({ slug, ...stats }), {
		headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
	});
};
```

几个细节值得说一下：

- **`env.BLOG_KV` 没绑定时返回 503**，而不是 500。前端看到 503 就安静隐藏组件，页面完全不受影响。
- **`cache-control: no-store`** 必须加，否则 CDN 会把计数缓存住，所有人都看到同一个数字。
- **去重键用 TTL 自动过期**，不需要额外的定时任务清理。

> [!WARNING] 这只是防手滑，不是防刷
> 换个 IP 或者清掉 cookie 就能再刷一次。真要防刷得上 Turnstile 人机验证，或者对高频请求做限流。
> 一个个人博客的浏览量，不值得为它引入这些复杂度 —— 想通这一点省下不少时间。

## 第三步：前端优雅降级

前端组件最容易被忽略的是「接口挂了怎么办」。我的做法是：**默认隐藏，成功才显示**。

```html
<div data-views-root data-slug="/blog/xxx/" hidden>
	<span data-views-value>—</span>
</div>
```

```js
fetch(`/api/views?slug=${encodeURIComponent(slug)}`, { method: 'POST' })
	.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
	.then((data) => {
		root.removeAttribute('hidden');
		value.textContent = new Intl.NumberFormat('zh-CN').format(data.views);
	})
	.catch(() => root.setAttribute('hidden', ''));
```

这样带来一个额外好处：**同一份代码在纯静态托管上也能用**。没有 Functions 的环境（比如 GitHub Pages）请求会 404，组件自动隐身，页面依然干净。

## 顺手加的安全头

Pages 支持用 `_headers` 文件加响应头，但如果内容需要按请求动态生成，用中间件更灵活：

```js title="functions/_middleware.js"
const SECURITY_HEADERS = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'x-frame-options': 'SAMEORIGIN',
	'permissions-policy': 'geolocation=(), microphone=(), camera=()',
	'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

export const onRequest = async (context) => {
	const response = await context.next();
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(key)) headers.set(key, value);
	}
	if (new URL(context.request.url).pathname.startsWith('/api/')) {
		headers.set('cache-control', 'no-store');
	}
	return new Response(response.body, { status: response.status, headers });
};
```

## 成本

| 项目 | 免费额度 | 这个博客的用量 |
| --- | --- | --- |
| Pages 构建 | 500 次/月 | 约 40 次 |
| Functions 请求 | 100,000 次/天 | 每天几百 |
| KV 读取 | 100,000 次/天 | 每天几千 |
| KV 写入 | 1,000 次/天 | 每天几十 |

结论：**在免费额度内，基本看不到天花板**。除非你的博客突然火了 —— 那也算是个幸福的烦恼。

## 小结

- 静态站点的动态需求，优先考虑 Pages Functions，而不是另起一个服务
- KV 的 TTL 可以当「带自动清理的去重表」用，很省事
- 前端一定要能优雅降级，接口挂了页面也得好看
- `cf-connecting-ip` 是 Cloudflare 给你的真实访客 IP，比 `x-forwarded-for` 更可信

下一篇打算写写用 D1 做文章阅读记录，顺便试试 Workers 的定时任务。如果你也在折腾 Cloudflare，欢迎来[留言板](/guestbook/)聊聊。
