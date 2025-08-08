import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import type { Post } from '$lib/types/post.js';
import { clientFirstLoadWithBackgroundSync } from '$lib/config.js';

export const load: PageLoad = async ({ params }) => {
	const { slug } = params;

	const loadFromLocal = async () => {
		const postModule = await import(`../../../markdown/posts/${slug}.svx`);

		if (!postModule || !postModule.metadata) {
			throw new Error('Post metadata is missing');
		}

		const metadata = postModule.metadata as Omit<Post, 'content' | 'slug'>;

		return {
			title: metadata.title,
			date: metadata.date,
			tags: metadata.tags || [],
			content: postModule.default,
			slug: slug,
			duration: metadata.duration || '5min',
			lang: metadata.lang || 'en',
			description: metadata.description || ''
		};
	};

	let post: Post;

	try {
		const result = await clientFirstLoadWithBackgroundSync(loadFromLocal);
		post = result.data;
	} catch (apiAndLocalError) {
		console.error('Failed to load blog post from both API and local files:', apiAndLocalError);
		error(404, 'Post does not exist or cannot be loaded');
	}

	return {
		post
	};
};
