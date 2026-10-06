import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
	schema: ({ image }) =>
		z.object({
			title: z.string().max(120),
			description: z.string().max(300).default(''),
			published: z.coerce.date(),
			updated: z.coerce.date().optional(),
			category: z.string().default('随笔'),
			tags: z.array(z.string()).default([]),
			cover: z
				.object({
					src: image(),
					alt: z.string().default(''),
				})
				.optional(),
			/** 置顶：首页与列表页优先展示 */
			pinned: z.boolean().default(false),
			/** 草稿：生产构建时不出现（开发环境仍可见） */
			draft: z.boolean().default(false),
			/** 更多链接，显示在文末 */
			links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
			series: z.string().optional(),
			/** 预估字数会由 body 自动统计 */
		}),
});

const projects = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
	schema: z.object({
		title: z.string(),
		tagline: z.string().default(''),
		description: z.string().default(''),
		published: z.coerce.date(),
		status: z.enum(['active', 'maintained', 'archived', 'wip']).default('active'),
		tags: z.array(z.string()).default([]),
		stack: z.array(z.string()).default([]),
		links: z
			.array(z.object({ label: z.string(), href: z.string(), icon: z.string().optional() }))
			.default([]),
		featured: z.boolean().default(false),
		stars: z.union([z.string(), z.number()]).optional(),
		emoji: z.string().default('✦'),
	}),
});

export const collections = { blog, projects };
