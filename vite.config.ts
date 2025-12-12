import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { imagetools } from 'vite-imagetools';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		imagetools({
			defaultDirectives: new URLSearchParams({
				format: 'webp'
			})
		})
	],
	optimizeDeps: {
		exclude: ['sharp']
	},
	ssr: {
		external: ['sharp']
	},
	build: {
		minify: 'esbuild',
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['svelte']
				}
			}
		}
	}
});
