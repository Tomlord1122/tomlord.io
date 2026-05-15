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
		content: `# Sample Post

This is a sample post for development mode.

Slug: ${slug}

## Overview

This section introduces the article and gives the TOC enough content to observe the first active state.

### Why This Exists

The development fallback post includes nested headings so the right-side table of contents can be tested without backend content.

## First Main Section

Scroll through this paragraph to see the TOC indicator move. The TOC should stay fixed on the right side without pushing the article away from the center.

### First Detail

Nested headings should be indented under their parent section and still use the same dash-style indicator.

### Second Detail

This repeated detail section helps verify the scroll spy chooses the heading currently nearest the top of the viewport.

## Second Main Section

More body copy gives the page enough vertical height to test scrolling behavior. The active TOC item should update as this section approaches the top.

### Implementation Notes

The rendered markdown headings get HTML ids, and the TOC links point to those ids with hash anchors.

## Final Section

The final section verifies the last item remains active near the bottom of the page.`,
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
