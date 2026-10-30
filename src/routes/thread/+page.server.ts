import type { PageServerLoad } from './$types.js';
import { dev } from '$app/environment';
import { fetchThreads } from '$lib/api/threads.js';
import { mockThreads } from '$lib/data/thread-mock.js';
import { preloadEmbedPreviews } from '$lib/util/embed-previews.server.js';
import type { ThreadPost } from '$lib/types/thread.js';

const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ url }) => {
	const preview = dev && url.searchParams.get('mock') === '1';
	if (preview) {
		const threads = mockThreads.slice(0, PAGE_SIZE) satisfies ThreadPost[];
		return {
			threads,
			nextCursor: mockThreads.length > PAGE_SIZE ? 'mock' : null,
			hasMore: mockThreads.length > PAGE_SIZE,
			mock: true,
			previews: preloadEmbedPreviews(threads.map((thread) => thread.content).join('\n'))
		};
	}

	try {
		const page = await fetchThreads({ limit: PAGE_SIZE });
		return {
			threads: page.threads,
			nextCursor: page.next_cursor,
			hasMore: page.has_more,
			mock: false,
			previews: preloadEmbedPreviews(page.threads.map((thread) => thread.content).join('\n'))
		};
	} catch (error) {
		console.error('Failed to load threads:', error);
		return { threads: [], nextCursor: null, hasMore: false, mock: false, previews: {} };
	}
};
