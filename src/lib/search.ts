export type SearchDoc = {
	title: string;
	url: string;
	date: string;
	category: string;
	tags: string[];
	description: string;
	keywords: string;
};

export type SearchHit = SearchDoc & { score: number };

const CJK = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

/** 极简分词：中文按二元组，英文按单词 */
function tokenize(text: string): string[] {
	const lower = text.toLowerCase();
	const tokens: string[] = [];
	const cjkRuns = lower.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g) ?? [];
	for (const run of cjkRuns) {
		if (run.length === 1) tokens.push(run);
		for (let i = 0; i < run.length - 1; i++) tokens.push(run.slice(i, i + 2));
	}
	const latin = lower.replace(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ').match(/[a-z0-9][a-z0-9'’\-_.+#]*/g) ?? [];
	tokens.push(...latin);
	return tokens;
}

export function scoreDoc(doc: SearchDoc, query: string): number {
	const q = query.trim().toLowerCase();
	if (!q) return 0;
	const hay = `${doc.title} ${doc.description} ${doc.category} ${doc.tags.join(' ')} ${doc.keywords}`.toLowerCase();
	let score = 0;
	if (doc.title.toLowerCase().includes(q)) score += 30;
	if (doc.tags.some((t) => t.toLowerCase().includes(q))) score += 14;
	if (doc.category.toLowerCase().includes(q)) score += 8;
	if (doc.description.toLowerCase().includes(q)) score += 6;
	for (const token of tokenize(q)) {
		if (!token) continue;
		const weight = CJK.test(token) && token.length === 2 ? 3 : 5;
		let idx = hay.indexOf(token);
		let hits = 0;
		while (idx !== -1 && hits < 12) {
			hits++;
			idx = hay.indexOf(token, idx + token.length);
		}
		score += hits * weight;
	}
	return score;
}

export function searchDocs(docs: SearchDoc[], query: string, limit = 12): SearchDoc[] {
	return docs
		.map((doc) => ({ doc, score: scoreDoc(doc, query) }))
		.filter((r) => r.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((r) => r.doc);
}
