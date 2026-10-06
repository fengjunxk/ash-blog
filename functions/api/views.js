/**
 * 浏览量 / 点赞：Cloudflare KV 实现（Pages Functions）
 *
 * 绑定方式（二选一）：
 *  1. Cloudflare Dashboard → Workers & Pages → 你的 Pages 项目 → Settings → Functions
 *     → KV namespace bindings → 变量名填 BLOG_KV，选一个命名空间
 *  2. wrangler.toml / wrangler.jsonc 里写好 kv_namespaces 再 `wrangler pages deploy`
 *
 * 没有绑定 KV 时，接口会返回 503，前端组件会自动隐藏（页面不受影响）。
 */

const MAX_SLUG_LENGTH = 220;
const VIEW_COOLDOWN_SECONDS = 1800; // 同一 IP 对同一篇文章 30 分钟只记一次

const json = (data, status = 200, extra = {}) =>
	new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
			...extra,
		},
	});

const normalizeSlug = (value) => {
	if (typeof value !== 'string') return null;
	const slug = value.trim().slice(0, MAX_SLUG_LENGTH);
	if (!slug || /[\u0000-\u001f]/.test(slug)) return null;
	return slug.startsWith('/') ? slug : `/${slug}`;
};

const keyOf = (slug) => `post:${slug}`;

const readStats = async (env, slug) => {
	const raw = await env.BLOG_KV.get(keyOf(slug));
	if (!raw) return { views: 0, likes: 0 };
	try {
		const parsed = JSON.parse(raw);
		return { views: Number(parsed.views) || 0, likes: Number(parsed.likes) || 0 };
	} catch {
		return { views: 0, likes: 0 };
	}
};

export const onRequestPost = async ({ request, env }) => {
	return handle(request, env, true);
};

export const onRequestGet = async ({ request, env }) => {
	return handle(request, env, false);
};

async function handle(request, env, countView) {
	if (!env.BLOG_KV) {
		return json(
			{
				error: 'kv_not_bound',
				hint: '在 Pages 项目里绑定一个名为 BLOG_KV 的 KV 命名空间即可启用浏览量统计。',
			},
			503,
		);
	}

	const url = new URL(request.url);
	let slug = normalizeSlug(url.searchParams.get('slug'));
	if (!slug && request.method === 'POST') {
		try {
			const body = await request.clone().json();
			slug = normalizeSlug(body?.slug);
		} catch {
			/* ignore */
		}
	}
	if (!slug) return json({ error: 'invalid_slug' }, 400);

	const stats = await readStats(env, slug);

	if (countView) {
		const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
		const bucket = Math.floor(Date.now() / (VIEW_COOLDOWN_SECONDS * 1000));
		// 用 KV 的过期能力做去重：同一个 IP + 时间片只算一次
		const dedupeKey = `seen:${slug}:${ip}:${bucket}`;
		const seen = await env.BLOG_KV.get(dedupeKey);
		if (!seen) {
			await env.BLOG_KV.put(dedupeKey, '1', { expirationTtl: VIEW_COOLDOWN_SECONDS + 60 });
			stats.views += 1;
			await env.BLOG_KV.put(keyOf(slug), JSON.stringify(stats));
		}
	}

	return json({ slug, ...stats });
}
