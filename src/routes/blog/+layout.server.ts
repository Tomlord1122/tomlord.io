import { dev } from '$app/environment';
import type { LayoutServerLoad } from '../$types.js';
import type { PostMetadata, PostData } from '$lib/types/post.js';
import { config, fetchWithTimeout } from '$lib/config.js';

function getDefaultPosts(): PostMetadata[] {
	return [
		{
			title: 'Sample Post for Development',
			date: '2024-01-01',
			slug: 'sample-post',
			description: 'This is a sample post for development mode.',
			tags: ['sample', 'dev'],
			lang: 'en',
			duration: '5min'
		}
	];
}

export const load: LayoutServerLoad = async (): Promise<{
	posts: PostMetadata[];
}> => {
	// In development mode, skip API call and use default posts for faster loading
	if (dev) {
		return { posts: getDefaultPosts() };
	}

	let posts: PostMetadata[] = [];

	try {
		const response = await fetchWithTimeout(
			`${config.API.BLOGS}?limit=10000&published=true`,
			{ method: 'GET', headers: { 'Content-Type': 'application/json' } },
			5000 // 5 second timeout
		);

		if (!response.ok) {
			throw new Error(`Backend API error: ${response.status}`);
		}

		const data: { blogs: PostData[] } = await response.json();
		posts = data.blogs.map((blog: PostData) => ({
			title: blog.title,
			date: blog.date,
			slug: blog.slug,
			description: blog.description || '',
			tags: blog.tags || [],
			lang: blog.lang || 'en',
			duration: blog.duration || '5min'
		}));
	} catch (error) {
		console.error('Failed to load blogs from API:', error);
		posts = [];
	}

	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return {
		posts
	};
};
