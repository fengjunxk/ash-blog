import type { APIRoute, GetStaticPaths } from 'astro';
import { ogPng, type OgInput } from '@/lib/og';
import { getPostMetas, categoriesOf, tagsOf } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import { SITE, PALETTE } from '@/data/site';

export const prerender = true;

/**
 * 每页专属分享图（OG Image），构建期用 SVG + sharp 生成。
 *
 * 路由对应关系：
 *   /            → /og/index.png
 *   /blog/       → /og/blog/index.png
 *   /blog/x/     → /og/blog/x.png
 *   /tags/x/     → /og/tags/x.png
 *   /stats/      → /og/stats/index.png
 *
 * 注意：文件名是 [...path].png.ts 时，`.png` 属于路由本身而不是参数名，
 * 所以下面 params.path 里不要带 `.png`（Astro 会自动补上）。
 */
export const getStaticPaths = (async () => {
	const posts = await getPostMetas();
	const categories = categoriesOf(posts);
	const tags = tagsOf(posts);

	const paths: { params: { path: string }; props: { input: OgInput } }[] = [];

	const base: Pick<OgInput, 'siteName' | 'tagline' | 'accent' | 'ink' | 'cream'> = {
		siteName: SITE.title,
		tagline: SITE.tagline,
		accent: PALETTE.dustyRose,
		ink: '#26232c',
		cream: '#f9f5f2',
	};

	// 首页
	paths.push({
		params: { path: 'index' },
		props: {
			input: {
				...base,
				eyebrow: '个人博客',
				title: SITE.title,
				subtitle: SITE.description,
				meta: `${posts.length} 篇文章 · RSS 订阅开放`,
			},
		},
	});

	// 列表类页面
	const pages: { path: string; input: OgInput }[] = [
		{
			path: 'blog/index',
			input: {
				...base,
				eyebrow: '文章列表',
				title: '全部文章',
				subtitle: `一共 ${posts.length} 篇，覆盖 ${categories.length} 个分类。`,
				meta: '支持关键词过滤 · 卡片 / 列表两种视图',
			},
		},
		{
			path: 'archive/index',
			input: {
				...base,
				eyebrow: '归档',
				title: '时间线归档',
				subtitle: '按年份浏览写过的每一篇。',
				meta: `${posts.length} 篇文章`,
			},
		},
		{
			path: 'categories/index',
			input: {
				...base,
				eyebrow: '分类',
				title: '按主题逛逛',
				subtitle: categories.map((c) => c.name).join(' · '),
				meta: `${categories.length} 个分类`,
			},
		},
		{
			path: 'tags/index',
			input: {
				...base,
				eyebrow: '标签云',
				title: '关键词索引',
				subtitle: tags.slice(0, 8).map((t) => `#${t.name}`).join('  '),
				meta: `${tags.length} 个标签`,
			},
		},
		{
			path: 'projects/index',
			input: {
				...base,
				eyebrow: '作品集',
				title: '做过的一些东西',
				subtitle: '正经维护的，和周末两小时写完的，都在这里。',
				meta: '开源项目与玩具',
			},
		},
		{
			path: 'stats/index',
			input: {
				...base,
				eyebrow: '数据面板',
				title: '写作统计',
				subtitle: '把「写了多少」这件事量化一下。',
				meta: `${posts.length} 篇 · ${posts.reduce((sum, p) => sum + p.words, 0).toLocaleString('zh-CN')} 字`,
			},
		},
		{
			path: 'about/index',
			input: {
				...base,
				eyebrow: '关于',
				title: `嗨，我是${SITE.title.split('·').pop()?.trim() ?? 'Ash'}`,
				subtitle: SITE.tagline,
				meta: '技术栈 · 写作规范 · 联系方式',
			},
		},
		{
			path: 'links/index',
			input: {
				...base,
				eyebrow: '友链',
				title: '认识的朋友们',
				subtitle: '互联网上还有一些安静写字的人。',
				meta: '欢迎交换友链',
			},
		},
		{
			path: 'guestbook/index',
			input: {
				...base,
				eyebrow: '留言板',
				title: '随便说点什么',
				subtitle: '可以聊技术，也可以只是路过打个招呼。',
				meta: '基于 GitHub Discussions',
			},
		},
	];
	paths.push(...pages.map((p) => ({ params: { path: p.path }, props: { input: p.input } })));

	// 文章
	for (const post of posts) {
		paths.push({
			params: { path: `blog/${post.slug}` },
			props: {
				input: {
					...base,
					eyebrow: post.category,
					title: post.title,
					subtitle: post.description,
					meta: `${formatDate(post.published, 'iso')} · ${post.minutes} 分钟读完 · ${post.words.toLocaleString('zh-CN')} 字`,
				},
			},
		});
	}

	// 分类
	for (const cat of categories) {
		paths.push({
			params: { path: `categories/${cat.name}` },
			props: {
				input: {
					...base,
					eyebrow: '分类',
					title: cat.name,
					subtitle: `这个分类下有 ${cat.count} 篇文章。`,
					meta: `最近更新 ${formatDate(cat.latest, 'iso')}`,
				},
			},
		});
	}

	// 标签
	for (const tag of tags) {
		paths.push({
			params: { path: `tags/${tag.name}` },
			props: {
				input: {
					...base,
					eyebrow: '标签',
					title: `#${tag.name}`,
					subtitle: `包含 ${tag.count} 篇文章。`,
					meta: '灰羽 · Ash',
				},
			},
		});
	}

	// 去重
	const seen = new Set<string>();
	return paths.filter((p) => {
		if (seen.has(p.params.path)) return false;
		seen.add(p.params.path);
		return true;
	});
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
	const { input } = props as { input: OgInput };
	try {
		const png = await ogPng(input);
		return new Response(new Uint8Array(png), {
			headers: {
				'content-type': 'image/png',
				'cache-control': 'public, max-age=604800, immutable',
			},
		});
	} catch (error) {
		console.error('[og] 生成失败，回退到默认图：', String(error));
		return new Response(null, { status: 302, headers: { location: '/og-default.png' } });
	}
};
