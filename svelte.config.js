import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter(),
		prerender: {
			handleMissingId: 'warn'
		}
	},
	extensions: ['.svelte', '.svx', '.md'],
	compilerOptions: {
		dev: process.env.NODE_ENV === 'development'
	}
};

export default config;
