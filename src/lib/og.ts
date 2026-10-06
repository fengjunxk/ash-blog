/**
 * 构建期生成每页专属的社交分享图（OG Image）
 * 思路：用 SVG 当模板 + sharp 转 PNG，不依赖 canvas / satori / 系统字体文件。
 * 产物：/og/index.png、/og/blog/<slug>.png、/og/<page>/index.png、/og-default.png
 */
import sharp from 'sharp';
import { escapeXml } from './utils';

export type OgInput = {
	/** 大标题（文章标题 / 页面标题） */
	title: string;
	/** 副标题（摘要） */
	subtitle?: string;
	/** 左上角小标签（分类 / 栏目） */
	eyebrow?: string;
	/** 底部信息（日期 · 阅读时长 等） */
	meta?: string;
	/** 站点名 */
	siteName: string;
	/** 站点签名 */
	tagline: string;
	/** 主题色（十六进制） */
	accent?: string;
	ink?: string;
	cream?: string;
	/** 长标题时缩小字号 */
	scale?: number;
};

const WIDTH = 1200;
const HEIGHT = 630;

/** 按视觉宽度折行（中文字符按 1 个字宽、拉丁字符按 0.55 个字宽估算） */
function wrap(text: string, maxUnits: number, maxLines: number): string[] {
	const lines: string[] = [];
	let current = '';
	let units = 0;
	for (const char of text) {
		const w = /[\u3000-\u9fff\uff00-\uffef]/.test(char) ? 1 : /[A-Za-z0-9]/.test(char) ? 0.56 : 0.4;
		if (units + w > maxUnits && current) {
			lines.push(current.trim());
			current = '';
			units = 0;
			if (lines.length === maxLines) break;
		}
		current += char;
		units += w;
	}
	if (lines.length < maxLines && current.trim()) lines.push(current.trim());
	if (lines.length === maxLines && current.trim() && lines[maxLines - 1] !== current.trim()) {
		lines[maxLines - 1] = lines[maxLines - 1]!.replace(/.{2}$/, '…');
	}
	return lines;
}

/** 生成分享图的 SVG 源码 */
export function ogSvg(input: OgInput): string {
	const {
		title,
		subtitle = '',
		eyebrow = '',
		meta = '',
		siteName,
		tagline,
		accent = '#c56b79',
		ink = '#26232c',
		cream = '#f9f5f2',
	} = input;

	const scale = input.scale ?? 1;
	const titleSize = Math.round((title.length > 30 ? 60 : title.length > 18 ? 68 : 78) * scale);
	const maxUnits = titleSize >= 70 ? 13 : 16;
	const titleLines = wrap(title, maxUnits, 3);
	const subtitleLines = subtitle ? wrap(subtitle, 34, 2) : [];

	// 版式：徽标 → 标题 → 副标题 → 底部信息，全部按基线定位
	const TITLE_TOP = 292;
	const LINE_GAP = titleSize + 12;
	const subtitleTop = TITLE_TOP + (titleLines.length - 1) * LINE_GAP + 56;

	const lines = titleLines
		.map(
			(line, i) =>
				`<text x="96" y="${TITLE_TOP + i * LINE_GAP}" font-family="Georgia, 'Noto Serif SC', 'Songti SC', serif" font-size="${titleSize}" font-weight="700" fill="${ink}" letter-spacing="-1">${escapeXml(line)}</text>`,
		)
		.join('\n\t');

	const sub = subtitleLines
		.map(
			(line, i) =>
				`<text x="96" y="${subtitleTop + i * 40}" font-family="system-ui, 'Noto Sans SC', 'PingFang SC', sans-serif" font-size="27" fill="#7c737b">${escapeXml(line)}</text>`,
		)
		.join('\n\t');

	const metaY = Math.min(subtitleTop + subtitleLines.length * 40 + 8, HEIGHT - 88);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="${cream}"/>
			<stop offset="100%" stop-color="#efe6e5"/>
		</linearGradient>
		<radialGradient id="glow" cx="0.86" cy="0.08" r="0.72">
			<stop offset="0%" stop-color="${accent}" stop-opacity="0.42"/>
			<stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
		</radialGradient>
		<radialGradient id="glow2" cx="0.05" cy="0.95" r="0.6">
			<stop offset="0%" stop-color="#9d96a8" stop-opacity="0.28"/>
			<stop offset="100%" stop-color="#9d96a8" stop-opacity="0"/>
		</radialGradient>
		<filter id="grain">
			<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
			<feColorMatrix type="saturate" values="0"/>
		</filter>
	</defs>

	<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
	<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
	<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow2)"/>
	<rect width="${WIDTH}" height="${HEIGHT}" filter="url(#grain)" opacity="0.05" style="mix-blend-mode:multiply"/>

	<!-- 左上角猫猫标记 -->
	<g transform="translate(88, 86) scale(0.72)">
		<rect width="64" height="64" rx="18" fill="${ink}"/>
		<path d="M14 26 L10 11 L23 18 Z" fill="#cfc4c8"/>
		<path d="M50 26 L54 11 L41 18 Z" fill="#cfc4c8"/>
		<ellipse cx="32" cy="33" rx="20" ry="17" fill="#cfc4c8"/>
		<path d="M13 25 Q32 3 51 25 Q32 30 13 25 Z" fill="#2c2733"/>
		<path d="M22 32 q3.5 -4.5 7 0 q-3.5 3 -7 0" fill="#5a3038"/>
		<path d="M35 32 q3.5 -4.5 7 0 q-3.5 3 -7 0" fill="#5a3038"/>
		<ellipse cx="20" cy="38" rx="4.5" ry="2.6" fill="${accent}" opacity="0.75"/>
		<ellipse cx="44" cy="38" rx="4.5" ry="2.6" fill="${accent}" opacity="0.75"/>
	</g>
	<text x="140" y="112" font-family="Georgia, 'Noto Serif SC', serif" font-size="30" font-weight="700" fill="${ink}">${escapeXml(siteName)}</text>
	<text x="142" y="140" font-family="system-ui, 'Noto Sans SC', sans-serif" font-size="19" fill="#8d848b">${escapeXml(tagline)}</text>

	${
		eyebrow
			? `<g>
		<rect x="96" y="176" rx="999" ry="999" width="${Math.max(110, Math.round(eyebrow.length * 21 + 46))}" height="40" fill="${accent}" opacity="0.13"/>
		<text x="116" y="203" font-family="system-ui, 'Noto Sans SC', sans-serif" font-size="21" font-weight="600" fill="${accent}">${escapeXml(eyebrow)}</text>
	</g>`
			: ''
	}

	${lines}
	${sub}

	<!-- 底部：装饰波浪 + 信息 -->
	<path d="M0 ${HEIGHT - 74} Q 300 ${HEIGHT - 124} 600 ${HEIGHT - 74} T 1200 ${HEIGHT - 74}" fill="none" stroke="${accent}" stroke-width="1.6" opacity="0.35"/>
	<path d="M0 ${HEIGHT - 44} Q 300 ${HEIGHT - 94} 600 ${HEIGHT - 44} T 1200 ${HEIGHT - 44}" fill="none" stroke="${ink}" stroke-width="1.2" opacity="0.14"/>
	${
		meta
			? `<text x="96" y="${metaY}" font-family="system-ui, 'Noto Sans SC', sans-serif" font-size="21" fill="#8d848b">${escapeXml(meta)}</text>`
			: ''
	}
	<g transform="translate(${WIDTH - 152}, ${HEIGHT - 128})">
		<circle cx="40" cy="40" r="40" fill="none" stroke="${ink}" stroke-width="1.2" opacity="0.16"/>
		<circle cx="40" cy="40" r="26" fill="none" stroke="${accent}" stroke-width="1.4" opacity="0.5"/>
		<text x="40" y="50" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="${accent}" opacity="0.9">♥</text>
	</g>
</svg>`;
}

/** 生成 PNG buffer */
export async function ogPng(input: OgInput): Promise<Buffer> {
	return sharp(Buffer.from(ogSvg(input))).png({ compressionLevel: 9, palette: true }).toBuffer();
}
