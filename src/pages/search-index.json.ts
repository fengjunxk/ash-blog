import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readingTime, stripMarkdown } from '@/lib/utils';
import type { SearchDoc } from '@/lib/search';

/** 构建期生成静态搜索索引：/search-index.json
 *  用途：开发环境（Pagefind 还没跑）与 Pagefind 未加载时的兜底搜索。 */
export const prerender = true;

export const GET: APIRoute = async () => {
	const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
	const docs: SearchDoc[] = posts
		.sort((a, b) => b.data.published.getTime() - a.data.published.getTime())
		.map((post) => {
			const body = stripMarkdown(post.body ?? '');
			return {
				title: post.data.title,
				url: `/blog/${post.id}/`,
				date: post.data.published.toISOString().slice(0, 10),
				category: post.data.category,
				tags: post.data.tags ?? [],
				description: post.data.description || body.slice(0, 120),
				keywords: `${body.slice(0, 1600)} ${readingTime(post.body ?? '').minutes}`,
			};
		});

	return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), docs }), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=3600',
		},
	});
};
