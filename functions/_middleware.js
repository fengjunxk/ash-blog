/**
 * Pages/_headers 的等价物：用 Functions 中间件统一加安全响应头。
 * 只对 HTML 与 API 生效，静态资源交给 CDN 缓存。
 */

const SECURITY_HEADERS = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'x-frame-options': 'SAMEORIGIN',
	'permissions-policy': 'geolocation=(), microphone=(), camera=()',
	'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

export const onRequest = async (context) => {
	const response = await context.next();
	const headers = new Headers(response.headers);

	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(key)) headers.set(key, value);
	}

	// API 一律不缓存
	if (new URL(context.request.url).pathname.startsWith('/api/')) {
		headers.set('cache-control', 'no-store');
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};
