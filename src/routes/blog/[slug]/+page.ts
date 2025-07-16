import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import type { Post } from '$lib/types/post.js';

export const load: PageLoad = async ({ params, fetch }) => {
	const { slug } = params;

	try {
		// First, try to get blog metadata from backend API
		const blogResponse = await fetch(`http://localhost:8080/api/blogs/${slug}`);
		
		if (!blogResponse.ok) {
			if (blogResponse.status === 404) {
				error(404, 'Blog post not found');
			} else {
				throw new Error(`Backend API error: ${blogResponse.status}`);
			}
		}

		const blogData = await blogResponse.json();
		const blog = blogData.blog;

		// For the content, we still need to load from the markdown file
		// since we don't store the full markdown content in the database
		let content = null;
		let markdownLoadFailed = false;

		try {
			const postModule = await import(`../../../markdown/posts/${slug}.svx`);
			if (postModule && postModule.default) {
				content = postModule.default;
			} else {
				markdownLoadFailed = true;
			}
		} catch (markdownError) {
			console.warn(`Failed to load markdown content for ${slug}:`, markdownError);
			markdownLoadFailed = true;
		}

		// If markdown loading failed, create a simple component that shows an error message
		if (markdownLoadFailed) {
			// Create a simple Svelte component that displays a message
			const NoContentComponent = () => {
				return {
					$$component: true,
					render: () => `
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
							<p class="text-yellow-800">
								<strong>Content not available:</strong> The markdown content for this post could not be loaded.
								This may happen when posts are stored in the database but the corresponding markdown files are missing.
							</p>
						</div>
						<p class="text-gray-600">
							Blog metadata is available from the database, but the full content is not accessible at this time.
						</p>
					`
				};
			};
			content = NoContentComponent;
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
			post: {
				title: blog.title,
				date: blog.date,
				tags: blog.tags || [],
				content: content,
				slug: blog.slug,
				duration: blog.duration || '5min',
				lang: blog.lang || 'en',
				description: blog.description || ''
			},
			availablePhotos
		};

	} catch (apiError) {
		console.error('Failed to load blog from API:', apiError);
		
		// Fallback: try to load from local markdown file
		console.log('Falling back to local markdown file...');
		
		try {
			const postModule = await import(`../../../markdown/posts/${slug}.svx`);

			if (postModule && postModule.metadata) {
				const metadata = postModule.metadata as Omit<Post, 'content' | 'slug'>;

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
					post: {
						title: metadata.title,
						date: metadata.date,
						tags: metadata.tags || [],
						content: postModule.default,
						slug: slug,
						duration: metadata.duration || '5min',
						lang: metadata.lang || 'en',
						description: metadata.description || ''
					},
					availablePhotos
				};
			} else {
				error(404, 'Post metadata is missing');
			}
		} catch (fallbackError) {
			console.error('Failed to load from markdown fallback:', fallbackError);
			error(404, 'Post does not exist or cannot be loaded from either API or local files');
		}
	}
};
