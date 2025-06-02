import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dev } from '$app/environment';

const postsDir = path.join(process.cwd(), 'src', 'markdown', 'posts');

async function ensurePostsDir() {
	try {
		await fs.access(postsDir);
	} catch (e) {
		await fs.mkdir(postsDir, { recursive: true });
	}
}

export const POST: RequestHandler = async ({ request }) => {
	if (!dev) {
		throw error(403, 'Post editing is only allowed in development mode.');
	}

	try {
		await ensurePostsDir();

		const { originalSlug, newSlug, content } = await request.json();

		if (!originalSlug || !newSlug || !content) {
			throw error(400, 'Original slug, new slug, and content are required.');
		}

		// Validate slugs to prevent directory traversal
		if (!/^[a-zA-Z0-9_-]+$/.test(originalSlug) || !/^[a-zA-Z0-9_-]+$/.test(newSlug)) {
			throw error(
				400,
				'Invalid slug format. Only alphanumeric characters, hyphens, and underscores are allowed.'
			);
		}

		const originalFileName = `${originalSlug}.svx`;
		const newFileName = `${newSlug}.svx`;
		const originalFilePath = path.join(postsDir, originalFileName);
		const newFilePath = path.join(postsDir, newFileName);

		// Check if the original file exists
		try {
			await fs.access(originalFilePath);
		} catch (e) {
			throw error(404, 'Original post file not found.');
		}

		// If the slug changed, we need to rename the file
		if (originalSlug !== newSlug) {
			// Check if a file with the new slug already exists
			try {
				await fs.access(newFilePath);
				throw error(409, 'A post with the new slug already exists.');
			} catch (e) {
				// File doesn't exist, which is what we want
				if ((e as any).code !== 'ENOENT') {
					throw e;
				}
			}
		}

		// Write the new content
		await fs.writeFile(newFilePath, content, 'utf-8');

		// If the slug changed, delete the old file
		if (originalSlug !== newSlug) {
			await fs.unlink(originalFilePath);
		}

		console.log(`Post updated successfully: ${newFilePath}`);
		return json(
			{
				message: 'Post updated successfully!',
				fileName: newFileName,
				slugChanged: originalSlug !== newSlug
			},
			{ status: 200 }
		);
	} catch (err: any) {
		console.error('Post update error:', err);
		if (err.status && err.body) {
			throw error(err.status, err.body.message || 'Failed to update post.');
		}
		throw error(500, err.message || 'Failed to update post due to an internal server error.');
	}
};

export const GET: RequestHandler = async ({ url }) => {
	if (!dev) {
		throw error(403, 'Post content access is only allowed in development mode.');
	}

	try {
		await ensurePostsDir();

		const slug = url.searchParams.get('slug');

		if (!slug) {
			throw error(400, 'Post slug is required.');
		}

		// Validate slug to prevent directory traversal
		if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
			throw error(400, 'Invalid slug format.');
		}

		const fileName = `${slug}.svx`;
		const filePath = path.join(postsDir, fileName);

		try {
			const content = await fs.readFile(filePath, 'utf-8');

			// Parse the frontmatter and content
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

			if (!frontmatterMatch) {
				throw error(400, 'Invalid post format - no frontmatter found.');
			}

			const frontmatterText = frontmatterMatch[1];
			const postContent = frontmatterMatch[2];

			// Parse frontmatter (simple YAML parsing for our use case)
			const metadata: any = {};
			frontmatterText.split('\n').forEach((line) => {
				const match = line.match(/^(\w+):\s*(.+)$/);
				if (match) {
					const [, key, value] = match;
					if (key === 'tags') {
						// Parse tags array
						const tagsMatch = value.match(/\[(.*)\]/);
						if (tagsMatch) {
							metadata[key] = tagsMatch[1]
								.split(',')
								.map((tag) => tag.trim().replace(/^'|'$/g, ''))
								.filter((tag) => tag.length > 0);
						} else {
							metadata[key] = [];
						}
					} else {
						// Remove quotes from string values
						metadata[key] = value.replace(/^'|'$/g, '');
					}
				}
			});

			return json({
				metadata,
				content: postContent.trim(),
				fullContent: content
			});
		} catch (readError: any) {
			if (readError.code === 'ENOENT') {
				throw error(404, 'Post not found.');
			}
			throw readError;
		}
	} catch (err: any) {
		console.error('Post load error:', err);
		if (err.status && err.body) {
			throw error(err.status, err.body.message || 'Failed to load post.');
		}
		throw error(500, err.message || 'Failed to load post due to an internal server error.');
	}
};
