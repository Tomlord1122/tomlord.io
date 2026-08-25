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
		{ left: 990, top: 550, width: 780, height: 430 }
	],
	balanced: [
		{ left: 150, top: 100, width: 780, height: 430 },
		{ left: 150, top: 550, width: 780, height: 430 },
		{ left: 990, top: 100, width: 780, height: 430 },
		{ left: 990, top: 550, width: 780, height: 430 }
	],
	single: [{ left: 150, top: 100, width: 1620, height: 880, fit: 'contain' }],
	pair: [
		{ left: 150, top: 100, width: 780, height: 880, fit: 'contain' },
		{ left: 990, top: 100, width: 780, height: 880, fit: 'contain' }
	],
	trio: [
		{ left: 150, top: 100, width: 780, height: 880 },
		{ left: 990, top: 100, width: 780, height: 430 },
		{ left: 990, top: 550, width: 780, height: 430 }
	],
	'final-portrait': [{ left: 150, top: 100, width: 1620, height: 880, fit: 'contain' }]
};

// ~4px on the 700px homepage book (1920 canvas).
const photoCornerRadius = 11;
const photoBorder = 10;

function containedSize(
	sourceWidth: number,
	sourceHeight: number,
	slotWidth: number,
	slotHeight: number
) {
	const scale = Math.min(slotWidth / sourceWidth, slotHeight / sourceHeight);
	return {
		width: Math.max(1, Math.round(sourceWidth * scale)),
		height: Math.max(1, Math.round(sourceHeight * scale))
	};
}

function svgBuffer(markup: string) {
	return Buffer.from(markup);
}

function roundedRectMask(width: number, height: number, radius: number) {
	const safeRadius = Math.min(radius, Math.floor(Math.min(width, height) / 2));
	return svgBuffer(
		`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="${safeRadius}" ry="${safeRadius}"/></svg>`
	);
}

async function renderPhotoBuffer(sourcePath: string, width: number, height: number) {
	return sharp(sourcePath)
		.rotate()
		.resize(width, height, { fit: 'cover', position: 'centre' })
		.ensureAlpha()
		.composite([{ input: roundedRectMask(width, height, photoCornerRadius), blend: 'dest-in' }])
		.png()
		.toBuffer();
}

async function mountPrint(photo: Buffer, photoWidth: number, photoHeight: number) {
	const frameWidth = photoWidth + photoBorder * 2;
	const frameHeight = photoHeight + photoBorder * 2;
	const frameRadius = photoCornerRadius + 3;

	const mat = svgBuffer(`
		<svg width="${frameWidth}" height="${frameHeight}" xmlns="http://www.w3.org/2000/svg">
			<rect width="${frameWidth}" height="${frameHeight}" rx="${frameRadius}" fill="#f7f2e6"/>
			<rect x="0.75" y="0.75" width="${frameWidth - 1.5}" height="${frameHeight - 1.5}" rx="${frameRadius - 0.5}" fill="none" stroke="#e4d8c0" stroke-width="1.2"/>
		</svg>
	`);

	return sharp(mat)
		.composite([{ input: photo, left: photoBorder, top: photoBorder }])
		.png()
		.toBuffer();
}

async function renderPhoto(source: string, slot: Slot) {
	const sourcePath = path.join(staticDirectory, source.replace(/^\//, ''));
	await fs.access(sourcePath);

	const metadata = await sharp(sourcePath).rotate().metadata();
	const fit = slot.fit ?? 'cover';
	const maxWidth = slot.width - photoBorder * 2;
	const maxHeight = slot.height - photoBorder * 2;
	const sourceWidth = metadata.width ?? maxWidth;
	const sourceHeight = metadata.height ?? maxHeight;
	const size =
		fit === 'contain'
			? containedSize(sourceWidth, sourceHeight, maxWidth, maxHeight)
			: { width: maxWidth, height: maxHeight };

	const photo = await renderPhotoBuffer(sourcePath, size.width, size.height);
	const print = await mountPrint(photo, size.width, size.height);
	return {
		input: print,
		left: slot.left + Math.round((slot.width - size.width - photoBorder * 2) / 2),
		top: slot.top + Math.round((slot.height - size.height - photoBorder * 2) / 2)
	};
}

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
		sources.map((source, index) => renderPhoto(source, slots[index]))
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
