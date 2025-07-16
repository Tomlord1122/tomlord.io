export interface Comment {
	id: string;
	user_id: string;
	user_name: string;
	user_picture: string;
	post_slug: string;
	blog_id?: string;
	message: string;
	thumb_count: number;
	created_at: string;
	updated_at: string;
	user_thumbed?: boolean;
}

export interface CreateCommentRequest {
	user_id: string;
	post_slug: string;
	blog_id?: string;
	message: string;
}

export interface CommentListRequest {
	post_slug?: string;
	blog_id?: string;
	blog_slug?: string;
	limit?: number;
	offset?: number;
	user_id?: string;
}

export interface CommentSortOption {
	value: 'time' | 'likes';
	label: string;
}

export const COMMENT_SORT_OPTIONS: CommentSortOption[] = [
	{ value: 'time', label: 'Newest First' },
	{ value: 'likes', label: 'Most Liked' }
];

export interface BlogPost {
	id: string;
	title: string;
	slug: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description?: string;
	is_published: boolean;
	created_at: string;
	updated_at: string;
	message_count?: number;
} 