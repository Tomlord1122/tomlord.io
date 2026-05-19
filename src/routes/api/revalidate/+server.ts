import type { RequestHandler } from '@sveltejs/kit';
import { BYPASS_TOKEN } from '$env/static/private';
import { PUBLIC_BACKEND_URL } from '$env/static/public';

function hasBypassToken(request: Request): boolean {
	const authHeader = request.headers.get('authorization');
	const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
	const prewarmToken = request.headers.get('x-prewarm-token');

	return bearerToken === BYPASS_TOKEN || prewarmToken === BYPASS_TOKEN;
}

async function isSuperUser(request: Request, fetch: typeof globalThis.fetch): Promise<boolean> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return false;
	}

	const response = await fetch(`${PUBLIC_BACKEND_URL}/auth/me`, {
		headers: {
			Authorization: authHeader
		}
	});

	if (!response.ok) {
		return false;
	}

	const data = await response.json();
	return data?.user?.is_super_user === true;
}

export const POST: RequestHandler = async ({ request, url, fetch }) => {
	if (!hasBypassToken(request) && !(await isSuperUser(request, fetch))) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

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
		// Vercel ISR on-demand revalidation: GET warms the regenerated page artifact.
		const res = await fetch(target, {
			method: 'GET',
			headers: {
				'x-prerender-revalidate': BYPASS_TOKEN
			}
		});

		return new Response(JSON.stringify({ ok: res.ok, status: res.status, path }), {
			status: res.ok ? 200 : 502,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
