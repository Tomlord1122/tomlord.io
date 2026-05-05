import { config as appConfig, fetchWithTimeout } from '$lib/config.js';
import type { LinkPreview } from '$lib/types/preview.js';
import { extractEmbedUrls } from './embed.js';

/**
 * Server-side helper: extract every `[[embed|url]]` from the given text,
 * fetch each URL's preview from the backend in parallel, and return a map.
 *
 * Contract: this function MUST NEVER throw. A crashing SSR function takes the
 * whole page down (Vercel returns FUNCTION_INVOCATION_FAILED), so every error
 * path here returns an empty/partial map. Missing entries fall back to the
 * domain-only chip on render.
 */
export async function preloadEmbedPreviews(
	text: string
): Promise<Record<string, LinkPreview>> {
	try {
		if (!text) return {};

		const urls = extractEmbedUrls(text);
		if (urls.length === 0) return {};

		// If we don't have a backend URL configured, skip silently.
		const backend = appConfig.BACKEND_URL;
		if (!backend) return {};

		const results = await Promise.allSettled(
			urls.map((url) => fetchOne(backend, url))
		);

		const previews: Record<string, LinkPreview> = {};
		results.forEach((result, index) => {
			if (result.status === 'fulfilled' && result.value) {
				previews[urls[index]] = result.value;
			}
		});
		return previews;
	} catch (err) {
		// Last-resort guard. Anything that escapes the per-URL try/catch ends here.
		console.error('[preloadEmbedPreviews] unexpected error', err);
		return {};
	}
}

async function fetchOne(backend: string, url: string): Promise<LinkPreview | null> {
	try {
		const res = await fetchWithTimeout(
			`${backend}/api/preview?url=${encodeURIComponent(url)}`,
			{ method: 'GET' },
			5000
		);
		if (!res.ok) return null;
		const data = (await res.json()) as LinkPreview;
		// Minimal shape check — backend may evolve, never trust blindly.
		if (!data || typeof data !== 'object' || typeof data.url !== 'string') {
			return null;
		}
		return data;
	} catch (err) {
		console.warn(`[preloadEmbedPreviews] failed to fetch ${url}`, err);
		return null;
	}
}
