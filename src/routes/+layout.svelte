<script lang="ts">
	import '../app.css';
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit'
	import { dev } from '$app/environment';

	let { children } = $props();
	injectAnalytics({ mode: dev ? 'development' : 'production' });

</script>

<InteractiveBackground />
<div class="min-h-screen bg-[#EDEDED] flex flex-col font-sans">
	<nav class="p-4 ">
		<div class="container mx-auto flex justify-between items-center">
			
 			<a href="/" class="transition-all duration-300 hover:scale-110">
				<img  src="/app_icon.png" alt="Tomlord" class="w-15 h-15 rounded-2xl border-2 border-gray-300">
			</a>
			<div class="flex items-center gap-4  text-lg">
				<a href="/" class="nav-link">Home</a>
				<a href="/blog" class="nav-link">Blog</a>
				<a href="/project" class="nav-link">Project</a>
				<a href="/photography" class="nav-link">Photography</a>
			</div>
		</div>
	</nav>
	<main class="flex-1 container mx-auto p-4">
		{@render children()}
	</main>
</div>
