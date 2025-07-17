import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { config } from '$lib/config.js';

export async function POST({ request }) {
	try {
		const postsDir = path.join(process.cwd(), 'src', 'markdown', 'posts');

		if (!fs.existsSync(postsDir)) {
			return json({ error: 'Posts directory not found' }, { status: 404 });
		}

		const files = fs.readdirSync(postsDir).filter((file) => file.endsWith('.svx'));
		const results = [];
		const errors = [];

		for (const filename of files) {
			try {
				const filePath = path.join(postsDir, filename);
				const content = fs.readFileSync(filePath, 'utf-8');

				// Parse frontmatter
				const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
				if (!frontmatterMatch) {
					errors.push(`${filename}: Invalid frontmatter format`);
					continue;
				}

				const frontmatterString = frontmatterMatch[1];
				const markdownContent = frontmatterMatch[2];

				// Parse frontmatter to extract blog metadata
				const frontmatterData: Record<string, any> = {};
				frontmatterString.split('\n').forEach((line) => {
					const [key, ...valueParts] = line.split(':');
					if (key && valueParts.length > 0) {
						const value = valueParts.join(':').trim();
						// Remove quotes and process the value
						if (value.startsWith("'") && value.endsWith("'")) {
							frontmatterData[key.trim()] = value.slice(1, -1);
						} else if (value.startsWith('[') && value.endsWith(']')) {
							// Parse tags array
							const tagsContent = value.slice(1, -1);
							if (tagsContent.trim()) {
								frontmatterData[key.trim()] = tagsContent
									.split(',')
									.map((tag) => tag.trim().replace(/'/g, ''))
									.filter((tag) => tag);
							} else {
								frontmatterData[key.trim()] = [];
							}
						} else {
							frontmatterData[key.trim()] = value;
						}
					}
				});

				// Prepare blog data for backend API
				const blogData = {
					title: frontmatterData.title || filename.replace('.svx', ''),
					slug: frontmatterData.slug || filename.replace('.svx', ''),
					date: frontmatterData.date || new Date().toISOString().split('T')[0],
					lang: frontmatterData.lang || 'en',
					duration: frontmatterData.duration || '5min',
					tags: frontmatterData.tags || [],
					description: frontmatterData.description || '',
					is_published: true
				};

				// Check if blog already exists
				const checkResponse = await fetch(`${config.API.BLOGS}/${blogData.slug}`);

				if (checkResponse.ok) {
					// Blog exists, update it
					const updateResponse = await fetch(`${config.API.BLOGS}/${blogData.slug}`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${request.headers.get('authorization')?.replace('Bearer ', '') || ''}`
						},
						body: JSON.stringify(blogData)
					});

					if (updateResponse.ok) {
						const result = await updateResponse.json();
						results.push({
							filename,
							action: 'updated',
							blog: result.blog
						});
					} else {
						const errorData = await updateResponse.json().catch(() => ({}));
						errors.push(`${filename}: Failed to update - ${errorData.error || 'Unknown error'}`);
					}
				} else {
					// Blog doesn't exist, create it
					const createResponse = await fetch(config.API.BLOGS, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${request.headers.get('authorization')?.replace('Bearer ', '') || ''}`
						},
						body: JSON.stringify(blogData)
					});

					if (createResponse.ok) {
						const result = await createResponse.json();
						results.push({
							filename,
							action: 'created',
							blog: result.blog
						});
					} else {
						const errorData = await createResponse.json().catch(() => ({}));
						errors.push(`${filename}: Failed to create - ${errorData.error || 'Unknown error'}`);
					}
				}
			} catch (fileError) {
				errors.push(
					`${filename}: ${fileError instanceof Error ? fileError.message : 'Unknown file error'}`
				);
			}
		}

		return json({
			success: true,
			message: `Processed ${files.length} files`,
			results,
			errors,
			summary: {
				total: files.length,
				success: results.length,
				failed: errors.length
			}
		});
	} catch (error) {
		console.error('Error syncing blogs:', error);
		return json(
			{
				error: 'Failed to sync blogs',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
