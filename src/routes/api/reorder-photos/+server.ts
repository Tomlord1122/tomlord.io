import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dev } from '$app/environment';

const uploadDir = path.join(process.cwd(), 'static', 'photography_assets');

// Allowed image extensions for validation
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

function isImageFile(filename: string): boolean {
	const ext = path.extname(filename).toLowerCase();
	return imageExtensions.includes(ext);
}

function getTempName(index: number): string {
	return `temp_reorder_${index}.webp`;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!dev) {
		throw error(403, 'Photo reordering is only allowed in development mode.');
	}

	try {
		const body = await request.json();
		const order: string[] = body.order;

		if (!Array.isArray(order) || order.length === 0) {
			throw error(400, 'Invalid order array.');
		}

		// Validate all files exist and are image files
		for (const filename of order) {
			if (!isImageFile(filename)) {
				throw error(400, `Invalid file type: ${filename}`);
			}
			const filePath = path.join(uploadDir, filename);
			try {
				await fs.access(filePath);
			} catch {
				throw error(400, `File not found: ${filename}`);
			}
		}

		// Check for duplicate filenames in the order array
		const uniqueNames = new Set(order);
		if (uniqueNames.size !== order.length) {
			throw error(400, 'Duplicate filenames in order array.');
		}

		const maxNumber = order.length;

		// Phase 1: Rename all files to temporary names to avoid number collisions
		for (let i = 0; i < order.length; i++) {
			const oldPath = path.join(uploadDir, order[i]);
			const tempPath = path.join(uploadDir, getTempName(i));
			await fs.rename(oldPath, tempPath);
		}

		// Phase 2: Rename temp files to final descending numbers
		// order[0] (desired first visual position) -> maxNumber.webp
		// order[1] (desired second visual position) -> maxNumber-1.webp
		// ...
		const reorderedFiles: string[] = [];
		for (let i = 0; i < order.length; i++) {
			const tempPath = path.join(uploadDir, getTempName(i));
			const newNumber = maxNumber - i;
			const ext = path.extname(order[i]) || '.webp';
			const newFileName = `${newNumber}${ext}`;
			const newPath = path.join(uploadDir, newFileName);
			await fs.rename(tempPath, newPath);
			reorderedFiles.push(newFileName);
		}

		return json(
			{
				message: `Successfully reordered ${order.length} photos.`,
				reorderedFiles
			},
			{ status: 200 }
		);
	} catch (err: unknown) {
		console.error('Photo reorder error:', err);
		if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
			const errorObj = err as { status: number; body: { message?: string } };
			throw error(errorObj.status, errorObj.body.message || 'Photo reorder failed.');
		}
		const message =
			err instanceof Error ? err.message : 'Photo reorder failed due to an internal server error.';
		throw error(500, message);
	}
};
