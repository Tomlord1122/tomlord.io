export interface PostMetadata {
	title: string;
	date: string;
	slug: string;
	description: string;
	tags: string[];
	lang: string;
	duration: string;
}

// Using Omit to define Post based on PostMetadata
export interface Post extends Omit<PostMetadata, 'description'> {
	content: string; // Markdown content as string
	duration: string;
	description: string;
}

export interface PostData {
	id?: string;
	title: string;
	slug: string;
	content: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description: string;
	is_published: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface PostEditorModalType {
	show: boolean;
	mode: 'create' | 'edit';
	postData?: PostData;
	allCurrentTags: string[];
	availablePhotos?: string[];
	availableAssets?: string[];
	onSaved: () => void;
	onCancel: () => void;
	onDeleted?: () => void; // only used in edit mode
}
