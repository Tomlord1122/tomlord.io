import type { LayoutServerLoad } from '../$types.js';
import type { PostMetadata, PostData } from '$lib/types/post.js';
import { config, fetchWithTimeout, smartLoadWithFallback } from '$lib/config.js';

export const load: LayoutServerLoad = async (): Promise<{
	posts: PostMetadata[];
	availablePhotos: string[];
	loadSource: 'api' | 'local';
}> => {
	// API 載入函數
	const loadFromAPI = async (): Promise<PostMetadata[]> => {
		const response = await fetchWithTimeout(`${config.API.BLOGS}/?limit=100&published=true`);

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

	// 本地文件載入函數
	const loadFromLocal = async (): Promise<PostMetadata[]> => {
		const postModules = import.meta.glob('/src/markdown/posts/**/*.svx', {
			eager: true
		});

		const posts: PostMetadata[] = [];
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

		return posts;
	};

	// 使用智能載入策略 - 先檢查健康狀態，再決定載入方式
	let posts: PostMetadata[] = [];
	let loadSource: 'api' | 'local' = 'local';

	try {
		const result = await smartLoadWithFallback(loadFromAPI, loadFromLocal);
		posts = result.data;
		loadSource = result.source;

		console.log(
			`📚 Loaded ${posts.length} posts from ${loadSource === 'api' ? 'backend API' : 'local markdown files'}`
		);
	} catch (error) {
		console.error('Both API and local loading failed:', error);
		// 如果都失敗，返回空陣列但不讓頁面崩潰
		posts = [];
	}

	// Sort posts by date (newest first)
	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	// Load available photos for the NewPostModal
	const availablePhotos = await getAvailablePhotos();

	return {
		posts,
		availablePhotos,
		loadSource // 告訴前端是從哪裡載入的
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
