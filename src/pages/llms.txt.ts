import type { APIRoute } from 'astro';
import { getPostMetas, tagsOf } from '@/lib/blog';
import { SITE, AUTHOR } from '@/data/site';

export const prerender = true;

/** 给 AI 爬虫 / 好奇的访客看的站点摘要（llms.txt 约定） */
export const GET: APIRoute = async () => {
	const posts = await getPostMetas();
	const tags = tagsOf(posts);
	const lines = [
		`# ${SITE.title}`,
		'',
		`> ${SITE.description}`,
		'',
		`作者：${AUTHOR.name}（${AUTHOR.nameZh}）· ${AUTHOR.title}`,
		`站点：${SITE.url}`,
		`语言：${SITE.lang}`,
		'',
		'## 主要页面',
		'',
		`- [首页](${SITE.url}/)：最新文章与站点概览`,
		`- [全部文章](${SITE.url}/blog/)：共 ${posts.length} 篇`,
		`- [归档](${SITE.url}/archive/)：按年份浏览`,
		`- [分类](${SITE.url}/categories/)：按主题浏览`,
		`- [标签](${SITE.url}/tags/)：共 ${tags.length} 个标签`,
		`- [项目](${SITE.url}/projects/)：做过的东西`,
		`- [统计](${SITE.url}/stats/)：写作数据`,
		`- [关于](${SITE.url}/about/)：作者与技术栈`,
		`- [RSS](${SITE.url}/rss.xml)：全文订阅`,
		'',
		'## 文章',
		'',
		...posts.map((p) => `- [${p.title}](${new URL(p.url, SITE.url).href})：${p.description}`),
		'',
		'## 标签',
		'',
		tags.map((t) => `- ${t.name} (${t.count})`).join('\n'),
		'',
	];

	return new Response(lines.join('\n'), {
		headers: { 'content-type': 'text/plain; charset=utf-8' },
	});
};
