import { dev } from '$app/environment';
import type { PageServerLoad } from './$types.js';
import type { Config } from '@sveltejs/adapter-vercel';
import { BYPASS_TOKEN } from '$env/static/private';
import { config as appConfig, fetchWithTimeout } from '$lib/config.js';
import { preloadEmbedPreviews } from '$lib/util/embed-previews.server.js';

function getDefaultHomeContent() {
	return `

<!-- About me -->
Hi, it's Tomlord here.

I am a software engineer who is passionate about distributed systems. FYI I am a Golang lover.
In my free time, I also love to write frontend applications with Svelte.

This website contains some of my blog posts about my learning journey and topics of interest. I will share my projects and thoughts with you. Feel free to contact me via email.

### Experience
- **HP Software Engineering Intern** *(Jul 2024 - Now)*
- **MediaTek System Research Assistant** *(Jan 2024 - Jul 2025)*`;
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
		const pageContent = getDefaultHomeContent();
		return { pageContent, previews: preloadEmbedPreviews(pageContent) };
	}

	try {
		const apiContent = await fetchPageFromAPI('home');
		const pageContent = apiContent ?? getDefaultHomeContent();
		return {
			pageContent,
			previews: preloadEmbedPreviews(pageContent)
		};
	} catch (error) {
		console.error('Error loading home page content:', error);
		const pageContent = getDefaultHomeContent();
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
