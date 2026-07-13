import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
	buildPhotoBookSourceSpreads,
	PHOTO_BOOK_HEIGHT,
	PHOTO_BOOK_WIDTH,
	type PhotoBookTemplate
} from '../src/lib/data/photo-book-config.js';

const root = process.cwd();
const staticDirectory = path.join(root, 'static');
const outputDirectory = path.join(staticDirectory, 'photo-book');
const manifestPath = path.join(root, 'src', 'lib', 'data', 'photo-book.generated.json');
const photographyDirectory = path.join(staticDirectory, 'photography_assets');
const finalPortrait = '/content_assets/1.webp';
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

type Slot = {
	left: number;
	top: number;
	width: number;
	height: number;
	fit?: 'cover' | 'contain';
};

const layouts: Record<PhotoBookTemplate, Slot[]> = {
	'feature-left': [
		{ left: 150, top: 100, width: 780, height: 880 },
		{ left: 990, top: 100, width: 370, height: 430 },
		{ left: 1400, top: 100, width: 370, height: 430 },
		{ left: 990, top: 570, width: 780, height: 410 }
	],
	balanced: [
		{ left: 150, top: 100, width: 780, height: 420 },
		{ left: 150, top: 560, width: 780, height: 420 },
		{ left: 990, top: 100, width: 780, height: 420 },
		{ left: 990, top: 560, width: 780, height: 420 }
	],
	single: [{ left: 150, top: 100, width: 1620, height: 880, fit: 'contain' }],
	pair: [
		{ left: 150, top: 100, width: 780, height: 880, fit: 'contain' },
		{ left: 990, top: 100, width: 780, height: 880, fit: 'contain' }
	],
	trio: [
		{ left: 150, top: 100, width: 780, height: 880 },
		{ left: 990, top: 100, width: 780, height: 420 },
		{ left: 990, top: 560, width: 780, height: 420 }
	],
	'final-portrait': [{ left: 150, top: 100, width: 1620, height: 880, fit: 'contain' }]
};

const paper = Buffer.from(`
	<svg width="${PHOTO_BOOK_WIDTH}" height="${PHOTO_BOOK_HEIGHT}" viewBox="0 0 ${PHOTO_BOOK_WIDTH} ${PHOTO_BOOK_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="left-paper" x1="0" x2="1">
				<stop offset="0" stop-color="#d9d7d1"/>
				<stop offset="0.18" stop-color="#ebeae5"/>
				<stop offset="0.86" stop-color="#f1f0ec"/>
				<stop offset="1" stop-color="#d4d2cc"/>
			</linearGradient>
			<linearGradient id="right-paper" x1="0" x2="1">
				<stop offset="0" stop-color="#d4d2cc"/>
				<stop offset="0.14" stop-color="#f1f0ec"/>
				<stop offset="0.82" stop-color="#ebeae5"/>
				<stop offset="1" stop-color="#d9d7d1"/>
			</linearGradient>
			<filter id="paper-grain" x="0" y="0" width="100%" height="100%">
				<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="4" seed="17"/>
				<feColorMatrix type="saturate" values="0"/>
				<feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
			</filter>
		</defs>
		<path d="M110 55 Q110 35 135 35 H960 V1045 H135 Q110 1045 110 1025 Z" fill="url(#left-paper)"/>
		<path d="M960 35 H1785 Q1810 35 1810 55 V1025 Q1810 1045 1785 1045 H960 Z" fill="url(#right-paper)"/>
		<path d="M110 55 Q110 35 135 35 H960 V1045 H135 Q110 1045 110 1025 Z" filter="url(#paper-grain)" opacity="0.62"/>
		<path d="M960 35 H1785 Q1810 35 1810 55 V1025 Q1810 1045 1785 1045 H960 Z" filter="url(#paper-grain)" opacity="0.62"/>
		<path d="M960 40 V1040" stroke="#aaa8a2" stroke-width="4" opacity="0.58"/>
	</svg>
`);

const flatPaper = Buffer.from(`
	<svg width="${PHOTO_BOOK_WIDTH}" height="${PHOTO_BOOK_HEIGHT}" viewBox="0 0 ${PHOTO_BOOK_WIDTH} ${PHOTO_BOOK_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="flat-paper" x1="0" x2="1">
				<stop offset="0" stop-color="#d9d7d1"/>
				<stop offset="0.18" stop-color="#ebeae5"/>
				<stop offset="0.5" stop-color="#f1f0ec"/>
				<stop offset="0.82" stop-color="#ebeae5"/>
				<stop offset="1" stop-color="#d9d7d1"/>
			</linearGradient>
			<filter id="flat-grain" x="0" y="0" width="100%" height="100%">
				<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="4" seed="17"/>
				<feColorMatrix type="saturate" values="0"/>
				<feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
			</filter>
		</defs>
		<rect x="110" y="35" width="1700" height="1010" rx="25" fill="url(#flat-paper)"/>
		<rect x="110" y="35" width="1700" height="1010" rx="25" filter="url(#flat-grain)" opacity="0.62"/>
	</svg>
`);

async function renderSpread(template: PhotoBookTemplate, sources: string[]) {
	const slots = layouts[template];
	const photos = await Promise.all(
		sources.map(async (source, index) => {
			const sourcePath = path.join(staticDirectory, source.replace(/^\//, ''));
			await fs.access(sourcePath);
			return {
				input: await sharp(sourcePath)
					.rotate()
					.resize(slots[index].width, slots[index].height, {
						fit: slots[index].fit ?? 'cover',
						position: 'centre',
						// Transparent padding lets the generated paper texture show around contained photos.
						background: { r: 0, g: 0, b: 0, alpha: 0 }
					})
					.webp({ quality: 84 })
					.toBuffer(),
				left: slots[index].left,
				top: slots[index].top
			};
		})
	);

	return sharp({
		create: {
			width: PHOTO_BOOK_WIDTH,
			height: PHOTO_BOOK_HEIGHT,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		}
	})
		.composite([
			{ input: template === 'final-portrait' ? flatPaper : paper, left: 0, top: 0 },
			...photos
		])
		.webp({ quality: 82, alphaQuality: 90 })
		.toBuffer();
}

async function main() {
	const photographyFiles = (await fs.readdir(photographyDirectory))
		.filter((filename) => imageExtensions.has(path.extname(filename).toLowerCase()))
		.sort((left, right) => {
			const leftNumber = Number.parseInt(path.parse(left).name, 10);
			const rightNumber = Number.parseInt(path.parse(right).name, 10);
			if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
				return rightNumber - leftNumber;
			}
			return right.localeCompare(left, undefined, { numeric: true });
		})
		.map((filename) => `/photography_assets/${filename}`);
	const photoBookSourceSpreads = buildPhotoBookSourceSpreads(photographyFiles, finalPortrait);

	await fs.rm(outputDirectory, { recursive: true, force: true });
	await fs.mkdir(outputDirectory, { recursive: true });

	for (const spread of photoBookSourceSpreads) {
		const fullSize = await renderSpread(spread.template, spread.photos);
		await Promise.all([
			fs.writeFile(path.join(outputDirectory, `${spread.id}-1920.webp`), fullSize),
			sharp(fullSize)
				.resize({ width: 960 })
				.webp({ quality: 80, alphaQuality: 90 })
				.toFile(path.join(outputDirectory, `${spread.id}-960.webp`))
		]);
	}

	const manifest = {
		spreads: photoBookSourceSpreads.map((spread, index) => ({
			id: spread.id,
			src: `/photo-book/${spread.id}-960.webp`,
			srcset: `/photo-book/${spread.id}-960.webp 960w, /photo-book/${spread.id}-1920.webp 1920w`,
			width: PHOTO_BOOK_WIDTH,
			height: PHOTO_BOOK_HEIGHT,
			alt:
				spread.template === 'final-portrait'
					? 'Full-page portrait'
					: `Photography collage, spread ${index + 1} of ${photoBookSourceSpreads.length}`
		}))
	};
	await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`);

	console.log(
		`Generated ${photoBookSourceSpreads.length * 2} photo-book assets from ${photographyFiles.length} photography files.`
	);
}

await main();
