<script lang="ts">
	import '../app.css';
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { dev } from '$app/environment';

	let { children } = $props();
	injectAnalytics({ mode: dev ? 'development' : 'production' });
</script>

<InteractiveBackground />
<div class="flex min-h-screen flex-col bg-[#EDEDED]">
	<Navigation />
	<main class="container mx-auto flex-1 p-4">
		{@render children()}
	</main>
</div>
