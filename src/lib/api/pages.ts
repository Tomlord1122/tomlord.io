import { config, fetchWithTimeout } from '$lib/config.js';

export interface PageData {
	id: string;
	name: string;
	content: string;
	created_at: string;
	updated_at: string;
}

/**
 * Fetch a page by name from the backend API
 */
export async function fetchPageByName(name: string): Promise<PageData> {
	const response = await fetchWithTimeout(`${config.API.PAGES}/${name}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch page: ${response.status}`);
	}

	const data = await response.json();
	return data.page;
}

/**
 * Update a page by name (requires super user auth)
 */
export async function updatePage(name: string, content: string, token: string): Promise<PageData> {
	const response = await fetchWithTimeout(
		`${config.API.PAGES}/${name}`,
		{
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ name, content })
		},
		10000 // 10 second timeout for update
	);

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `Failed to update page: ${response.status}`);
	}

	const result = await response.json();
	return result.page;
}
