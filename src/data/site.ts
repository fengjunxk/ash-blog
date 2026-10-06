/**
 * 站点全局配置 —— 全站文案 / 开关都集中在这里，改这一个文件就够了。
 * 改完直接 build，无需动其它代码。
 */

export type NavItem = { label: string; href: string; icon?: string; desc?: string };

export const SITE = {
	/** 站点标题（浏览器 tab、OG、RSS） */
	title: '灰羽 · Ash',
	/** 一句话签名 */
	tagline: '一只有点丧、但很温柔的技术猫',
	/** 站点描述，用于 SEO */
	description: '灰羽的个人博客：前端工程、Cloudflare 边缘部署、设计随笔，以及一只爱睡觉的猫。',
	/** 部署后的正式域名（务必带 https:// 且结尾没有斜杠）——影响 RSS / sitemap / OG 绝对地址 */
	url: 'https://ash-blog.pages.dev',
	lang: 'zh-CN',
	/** 站点建立年份，用于页脚版权 */
	since: 2023,
} as const;

export const AUTHOR = {
	name: 'Ash',
	nameZh: '灰羽',
	title: '前端工程师 / 猫奴',
	bio: '写着写着就天亮了。喜欢把界面做得柔和一点，把代码写得干净一点。',
	location: '杭州',
	/** 头像：可以把图片放到 public/ 下再改这里；留空则用内置的猫猫占位头像 */
	avatar: '',
	email: 'hello@example.com',
} as const;

export const NAV: NavItem[] = [
	{ label: '首页', href: '/', icon: 'home', desc: '回到最初的地方' },
	{ label: '文章', href: '/blog', icon: 'pen', desc: '所有长文与碎碎念' },
	{ label: '分类', href: '/categories', icon: 'folder', desc: '按主题浏览' },
	{ label: '标签', href: '/tags', icon: 'tag', desc: '按关键词浏览' },
	{ label: '归档', href: '/archive', icon: 'archive', desc: '时间线视图' },
	{ label: '项目', href: '/projects', icon: 'sparkles', desc: '做过的东西' },
	{ label: '统计', href: '/stats', icon: 'chart', desc: '写作数据与热力图' },
	{ label: '友链', href: '/links', icon: 'link', desc: '认识的朋友们' },
	{ label: '留言板', href: '/guestbook', icon: 'chat', desc: '说点什么' },
	{ label: '关于', href: '/about', icon: 'cat', desc: '关于我和这个站' },
];

export const SOCIALS = [
	{ label: 'GitHub', href: 'https://github.com/', icon: 'github' },
	{ label: 'X / Twitter', href: 'https://x.com/', icon: 'x' },
	{ label: 'Email', href: 'mailto:hello@example.com', icon: 'mail' },
	{ label: 'RSS', href: '/rss.xml', icon: 'rss' },
];

/** 页脚与友链页展示的图标链接（可留空数组） */
export const FOOTER_LINKS: NavItem[] = [
	{ label: 'RSS 订阅', href: '/rss.xml' },
	{ label: '站点地图', href: '/sitemap-index.xml' },
	{ label: 'robots.txt', href: '/robots.txt' },
	{ label: '写作规范', href: '/about#writing' },
];

export const FEATURES = {
	/** 搜索（Pagefind 全文索引 + 开发期 JSON 兜底） */
	search: true,
	/** ⌘K / Ctrl+K 命令面板 */
	commandPalette: true,
	/** 阅读进度条 + 回到顶部 */
	readingProgress: true,
	/** 文章目录（TOC） */
	toc: true,
	/** 亮/暗主题切换（含跟随系统） */
	themeToggle: true,
	/** 复制代码按钮 */
	copyCode: true,
	/** 相关文章推荐 */
	relatedPosts: true,
	/** 文章浏览量 / 点赞（需要 Cloudflare KV + Pages Functions） */
	views: {
		enabled: true,
		/** 留空则用同域 /api/*
		 *  - Pages Functions 部署时无需修改
		 *  - 纯静态托管（GitHub Pages 等）时填你自己的 Worker 地址 */
		apiBase: '',
	},
	/** Giscus 评论（基于 GitHub Discussions，无后端免费） */
	comments: {
		enabled: false,
		/** 在 https://giscus.app 生成配置后把值填进来 */
		repo: '',
		repoId: '',
		category: 'Announcements',
		categoryId: '',
		mapping: 'pathname',
		reactionsEnabled: '1',
		inputPosition: 'top',
		lang: 'zh-CN',
		theme: 'preferred_color_scheme',
	},
	/**
	 * 匿名留言板：填昵称 + 内容即可，无需登录。
	 * 后端是 Cloudflare Pages Functions + KV（见 functions/api/guestbook/）。
	 * 需要：给 Pages 项目绑定名为 BLOG_KV 的 KV 命名空间
	 * 可选：环境变量 GUESTBOOK_ADMIN_PASSWORD（管理密码，可隐藏任意留言）
	 * 可选：TURNSTILE_SECRET_KEY + PUBLIC_TURNSTILE_SITE_KEY（人机验证）
	 */
	guestbook: {
		enabled: true,
		/** 每次加载的留言条数 */
		pageSize: 20,
		/** 是否允许「回复某条留言」 */
		allowReply: true,
	},
	/** 访问统计（Cloudflare Web Analytics 或 Umami），留空 token 即自动关闭 */
	analytics: {
		/** Cloudflare Web Analytics 的 beacon token */
		cloudflareToken: '',
		/** Umami：脚本地址与网站 id */
		umamiScript: '',
		umamiWebsiteId: '',
	},
	/** 页脚展示 Cloudflare 徽章 */
	showCloudflareBadge: true,
	/** 构建期为每页生成专属分享图（/og/*.png）。
	 *  代价：每次构建多花约 20 秒；关掉就统一用 /og-default.png */
	ogImages: true,
} as const;

export const POSTS_PER_PAGE = 8;

/** 首页 hero 区域的小卡片文案 */
export const HERO_STATS_LABEL = {
	posts: '篇文章',
	words: '字',
	days: '天坚持',
} as const;

export const PALETTE = {
	/** 参考图里那几个颜色，写在这里便于换皮 */
	dustyRose: '#d99aa4',
	ashGray: '#8c8288',
	softCream: '#f7f3f0',
	inkBlack: '#22202a',
};
