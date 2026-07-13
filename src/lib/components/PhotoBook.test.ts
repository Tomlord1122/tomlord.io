import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhotoBook from './PhotoBook.svelte';
import type { PhotoBookSpread } from '$lib/data/photo-book.js';

const spreads: PhotoBookSpread[] = Array.from({ length: 4 }, (_, index) => ({
	id: `spread-${index + 1}`,
	src: `/spread-${index + 1}.webp`,
	srcset: `/spread-${index + 1}.webp 960w`,
	width: 1920,
	height: 1080,
	alt: `Photography collage, spread ${index + 1} of 4`
}));

beforeEach(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	});
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('PhotoBook', () => {
	it('wraps in both directions and commits an animated page turn', async () => {
		const { container } = render(PhotoBook, {
			props: { spreads, introSteps: 0, introTargetIndex: 0 }
		});

		await fireEvent.click(screen.getAllByRole('button', { name: 'Previous spread' })[0]);
		expect(screen.getByText('Photography collage, spread 4 of 4')).toBeTruthy();

		await fireEvent.animationEnd(container.querySelector('.flap') as Element);
		await fireEvent.click(screen.getAllByRole('button', { name: 'Next spread' })[0]);
		expect(screen.getByText('Photography collage, spread 1 of 4')).toBeTruthy();
	});

	it('supports global arrow-key navigation', async () => {
		render(PhotoBook, { props: { spreads, introSteps: 0, introTargetIndex: 0 } });

		await fireEvent.keyDown(window, { key: 'ArrowRight' });
		expect(screen.getByText('Photography collage, spread 2 of 4')).toBeTruthy();
	});

	it('ignores global arrow keys while keyboard navigation is disabled', async () => {
		render(PhotoBook, {
			props: { spreads, introSteps: 0, introTargetIndex: 0, keyboardEnabled: false }
		});

		await fireEvent.keyDown(window, { key: 'ArrowRight' });
		expect(screen.getByText('Photography collage, spread 1 of 4')).toBeTruthy();
		expect(document.querySelector('.flap')).toBeNull();
	});

	it('shares a maximum 650ms animation budget across every intro turn', () => {
		const { container } = render(PhotoBook, {
			props: { spreads, introSteps: spreads.length - 1, introTargetIndex: spreads.length - 1 }
		});
		const book = container.querySelector<HTMLElement>('.photo-book');
		const turnDuration = Number.parseInt(
			book?.style.getPropertyValue('--intro-turn-duration') ?? '',
			10
		);

		expect(turnDuration * (spreads.length - 1)).toBeLessThanOrEqual(650);
	});

	it('skips the intro and lands on its target when reduced motion is preferred', async () => {
		vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			matches: query.includes('prefers-reduced-motion'),
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}));

		render(PhotoBook, { props: { spreads, introSteps: 3, introTargetIndex: 3 } });
		await Promise.resolve();

		expect(screen.getByText('Photography collage, spread 4 of 4')).toBeTruthy();
		expect(document.querySelector('.flap')).toBeNull();
	});
});
