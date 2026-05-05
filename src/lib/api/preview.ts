import { config, fetchWithTimeout } from '$lib/config.js';
import type { LinkPreview } from '$lib/types/preview.js';

const memoryCache = new Map<string, LinkPreview>();

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
	if (memoryCache.has(url)) {
		return memoryCache.get(url)!;
	}

	try {
		const response = await fetchWithTimeout(
			`${config.BACKEND_URL}/api/preview?url=${encodeURIComponent(url)}`,
			{ method: 'GET' }
		);

		if (!response.ok) {
			return null;
		}

		const preview: LinkPreview = await response.json();
		memoryCache.set(url, preview);
		return preview;
	} catch {
		return null;
	}
}
