/**
 * Format large numbers into compact notation:
 * 123        → 123
 * 1234       → 1.2k
 * 12345      → 12.3k
 * 123456     → 123.5k
 * 1234567    → 1.2M
 * 1234567890 → 1.2B
 */
export function formatCompactNumber(num: number): string {
	if (num < 1000) return num.toString();
	if (num < 1_000_000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
	if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
	return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
}

/**
 * Format number with locale separators (e.g., 82,140)
 */
export function formatLocaleNumber(num: number): string {
	return num.toLocaleString();
}

/**
 * Generate an SVG sparkline path from an array of values.
 * Returns an SVG path string.
 */
export function generateSparklinePath(values: number[], width: number, height: number): string {
	if (values.length === 0) return '';

	const max = Math.max(...values, 1);
	const min = Math.min(...values, 0);
	const range = max - min || 1;

	const stepX = width / (values.length - 1 || 1);

	return values
		.map((v, i) => {
			const x = i * stepX;
			const y = height - ((v - min) / range) * height;
			return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(' ');
}
