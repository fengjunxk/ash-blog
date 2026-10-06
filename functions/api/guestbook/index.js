/**
 * 留言板列表 / 发布
 *
 *   GET  /api/guestbook[?withHidden=1&adminPassword=xxx]
 *        → { entries: 楼层[], total: 楼层数, replyTotal: 回复数, capabilities }
 *        每个楼层：{ id, name, message, createdAt, replyCount, replies: [...] }
 *        回复（replies）里带 replyToId / replyToName，用于渲染「回复 @某某」
 *   POST /api/guestbook
 *        { name, message, replyToId?, website?, turnstileToken?, adminPassword? }
 *        → { entry, token, total }
 *
 * 说明：
 *  - 昵称与内容都必填，无需登录、无需邮箱
 *  - 限流：同一 IP 20 秒一条、每小时 12 条
 *  - honeypot 字段 `website` 必须为空（机器人常会填）
 *  - 回复只做两层：回复「回复」时自动挂到同一个顶层楼层下（类似微博/知乎）
 *  - 留言总量不大，一次性返回全部，前端负责组楼层，避免回复被分页切断
 */
import {
	cleanText,
	clientIp,
	hash,
	json,
	keyOf,
	listEntries,
	MAX_ID,
	MAX_MESSAGE,
	MAX_NAME,
	newId,
	publicEntry,
	RATE_MIN_INTERVAL_MS,
	RATE_WINDOW_MAX,
	RATE_WINDOW_SECONDS,
	verifyTurnstile,
} from '../_guestbook.js';

const MIN_MESSAGE = 2;
const MAX_LINKS = 3;
const MAX_REPLIES_PER_FLOOR = 200;
const URL_PATTERN = /https?:\/\/|www\.[^\s]+/gi;

/** 把扁平的留言列表组装成「楼层 + 回复」，删掉的楼层用占位楼层保留上下文 */
function buildThreads(entries) {
	const floors = new Map(); // 楼层 id → 楼层对象
	const roots = [];

	for (const entry of entries) {
		if (!entry.parentId) {
			const floor = { ...entry, replies: [] };
			floors.set(entry.id, floor);
			roots.push(floor);
		}
	}

	for (const entry of entries) {
		if (!entry.parentId) continue;
		const floor = floors.get(entry.parentId);
		if (floor) {
			floor.replies.push(entry);
		} else {
			// 顶层楼层已删除：造一个占位楼层，别让下面的对话凭空消失
			const placeholder = {
				id: entry.parentId,
				name: '（已删除）',
				message: '',
				createdAt: entry.createdAt,
				hidden: true,
				replies: [entry],
			};
			floors.set(entry.parentId, placeholder);
			roots.push(placeholder);
		}
	}

	roots.sort((a, b) => b.createdAt - a.createdAt);
	for (const floor of roots) {
		floor.replies.sort((a, b) => a.createdAt - b.createdAt);
		if (floor.replies.length > MAX_REPLIES_PER_FLOOR) {
			floor.replies = floor.replies.slice(-MAX_REPLIES_PER_FLOOR);
		}
	}
	return roots;
}

export const onRequestGet = async ({ request, env }) => {
	if (!env.BLOG_KV) {
		return json(
			{
				error: 'kv_not_bound',
				hint: '在 Pages 项目里绑定名为 BLOG_KV 的 KV 命名空间即可启用留言板。',
			},
			503,
		);
	}

	const url = new URL(request.url);
	const wantsHidden = url.searchParams.get('withHidden') === '1';
	const adminPassword = env.GUESTBOOK_ADMIN_PASSWORD;
	const isAdmin = Boolean(
		wantsHidden && adminPassword && url.searchParams.get('adminPassword') === adminPassword,
	);

	const all = await listEntries(env);
	// 非管理员看不到被隐藏（已删除）的内容；管理员用占位楼层保留结构
	const visible = isAdmin ? all : all.filter((entry) => !entry.hidden && entry.message);
	const threads = buildThreads(visible);

	const entries = threads.map((floor) => {
		const replies = (floor.replies ?? []).map(publicEntry);
		return { ...publicEntry(floor), replyCount: replies.length, replies };
	});

	return json({
		entries,
		total: threads.length,
		replyTotal: entries.reduce((sum, floor) => sum + floor.replyCount, 0),
		capabilities: {
			adminReview: Boolean(adminPassword),
			turnstile: Boolean(env.TURNSTILE_SECRET_KEY),
		},
	});
};

export const onRequestPost = async ({ request, env }) => {
	if (!env.BLOG_KV) {
		return json(
			{
				error: 'kv_not_bound',
				hint: '在 Pages 项目里绑定名为 BLOG_KV 的 KV 命名空间即可启用留言板。',
			},
			503,
		);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_body', message: '请求格式不对' }, 400);
	}

	// —— 1. 反机器人：honeypot + 人机验证 ——
	if (typeof body.website === 'string' && body.website.trim() !== '') {
		return json({ error: 'spam_detected', message: '提交被拦截了' }, 400);
	}
	const turnstile = await verifyTurnstile(env, request, body.turnstileToken);
	if (!turnstile.ok) {
		return json({ error: turnstile.reason, message: '人机验证没通过，刷新页面再试一次' }, 403);
	}

	// —— 2. 字段校验 ——
	const name = cleanText(body.name, MAX_NAME);
	const message = cleanText(body.message, MAX_MESSAGE);
	const replyToId = cleanText(body.replyToId, MAX_ID);

	if (!name) return json({ error: 'name_required', message: '昵称不能为空' }, 400);
	if (!message) return json({ error: 'message_required', message: '留言内容不能为空' }, 400);
	if (message.length < MIN_MESSAGE) {
		return json({ error: 'message_too_short', message: `至少写 ${MIN_MESSAGE} 个字吧` }, 400);
	}
	const links = message.match(URL_PATTERN)?.length ?? 0;
	if (links > MAX_LINKS) {
		return json({ error: 'too_many_links', message: '链接太多了，先聊聊别的？' }, 400);
	}

	// —— 3. 回复关系（只做两层） ——
	let parentId = null;
	let replyToName = null;
	let resolvedReplyToId = null;
	if (replyToId) {
		const target = await env.BLOG_KV.get(keyOf(replyToId), { type: 'json' });
		if (!target || target.hidden) {
			return json({ error: 'reply_target_missing', message: '要回复的留言已经不在了' }, 404);
		}
		resolvedReplyToId = target.id;
		replyToName = target.name;
		// 回复的是「回复」→ 挂到它所在的顶层楼层；回复的是楼层 → 直接挂在楼层下
		parentId = target.parentId ?? target.id;
	}

	// —— 4. 限流：同 IP 最小间隔 + 每小时上限 ——
	const ip = clientIp(request);
	const ipHash = await hash(`ip:${ip}`);
	const rateKey = `gb-rate:${ipHash}`;
	const now = Date.now();
	let rate = { at: 0, count: 0 };
	try {
		rate = { ...rate, ...JSON.parse((await env.BLOG_KV.get(rateKey)) ?? '{}') };
	} catch {
		/* ignore */
	}

	const elapsed = now - (Number(rate.at) || 0);
	if (elapsed < RATE_MIN_INTERVAL_MS) {
		const wait = Math.ceil((RATE_MIN_INTERVAL_MS - elapsed) / 1000);
		return json({ error: 'too_fast', message: `慢一点，${wait} 秒后再发`, retryAfter: wait }, 429);
	}
	const windowExpired = now - (Number(rate.windowAt) || 0) > RATE_WINDOW_SECONDS * 1000;
	const windowCount = windowExpired ? 0 : Number(rate.count) || 0;
	if (windowCount >= RATE_WINDOW_MAX) {
		return json({ error: 'rate_limited', message: '这个小时说得够多了，歇会儿再来' }, 429);
	}

	// —— 5. 写入 ——
	const token = newId() + newId();
	const entry = {
		id: `${now.toString(36)}-${newId()}`,
		name,
		message,
		parentId,
		replyToId: resolvedReplyToId,
		replyToName,
		createdAt: now,
		ipHash,
		ua: cleanText(request.headers.get('user-agent') ?? '', 120),
		tokenHash: await hash(token),
		hidden: false,
	};

	await env.BLOG_KV.put(keyOf(entry.id), JSON.stringify(entry));
	await env.BLOG_KV.put(
		rateKey,
		JSON.stringify({
			at: now,
			count: windowCount + 1,
			windowAt: windowExpired ? now : Number(rate.windowAt) || now,
		}),
		{ expirationTtl: RATE_WINDOW_SECONDS + 60 },
	);

	const total = Number((await env.BLOG_KV.get('gb-total')) ?? '0') + 1;
	await env.BLOG_KV.put('gb-total', String(total));

	return json({ entry: publicEntry(entry), token, total }, 201);
};
