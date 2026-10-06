---
title: ink-palette
tagline: 从图片里提取设计令牌
description: 上传一张参考图，自动提取主色并生成一套 oklch 色阶，直接输出 Tailwind v4 的 @theme 代码块。周末项目，写完就没再动过。
published: 2026-03-15
status: archived
tags: [设计工具, 颜色, 玩具]
stack: [TypeScript, Canvas, oklch]
featured: false
emoji: 🎨
stars: 96
links:
  - label: GitHub
    href: https://github.com/
    icon: github
---

核心是 k-means 聚类 + oklch 色相环上的色阶插值。当年为了给这个博客配色写的，现在是归档状态，偶尔还会打开用一下。
