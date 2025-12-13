import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Cache blog list for 5 minutes, stale for 1 hour
	setHeaders({
		'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600'
	});
};
