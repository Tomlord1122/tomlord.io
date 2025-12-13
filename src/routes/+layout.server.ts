import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
	// Cache layout data for 1 hour (photos rarely change)
	setHeaders({
		'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
	});
	// Load available photos using import.meta.glob for production compatibility
	let availablePhotos: string[] = [];

	try {
		const photoModules = import.meta.glob('/static/photography_assets/*', {
			eager: true,
			query: '?url',
			import: 'default'
		});

		// Extract the URLs and filter for image files
		const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
		availablePhotos = Object.keys(photoModules)
			.filter((path) => {
				const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
				return imageExtensions.includes(ext);
			})
			.map((path) => {
				// Convert from /static/photography_assets/filename.ext to /photography_assets/filename.ext
				return path.replace('/static', '');
			})
			.sort((a, b) => {
				const getNumber = (path: string) => {
					const filename = path.split('/').pop();
					const numberPart = filename?.split('.')[0];
					return parseInt(numberPart || '0') || 0;
				};
				return getNumber(b) - getNumber(a);
			});
	} catch (err) {
		// Only log in development
		if (process.env.NODE_ENV === 'development') {
			console.error('Error loading photos in layout:', err);
		}
	}

	return {
		availablePhotos
	};
};
