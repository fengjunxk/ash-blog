/**
 * 删除自己的留言 / 管理员隐藏留言
 *
 *   DELETE /api/guestbook/:id
 *     body: { token }             —— 发布时返回的凭证，删除本人留言
 *     body: { adminPassword }     —— 站点主，可隐藏任意留言（含刷屏内容）
 *
 * 删除楼层（顶层留言）时，它下面的所有回复会一起隐藏，避免出现孤儿回复。
 * 普通删除是软删除：内容清空、标记 hidden，记录保留便于排查滥用。
 * 想彻底删掉：Cloudflare Dashboard → KV，删除以 `guestbook:` 开头的对应键。
 */
import { cleanText, hash, json, keyOf, listEntries, softDelete } from '../_guestbook.js';

export const onRequestDelete = async ({ request, env, params }) => {
	if (!env.BLOG_KV) {
		return json({ error: 'kv_not_bound' }, 503);
	}

	const id = cleanText(params?.id ?? '', 64);
	if (!id) return json({ error: 'invalid_id', message: '找不到这条留言' }, 400);

	let body = {};
	try {
		body = await request.json();
	} catch {
		/* 允许空 body，但那样一定没有权限 */
	}

	const key = keyOf(id);
	const entry = await env.BLOG_KV.get(key, { type: 'json' });
	if (!entry) return json({ error: 'not_found', message: '这条留言已经不在了' }, 404);

	const adminPassword = env.GUESTBOOK_ADMIN_PASSWORD;
	const isAdmin = Boolean(adminPassword && body.adminPassword === adminPassword);
	const isOwner = Boolean(
		entry.tokenHash && typeof body.token === 'string' && (await hash(body.token)) === entry.tokenHash,
	);

	if (!isAdmin && !isOwner) {
		return json({ error: 'forbidden', message: '没有权限删除这条留言' }, 403);
	}

	// 删楼层时把楼里的回复一起收走
	let cascaded = 0;
	if (!entry.parentId) {
		const all = await listEntries(env);
		const children = all.filter((item) => item.parentId === id && !item.hidden);
		for (const child of children) {
			await softDelete(env, child.id);
			cascaded += 1;
		}
	}

	await softDelete(env, id);

	const total = Math.max(0, Number((await env.BLOG_KV.get('gb-total')) ?? String(1 + cascaded)) - 1 - cascaded);
	await env.BLOG_KV.put('gb-total', String(total));

	return json({ ok: true, id, by: isAdmin ? 'admin' : 'owner', cascaded });
};
