import { dev } from '$app/environment';
import type { PageServerLoad } from './$types.js';
import { config, fetchWithTimeout } from '$lib/config.js';

function getDefaultProjectContent() {
	return `- **[go-recipe](https://github.com/Tomlord1122/go-recipe)**: A TUI app that can store commands you frequently use.`;
}

async function fetchPageFromAPI(name: string): Promise<string | null> {
	try {
		const response = await fetchWithTimeout(
			`${config.API.PAGES}/${name}`,
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
	// Cache project page for 10 minutes, stale for 1 hour
	setHeaders({
		'cache-control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=3600'
	});
	// In development mode, skip API call and use default content for faster loading
	if (dev) {
		return { pageContent: getDefaultProjectContent() };
	}

	try {
		const apiContent = await fetchPageFromAPI('project');
		if (apiContent) {
			return { pageContent: apiContent };
		}
		// Fallback to default content if API fails
		return {
			pageContent: getDefaultProjectContent()
		};
	} catch (error) {
		console.error('Error loading project page content:', error);
		return {
			pageContent: getDefaultProjectContent()
		};
	}
};
