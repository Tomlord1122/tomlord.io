import manifest from './photo-book.generated.json';

export interface PhotoBookSpread {
	id: string;
	src: string;
	srcset: string;
	width: number;
	height: number;
	alt: string;
}

export const photoBookSpreads = manifest.spreads satisfies PhotoBookSpread[];
export const photoBookTargetIndex = photoBookSpreads.length - 1;
