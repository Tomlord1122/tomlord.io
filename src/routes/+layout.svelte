<script lang="ts">
	import '../app.css';
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { browser } from '$app/environment';
	import { config } from '$lib/config.js';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { onMount } from 'svelte';

	injectAnalytics();
	let { children } = $props();

	// Initialize performance optimizations only in development
	$effect(() => {
		if (browser && config.isDevelopment) {
			// Lazy load performance optimizer only in development
			import('$lib/performance.js').then(({ performanceOptimizer }) => {
				performanceOptimizer.init();
			});
		}
	});

	// Image skeleton loading: mark images as loaded when they finish downloading
	onMount(() => {
		if (!browser) return;

		function markLoaded(img: HTMLImageElement) {
			img.setAttribute('data-loaded', '');
		}

		function handleImage(img: HTMLImageElement) {
			if (img.complete && img.naturalHeight !== 0) {
				markLoaded(img);
			} else {
				img.addEventListener('load', () => markLoaded(img), { once: true });
				img.addEventListener('error', () => markLoaded(img), { once: true });
			}
		}

		// Handle images already in the DOM
		document.querySelectorAll('img').forEach(handleImage);

		// Watch for dynamically added images (e.g. route changes, markdown re-renders)
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node instanceof HTMLImageElement) {
						handleImage(node);
					} else if (node instanceof HTMLElement) {
						node.querySelectorAll('img').forEach(handleImage);
					}
				});
			});
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
