/* Pagefind 全文索引：在 astro build 之后运行，产物写入 dist/pagefind */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

if (!existsSync(dist)) {
	console.error('✗ 没找到 dist/，先跑 astro build');
	process.exit(1);
}

const bin = path.join(root, 'node_modules', 'pagefind', 'lib', 'runner', 'bin.cjs');
const result = spawnSync(
	process.execPath,
	[
		bin,
		'--site',
		dist,
		// 只索引 <main>：页头、页脚、命令面板、评论区都已标了 data-pagefind-ignore，
		// 这样任何新页面都自动可搜索，不需要在页面里手写标记
		'--glob',
		'**/*.html',
		'--root-selector',
		'main',
	],
	{ stdio: 'inherit', cwd: root },
);

if (result.status !== 0) {
	console.warn('⚠ Pagefind 索引失败，站点仍然可用（搜索会退回内置 JSON 索引）');
} else {
	console.log('✓ Pagefind 搜索索引已生成到 dist/pagefind');
}
