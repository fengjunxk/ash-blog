/**
 * 小工具集合：日期、字符串、统计…… 纯函数，方便在任意组件里复用。
 */

/** 2024-05-03 → 2024 年 5 月 3 日 */
export function formatDate(date: Date, style: 'full' | 'short' | 'iso' = 'full'): string {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return '';
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	if (style === 'iso') return `${y}-${m}-${day}`;
	if (style === 'short') return `${m}/${day}`;
	return `${y} 年 ${Number(m)} 月 ${Number(day)} 日`;
}

export function formatMonthDay(date: Date): string {
	const d = new Date(date);
	return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 相对时间：3 天前 / 刚刚 */
export function timeAgo(date: Date, now = new Date()): string {
	const diff = now.getTime() - new Date(date).getTime();
	const day = 86_400_000;
	if (diff < 60_000) return '刚刚';
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
	if (diff < day) return `${Math.floor(diff / 3_600_000)} 小时前`;
	if (diff < day * 30) return `${Math.floor(diff / day)} 天前`;
	if (diff < day * 365) return `${Math.floor(diff / (day * 30))} 个月前`;
	return `${Math.floor(diff / (day * 365))} 年前`;
}

/** 去掉 markdown 语法，用于摘要 / 搜索 */
export function stripMarkdown(md: string): string {
	return md
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/[*_~>|]/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** 中英混排的字数统计：英文按词、中文按字 */
export function countWords(text: string): number {
	const clean = stripMarkdown(text);
	const cjk = (clean.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? []).length;
	const latin = (clean.replace(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) ?? []).length;
	return cjk + latin;
}

/** 阅读时长（分钟），中文按 350 字/分钟 */
export function readingTime(text: string): { words: number; minutes: number; label: string } {
	const words = countWords(text);
	const minutes = Math.max(1, Math.round(words / 350));
	return { words, minutes, label: `${minutes} 分钟` };
}

export function formatNumber(n: number): string {
	if (n < 1000) return String(n);
	if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
	return (n / 10_000).toFixed(1).replace(/\.0$/, '') + 'w';
}

/** 取 id 的最后一段：2024/hello-world → hello-world */
export function lastSegment(id: string): string {
	const parts = id.split('/').filter(Boolean);
	return parts[parts.length - 1] ?? id;
}

export function slugifyTag(tag: string): string {
	return tag.trim().replace(/\s+/g, '-').toLowerCase();
}

export function uniq<T>(arr: T[]): T[] {
	return [...new Set(arr)];
}

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Map<K, T[]> {
	const map = new Map<K, T[]>();
	for (const item of items) {
		const k = key(item);
		const list = map.get(k);
		if (list) list.push(item);
		else map.set(k, [item]);
	}
	return map;
}

/** 取数组里出现次数最多的前 n 项 */
export function topEntries(map: Map<string, number>, n = 10): [string, number][] {
	return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function pct(part: number, total: number): number {
	if (!total) return 0;
	return Math.round((part / total) * 100);
}

/** 连续打卡天数之类的日期计算 */
export function diffDays(a: Date, b: Date): number {
	return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

/** 生成一串稳定的伪随机（用于占位图 / 热力图种子） */
export function seededRandom(seed: number): () => number {
	let s = seed % 2147483647;
	if (s <= 0) s += 2147483646;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

export function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** 简易防抖 */
export function debounce<F extends (...args: never[]) => void>(fn: F, ms = 180) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: Parameters<F>) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}
