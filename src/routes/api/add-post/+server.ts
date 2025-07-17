import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function POST({ request }) {
	const { filename, content } = await request.json();

	// Extract frontmatter data from content
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!frontmatterMatch) {
		return json({ error: 'Invalid frontmatter format' }, { status: 400 });
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

	try {
		// 1. Create blog record in backend database
		const blogData = {
			title: frontmatterData.title || 'Untitled',
			slug: frontmatterData.slug || filename.replace('.svx', ''),
			date: frontmatterData.date || new Date().toISOString().split('T')[0],
			lang: frontmatterData.lang || 'en',
			duration: frontmatterData.duration || '5min',
			tags: frontmatterData.tags || [],
			description: frontmatterData.description || '',
			is_published: true
		};

		// Call backend API to create blog record
		const blogResponse = await fetch('http://localhost:8080/api/blogs', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${request.headers.get('authorization')?.replace('Bearer ', '') || ''}`
			},
			body: JSON.stringify(blogData)
		});

		if (!blogResponse.ok) {
			const errorData = await blogResponse.json().catch(() => ({}));
			console.error('Backend blog creation failed:', errorData);

			// If it's an auth error, still save the file but inform user
			if (blogResponse.status === 401) {
				return json(
					{
						error: 'Authentication required to save blog to database. File saved locally only.',
						requiresAuth: true
					},
					{ status: 401 }
				);
			}

			return json(
				{
					error: `Failed to create blog in database: ${errorData.error || 'Unknown error'}`
				},
				{ status: 500 }
			);
		}

		const blogResult = await blogResponse.json();
		console.log('Blog created in database:', blogResult);

		// 2. Save markdown file locally (for development/backup)
		const postsDir = path.join(process.cwd(), 'src', 'markdown', 'posts');

		// Create directory if it doesn't exist
		if (!fs.existsSync(postsDir)) {
			fs.mkdirSync(postsDir, { recursive: true });
		}

		// Write the file
		const filePath = path.join(postsDir, filename);
		fs.writeFileSync(filePath, content);

		return json({
			success: true,
			path: filePath,
			blog: blogResult.blog,
			message: 'Blog created successfully in database and file system'
		});
	} catch (error) {
		console.error('Error creating blog:', error);

		// Fallback: just save the file locally
		try {
			const postsDir = path.join(process.cwd(), 'src', 'markdown', 'posts');
			if (!fs.existsSync(postsDir)) {
				fs.mkdirSync(postsDir, { recursive: true });
			}
			const filePath = path.join(postsDir, filename);
			fs.writeFileSync(filePath, content);

			return json({
				success: true,
				path: filePath,
				warning: 'Blog saved locally but failed to create database record',
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		} catch (fileError) {
			return json(
				{
					error: 'Failed to save blog both to database and file system',
					details: {
						databaseError: error instanceof Error ? error.message : 'Unknown error',
						fileError: fileError instanceof Error ? fileError.message : 'Unknown error'
					}
				},
				{ status: 500 }
			);
		}
	}
}
