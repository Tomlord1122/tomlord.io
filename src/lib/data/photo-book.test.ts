import { describe, expect, it } from 'vitest';
import { buildPhotoBookSourceSpreads } from './photo-book-config.js';
import { photoBookSpreads, photoBookTargetIndex } from './photo-book.js';

describe('photo book configuration', () => {
	it('groups any number of photography assets and adds a dedicated final portrait', () => {
		const photos = Array.from({ length: 55 }, (_, index) => `/photos/${55 - index}.webp`);
		const spreads = buildPhotoBookSourceSpreads(photos, '/content_assets/1.webp');
		const flattened = spreads.flatMap((spread) => spread.photos);

		expect(spreads).toHaveLength(15);
		expect(spreads.at(-2)?.template).toBe('trio');
		expect(spreads.at(-2)?.photos).toHaveLength(3);
		expect(spreads.at(-1)).toMatchObject({
			template: 'final-portrait',
			photos: ['/content_assets/1.webp']
		});
		expect(flattened).toEqual([...photos, '/content_assets/1.webp']);
	});

	it('automatically fills a collage when another photography asset is added', () => {
		const photos = Array.from({ length: 56 }, (_, index) => `/photos/${56 - index}.webp`);
		const spreads = buildPhotoBookSourceSpreads(photos, '/content_assets/1.webp');

		expect(spreads).toHaveLength(15);
		expect(spreads.at(-2)?.template).toBe('balanced');
		expect(spreads.at(-2)?.photos).toHaveLength(4);
		expect(spreads.at(-1)?.template).toBe('final-portrait');
	});

	it('targets the final generated single-photo spread', () => {
		expect(photoBookSpreads.at(-1)?.alt).toBe('Full-page portrait');
		expect(photoBookTargetIndex).toBe(photoBookSpreads.length - 1);
	});
});
