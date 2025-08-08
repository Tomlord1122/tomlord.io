import type { LayoutServerLoad } from '../$types.js';
import type { PostMetadata, PostData } from '$lib/types/post.js';
import { config, fetchWithTimeout, clientFirstLoadWithBackgroundSync } from '$lib/config.js';

export const load: LayoutServerLoad = async (): Promise<{
	posts: PostMetadata[];
}> => {
	// API 載入函數
	const loadFromAPI = async (): Promise<PostMetadata[]> => {
		const response = await fetchWithTimeout(`${config.API.BLOGS}/?limit=200&published=true`);

		if (!response.ok) {
			throw new Error(`Backend API error: ${response.status}`);
		}

		const data: { blogs: PostData[] } = await response.json();
		const posts = data.blogs.map((blog: PostData) => ({
			title: blog.title,
			date: blog.date,
			slug: blog.slug,
			description: blog.description || '',
			tags: blog.tags || [],
			lang: blog.lang || 'en',
			duration: blog.duration || '5min'
		}));

		return posts;
	};
	const loadFromLocal = async (): Promise<PostMetadata[]> => {
		const postModules = import.meta.glob('/src/markdown/posts/**/*.svx');

		const posts: PostMetadata[] = [];
		for (const postPath in postModules) {
			try {
				const module = (await postModules[postPath]()) as { metadata?: unknown };
				if (module && typeof module === 'object' && 'metadata' in module) {
					const metadata = module.metadata as PostMetadata;
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
			} catch (error) {
				console.warn(`Failed to load post from ${postPath}:`, error);
			}
		}

		return posts;
	};

	let posts: PostMetadata[] = [];

	try {
		const result = await clientFirstLoadWithBackgroundSync(loadFromLocal, loadFromAPI);
		posts = result.data;
	} catch (error) {
		console.error('All loading strategies failed:', error);
		posts = [];
	}

	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return {
		posts
	};
};
