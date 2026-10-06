---
title: 从一张插画里取出一套设计令牌
description: 灰粉色不是随便挑的。这篇讲怎么把一张喜欢的图拆成可用的色彩系统：取色、定语义、分配层级，最后落到 Tailwind v4 的 @theme 里。
published: 2026-08-06
category: 设计
tags: [设计系统, 配色, Tailwind, CSS]
---

我见过太多「配色很好看但用不起来」的站点。问题通常不在颜色本身，而在于**它没有被组织成系统**：十个颜色各自为战，改一个就塌一片。

这篇用一个真实的例子（就是你现在看到的这个博客）走一遍完整流程。

## 一、先确定情绪，再谈色值

选色之前先回答一个问题：**你希望读者感觉如何？**

这个站的关键词是：温和、安静、有点丧但不冷。对应的视觉语言：

- **低饱和**：颜色都往灰里带一点，避免任何刺眼的纯色
- **暖白底**：`#f7f3f0` 这种带一点暖调的纸色，而不是 `#ffffff`
- **深墨色文字**：近黑但偏紫（`#22202a`），比纯黑柔和
- **一个高饱和强调色**：腮红粉，只用在必须被看到的地方

> [!TIP] 一个实用判断法
> 把你的界面缩到手机大小、眯起眼睛看。如果只能看到一团灰，说明层级不够；
> 如果到处都在抢注意力，说明强调色用多了。**强调色占屏面积不该超过 5%。**

## 二、从参考图里取色

我通常取 4–6 个锚点色，然后围绕它们扩展色阶。

```text
参考插画里的锚点：
  背景纸色   #f7f3f0   → 页面底色
  毛发灰褐   #b9aeb2   → 次级文字 / 边框
  帽子近黑   #2b2632   → 主文字 / 深色块
  腮红粉     #e39ba6   → 强调色 / 链接
  颈圈深灰   #4a4450   → 深色模式的表面色
```

现代 CSS 的好处是，你不用手算每个色阶 —— `oklch()` 可以把「同一个色相，不同明度」这件事表达得非常直白：

```css
@theme {
	/* 主色阶：色相固定 8，饱和度缓慢上升，明度均匀下降 */
	--color-blush-50:  oklch(0.972 0.014 8);
	--color-blush-100: oklch(0.941 0.028 8);
	--color-blush-200: oklch(0.894 0.048 8);
	--color-blush-300: oklch(0.836 0.075 8);
	--color-blush-400: oklch(0.764 0.098 8);
	--color-blush-500: oklch(0.702 0.106 8);
	--color-blush-600: oklch(0.628 0.108 8);
	--color-blush-700: oklch(0.532 0.096 8);
}
```

比 HSL 好在哪？**oklch 的明度是感知均匀的**。`L=0.7` 的黄色和 `L=0.7` 的蓝色，人眼看起来一样亮。HSL 做不到这一点，所以用 HSL 生成色阶时，黄绿色总会显得特别亮。

## 三、把色值变成语义

这一步最关键，也是最多人跳过的一步：**页面里不该出现 `--color-blush-500`，只该出现 `--color-accent`。**

```css
:root {
	--c-bg: oklch(0.976 0.006 60);       /* 页面底色 */
	--c-surface: oklch(0.995 0.003 60);  /* 卡片表面 */
	--c-border: oklch(0.905 0.010 335);  /* 分隔线 */
	--c-text: oklch(0.268 0.020 320);    /* 正文 */
	--c-text-mute: oklch(0.608 0.020 328); /* 辅助文字 */
	--c-accent: oklch(0.702 0.106 8);    /* 强调 */
}

[data-theme='dark'] {
	--c-bg: oklch(0.192 0.016 315);
	--c-surface: oklch(0.238 0.019 316);
	--c-border: oklch(0.325 0.022 318);
	--c-text: oklch(0.938 0.008 340);
	--c-text-mute: oklch(0.662 0.018 330);
	--c-accent: oklch(0.788 0.104 8);    /* 暗色下提亮，保证对比度 */
}
```

好处立刻显现：

1. **切暗色模式只改变量**，组件一行都不用动
2. **换皮肤只改这一处**，从粉色换成薄荷绿只需要改 `--c-accent`
3. **语义清晰**，新人看到 `bg-surface` 就知道该用什么

暗色模式不是把亮色反过来那么简单 —— 底色不能是纯黑（太刺眼），强调色要**提亮**（暗背景上低明度颜色会糊掉），阴影基本失效，得靠边框和层级差来区分层次。

## 四、接入 Tailwind v4

Tailwind v4 的 `@theme inline` 可以把运行时变量直接变成工具类：

```css
@theme inline {
	--color-bg: var(--c-bg);
	--color-surface: var(--c-surface);
	--color-line: var(--c-border);
	--color-ink: var(--c-text);
	--color-mute: var(--c-text-mute);
	--color-accent: var(--c-accent);
}
```

然后就能写 `bg-surface`、`text-mute`、`border-line`、`text-accent`。用 `inline` 关键字是为了让变量值保持 `var()` 引用 —— 这样切换 `data-theme` 时，工具类会跟着变。

实现主题切换只需要一行内联脚本（必须在首屏绘制前跑，否则会闪白）：

```html
<script is:inline>
	const saved = localStorage.getItem('ash-theme') || 'system';
	const dark = saved === 'dark' ||
		(saved === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.dataset.theme = dark ? 'dark' : 'light';
</script>
```

> [!WARNING] 别用 JS 类名切换
> 用 `.dark` 类名切换主题时，如果 JS 加载慢，用户会先看到一帧亮色。
> 用 `data-theme` 属性 + CSS 变量，配合首屏内联脚本，才能做到零闪烁。

## 五、几个容易踩的坑

**坑一：对比度不足。** 粉色强调色配白底，很容易不达标。用 `oklch` 算一下：文字和背景的 L 值差距至少要 0.5。

**坑二：边框色和分隔线共用一个变量。** 分隔线要更淡，卡片边框要稍重，否则界面会显得很「硬」。

**坑三：暗色模式忘了改 `color-scheme`。** 不然滚动条、表单控件还是亮色的：

```css
:root { color-scheme: light; }
[data-theme='dark'] { color-scheme: dark; }
```

**坑四：只做两套主题，不做「跟随系统」。** 用户设置成跟随系统时，系统切换主题页面应该立刻响应：

```css
@media (prefers-color-scheme: dark) {
	:root:not([data-theme='light']) {
		--c-bg: oklch(0.192 0.016 315);
		/* …整套暗色变量 */
	}
}
```

## 小结

流程总结成一张表：

| 步骤 | 产出 | 检查点 |
| --- | --- | --- |
| 定情绪 | 3–5 个形容词 | 能说清「希望读者感觉如何」 |
| 取锚点 | 4–6 个色值 | 从真实参考里取，别凭空想 |
| 扩色阶 | 每色 9–10 阶 | 用 oklch 保证感知均匀 |
| 定语义 | 8–12 个变量 | 页面里不出现具体色号 |
| 接框架 | 工具类 | 切主题只改变量 |
| 验对比 | 无障碍检查 | 正文对比度 ≥ 4.5:1 |

配色的功夫其实不在选色，而在**约束**。当你只有 8 个语义变量时，想做出难看的界面反而变难了。
