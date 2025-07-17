import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend API base URL
const API_BASE = 'http://localhost:8080';

// Helper function to parse frontmatter
function parseFrontmatter(content) {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!frontmatterMatch) {
		throw new Error('Invalid frontmatter format');
	}

	const frontmatterString = frontmatterMatch[1];
	const markdownContent = frontmatterMatch[2];

	const frontmatterData = {};
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

	return { frontmatterData, markdownContent };
}

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', data = null, token = null) {
	const url = `${API_BASE}${endpoint}`;
	const headers = {
		'Content-Type': 'application/json'
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const options = {
		method,
		headers
	};

	if (data) {
		options.body = JSON.stringify(data);
	}

	try {
		const response = await fetch(url, options);
		const responseData = await response.json();

		if (!response.ok) {
			throw new Error(`API Error: ${responseData.error || response.statusText}`);
		}

		return responseData;
	} catch (error) {
		throw new Error(`Network Error: ${error.message}`);
	}
}

async function syncBlogs() {
	console.log('🚀 Starting blog synchronization...\n');

	// Get token from command line arguments or environment
	const token = process.argv[2] || process.env.AUTH_TOKEN;

	if (!token) {
		console.log('⚠️  No authentication token provided. Some operations may fail.');
		console.log('Usage: node sync-blogs.js <jwt_token>');
		console.log('Or set AUTH_TOKEN environment variable\n');
	}

	try {
		const postsDir = path.join(__dirname, '..', 'src', 'markdown', 'posts');

		if (!fs.existsSync(postsDir)) {
			throw new Error('Posts directory not found');
		}

		const files = fs.readdirSync(postsDir).filter((file) => file.endsWith('.svx'));
		console.log(`📁 Found ${files.length} markdown files to process\n`);

		const blogDataArray = [];
		const fileMap = {};

		// First, process all files and prepare data
		for (const filename of files) {
			try {
				console.log(`📝 Processing ${filename}...`);

				const filePath = path.join(postsDir, filename);
				const content = fs.readFileSync(filePath, 'utf-8');

				const { frontmatterData } = parseFrontmatter(content);

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

				console.log(`   📋 Title: ${blogData.title}`);
				console.log(`   🔗 Slug: ${blogData.slug}`);
				console.log(`   📅 Date: ${blogData.date}`);
				console.log(`   🏷️  Tags: ${blogData.tags.join(', ') || 'none'}`);

				blogDataArray.push(blogData);
				fileMap[blogData.slug] = filename;
			} catch (fileError) {
				console.log(`   ❌ Error processing ${filename}: ${fileError.message}\n`);
			}
		}

		// Now sync all blogs in one batch call
		console.log(`\n🚀 Syncing ${blogDataArray.length} blogs to database...`);

		try {
			const result = await apiCall('/api/sync-blogs', 'POST', blogDataArray);

			console.log('\n✅ Batch sync completed!');
			console.log(`   Total: ${result.summary.total}`);
			console.log(`   Success: ${result.summary.success}`);
			console.log(`   Failed: ${result.summary.failed}`);

			const results = result.results || [];
			const errors = result.errors || [];

			// Print details
			if (results.length > 0) {
				console.log('\n✅ Successfully processed:');
				results.forEach((item) => {
					const filename = fileMap[item.blog?.slug] || 'unknown';
					console.log(`   - ${filename} (${item.action}): ${item.blog?.title}`);
				});
			}

			if (errors.length > 0) {
				console.log('\n❌ Errors:');
				errors.forEach((error) => {
					console.log(`   - ${error}`);
				});
			}

			console.log('\n🎉 Synchronization complete!');

			if (errors.length === 0) {
				console.log('✨ All blogs have been successfully synchronized to the database.');
				console.log('You can now visit http://localhost:5173/blog to see your posts!');
			}
		} catch (syncError) {
			console.error('💥 Failed to sync blogs:', syncError.message);
			process.exit(1);
		}
	} catch (error) {
		console.error('💥 Fatal error during synchronization:', error.message);
		process.exit(1);
	}
}

// Run the sync
syncBlogs().catch((error) => {
	console.error('💥 Unexpected error:', error);
	process.exit(1);
});
