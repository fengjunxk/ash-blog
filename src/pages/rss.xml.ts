import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { render } from 'astro:content';
import { getPosts, postUrl } from '@/lib/blog';
import { SITE, AUTHOR, FEATURES } from '@/data/site';

export const prerender = true;

export const GET: APIRoute = async (context) => {
	const posts = await getPosts();

	const items = await Promise.all(
		posts.slice(0, 30).map(async (post) => {
			// 全文输出：把渲染后的 HTML 塞进 content
			let content = post.data.description;
			try {
				const { Content } = await render(post);
				content = String(Content);
			} catch {
				/* 渲染失败就退回摘要 */
			}
			return {
				title: post.data.title,
				description: post.data.description,
				pubDate: post.data.published,
				link: postUrl(post),
				categories: [post.data.category, ...(post.data.tags ?? [])],
				author: AUTHOR.email,
				content,
			};
		}),
	);

	return rss({
		title: `${SITE.title} — ${SITE.tagline}`,
		description: SITE.description,
		site: context.site ?? SITE.url,
		items,
		customData: `<language>${SITE.lang}</language><copyright>© ${SITE.since}–${new Date().getFullYear()} ${AUTHOR.name}</copyright>${
			FEATURES.comments.repoId ? '' : ''
		}`,
		stylesheet: false,
	});
};
