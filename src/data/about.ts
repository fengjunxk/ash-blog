/** 关于页 / 页脚用到的个人资料（改这里即可，页面会自动跟着变） */

export const SKILLS = [
	{ name: 'TypeScript / JavaScript', level: 92, note: '吃饭的家伙' },
	{ name: 'Astro / 静态站点', level: 88, note: '越用越香' },
	{ name: 'React / Vue', level: 85, note: '够用' },
	{ name: 'CSS / 设计系统', level: 82, note: '喜欢抠像素' },
	{ name: 'Cloudflare / 边缘计算', level: 76, note: '正在沉迷' },
	{ name: 'Node.js / 后端', level: 72, note: '能写能跑' },
];

export const TIMELINE = [
	{
		year: '2026',
		title: '把博客搬到了 Cloudflare 边缘',
		desc: '静态托管 + KV 计数 + 全球 CDN，成本为零，访问速度却很诚实。',
	},
	{
		year: '2025',
		title: '开始认真写技术长文',
		desc: '从「记笔记」变成「讲清楚一件事」，一年写了 30 多篇。',
	},
	{
		year: '2024',
		title: '沉迷设计系统',
		desc: '给团队做了套组件库，也顺手把博客换了好几次皮。',
	},
	{
		year: '2023',
		title: '这个站点上线',
		desc: '第一版只有一篇文章和一堆 404，但它活到了现在。',
	},
];

export const NOW = [
	{ label: '在研究', value: 'Cloudflare Workers + D1 的全栈玩法' },
	{ label: '在阅读', value: '《设计中的设计》原研哉' },
	{ label: '在折腾', value: '把博客的构建时间压到 10 秒以内' },
	{ label: '在喝', value: '冰美式，一天两杯半' },
];

export const FAQ = [
	{
		q: '这个博客是用什么搭的？',
		a: 'Astro 7 + Tailwind CSS v4，内容用 Markdown / MDX 写，托管在 Cloudflare Pages 上，评论走 GitHub Discussions，浏览量用 KV 存。整套下来不花钱。',
	},
	{
		q: '配色是哪里来的？',
		a: '从一张灰粉色调的猫猫插画里取的色：暖白纸底、灰褐、近黑的墨色，再加一点点腮红粉当强调色。',
	},
	{
		q: '可以转载文章吗？',
		a: '可以，注明作者与原文链接就行（CC BY-NC-SA 4.0）。如果拿去商用，先发封邮件和我说一声。',
	},
	{
		q: '怎么联系你？',
		a: '首页与页脚都有邮箱和社交账号，留言板也开着，随便挑一个。',
	},
];

export const FRIENDS = [
	{
		name: '猫猫观测站',
		url: 'https://example.com',
		avatar: '🐈',
		desc: '每天更新一只猫，人间值得。',
		tags: ['生活', '摄影'],
	},
	{
		name: '边缘计算笔记',
		url: 'https://example.com',
		avatar: '☁️',
		desc: 'Cloudflare Workers 的一百种写法。',
		tags: ['技术', 'Cloudflare'],
	},
	{
		name: '像素与留白',
		url: 'https://example.com',
		avatar: '🎨',
		desc: '界面设计随笔，排版爱好者。',
		tags: ['设计', 'UI'],
	},
	{
		name: '深夜编译',
		url: 'https://example.com',
		avatar: '🌙',
		desc: '凌晨三点的构建日志。',
		tags: ['工程', 'Node'],
	},
	{
		name: '一杯半糖',
		url: 'https://example.com',
		avatar: '🧋',
		desc: '写代码，也写吃喝。',
		tags: ['随笔', '美食'],
	},
	{
		name: '静态星球',
		url: 'https://example.com',
		avatar: '🪐',
		desc: 'SSG 爱好者聚集地。',
		tags: ['Astro', 'SSG'],
	},
];

export const GUESTBOOK_TIPS = [
	'不用注册：填个昵称 + 内容就能发',
	'想接话就点留言左下角的「回复」，会在同一层里展开',
	'自己发的留言 2 分钟内可以删除；想交换友链去「友链」页更方便',
];
