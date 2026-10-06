/* SSR 构建：ASTRO_SSR=1 + astro build（Cloudflare 适配器） */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');

const result = spawnSync(process.execPath, [astro, 'build', ...process.argv.slice(2)], {
	stdio: 'inherit',
	cwd: root,
	env: { ...process.env, ASTRO_SSR: '1' },
});

process.exit(result.status ?? 1);
