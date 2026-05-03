import type { LayoutServerLoad } from './$types.js';
import { dev } from '$app/environment';
import fs from 'node:fs/promises';
import path from 'node:path';

const photoDir = path.join(process.cwd(), 'static', 'photography_assets');
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

const productionPhotoModules = import.meta.glob('/static/photography_assets/*', {
	eager: true,
	query: '?url',
	import: 'default'
});

function sortPhotoUrls(urls: string[]) {
	return urls.sort((a, b) => {
		const getNumber = (url: string) => {
			const filename = url.split('/').pop();
			const numberPart = filename?.split('.')[0];
			return parseInt(numberPart || '0') || 0;
		};
		return getNumber(b) - getNumber(a);
	});
}

async function loadPhotosFromFilesystem() {
	const files = await fs.readdir(photoDir);

	return sortPhotoUrls(
		files
			.filter((filename) => {
				const ext = path.extname(filename).toLowerCase();
				return imageExtensions.includes(ext);
			})
			.map((filename) => `/photography_assets/${filename}`)
	);
}

function loadPhotosFromBuildManifest() {
	return sortPhotoUrls(
		Object.keys(productionPhotoModules)
			.filter((filePath) => {
				const ext = path.extname(filePath).toLowerCase();
				return imageExtensions.includes(ext);
			})
			.map((filePath) => filePath.replace('/static', ''))
	);
}

export const load: LayoutServerLoad = async () => {
	let availablePhotos: string[] = [];

	try {
		availablePhotos = dev ? await loadPhotosFromFilesystem() : loadPhotosFromBuildManifest();
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
