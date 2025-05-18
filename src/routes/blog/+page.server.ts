import type { PageServerLoad } from './$types.js';

interface PostMetadata {
	title: string;
	date: string;
	slug: string;
	description?: string;
	tags?: string[];
	lang?: string;
}

export const load: PageServerLoad = async () => {
	const posts: PostMetadata[] = [];
	const modules = import.meta.glob('/src/markdown/posts/**/*.svx', { eager: true });

	for (const path in modules) {
		const file = modules[path];
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
				});
			}
		}
	}

	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return {
		posts
	};
}; 