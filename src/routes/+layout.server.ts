import type { LayoutServerLoad } from './$types.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const photoDir = path.join(process.cwd(), 'static', 'photography_assets');

export const load: LayoutServerLoad = async () => {
	let availablePhotos: string[] = [];

	try {
		const files = await fs.readdir(photoDir);

		// Extract the URLs and filter for image files
		const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
		availablePhotos = files
			.filter((filename) => {
				const ext = path.extname(filename).toLowerCase();
				return imageExtensions.includes(ext);
			})
			.map((filename) => {
				// Convert to public URL path
				return `/photography_assets/${filename}`;
			})
			.sort((a, b) => {
				const getNumber = (url: string) => {
					const filename = url.split('/').pop();
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
