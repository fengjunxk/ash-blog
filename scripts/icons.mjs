/* 用 sharp 把 favicon.svg 渲染成 iOS/Android 需要的 PNG 图标 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(path.join(root, 'public/favicon.svg'));

const sharp = (await import('sharp')).default;
for (const size of [180, 192, 512]) {
	const out = path.join(root, 'public', size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`);
	await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
	console.log(`✓ ${path.relative(root, out)} (${size}×${size})`);
}

// OG 默认兜底图（1200×630）
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#f9f5f2"/>
			<stop offset="100%" stop-color="#f0e7e6"/>
		</linearGradient>
		<radialGradient id="glow" cx="0.8" cy="0.1" r="0.7">
			<stop offset="0%" stop-color="#e8a9b0" stop-opacity="0.55"/>
			<stop offset="100%" stop-color="#e8a9b0" stop-opacity="0"/>
		</radialGradient>
	</defs>
	<rect width="1200" height="630" fill="url(#bg)"/>
	<rect width="1200" height="630" fill="url(#glow)"/>
	<g transform="translate(90, 150) scale(3.6)">
		<rect width="64" height="64" rx="18" fill="#22202a"/>
		<path d="M14 26 L10 11 L23 18 Z" fill="#cfc4c8"/>
		<path d="M50 26 L54 11 L41 18 Z" fill="#cfc4c8"/>
		<ellipse cx="32" cy="33" rx="20" ry="17" fill="#cfc4c8"/>
		<path d="M13 25 Q32 3 51 25 Q32 30 13 25 Z" fill="#2c2733"/>
		<path d="M22 32 q3.5 -4.5 7 0 q-3.5 3 -7 0" fill="#5a3038"/>
		<path d="M35 32 q3.5 -4.5 7 0 q-3.5 3 -7 0" fill="#5a3038"/>
		<ellipse cx="20" cy="38" rx="4.5" ry="2.6" fill="#e8a9b0" opacity="0.7"/>
		<ellipse cx="44" cy="38" rx="4.5" ry="2.6" fill="#e8a9b0" opacity="0.7"/>
		<path d="M32 39.5 q-3.5 4 -7 1" fill="none" stroke="#3b3440" stroke-width="1.8" stroke-linecap="round"/>
		<path d="M32 39.5 q3.5 4 7 1" fill="none" stroke="#3b3440" stroke-width="1.8" stroke-linecap="round"/>
	</g>
	<text x="360" y="300" font-family="Georgia, 'Noto Serif SC', serif" font-size="76" font-weight="700" fill="#2a2730">灰羽 · Ash</text>
	<text x="360" y="364" font-family="system-ui, 'Noto Sans SC', sans-serif" font-size="30" fill="#7a7178">一只有点丧、但很温柔的技术猫</text>
	<text x="360" y="440" font-family="system-ui, sans-serif" font-size="24" fill="#b0838c">前端工程 · Cloudflare · 设计随笔</text>
</svg>`;

const ogOut = path.join(root, 'public/og-default.png');
await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(ogOut);
console.log(`✓ ${path.relative(root, ogOut)} (1200×630)`);
