import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dev } from '$app/environment';

const DIRS = {
	photography: path.join(process.cwd(), 'static', 'photography_assets'),
	content: path.join(process.cwd(), 'static', 'content_assets')
} as const;

type TargetDir = keyof typeof DIRS;

async function ensureDir(dir: string) {
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
	}
}

export const POST: RequestHandler = async ({ request }) => {
	if (!dev) {
		throw error(403, 'File upload is only allowed in development mode.');
	}

	try {
		const formData = await request.formData();
		const imageFile = formData.get('imageFile') as File | null;
		const targetParam = (formData.get('targetDir') as string | null) ?? 'photography';

		if (!imageFile) {
			throw error(400, 'No image file provided.');
		}

		if (!imageFile.type.startsWith('image/')) {
			throw error(400, 'Invalid file type. Only images are allowed.');
		}

		if (!(targetParam in DIRS)) {
			throw error(400, `Invalid targetDir. Must be one of: ${Object.keys(DIRS).join(', ')}`);
		}

		const uploadDir = DIRS[targetParam as TargetDir];
		await ensureDir(uploadDir);

		const existingFiles = await fs.readdir(uploadDir);
		let maxNumber = 0;
		existingFiles.forEach((file) => {
			const match = file.match(/^(\d+)\.(jpg|jpeg|png|gif|webp)$/i);
			if (match) {
				const num = parseInt(match[1], 10);
				if (num > maxNumber) {
					maxNumber = num;
				}
			}
		});

		const newNumber = maxNumber + 1;
		const newFileName = `${newNumber}.webp`;
		const filePath = path.join(uploadDir, newFileName);

		const arrayBuffer = await imageFile.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const { default: sharp } = await import('sharp');

		const webpBuffer = await sharp(buffer).rotate().webp({ quality: 50 }).toBuffer();

		await fs.writeFile(filePath, webpBuffer);

		// Return the public URL path based on the target directory
		const publicPath =
			targetParam === 'photography'
				? `/photography_assets/${newFileName}`
				: `/content_assets/${newFileName}`;

		return json(
			{
				message: 'File uploaded and converted to WebP successfully!',
				fileName: newFileName,
				filePath: publicPath,
				targetDir: targetParam
			},
			{ status: 201 }
		);
	} catch (err: unknown) {
		console.error('File upload error:', err);
		if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
			const errorObj = err as { status: number; body: { message?: string } };
			throw error(errorObj.status, errorObj.body.message || 'File upload failed.');
		}
		const message =
			err instanceof Error ? err.message : 'File upload failed due to an internal server error.';
		throw error(500, message);
	}
};
