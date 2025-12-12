import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import type { Post } from '$lib/types/post.js';
import { config, fetchWithTimeout } from '$lib/config.js';

export const load: PageLoad = async ({ params }) => {
	const { slug } = params;

	try {
		const response = await fetchWithTimeout(
			`${config.API.BLOGS}/${slug}`,
			{ method: 'GET', headers: { 'Content-Type': 'application/json' } },
			5000 // 5 second timeout
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
