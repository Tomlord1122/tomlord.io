import type { PageServerLoad } from './$types.js';
import projectContent from '../../content/project.md?raw';
import { config, fetchWithTimeout } from '$lib/config.js';

function getDefaultProjectContent() {
	return `- **[go-recipe](https://github.com/Tomlord1122/go-recipe)**: A TUI app that can store commands you frequently use.`;
}

async function fetchPageFromAPI(name: string): Promise<string | null> {
	try {
		const response = await fetchWithTimeout(
			`${config.API.PAGES}/${name}`,
			{ method: 'GET', headers: { 'Content-Type': 'application/json' } },
			3000 // 3 second timeout for server-side
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

export const load: PageServerLoad = async () => {
	try {
		// Try API first, fallback to local content
		const apiContent = await fetchPageFromAPI('project');
		if (apiContent) {
			return { pageContent: apiContent };
		}
		// Fallback to local file
		return {
			pageContent: projectContent || getDefaultProjectContent()
		};
	} catch (error) {
		console.error('Error loading project page content:', error);
		return {
			pageContent: getDefaultProjectContent()
		};
	}
};
