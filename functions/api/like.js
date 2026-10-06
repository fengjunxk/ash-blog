/**
 * 点赞：POST /api/like  { slug: "/blog/xxx/", undo?: boolean }
 * 用 KV 存计数；同一浏览器重复点赞由前端 localStorage 控制（可撤销）。
 */

const MAX_SLUG_LENGTH = 220;

const json = (data, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
	});

const normalizeSlug = (value) => {
	if (typeof value !== 'string') return null;
	const slug = value.trim().slice(0, MAX_SLUG_LENGTH);
	if (!slug || /[\u0000-\u001f]/.test(slug)) return null;
	return slug.startsWith('/') ? slug : `/${slug}`;
};

export const onRequestPost = async ({ request, env }) => {
	if (!env.BLOG_KV) {
		return json({ error: 'kv_not_bound', hint: '请先给 Pages 项目绑定 BLOG_KV。' }, 503);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_body' }, 400);
	}

	const slug = normalizeSlug(body?.slug);
	if (!slug) return json({ error: 'invalid_slug' }, 400);

	const key = `post:${slug}`;
	let stats = { views: 0, likes: 0 };
	try {
		stats = { ...stats, ...JSON.parse((await env.BLOG_KV.get(key)) ?? '{}') };
	} catch {
		/* ignore */
	}

	const delta = body?.undo ? -1 : 1;
	stats.views = Number(stats.views) || 0;
	stats.likes = Math.max(0, (Number(stats.likes) || 0) + delta);
	await env.BLOG_KV.put(key, JSON.stringify(stats));

	return json({ slug, ...stats });
};
