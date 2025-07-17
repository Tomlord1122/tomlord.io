import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import type { Post } from '$lib/types/post.js';
import { config, fetchWithTimeout, fetchWithFallback } from '$lib/config.js';

export const load: PageLoad = async ({ params, fetch }) => {
	const { slug } = params;

	// API 載入函數
	const loadFromAPI = async () => {
		const blogResponse = await fetchWithTimeout(`${config.API.BLOGS}/${slug}`);

		if (!blogResponse.ok) {
			if (blogResponse.status === 404) {
				throw new Error('Blog post not found in API');
			} else {
				throw new Error(`Backend API error: ${blogResponse.status}`);
			}
		}

		const blogData = await blogResponse.json();
		const blog = blogData.blog;

		// Load markdown content
		let content = null;
		try {
			const postModule = await import(`../../../markdown/posts/${slug}.svx`);
			content = postModule.default || createNoContentComponent();
		} catch (markdownError) {
			console.warn(`Failed to load markdown content for ${slug}:`, markdownError);
			content = createNoContentComponent();
		}

		console.log(`✅ Loaded blog post "${blog.title}" from API`);
		return {
			title: blog.title,
			date: blog.date,
			tags: blog.tags || [],
			content: content,
			slug: blog.slug,
			duration: blog.duration || '5min',
			lang: blog.lang || 'en',
			description: blog.description || ''
		};
	};

	// 本地文件載入函數
	const loadFromLocal = async () => {
		const postModule = await import(`../../../markdown/posts/${slug}.svx`);

		if (!postModule || !postModule.metadata) {
			throw new Error('Post metadata is missing');
		}

		const metadata = postModule.metadata as Omit<Post, 'content' | 'slug'>;
		
		console.log(`📁 Loaded blog post "${metadata.title}" from local file`);
		return {
			title: metadata.title,
			date: metadata.date,
			tags: metadata.tags || [],
			content: postModule.default,
			slug: slug,
			duration: metadata.duration || '5min',
			lang: metadata.lang || 'en',
			description: metadata.description || ''
		};
	};

	// 載入文章資料
	let post: Post;
	try {
		post = await fetchWithFallback(
			loadFromAPI,
			loadFromLocal,
			1500 // 1.5秒超時
		);
	} catch (apiAndLocalError) {
		console.error('Failed to load blog post from both API and local files:', apiAndLocalError);
		error(404, 'Post does not exist or cannot be loaded');
	}

	// Load available photos for the EditPostModal (if in dev mode)
	const availablePhotos = [
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

	return {
		post,
		availablePhotos
	};
};

// Helper function to create a no-content component
function createNoContentComponent() {
	return () => ({
		$$component: true,
		render: () => `
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
				<p class="text-yellow-800">
					<strong>Content not available:</strong> The markdown content for this post could not be loaded.
					This may happen when posts are stored in the database but the corresponding markdown files are missing.
				</p>
			</div>
			<p class="text-gray-600">
				Blog metadata is available, but the full content is not accessible at this time.
			</p>
		`
	});
}
