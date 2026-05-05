import type { PageServerLoad } from './$types.js';
import type { Config } from '@sveltejs/adapter-vercel';
import { BYPASS_TOKEN } from '$env/static/private';

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Browser-side cache; ISR handles edge caching
	setHeaders({
		'cache-control': 'public, max-age=60'
	});
};

export const config: Config = {
	isr: {
		expiration: 300, // 5 minutes
		bypassToken: BYPASS_TOKEN
	}
};
