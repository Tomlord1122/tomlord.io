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
	const markdown = `<div class="flex justify-center">
<img src="${imagePath}" alt="${imagePath.split('/').pop()}" class="photo-post">
</div>`;
	try {
		await navigator.clipboard.writeText(markdown);
		alert(`Copied to clipboard: ${markdown}`);
	} catch (err) {
		console.error('Failed to copy text: ', err);
		alert('Failed to copy markdown. You can manually copy: ' + markdown);
	}
}
