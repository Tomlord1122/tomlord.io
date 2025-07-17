import type { LayoutServerLoad } from '../$types.js';
import type { PostMetadata } from '$lib/types/post.js';

export const load: LayoutServerLoad = async () => {
	let posts: PostMetadata[] = [];

	try {
		// First, try to load from backend API
		const backendUrl = process.env.PUBLIC_BACKEND_URL || 'http://localhost:8080';
		const response = await fetch(`${backendUrl}/api/blogs?limit=100&published=true`);

		if (response.ok) {
			const data = await response.json();
			// Transform backend blog data to PostMetadata format
			posts = data.blogs.map((blog: any) => ({
				title: blog.title,
				date: blog.date,
				slug: blog.slug,
				description: blog.description || '',
				tags: blog.tags || [],
				lang: blog.lang || 'en',
				duration: blog.duration || '5min'
			}));

			console.log(`Loaded ${posts.length} posts from backend API`);
		} else {
			console.warn('Backend API not available, falling back to local markdown files');
			throw new Error('Backend API not available');
		}
	} catch (error) {
		console.warn('Failed to load from backend API, loading from local markdown files:', error);

		// Fallback: load from local markdown files
		const postModules = import.meta.glob('/src/markdown/posts/**/*.svx', {
			eager: true
		});

		for (const postPath in postModules) {
			const file = postModules[postPath];
			if (file && typeof file === 'object' && 'metadata' in file) {
				const metadata = file.metadata as PostMetadata;
				if (metadata.slug && metadata.title && metadata.date) {
					posts.push({
						title: metadata.title,
						date: metadata.date,
						slug: metadata.slug,
						description: metadata.description || '',
						tags: metadata.tags || [],
						lang: metadata.lang,
						duration: metadata.duration || '5min'
					});
				}
			}
		}

		console.log(`Loaded ${posts.length} posts from local markdown files as fallback`);
	}

	// Sort posts by date (newest first)
	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	// Load available photos for the NewPostModal
	const availablePhotos = await getAvailablePhotos();

	return {
		posts,
		availablePhotos
	};
};

// Helper function to get available photos
async function getAvailablePhotos(): Promise<string[]> {
	try {
		// You can implement this based on your photo storage structure
		// For now, let's return static photography assets
		const photos = [
			'/photography_assets/1.webp',
			'/photography_assets/2.webp',
			'/photography_assets/4.webp',
			'/photography_assets/5.webp',
			'/photography_assets/6.webp',
			'/photography_assets/7.webp',
			'/photography_assets/8.webp',
			'/photography_assets/9.webp',
			'/photography_assets/10.webp',
			'/photography_assets/11.webp',
			'/photography_assets/12.webp',
			'/photography_assets/13.webp',
			'/photography_assets/14.webp',
			'/photography_assets/16.webp',
			'/photography_assets/17.webp',
			'/photography_assets/18.webp'
		];
		return photos;
	} catch (error) {
		console.warn('Failed to load available photos:', error);
		return [];
	}
}
