import { describe, expect, it } from 'vitest';
import { applyPhotoWidthToTag, getPhotoWidth, parsePhotoWidth, setPhotoWidth } from './helper.js';

const tag = `<img src="/content_assets/2.webp" alt="2.webp" class="photo-post w-[300px]"
width="1086" height="1448">`;

describe('photo width helpers', () => {
	it('reads width from class or style', () => {
		expect(parsePhotoWidth(tag)).toBe(300);
		expect(parsePhotoWidth('<img class="photo-post" style="width: 360px; max-width: 100%">')).toBe(
			360
		);
		expect(parsePhotoWidth('<img class="photo-post">')).toBeNull();
	});

	it('writes style width and strips the old class', () => {
		const next = applyPhotoWidthToTag(tag, 360);
		expect(next).toContain('style="width: 360px; max-width: 100%"');
		expect(next).not.toContain('w-[300px]');
		expect(applyPhotoWidthToTag(next, null)).not.toContain('style=');
	});

	it('updates the nth matching image in content', () => {
		const content = `${tag}\n\ntext\n\n${tag}`;
		const updated = setPhotoWidth(content, '/content_assets/2.webp', 1, 240);
		expect(getPhotoWidth(updated, '/content_assets/2.webp', 0)).toBe(300);
		expect(getPhotoWidth(updated, '/content_assets/2.webp', 1)).toBe(240);
	});
});
