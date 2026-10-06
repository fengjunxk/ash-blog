---
title: edge-counter
tagline: 给静态站点用的边缘计数器
description: 一个 200 行的 Cloudflare Worker 项目：为任意静态站点提供浏览量、点赞、阅读进度同步接口，自带去重与限流。
published: 2026-06-02
status: maintained
tags: [Cloudflare, Workers, KV]
stack: [Workers, KV, TypeScript]
featured: true
emoji: 🧮
stars: 328
links:
  - label: GitHub
    href: https://github.com/
    icon: github
  - label: 文档
    href: https://example.com
    icon: book
---

部署一次，之后任何静态站点只要引一个 `<script>`，就能拿到计数能力。支持多站点共用同一个 Worker，按 `siteId` 隔离数据。
