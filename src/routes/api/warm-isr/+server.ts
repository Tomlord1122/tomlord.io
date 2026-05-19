import type { RequestHandler } from '@sveltejs/kit';
import { BYPASS_TOKEN } from '$env/static/private';

const WARM_PATHS = ['/', '/blog', '/project'] as const;

type WarmResult = {
	path: string;
	ok: boolean;
	status?: number;
	error?: string;
};

function isAuthorized(request: Request) {
	const authHeader = request.headers.get('authorization');
	const userAgent = request.headers.get('user-agent') ?? '';

	return authHeader === `Bearer ${BYPASS_TOKEN}` || userAgent.includes('vercel-cron/1.0');
}

async function warmPath(origin: string, path: string): Promise<WarmResult> {
	try {
		const response = await fetch(`${origin}${path}`, {
			method: 'HEAD',
			headers: {
				'x-prerender-revalidate': BYPASS_TOKEN
			}
		});

		return {
			path,
			ok: response.ok,
			status: response.status
		};
	} catch (error) {
		return {
			path,
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

export const GET: RequestHandler = async ({ request, url }) => {
	if (!isAuthorized(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const results = await Promise.all(WARM_PATHS.map((path) => warmPath(url.origin, path)));
	const ok = results.every((result) => result.ok);

	return new Response(JSON.stringify({ ok, warmed: results }), {
		status: ok ? 200 : 207,
		headers: { 'Content-Type': 'application/json' }
	});
};
