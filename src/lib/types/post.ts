export interface PostMetadata {
	title: string;
	date: string;
	slug: string;
	description: string;
	tags: string[];
	lang: string;
	duration: string;
}

// Frontmatter data interface for blog posts
export interface Frontmatter {
	title?: string;
	date?: string;
	slug?: string;
	description?: string;
	tags?: string[];
	lang?: string;
	duration?: string;
	[key: string]: string | string[] | undefined;
}

// Using Omit to define Post based on PostMetadata
export interface Post extends Omit<PostMetadata, 'description'> {
	content: string; // Markdown/HTML content as string
	duration: string;
	description: string;
}

export interface PostData {
	title: string;
	slug: string;
	content: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description: string;
	is_published: boolean;
}

export interface NewPostModalType {
	show: boolean;
	allCurrentTags: string[];
	availableImages?: string[];
	// Changed from oncreated to onSaved for consistency with edit modal context
	onSaved: () => void;
	// Changed from oncancel to onCancel for consistency with edit modal context
	onCancel: () => void;
}

export interface EditPostModalType extends NewPostModalType {
	postData: PostData;
}
