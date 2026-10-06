/* 往 KV 里塞几条示例留言，方便刚上线时看排版
 *   node scripts/seed-guestbook.mjs [--remote]
 * 需要先：wrangler login，并且 wrangler.toml 里填好了 BLOG_KV 的 id
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const remote = process.argv.includes('--remote');

const samples = [
	{
		id: 'seed-floor-1',
		name: '路过的猫',
		message: '配色好舒服，请问暗色模式也是同一套变量吗？',
		minutesAgo: 180,
	},
	{
		id: 'seed-floor-1-reply-1',
		name: 'Ash',
		message: '是的，同一套语义变量，切 data-theme 就换色。',
		minutesAgo: 170,
		parentId: 'seed-floor-1',
		replyToName: '路过的猫',
	},
	{
		id: 'seed-floor-1-reply-2',
		name: '一只企鹅',
		message: '楼上问得好，我也想知道这个问题。',
		minutesAgo: 150,
		parentId: 'seed-floor-1',
		replyToName: 'Ash',
	},
	{
		id: 'seed-floor-2',
		name: 'Ash 的朋友',
		message: '来串门了，友链已经挂上 ✦',
		minutesAgo: 12,
	},
];

for (const sample of samples) {
	const createdAt = Date.now() - sample.minutesAgo * 60_000;
	const entry = {
		id: sample.id,
		name: sample.name,
		message: sample.message,
		parentId: sample.parentId ?? null,
		replyToId: sample.parentId ?? null,
		replyToName: sample.replyToName ?? null,
		createdAt,
		ipHash: 'seed',
		ua: 'seed-script',
		tokenHash: null,
		hidden: false,
	};
	const args = [
		wrangler,
		'kv',
		'key',
		'put',
		`--binding=BLOG_KV`,
		`guestbook:${entry.id}`,
		JSON.stringify(entry),
	];
	if (remote) args.push('--remote');

	console.log(`→ 写入 ${entry.id}${entry.parentId ? `（回复 ${entry.parentId}）` : '（楼层）'}`);
	const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root });
	if (result.status !== 0) {
		console.error('✗ 写入失败，检查 wrangler 是否已登录、BLOG_KV 是否绑定了 id');
		process.exit(result.status ?? 1);
	}
}

const totalArgs = [wrangler, 'kv', 'key', 'put', '--binding=BLOG_KV', 'gb-total', String(samples.length)];
if (remote) totalArgs.push('--remote');
spawnSync(process.execPath, totalArgs, { stdio: 'inherit', cwd: root });

console.log(`✓ 已写入 ${samples.length} 条示例（2 个楼层 + 2 条回复，${remote ? '线上' : '本地模拟'}）`);
