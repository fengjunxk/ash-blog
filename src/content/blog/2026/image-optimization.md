---
title: 用 Astro 的图片组件把首屏压到 100KB 以内
description: 从 480KB 到 96KB：一次真实的图片优化记录，包括格式选择、尺寸生成、懒加载策略，以及 LCP 的实测变化。
published: 2026-05-11
category: 性能
tags: [性能, 图片, Astro, LCP]
---

这个站原来首屏要下 480KB 的图片，换成 Astro 的 `<Image>` + AVIF 之后降到 96KB，LCP 从 2.4s 到 1.1s。

记一下具体做了什么。

## 先看问题在哪

用 Lighthouse 跑一遍，问题很清楚：

```text
LCP 元素：首屏插画 (316×316)
  └─ 资源大小 412 KB（PNG）
  └─ 阻塞时间 1.3 s
  └─ 未使用的响应式尺寸（手机上按桌面尺寸下载）
```

三个问题：**格式太老、尺寸没适配、加载优先级不对**。

## 改法

```astro
---
import { Image } from 'astro:assets';
import hero from '@/assets/hero.png';
---
<Image
	src={hero}
	alt="站点吉祥物"
	widths={[200, 316, 480]}
	sizes="(max-width: 960px) 200px, 316px"
	format="avif"
	loading="eager"
	fetchpriority="high"
/>
```

产物：

```html
<img
  src="/_image?f=avif&w=316&h=316"
  srcset="/_image?f=avif&w=200 200w, /_image?f=avif&w=316 316w, /_image?f=avif&w=480 480w"
  sizes="(max-width: 960px) 200px, 316px"
  width="316" height="316"
  alt="站点吉祥物" loading="eager" fetchpriority="high" decoding="async">
```

关键是三个属性：

- **`width` / `height`**：浏览器提前知道比例，避免布局抖动（CLS）
- **`sizes`**：告诉浏览器按哪个宽度下载，手机就不会下桌面版
- **`fetchpriority="high"`**：LCP 图片要显式提权

> [!CAUTION] 别给所有图片都加 fetchpriority
> 提权是零和游戏。如果每张图都 high，等于都没提。
> 只给首屏那张 LCP 图加，其余用 `loading="lazy"` 就好。

## 尺寸怎么定

我的经验值：

| 用途 | 宽度档位 | 格式 |
| --- | --- | --- |
| 头像 / 图标 | 64 / 128 | SVG 优先，否则 AVIF |
| 卡片封面 | 400 / 640 / 800 | AVIF + WebP 兜底 |
| 文章大图 | 800 / 1200 / 1600 | AVIF + WebP 兜底 |
| 首屏主图 | 实际显示宽度 × 1.5 | AVIF |

**不要超过 1600px。** 再大对观感没有帮助，只是浪费流量。

## 实测结果

| 指标 | 优化前 | 优化后 | 变化 |
| --- | --- | --- | --- |
| 首屏图片体积 | 412 KB | 84 KB | −80% |
| 总传输 | 480 KB | 96 KB | −80% |
| LCP | 2.4 s | 1.1 s | −54% |
| CLS | 0.12 | 0.00 | 消除 |

> [!NOTE] 关于 AVIF 的兼容性
> 2026 年了，AVIF 支持率已经超过 95%。如果还有顾虑，就用 `<picture>` 加 WebP 兜底，
> 代价是构建时多生成一套图 —— 对这个站的规模来说完全可以接受。

## 别忘了 OG 图

社交平台分享卡片的图是另一套逻辑：尺寸固定 1200×630，格式用 PNG 更稳（有些平台的解析器对 WebP 支持不好）。

我的做法是构建期用 sharp 生成，一次生成永久缓存：

```js
await sharp(svgBuffer).resize(1200, 630).png({ compressionLevel: 9 }).toFile('og.png');
```

这样就完成了从「图片拖慢首屏」到「图片完全不是瓶颈」的转变。下一步打算试试 Cloudflare Images 做运行时变换，把构建产物再瘦一圈。
