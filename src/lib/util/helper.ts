export function countContentUnits(text: string, language: string): number {
	const trimmedContent = text.trim();
	if (trimmedContent === '') return 0;

	if (language === 'zh-tw' || /[\u4e00-\u9fff]/.test(trimmedContent)) {
		return trimmedContent.replace(/[\s\p{P}]/gu, '').length;
	}
	return trimmedContent.split(/\s+/).filter((word) => word.length > 0).length;
}

export function calculateDuration(text: string, language: string): number {
	const words = countContentUnits(text, language);
	if (words === 0) return 1;
	const wordsPerMinute = language === 'zh-tw' ? 300 : 180;
	const calculatedDuration = Math.ceil(words / wordsPerMinute);

	return Math.max(1, calculatedDuration);
}

/**
 * Load an image in the browser and return its natural dimensions.
 * Falls back to null if the image cannot be loaded (e.g. CORS, 404).
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
	return new Promise((resolve) => {
		if (typeof window === 'undefined') {
			resolve(null);
			return;
		}
		const img = new Image();
		img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
		img.onerror = () => resolve(null);
		img.src = src;
	});
}

/**
 * Build the standard `.photo-post` HTML snippet, optionally including
 * width/height attributes so the browser can reserve space and prevent
 * layout shift while the real image loads.
 */
export function buildPhotoPostHTML(
	imagePath: string,
	dimensions?: { width: number; height: number } | null
): string {
	const alt = imagePath.split('/').pop() ?? 'image';
	const dimAttrs = dimensions ? ` width="${dimensions.width}" height="${dimensions.height}"` : '';
	return `<div class="flex justify-center">
<img src="${imagePath}" alt="${alt}" class="photo-post"${dimAttrs}>
</div>`;
}

export const PHOTO_SIZE_PRESETS = {
	s: 240,
	m: 360,
	l: 520
} as const;

export const PHOTO_SIZE_MAX = 720;

const WIDTH_CLASS_RE = /\bw-\[(\d+)px\]/;
const WIDTH_STYLE_RE = /width:\s*(\d+)px/;

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function imgTagRegex(src: string): RegExp {
	return new RegExp(`<img\\b[\\s\\S]*?src="${escapeRegExp(src)}"[\\s\\S]*?>`, 'gi');
}

export function parsePhotoWidth(tag: string): number | null {
	const fromStyle = tag.match(WIDTH_STYLE_RE);
	if (fromStyle) return Number(fromStyle[1]);
	const fromClass = tag.match(WIDTH_CLASS_RE);
	if (fromClass) return Number(fromClass[1]);
	return null;
}

export function applyPhotoWidthToTag(tag: string, widthPx: number | null): string {
	let next = tag.replace(/\s*w-\[\d+px\]/g, '').replace(/\s*style="[^"]*"/g, '');
	next = next.replace(/class="\s*([^"]*?)\s*"/, 'class="$1"');
	if (widthPx == null) return next;
	if (/class="/.test(next)) {
		return next.replace(
			/class="([^"]*)"/,
			`class="$1" style="width: ${widthPx}px; max-width: 100%"`
		);
	}
	return next.replace('<img', `<img style="width: ${widthPx}px; max-width: 100%"`);
}

export function getPhotoWidth(content: string, src: string, index: number): number | null {
	const matches = [...content.matchAll(imgTagRegex(src))];
	const tag = matches[index]?.[0];
	return tag ? parsePhotoWidth(tag) : null;
}

export function setPhotoWidth(
	content: string,
	src: string,
	index: number,
	widthPx: number | null
): string {
	let current = 0;
	return content.replace(imgTagRegex(src), (tag) => {
		if (current++ === index) return applyPhotoWidthToTag(tag, widthPx);
		return tag;
	});
}

export async function copyImageMarkdown(imagePath: string) {
	const { showToast } = await import('$lib/stores/toast.svelte.js');
	// Probe the image first so the copied snippet carries width/height.
	const dimensions = await getImageDimensions(imagePath);
	const markdown = buildPhotoPostHTML(imagePath, dimensions);
	try {
		await navigator.clipboard.writeText(markdown);
		showToast('Copied to clipboard!', 'success', 1000);
	} catch (err) {
		console.error('Failed to copy text: ', err);
		showToast('Failed to copy. Please try again.', 'error', 2000);
	}
}
