export interface ThreadPost {
	id: string;
	content: string;
	created_at: string;
	updated_at: string;
}

export interface ThreadPage {
	threads: ThreadPost[];
	next_cursor: string | null;
	has_more: boolean;
}
