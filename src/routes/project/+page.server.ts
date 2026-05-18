import { dev } from '$app/environment';
import type { PageServerLoad } from './$types.js';
import type { Config } from '@sveltejs/adapter-vercel';
import { BYPASS_TOKEN } from '$env/static/private';
import { config as appConfig, fetchWithTimeout } from '$lib/config.js';
import { preloadEmbedPreviews } from '$lib/util/embed-previews.server.js';

function getDefaultProjectContent() {
	return `- **[go-recipe](https://github.com/Tomlord1122/go-recipe)**: A TUI app that can store commands you frequently use. [[embed|https://github.com/Tomlord1122/go-recipe]]
	[[embed|https://www.youtube.com/@s09g | s09g]]`;
}

async function fetchPageFromAPI(name: string): Promise<string | null> {
	try {
		const response = await fetchWithTimeout(
			`${appConfig.API.PAGES}/${name}`,
			{ method: 'GET', headers: { 'Content-Type': 'application/json' } },
			5000 // 5 second timeout
		);
		if (response.ok) {
			const data = await response.json();
			return data.page?.content || null;
		}
		return null;
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Browser-side cache; ISR handles edge caching
	setHeaders({
		'cache-control': 'public, max-age=60'
	});

	// In development mode, skip API call and use default content for faster loading
	if (dev) {
		const pageContent = getDefaultProjectContent();
		return { pageContent, previews: preloadEmbedPreviews(pageContent) };
	}

	try {
		const apiContent = await fetchPageFromAPI('project');
		const pageContent = apiContent ?? getDefaultProjectContent();
		return {
			pageContent,
			previews: preloadEmbedPreviews(pageContent)
		};
	} catch (error) {
		console.error('Error loading project page content:', error);
		const pageContent = getDefaultProjectContent();
		return {
			pageContent,
			previews: preloadEmbedPreviews(pageContent)
		};
	}
};

export const config: Config = {
	isr: {
		expiration: 600, // 10 minutes
		bypassToken: BYPASS_TOKEN
	}
};
