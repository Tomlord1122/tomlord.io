<script lang="ts">
	import '../app.css';
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit'
	import { dev } from '$app/environment';

	let { children } = $props();
	injectAnalytics({ mode: dev ? 'development' : 'production' });

</script>

<InteractiveBackground />
<div class="min-h-screen bg-[#EDEDED] flex flex-col">
	<Navigation />
	<main class="flex-1 container mx-auto p-4">
		{@render children()}
	</main>
</div>
