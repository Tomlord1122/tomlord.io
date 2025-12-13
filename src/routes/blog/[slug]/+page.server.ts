import { dev } from '$app/environment';
import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import type { Post } from '$lib/types/post.js';
import { config, fetchWithTimeout } from '$lib/config.js';

function getDefaultPost(slug: string): Post {
	return {
		title: 'Sample Post for Development',
		date: '2024-01-01',
		tags: ['sample', 'dev'],
		content: `# Sample Post\n\nThis is a sample post for development mode.\n\nSlug: ${slug}`,
		slug: slug,
		duration: '5min',
		lang: 'en',
		description: 'This is a sample post for development mode.'
	};
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	// Cache individual blog posts for 10 minutes, stale for 1 day
	setHeaders({
		'cache-control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
	});
	const { slug } = params;

	// In development mode, skip API call and use default post for faster loading
	if (dev) {
		return { post: getDefaultPost(slug) };
	}

	try {
		const response = await fetchWithTimeout(
			`${config.API.BLOGS}/${slug}`,
			{ method: 'GET', headers: { 'Content-Type': 'application/json' } },
			5000 // 5 second timeout - faster fallback on slow connections
		);

		if (!response.ok) {
			if (response.status === 404) {
				error(404, 'Post not found');
			}
			throw new Error(`API error: ${response.status}`);
		}

		const data = await response.json();
		const blog = data.blog;

		// Extract content from the markdown (remove frontmatter if present)
		let content = blog.content || '';
		const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
		if (frontmatterMatch) {
			content = frontmatterMatch[1].trim();
		}

		const post: Post = {
			title: blog.title,
			date: blog.date,
			tags: blog.tags || [],
			content: content,
			slug: blog.slug,
			duration: blog.duration || '5min',
			lang: blog.lang || 'en',
			description: blog.description || ''
		};

		return {
			post
		};
	} catch (err) {
		console.error('Failed to load blog post:', err);
		error(404, 'Post does not exist or cannot be loaded');
	}
};
