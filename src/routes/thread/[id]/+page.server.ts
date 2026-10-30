import type { PageServerLoad } from './$types.js';
import type { Config } from '@sveltejs/adapter-vercel';
import { BYPASS_TOKEN } from '$env/static/private';
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { fetchThread } from '$lib/api/threads.js';
import { mockThreads } from '$lib/data/thread-mock.js';
import { preloadEmbedPreviews } from '$lib/util/embed-previews.server.js';

function mockThread(id: string) {
	const thread = mockThreads.find((item) => item.id === id);
	if (!thread) error(404, 'Thread not found');
	return { thread, mock: true, previews: preloadEmbedPreviews(thread.content) };
}

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, max-age=60'
	});
	if (dev && url.searchParams.get('mock') === '1') return mockThread(params.id);

	try {
		const thread = await fetchThread(params.id);
		return { thread, mock: false, previews: preloadEmbedPreviews(thread.content) };
	} catch (cause) {
		if (dev && mockThreads.some((item) => item.id === params.id)) return mockThread(params.id);
		console.error('Failed to load thread:', cause);
		error(404, 'Thread not found');
	}
};

export const config: Config = {
	isr: {
		expiration: 3600,
		bypassToken: BYPASS_TOKEN
	}
};
