import type { PageServerLoad } from './$types.js';
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { fetchThread } from '$lib/api/threads.js';
import { mockThreads } from '$lib/data/thread-mock.js';
import { preloadEmbedPreviews } from '$lib/util/embed-previews.server.js';

export const load: PageServerLoad = async ({ params, url }) => {
	const preview = dev && url.searchParams.get('mock') === '1';
	if (preview) {
		const thread = mockThreads.find((item) => item.id === params.id);
		if (!thread) error(404, 'Thread not found');
		return { thread, mock: true, previews: preloadEmbedPreviews(thread.content) };
	}

	try {
		const thread = await fetchThread(params.id);
		return { thread, mock: false, previews: preloadEmbedPreviews(thread.content) };
	} catch {
		error(404, 'Thread not found');
	}
};
