export const PHOTO_BOOK_WIDTH = 1920;
export const PHOTO_BOOK_HEIGHT = 1080;
export const PHOTO_BOOK_IMAGES_PER_SPREAD = 4;

export type PhotoBookTemplate =
	| 'feature-left'
	| 'balanced'
	| 'single'
	| 'pair'
	| 'trio'
	| 'final-portrait';

export interface PhotoBookSourceSpread {
	id: string;
	template: PhotoBookTemplate;
	photos: string[];
}

function templateForSpread(photoCount: number, spreadIndex: number): PhotoBookTemplate {
	if (photoCount === 1) return 'single';
	if (photoCount === 2) return 'pair';
	if (photoCount === 3) return 'trio';
	return spreadIndex % 2 === 0 ? 'feature-left' : 'balanced';
}

export function buildPhotoBookSourceSpreads(
	photographySources: readonly string[],
	finalPortrait: string
): PhotoBookSourceSpread[] {
	const collageCount = Math.ceil(photographySources.length / PHOTO_BOOK_IMAGES_PER_SPREAD);
	const collages = Array.from({ length: collageCount }, (_, spreadIndex) => {
		const photos = photographySources.slice(
			spreadIndex * PHOTO_BOOK_IMAGES_PER_SPREAD,
			(spreadIndex + 1) * PHOTO_BOOK_IMAGES_PER_SPREAD
		);

		return {
			id: `spread-${String(spreadIndex + 1).padStart(2, '0')}`,
			template: templateForSpread(photos.length, spreadIndex),
			photos
		};
	});

	return [
		...collages,
		{
			id: `spread-${String(collages.length + 1).padStart(2, '0')}`,
			template: 'final-portrait',
			photos: [finalPortrait]
		}
	];
}
