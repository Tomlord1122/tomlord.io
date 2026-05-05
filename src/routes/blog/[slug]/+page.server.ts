import { dev } from '$app/environment';
import type { PageServerLoad } from './$types.js';
import type { Config } from '@sveltejs/adapter-vercel';
import { BYPASS_TOKEN } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type { Post } from '$lib/types/post.js';
import { config as appConfig, fetchWithTimeout } from '$lib/config.js';
import { preloadEmbedPreviews } from '$lib/util/embed-previews.server.js';

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
	// Browser-side cache; ISR handles edge caching
	setHeaders({
		'cache-control': 'public, max-age=60'
	});

	const { slug } = params;

	// In development mode, skip API call and use default post for faster loading
	if (dev) {
		return { post: getDefaultPost(slug) };
	}

	try {
		const response = await fetchWithTimeout(
			`${appConfig.API.BLOGS}/${slug}`,
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
			post,
			previews: await preloadEmbedPreviews(content)
		};
	} catch (err) {
		console.error('Failed to load blog post:', err);
		error(404, 'Post does not exist or cannot be loaded');
	}
};

export const config: Config = {
	isr: {
		expiration: 3600, // 1 hour
		bypassToken: BYPASS_TOKEN
	}
};
