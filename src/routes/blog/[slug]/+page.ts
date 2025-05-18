import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';

interface Post {
	title: string;
	date: string;
	tags?: string[];
	content: any; // or more precisely SvelteComponent type, if easily available
	duration: string;
	lang: string;
	slug: string;
}

export const load: PageLoad = async ({ params }: { params: { slug: string } }) => {
	const { slug } = params;

	try {
		const postModule = await import(`../../../markdown/posts/${slug}.svx`);

		if (postModule && postModule.metadata) {
			const metadata = postModule.metadata as Omit<Post, 'content' | 'slug'>;
			return {
				post: {
					title: metadata.title,
					date: metadata.date,
					tags: metadata.tags || [],
					content: postModule.default, 
					slug: slug,
					duration: metadata.duration,
					lang: metadata.lang,
				}
			};
		} else {
			error(404, 'Post metadata is missing');
		}
	} catch (e) {
		console.error('Failed to load post:', e);
		error(404, 'Post does not exist or cannot be loaded');
	}
}; 