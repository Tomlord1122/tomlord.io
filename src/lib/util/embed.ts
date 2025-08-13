import type { LinkPreview } from '$lib/types/preview.js';

/** Extract unique embed URLs from markdown text. */
export function extractEmbedUrls(text: string): string[] {
	// Create a new regex each call to avoid lastIndex state leaking between calls.
	const regex = /\[\[embed\|([^|\]]+)(?:\|[^\]]*)?\]\]/g;
	const urls: string[] = [];
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		urls.push(match[1].trim());
	}
	return [...new Set(urls)];
}

/**
 * Build inline HTML for an embedded link.
 *
 * Renders as inline text: `[favicon] title` — same height, same colour as the
 * surrounding paragraph. No border, no background, no extra padding.
 *
 * The raw URL is never exposed to the reader; only the title/domain label is
 * shown. The full URL is available on hover via the native `title` attribute.
 *
 * Supports optional custom label: [[embed|url|My Label]]
 */
export function buildEmbedHTML(
	url: string,
	preview?: LinkPreview | null,
	customLabel?: string
): string {
	const safeUrl = escapeHtml(url);
	const domain = domainFromUrl(url);

	// Custom label overrides everything; otherwise fall back to OG title -> site_name -> domain.
	const rawLabel =
		customLabel?.trim() || preview?.title?.trim() || preview?.site_name?.trim() || domain;

	const label = escapeHtml(rawLabel);
	const faviconSrc = pickFavicon(url, preview);

	return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="inline-embed" title="${escapeHtml(url)}"><img src="${faviconSrc}" alt="" class="inline-embed-icon" width="16" height="16" loading="lazy"><span class="inline-embed-label">${label}</span></a>`;
}

/** Choose the most reliable favicon source. */
function pickFavicon(url: string, preview?: LinkPreview | null): string {
	// 1. Backend preview service (most accurate).
	if (preview?.favicon?.trim()) {
		return escapeHtml(preview.favicon);
	}
	// 2. DuckDuckGo's favicon endpoint — fast, no rate-limit, returns the
	//    site's actual ico/png with correct content-type.
	return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domainFromUrl(url))}.ico`;
}

function domainFromUrl(urlStr: string): string {
	try {
		const u = new URL(urlStr);
		return u.hostname.replace(/^www\./, '');
	} catch {
		return urlStr;
	}
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
