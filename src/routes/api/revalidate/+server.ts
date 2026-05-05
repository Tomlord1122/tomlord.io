import type { RequestHandler } from '@sveltejs/kit';
import { BYPASS_TOKEN } from '$env/static/private';

export const POST: RequestHandler = async ({ url }) => {
	const path = url.searchParams.get('path');
	if (!path) {
		return new Response(JSON.stringify({ error: 'Missing path query parameter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Prevent revalidating arbitrary external origins
	if (!path.startsWith('/')) {
		return new Response(JSON.stringify({ error: 'Path must be absolute (start with /)' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const origin = url.origin;
	const target = `${origin}${path}`;

	try {
		// Vercel ISR on-demand revalidation: GET/HEAD with x-prerender-revalidate header
		const res = await fetch(target, {
			method: 'HEAD',
			headers: {
				'x-prerender-revalidate': BYPASS_TOKEN
			}
		});

		return new Response(
			JSON.stringify({ ok: res.ok, status: res.status, path }),
			{
				status: res.ok ? 200 : 502,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
