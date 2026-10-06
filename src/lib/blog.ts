import { getCollection, type CollectionEntry } from 'astro:content';
import { readingTime, stripMarkdown } from './utils';

export type Post = CollectionEntry<'blog'>;
export type Project = CollectionEntry<'projects'>;

const isProd = import.meta.env.PROD;

/** 全部文章（生产环境过滤草稿），按发布时间倒序；置顶优先 */
export async function getPosts(options: { includeDrafts?: boolean } = {}): Promise<Post[]> {
	const includeDrafts = options.includeDrafts ?? !isProd;
	const posts = await getCollection('blog', ({ data }) => includeDrafts || !data.draft);
	return posts.sort(sortPosts);
}

export function sortPosts(a: Post, b: Post): number {
	if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
	return b.data.published.getTime() - a.data.published.getTime();
}

export function postSlug(post: Post): string {
	return post.id.split('/').filter(Boolean).join('/');
}

export function postUrl(post: Post): string {
	return `/blog/${postSlug(post)}/`;
}

export type PostMeta = {
	slug: string;
	url: string;
	title: string;
	description: string;
	published: Date;
	updated?: Date;
	category: string;
	tags: string[];
	pinned: boolean;
	draft: boolean;
	series?: string;
	minutes: number;
	words: number;
};

/** 转成可以在页面之间传递的轻量结构（不含渲染后的内容） */
export function toMeta(post: Post): PostMeta {
	const body = post.body ?? '';
	const rt = readingTime(body);
	return {
		slug: postSlug(post),
		url: postUrl(post),
		title: post.data.title,
		description: post.data.description || stripMarkdown(body).slice(0, 120),
		published: post.data.published,
		updated: post.data.updated,
		category: post.data.category,
		tags: post.data.tags ?? [],
		pinned: post.data.pinned,
		draft: post.data.draft,
		series: post.data.series,
		minutes: rt.minutes,
		words: rt.words,
	};
}

export async function getPostMetas(): Promise<PostMeta[]> {
	return (await getPosts()).map(toMeta);
}

/** 分类统计 */
export function categoriesOf(posts: PostMeta[]): { name: string; count: number; latest: Date }[] {
	const map = new Map<string, { name: string; count: number; latest: Date }>();
	for (const p of posts) {
		const cur = map.get(p.category);
		if (cur) {
			cur.count += 1;
			if (p.published > cur.latest) cur.latest = p.published;
		} else {
			map.set(p.category, { name: p.category, count: 1, latest: p.published });
		}
	}
	return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 标签统计 */
export function tagsOf(posts: PostMeta[]): { name: string; count: number }[] {
	const map = new Map<string, number>();
	for (const p of posts) {
		for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
	}
	return [...map.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 归档：按年份分组 */
export function archiveOf(posts: PostMeta[]): { year: number; posts: PostMeta[] }[] {
	const map = new Map<number, PostMeta[]>();
	for (const p of posts) {
		const y = p.published.getFullYear();
		const list = map.get(y);
		if (list) list.push(p);
		else map.set(y, [p]);
	}
	return [...map.entries()]
		.sort((a, b) => b[0] - a[0])
		.map(([year, list]) => ({
			year,
			posts: list.sort((a, b) => b.published.getTime() - a.published.getTime()),
		}));
}

/** 写作热力图：最近 N 天每天写了多少字 */
export function heatmapOf(posts: PostMeta[], days = 182): { date: string; words: number; count: number }[] {
	const byDay = new Map<string, { words: number; count: number }>();
	for (const p of posts) {
		const key = p.published.toISOString().slice(0, 10);
		const cur = byDay.get(key);
		if (cur) {
			cur.words += p.words;
			cur.count += 1;
		} else {
			byDay.set(key, { words: p.words, count: 1 });
		}
	}
	const out: { date: string; words: number; count: number }[] = [];
	const today = new Date();
	today.setHours(23, 59, 59, 999);
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(today.getTime() - i * 86_400_000);
		const key = d.toISOString().slice(0, 10);
		const hit = byDay.get(key);
		out.push({ date: key, words: hit?.words ?? 0, count: hit?.count ?? 0 });
	}
	return out;
}

/** 标签 → 文章列表 */
export function postsByTag(posts: PostMeta[]): Map<string, PostMeta[]> {
	const map = new Map<string, PostMeta[]>();
	for (const p of posts) {
		for (const tag of p.tags) {
			const list = map.get(tag);
			if (list) list.push(p);
			else map.set(tag, [p]);
		}
	}
	return map;
}

/** 分类 → 文章列表 */
export function postsByCategory(posts: PostMeta[]): Map<string, PostMeta[]> {
	const map = new Map<string, PostMeta[]>();
	for (const p of posts) {
		const list = map.get(p.category);
		if (list) list.push(p);
		else map.set(p.category, [p]);
	}
	return map;
}

/** 相关文章：同标签 / 同分类加权 */
export function relatedPosts(current: PostMeta, all: PostMeta[], limit = 3): PostMeta[] {
	const scored = all
		.filter((p) => p.slug !== current.slug)
		.map((p) => {
			const shared = p.tags.filter((t) => current.tags.includes(t)).length;
			const score = shared * 3 + (p.category === current.category ? 2 : 0);
			return { post: p, score };
		})
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score || b.post.published.getTime() - a.post.published.getTime());
	return scored.slice(0, limit).map((s) => s.post);
}

/** 上一篇 / 下一篇（按时间顺序） */
export function neighbours(current: PostMeta, all: PostMeta[]): { prev?: PostMeta; next?: PostMeta } {
	const sorted = [...all].sort((a, b) => a.published.getTime() - b.published.getTime());
	const idx = sorted.findIndex((p) => p.slug === current.slug);
	return {
		prev: idx > 0 ? sorted[idx - 1] : undefined,
		next: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : undefined,
	};
}

export async function getProjects(): Promise<Project[]> {
	const projects = await getCollection('projects');
	return projects.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

/** 全站统计 */
export function siteStats(posts: PostMeta[]) {
	const words = posts.reduce((sum, p) => sum + p.words, 0);
	const tags = new Set(posts.flatMap((p) => p.tags));
	const categories = new Set(posts.map((p) => p.category));
	const days = posts.length
		? Math.max(
				1,
				Math.round(
					(Date.now() - Math.min(...posts.map((p) => p.published.getTime()))) / 86_400_000,
				),
			)
		: 1;
	return { count: posts.length, words, tags: tags.size, categories: categories.size, days };
}
