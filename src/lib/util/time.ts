const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatThreadTime(iso: string, now = Date.now()): string {
	const time = new Date(iso).getTime();
	if (Number.isNaN(time)) return '';

	const seconds = Math.round((time - now) / 1000);
	const abs = Math.abs(seconds);
	if (abs < 60) return relativeFormatter.format(Math.round(seconds), 'second');

	const minutes = Math.round(seconds / 60);
	if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, 'minute');

	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 24) return relativeFormatter.format(hours, 'hour');

	const days = Math.round(hours / 24);
	if (Math.abs(days) < 7) return relativeFormatter.format(days, 'day');

	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(time);
}
