// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import remarkCallouts from './src/lib/remark-callouts.ts';

import { SITE } from './src/data/site.ts';

/**
 * SSR 开关：
 *  - 默认 `output: 'static'`：纯静态产物，Cloudflare Pages 直接吃 dist/，
 *    也能丢到任何静态托管（Vercel / Netlify / GitHub Pages / 自己的服务器）。
 *  - 需要服务端渲染（动态 API、按需渲染）时打开：
 *      PowerShell:  $env:ASTRO_SSR=1; pnpm build:ssr
 *      bash:        ASTRO_SSR=1 pnpm build:ssr
 *    这时会挂上 @astrojs/cloudflare 适配器，产物可直接 `wrangler deploy` 到 Workers。
 */
const useSSR = process.env.ASTRO_SSR === '1' || process.env.ASTRO_SSR === 'true';

const cloudflare = useSSR ? (await import('@astrojs/cloudflare')).default : null;

export default defineConfig({
	site: SITE.url,
	trailingSlash: 'ignore',
	output: useSSR ? 'server' : 'static',
	...(cloudflare ? { adapter: cloudflare({ imageService: 'compile' }) } : {}),

	integrations: [
		mdx(),
		sitemap({
			filter: (page) => !page.includes('/guestbook') && !page.includes('/404'),
			changefreq: 'weekly',
			lastmod: new Date(),
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},

	image: {
		// sharp 只在 Node 构建环境里加载；Vercel/Netlify 等平台不要这个
		service: useSSR
			? undefined
			: process.env.CF_PAGES || process.env.SKIP_SHARP
				? undefined
				: { entrypoint: 'astro/assets/services/sharp' },
	},

	markdown: {
		// Astro 7 默认 Markdown 处理器换成了 Sätteri，这里显式用 unified 以便挂自定义插件
		processor: unified({
			remarkPlugins: [remarkGfm, remarkMath, remarkCallouts],
			rehypePlugins: [
				rehypeSlug,
				[
					rehypeAutolinkHeadings,
					{
						behavior: 'append',
						properties: { class: 'heading-anchor', ariaHidden: 'true', tabIndex: -1 },
						content: { type: 'text', value: '#' },
					},
				],
				rehypeKatex,
			],
		}),
		// 代码高亮：Shiki 双主题（亮=Latte / 暗=Mocha），默认不着色，
		// 由 CSS 变量 --shiki-light / --shiki-dark 跟随 data-theme 切换，零客户端 JS
		syntaxHighlight: {
			type: 'shiki',
			excludeLangs: ['mermaid', 'math'],
		},
		shikiConfig: {
			themes: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
			defaultColor: false,
			wrap: false,
		},
	},

	prefetch: {
		prefetchAll: true,
		defaultStrategy: 'viewport',
	},
});
