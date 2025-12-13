import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, {
		// Enable streaming for faster TTFB
		filterSerializedResponseHeaders: (name) => {
			// Allow cache headers to pass through
			return name === 'content-type' || name.startsWith('cache-');
		}
	});

	// Add global performance headers
	const headers = new Headers(response.headers);

	// Enable compression hints for CDN
	if (!headers.has('vary')) {
		headers.set('vary', 'Accept-Encoding');
	}

	// Add timing headers for debugging
	headers.set('x-render-mode', 'ssr');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
};
