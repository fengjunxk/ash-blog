/**
 * 匿名留言板 —— 共享工具（Pages Functions）
 *
 * 存储：Cloudflare KV，键名 `guestbook:<id>`
 * 单条数据结构：
 *   {
 *     id, name, message,
 *     parentId,        // 顶层留言 id；为空表示自己就是顶层
 *     replyToId,       // 被回复的那条（可能是一层回复）
 *     replyToName,     // 被回复者的昵称，用来渲染「回复 @某某」
 *     createdAt, ipHash, ua, tokenHash, hidden
 *   }
 *
 * 结构约定：只有两层 —— 顶层留言 + 它下面的一串回复。
 * 回复「回复」时 parentId 仍指向顶层，replyToId/Name 指向具体那一条，
 * 这样既不会无限缩进，也不会丢上下文（和微博/知乎评论区的做法一致）。
 *
 * 需要的绑定：
 *   BLOG_KV                     —— KV 命名空间（和浏览量共用同一个即可）
 *   GUESTBOOK_ADMIN_PASSWORD    —— 可选。设置后可用它隐藏 / 删除任意留言
 *   TURNSTILE_SECRET_KEY        —— 可选。设置后启用人机验证（前端用 PUBLIC_TURNSTILE_SITE_KEY）
 */

export const KV_PREFIX = 'guestbook:';
export const MAX_NAME = 24;
export const MAX_MESSAGE = 600;
export const MAX_ID = 64;
export const MAX_PAGE = 50;

/** 同一 IP：两次留言最小间隔 + 每个时间窗上限 */
export const RATE_MIN_INTERVAL_MS = 20_000;
export const RATE_WINDOW_SECONDS = 3600;
export const RATE_WINDOW_MAX = 12;

export const json = (data, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		},
	});

export const clientIp = (request) =>
	request.headers.get('cf-connecting-ip') ||
	request.headers.get('x-real-ip') ||
	(request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
	'unknown';

/** 只用于去重与限流，不落明文 IP */
export async function hash(value) {
	const data = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/** 去掉控制字符、压缩空白、裁掉过长内容 */
export function cleanText(value, maxLength) {
	if (typeof value !== 'string') return '';
	return value
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
		.replace(/\r\n?/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
		.slice(0, maxLength);
}

export const keyOf = (id) => `${KV_PREFIX}${id}`;

export function newId() {
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 列出全部留言（KV 不分页返回有序数据，取回来自己排） */
export async function listEntries(env, limit = 300) {
	const keys = [];
	let cursor;
	do {
		const result = await env.BLOG_KV.list({ prefix: KV_PREFIX, cursor, limit: 500 });
		keys.push(...result.keys);
		cursor = result.list_complete ? undefined : result.cursor;
	} while (cursor && keys.length < limit);

	const values = await Promise.all(
		keys.slice(0, limit).map((key) => env.BLOG_KV.get(key.name, { type: 'json' }).catch(() => null)),
	);

	return values.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
}

/** 公开视图：去掉 ipHash / tokenHash 等内部字段 */
export function publicEntry(entry) {
	return {
		id: entry.id,
		name: entry.name,
		message: entry.message,
		parentId: entry.parentId ?? null,
		replyToId: entry.replyToId ?? null,
		replyToName: entry.replyToName ?? null,
		createdAt: entry.createdAt,
		hidden: Boolean(entry.hidden),
	};
}

/** 软删除：内容清空 + 标记，保留记录以便排查滥用 */
export async function softDelete(env, id) {
	const key = keyOf(id);
	const entry = await env.BLOG_KV.get(key, { type: 'json' });
	if (!entry) return null;
	entry.hidden = true;
	entry.message = '';
	entry.deletedAt = Date.now();
	await env.BLOG_KV.put(key, JSON.stringify(entry));
	return entry;
}

/** 人机验证（可选）：未配置密钥时直接放行 */
export async function verifyTurnstile(env, request, token) {
	const secret = env.TURNSTILE_SECRET_KEY;
	if (!secret) return { ok: true, skipped: true };
	if (!token) return { ok: false, reason: 'missing_token' };
	const body = new FormData();
	body.append('secret', secret);
	body.append('response', token);
	body.append('remoteip', clientIp(request));
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body,
		});
		const data = await res.json();
		return data.success ? { ok: true } : { ok: false, reason: 'turnstile_failed' };
	} catch {
		return { ok: false, reason: 'turnstile_error' };
	}
}
