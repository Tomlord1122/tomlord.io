<script lang="ts">
	import '../app.css';
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import { config } from '$lib/config.js';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { onMount } from 'svelte';

	injectAnalytics();
	let { children } = $props();

		onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		const fromPath = navigation.from?.url.pathname;
		const toPath = navigation.to?.url.pathname;
		const isBlogNavigation = fromPath?.startsWith('/blog') && toPath?.startsWith('/blog');
		const isReturningToBlogList = fromPath?.startsWith('/blog/') && toPath === '/blog';

		if (!isBlogNavigation) return;

		if (isReturningToBlogList) {
			document.documentElement.dataset.suppressBlogListTransitions = 'true';
		}

		return new Promise<void>((resolve) => {
			const transition = document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});

			void transition.finished.finally(() => {
				if (isReturningToBlogList) {
					delete document.documentElement.dataset.suppressBlogListTransitions;
				}
			});
		});
	});

	// Initialize performance optimizations only in development
	$effect(() => {
		if (browser && config.isDevelopment) {
			// Lazy load performance optimizer only in development
			import('$lib/performance.js').then(({ performanceOptimizer }) => {
				performanceOptimizer.init();
			});
		}
	});

	// Skeleton loading for .photo-post images (raw HTML inside markdown {@html}).
	// Adds `data-loaded` once the image finishes loading; CSS uses this to
	// remove the shimmer placeholder.
	onMount(() => {
		function markLoaded(img: HTMLImageElement) {
			img.setAttribute('data-loaded', '');
		}

		function handleImage(img: HTMLImageElement) {
			if (img.complete && img.naturalHeight !== 0) {
				markLoaded(img);
				return;
			}
			img.addEventListener('load', () => markLoaded(img), { once: true });
			img.addEventListener('error', () => markLoaded(img), { once: true });
		}

		// Process images already in the DOM.
		document.querySelectorAll<HTMLImageElement>('img.photo-post').forEach(handleImage);

		// Watch for images added later (route change, markdown re-render).
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node instanceof HTMLImageElement && node.classList.contains('photo-post')) {
						handleImage(node);
					} else if (node instanceof HTMLElement) {
						node.querySelectorAll<HTMLImageElement>('img.photo-post').forEach(handleImage);
					}
				}
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });

		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<meta name="title" content="Tomlord's Blog" />
	<meta
		name="description"
		content="Personal blog by Tomlord, sharing tech, projects, and photography"
	/>
</svelte:head>

<InteractiveBackground />
<div class="flex min-h-screen flex-col bg-[#EDEDED]">
	<Navigation />
	<main class="container mx-auto flex-1 p-4">
		{@render children()}
	</main>
</div>
<Toast />
