/* 清掉构建缓存。
 * 什么时候需要：改了 astro.config.mjs 里的 remark/rehype 插件、
 * 换了 Shiki 主题、或者遇到「内容没更新」的诡异情况。
 * Astro 会把渲染结果缓存在 .astro/ 里，它不感知插件代码的变化。
 */
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['.astro', 'node_modules/.astro', 'node_modules/.vite', 'dist'];

for (const target of targets) {
	const full = path.join(root, target);
	await rm(full, { recursive: true, force: true });
	console.log(`✓ 已清理 ${target}`);
}
