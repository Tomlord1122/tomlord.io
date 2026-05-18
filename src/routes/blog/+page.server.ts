import type { PageServerLoad } from './$types.js';
import type { Config } from '@sveltejs/adapter-vercel';
import { BYPASS_TOKEN } from '$env/static/private';
import { dev } from '$app/environment';
import type { PostData, PostMetadata } from '$lib/types/post.js';
import { config as appConfig, fetchWithTimeout } from '$lib/config.js';

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

async function fetchPostsFromAPI(): Promise<PostMetadata[]> {
	try {
		const response = await fetchWithTimeout(
			`${appConfig.API.BLOGS}?limit=10000&published=true`,
			{ method: 'GET', headers: { 'Content-Type': 'application/json' } },
			5000
		);

		if (!response.ok) {
			throw new Error(`Backend API error: ${response.status}`);
		}

		const data: { blogs: PostData[] } = await response.json();
		return data.blogs
			.map((blog: PostData) => ({
				title: blog.title,
				date: blog.date,
				slug: blog.slug,
				description: blog.description || '',
				tags: blog.tags || [],
				lang: blog.lang || 'en',
				duration: blog.duration || '5min'
			}))
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	} catch (error) {
		console.error('Failed to load blogs from API:', error);
		return [];
	}
}

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Browser-side cache; ISR handles edge caching
	setHeaders({
		'cache-control': 'public, max-age=60'
	});

	return {
		posts: dev ? getDefaultPosts() : await fetchPostsFromAPI()
	};
};

export const config: Config = {
	isr: {
		expiration: 300, // 5 minutes
		bypassToken: BYPASS_TOKEN
	}
};
