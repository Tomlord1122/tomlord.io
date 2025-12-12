import { config, fetchWithTimeout } from '$lib/config.js';
import type { PostData, PostMetadata } from '$lib/types/post.js';

export interface BlogDetail {
	id: string;
	title: string;
	slug: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description?: string;
	content?: string;
	is_published: boolean;
	created_at: string;
	updated_at: string;
	message_count?: number;
}

export interface CreateBlogRequest {
	title: string;
	slug: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description: string;
	content: string;
	is_published: boolean;
}

export interface UpdateBlogRequest {
	title: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description: string;
	content: string;
	is_published: boolean;
}

/**
 * Fetch a blog by slug from the backend API
 */
export async function fetchBlogBySlug(slug: string): Promise<BlogDetail> {
	const response = await fetchWithTimeout(`${config.API.BLOGS}/${slug}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch blog: ${response.status}`);
	}

	const data = await response.json();
	return data.blog;
}

/**
 * Fetch all blogs from the backend API
 */
export async function fetchBlogs(options?: {
	limit?: number;
	offset?: number;
	tag?: string;
	lang?: string;
	published?: boolean;
}): Promise<BlogDetail[]> {
	const params = new URLSearchParams();
	if (options?.limit) params.set('limit', options.limit.toString());
	if (options?.offset) params.set('offset', options.offset.toString());
	if (options?.tag) params.set('tag', options.tag);
	if (options?.lang) params.set('lang', options.lang);
	if (options?.published !== undefined) params.set('published', options.published.toString());

	const url = `${config.API.BLOGS}?${params.toString()}`;
	const response = await fetchWithTimeout(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch blogs: ${response.status}`);
	}

	const data = await response.json();
	return data.blogs;
}

/**
 * Create a new blog post (requires super user auth)
 */
export async function createBlog(data: CreateBlogRequest, token: string): Promise<BlogDetail> {
	const response = await fetchWithTimeout(
		config.API.BLOGS,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(data)
		},
		10000 // 10 second timeout for create
	);

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `Failed to create blog: ${response.status}`);
	}

	const result = await response.json();
	return result.blog;
}

/**
 * Update an existing blog post (requires super user auth)
 */
export async function updateBlog(
	slug: string,
	data: UpdateBlogRequest,
	token: string
): Promise<BlogDetail> {
	const response = await fetchWithTimeout(
		`${config.API.BLOGS}/${slug}`,
		{
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(data)
		},
		10000 // 10 second timeout for update
	);

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `Failed to update blog: ${response.status}`);
	}

	const result = await response.json();
	return result.blog;
}

/**
 * Delete a blog post (requires super user auth)
 */
export async function deleteBlog(slug: string, token: string): Promise<void> {
	const response = await fetchWithTimeout(
		`${config.API.BLOGS}/${slug}`,
		{
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		},
		10000
	);

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `Failed to delete blog: ${response.status}`);
	}
}

/**
 * Convert BlogDetail to PostMetadata format used in frontend
 */
export function blogToPostMetadata(blog: BlogDetail): PostMetadata {
	return {
		title: blog.title,
		date: blog.date,
		slug: blog.slug,
		description: blog.description || '',
		tags: blog.tags,
		lang: blog.lang,
		duration: blog.duration
	};
}

/**
 * Convert BlogDetail to PostData format used in frontend
 */
export function blogToPostData(blog: BlogDetail): PostData {
	return {
		title: blog.title,
		slug: blog.slug,
		content: blog.content || '',
		date: blog.date,
		lang: blog.lang,
		duration: blog.duration,
		tags: blog.tags,
		description: blog.description || '',
		is_published: blog.is_published
	};
}
