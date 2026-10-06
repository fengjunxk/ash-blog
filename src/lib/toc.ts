/**
 * 从 Markdown 源码里提取标题，生成目录（TOC）。
 * 目标：与 rehype-slug 生成的 DOM id 保持一致。
 * rehype-slug 使用 github-slugger：小写、去标点、空格转 `-`，重名递增 `-1`。
 */

export type TocItem = { depth: number; text: string; id: string };

const PUNCT =
	/[!"#$%&'()*+,./:;<=>?@[\]^`{|}~。，、；：？！…—·（）《》「」『』【】〔〕“”‘’]/g;

/** 粗粒度对标 github-slugger（英文/中英混排足够用） */
export function slugifyHeading(text: string): string {
	const cleaned = text
		.trim()
		.toLowerCase()
		.replace(PUNCT, '')
		.replace(/\s+/g, '-');
	return cleaned || 'section';
}

export function tocFromMarkdown(markdown: string, maxDepth = 3): TocItem[] {
	const items: TocItem[] = [];
	const seen = new Map<string, number>();
	const lines = markdown.split('\n');
	let inFence = false;

	for (const raw of lines) {
		const line = raw.replace(/\r$/, '');
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const m = /^(#{2,4})\s+(.+?)\s*#*\s*$/.exec(line);
		if (!m) continue;
		const depth = m[1]!.length;
		if (depth > maxDepth) continue;
		// 去掉行内 markdown 标记
		const text = m[2]!
			.replace(/`([^`]*)`/g, '$1')
			.replace(/\*\*([^*]*)\*\*/g, '$1')
			.replace(/\*([^*]*)\*/g, '$1')
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/<[^>]+>/g, '')
			.trim();
		if (!text) continue;
		const base = slugifyHeading(text);
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		items.push({ depth, text, id: count === 0 ? base : `${base}-${count}` });
	}
	return items;
}
