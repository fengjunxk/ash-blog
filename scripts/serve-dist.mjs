/* 零依赖静态服务器：用来本地预览 dist/ 产物（含 /api 桩，方便看浏览量组件）
 *   node scripts/serve-dist.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'dist');
const port = Number(process.argv[2] ?? 4321);

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.woff2': 'font/woff2',
	'.wasm': 'application/wasm',
	'.pf_fragment': 'application/octet-stream',
};

// 本地演示用的内存存储（线上由 Cloudflare KV 承担）
const store = new Map();
const guestbook = new Map();
const guestbookTokens = new Map();
// 本地演示时的管理密码（线上用 Pages 环境变量 GUESTBOOK_ADMIN_PASSWORD）
const ADMIN_PASSWORD = process.env.GUESTBOOK_ADMIN_PASSWORD ?? '';
let guestbookSeq = 1;
const now = Date.now();
/** 复刻 functions/api/guestbook/index.js 的组楼层逻辑 */
function buildThreads(entries) {
	const floors = new Map();
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
		if (floor) floor.replies.push(entry);
		else {
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
	for (const floor of roots) floor.replies.sort((a, b) => a.createdAt - b.createdAt);
	return roots;
}
// 预置一个带回复的示例楼层，方便看楼中楼排版
{
	const floorId = `seed-${guestbookSeq++}`;
	guestbook.set(floorId, {
		id: floorId,
		name: '路过的猫',
		message: '配色好舒服，请问暗色模式也是同一套变量吗？',
		parentId: null,
		replyToId: null,
		replyToName: null,
		createdAt: now - 46 * 60_000,
		hidden: false,
	});
	for (const reply of [
		{ name: 'Ash', message: '是的，同一套语义变量，切 data-theme 就换色。', minutesAgo: 41 },
		{ name: '一只企鹅', message: '楼上问得好，我也想知道这个问题。', minutesAgo: 33, replyToName: '路过的猫' },
	]) {
		const id = `seed-${guestbookSeq++}`;
		guestbook.set(id, {
			id,
			name: reply.name,
			message: reply.message,
			parentId: floorId,
			replyToId: floorId,
			replyToName: reply.replyToName ?? '路过的猫',
			createdAt: now - reply.minutesAgo * 60_000,
			hidden: false,
		});
	}
	const secondId = `seed-${guestbookSeq++}`;
	guestbook.set(secondId, {
		id: secondId,
		name: '一只企鹅',
		message: '留言板的交互做得挺细的，居然还能自己删。',
		parentId: null,
		replyToId: null,
		replyToName: null,
		createdAt: now - 5 * 60_000,
		hidden: false,
	});
}

const json = (res, data, status = 200) => {
	res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
	res.end(JSON.stringify(data));
};

const readBody = (req) =>
	new Promise((resolve) => {
		/** @type {Buffer[]} */
		const chunks = [];
		req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
		req.on('end', () => {
			try {
				// Cloudflare Pages 按 UTF-8 解析请求体，这里保持一致，否则中文会乱码
				const raw = Buffer.concat(chunks).toString('utf8');
				resolve(raw ? JSON.parse(raw) : {});
			} catch {
				resolve({});
			}
		});
	});

const server = createServer(async (req, res) => {
	const url = new URL(req.url ?? '/', `http://localhost:${port}`);

	// —— /api 桩 ——
	if (url.pathname === '/api/views') {
		const slug = url.searchParams.get('slug') ?? '/';
		const rec = store.get(slug) ?? { views: 0, likes: 0 };
		if (req.method === 'POST') rec.views += 1;
		store.set(slug, rec);
		return json(res, rec);
	}
	if (url.pathname === '/api/like') {
		const body = await readBody(req);
		const slug = body.slug ?? '/';
		const rec = store.get(slug) ?? { views: 0, likes: 0 };
		rec.likes = Math.max(0, rec.likes + (body.undo ? -1 : 1));
		store.set(slug, rec);
		return json(res, rec);
	}

	// —— 留言板桩（结构与 functions/api/guestbook 保持一致） ——
	if (url.pathname === '/api/guestbook') {
		if (req.method === 'GET') {
			const isAdmin =
				url.searchParams.get('withHidden') === '1' &&
				Boolean(ADMIN_PASSWORD) &&
				url.searchParams.get('adminPassword') === ADMIN_PASSWORD;
			const all = [...guestbook.values()].filter((e) => isAdmin || (!e.hidden && e.message));
			const threads = buildThreads(all);
			const entries = threads.map((floor) => {
				const replies = floor.replies ?? [];
				return { ...floor, replyCount: replies.length, replies };
			});
			return json(res, {
				entries,
				total: entries.length,
				replyTotal: entries.reduce((sum, floor) => sum + floor.replyCount, 0),
				hasMore: false,
				capabilities: { adminReview: Boolean(ADMIN_PASSWORD), turnstile: false },
			});
		}
		if (req.method === 'POST') {
			const body = await readBody(req);
			if (typeof body.website === 'string' && body.website.trim() !== '') {
				return json(res, { error: 'spam_detected', message: '提交被拦截了' }, 400);
			}
			const name = String(body.name ?? '').trim().slice(0, 24);
			const message = String(body.message ?? '').trim().slice(0, 600);
			if (!name) return json(res, { error: 'name_required', message: '昵称不能为空' }, 400);
			if (message.length < 2) {
				return json(res, { error: 'message_too_short', message: '至少写 2 个字吧' }, 400);
			}
			// 两层结构：回复「回复」时挂到它所在的顶层楼层
			let parentId = null;
			let replyToId = null;
			let replyToName = null;
			const target = body.replyToId ? guestbook.get(String(body.replyToId)) : null;
			if (body.replyToId && (!target || target.hidden)) {
				return json(res, { error: 'reply_target_missing', message: '要回复的留言已经不在了' }, 404);
			}
			if (target) {
				replyToId = target.id;
				replyToName = target.name;
				parentId = target.parentId ?? target.id;
			}
			const id = `local-${Date.now().toString(36)}-${guestbookSeq++}`;
			const token = `tk-${Math.random().toString(36).slice(2)}`;
			const entry = {
				id,
				name,
				message,
				parentId,
				replyToId,
				replyToName,
				createdAt: Date.now(),
				hidden: false,
			};
			guestbook.set(id, entry);
			guestbookTokens.set(id, token);
			return json(res, { entry, token, total: guestbook.size }, 201);
		}
	}
	if (url.pathname.startsWith('/api/guestbook/') && req.method === 'DELETE') {
		const id = decodeURIComponent(url.pathname.replace('/api/guestbook/', ''));
		const body = await readBody(req);
		const entry = guestbook.get(id);
		if (!entry) return json(res, { error: 'not_found', message: '这条留言已经不在了' }, 404);
		const isAdmin = Boolean(ADMIN_PASSWORD) && body.adminPassword === ADMIN_PASSWORD;
		const isOwner = guestbookTokens.get(id) === body.token;
		if (!isAdmin && !isOwner) {
			return json(res, { error: 'forbidden', message: '没有权限删除这条留言' }, 403);
		}
		let cascaded = 0;
		if (!entry.parentId) {
			for (const child of guestbook.values()) {
				if (child.parentId === id && !child.hidden) {
					child.hidden = true;
					child.message = '';
					cascaded += 1;
				}
			}
		}
		entry.hidden = true;
		entry.message = '';
		return json(res, { ok: true, id, by: isAdmin ? 'admin' : 'owner', cascaded });
	}

	// —— 静态文件 ——
	let filePath = path.join(root, decodeURIComponent(url.pathname));
	if (path.relative(root, filePath).startsWith('..')) {
		res.writeHead(403).end('Forbidden');
		return;
	}
	try {
		const info = await stat(filePath).catch(() => null);
		if (!info || info.isDirectory()) filePath = path.join(filePath, 'index.html');
		const data = await readFile(filePath);
		res.writeHead(200, {
			'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
			'cache-control': 'no-cache',
		});
		res.end(data);
	} catch {
		try {
			const data = await readFile(path.join(root, '404.html'));
			res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
			res.end(data);
		} catch {
			res.writeHead(404).end('Not found');
		}
	}
});

server.listen(port, () => {
	console.log(`▸ 预览：http://localhost:${port}  (dist/ + /api 桩)`);
});
