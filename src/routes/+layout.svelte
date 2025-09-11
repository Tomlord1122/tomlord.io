<script lang="ts">
	import '../app.css';
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { dev, browser } from '$app/environment';
	import { performanceOptimizer } from '$lib/performance.js';

	let { children } = $props();
	injectAnalytics({ mode: dev ? 'development' : 'production' });

	// Initialize performance optimizations
	$effect(() => {
		if (browser) {
			performanceOptimizer.init();
		}
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
