import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Cache blog list for 1 minute, stale for 1 minute
	setHeaders({
		'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=60'
	});
};
