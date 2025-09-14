<script lang="ts">
	import '../app.css';
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import { browser } from '$app/environment';
	import { config } from '$lib/config.js';

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
