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

export async function copyImageMarkdown(imagePath: string) {
	const { showToast } = await import('$lib/stores/toast.svelte.js');
	const markdown = `<div class="flex justify-center">
<img src="${imagePath}" alt="${imagePath.split('/').pop()}" class="photo-post">
</div>`;
	try {
		await navigator.clipboard.writeText(markdown);
		showToast('Copied to clipboard!', 'success', 1000);
	} catch (err) {
		console.error('Failed to copy text: ', err);
		showToast('Failed to copy. Please try again.', 'error', 2000);
	}
}
