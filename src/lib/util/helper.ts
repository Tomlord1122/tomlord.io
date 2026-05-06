export function calculateDuration(text: string, language: string): number {
	const trimmedContent = text.trim();
	if (trimmedContent === '') return 1;
	let words = 0;

	if (language === 'zh-tw' || /[\u4e00-\u9fff]/.test(trimmedContent)) {
		words = trimmedContent.replace(/[\s\p{P}]/gu, '').length;
	} else {
		words = trimmedContent.split(/\s+/).filter((word) => word.length > 0).length;
	}
	const wordsPerMinute = language === 'zh-tw' ? 300 : 180; // Adjusted WPM values
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
