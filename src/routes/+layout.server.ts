import type { LayoutServerLoad } from './$types.js';
import { dev } from '$app/environment';
import fs from 'node:fs/promises';
import path from 'node:path';

const photoDir = path.join(process.cwd(), 'static', 'photography_assets');
const assetDir = path.join(process.cwd(), 'static', 'content_assets');
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

const productionPhotoModules = import.meta.glob('/static/photography_assets/*', {
	eager: true,
	query: '?url',
	import: 'default'
});

const productionAssetModules = import.meta.glob('/static/content_assets/*', {
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

async function loadImagesFromFilesystem(dir: string, urlPrefix: string) {
	try {
		const files = await fs.readdir(dir);
		return sortPhotoUrls(
			files
				.filter((filename) => {
					const ext = path.extname(filename).toLowerCase();
					return imageExtensions.includes(ext);
				})
				.map((filename) => `/${urlPrefix}/${filename}`)
		);
	} catch {
		return [];
	}
}

function loadImagesFromBuildManifest(modules: Record<string, unknown>) {
	return sortPhotoUrls(
		Object.keys(modules)
			.filter((filePath) => {
				const ext = path.extname(filePath).toLowerCase();
				return imageExtensions.includes(ext);
			})
			.map((filePath) => filePath.replace('/static', ''))
	);
}

export const load: LayoutServerLoad = async () => {
	let availablePhotos: string[] = [];
	let availableAssets: string[] = [];

	if (dev) {
		[availablePhotos, availableAssets] = await Promise.all([
			loadImagesFromFilesystem(photoDir, 'photography_assets'),
			loadImagesFromFilesystem(assetDir, 'content_assets')
		]);
	} else {
		availablePhotos = loadImagesFromBuildManifest(productionPhotoModules);
		availableAssets = loadImagesFromBuildManifest(productionAssetModules);
	}

	return {
		availablePhotos,
		availableAssets
	};
};
