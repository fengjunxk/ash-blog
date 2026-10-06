/**
 * 构建期把 Markdown 里的 GitHub 风格 callout 转成带样式的区块：
 *
 *   > [!NOTE] 小提示
 *   > 正文……
 *
 * 产出：
 *   <aside class="callout callout--note">
 *     <p class="callout__title">✏️ 小提示</p>
 *     <p>正文……</p>
 *   </aside>
 *
 * 实现要点：
 *  - 引用块第一行的 `[!KIND] 标题` 被摘出来，放进独立的标题段落
 *  - 标题行之后的内容会被重新解析回 mdast 节点，因此行内格式（加粗、代码等）不会丢
 *  - 用节点级 data.hName 改写输出标签，不覆盖子节点（用 hChildren 会丢掉正文）
 */
import { visit } from 'unist-util-visit';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import type { Root, Blockquote, BlockContent, Paragraph, PhrasingContent } from 'mdast';

const KINDS = {
	NOTE: { label: '小提示', icon: '✏️', tone: 'note' },
	TIP: { label: '小技巧', icon: '✦', tone: 'tip' },
	IMPORTANT: { label: '划重点', icon: '❢', tone: 'important' },
	WARNING: { label: '小心', icon: '⚠', tone: 'warning' },
	CAUTION: { label: '注意', icon: '⛔', tone: 'caution' },
	SUCCESS: { label: '搞定', icon: '✓', tone: 'success' },
	QUESTION: { label: '疑问', icon: '?', tone: 'question' },
	QUOTE: { label: '引用', icon: '❝', tone: 'quote' },
	BUG: { label: '踩坑', icon: '🐛', tone: 'bug' },
} as const;

type KindKey = keyof typeof KINDS;

/** 把一段纯文本重新解析成行内节点，保留 `加粗`、`代码` 之类的语法 */
function inlineNodes(markdown: string): PhrasingContent[] {
	if (!markdown.trim()) return [];
	try {
		const tree = fromMarkdown(markdown, {
			extensions: [gfm()],
			mdastExtensions: [gfmFromMarkdown()],
		});
		const first = tree.children[0];
		if (first && first.type === 'paragraph') return first.children;
	} catch {
		/* 解析失败就退回纯文本 */
	}
	return [{ type: 'text', value: markdown }];
}

export default function remarkCallouts() {
	return (tree: Root) => {
		visit(tree, 'blockquote', (node: Blockquote) => {
			const first = node.children[0];
			if (!first || first.type !== 'paragraph') return;

			const paragraph = first as Paragraph;
			const head = paragraph.children[0];
			if (!head || head.type !== 'text') return;

			const match = /^\[!(\w+)\]\s*([^\n]*)/.exec(head.value);
			if (!match) return;
			const meta = KINDS[match[1]!.toUpperCase() as KindKey];
			if (!meta) return;

			const custom = (match[2] ?? '').trim();
			const title = custom || meta.label;

			// 切掉 `[!KIND] 标题` 那一段（含它后面的换行）
			let restText = head.value.slice(match[0].length).replace(/^\n/, '');
			const restChildren: PhrasingContent[] = [];
			let i = 1;
			for (; i < paragraph.children.length; i++) {
				const child = paragraph.children[i]!;
				if (child.type === 'text') {
					const nl = child.value.indexOf('\n');
					if (nl !== -1) {
						restText += child.value.slice(nl + 1);
						break;
					}
					restText += child.value;
				} else {
					restChildren.push(child);
				}
			}

			const titleNode = {
				type: 'paragraph',
				data: { hName: 'p', hProperties: { class: 'callout__title' } },
				children: [{ type: 'text', value: `${meta.icon} ${title}` }],
			} as unknown as BlockContent;

			const bodyNodes: PhrasingContent[] = [...inlineNodes(restText), ...restChildren];

			const newChildren: BlockContent[] = [];
			newChildren.push(titleNode);
			if (bodyNodes.length) {
				newChildren.push({ type: 'paragraph', children: bodyNodes });
			}
			newChildren.push(...(node.children.slice(1) as BlockContent[]));
			node.children = newChildren;

			node.data = {
				...node.data,
				hName: 'aside',
				hProperties: { class: `callout callout--${meta.tone}`, 'data-callout': meta.tone },
			};
		});
	};
}
