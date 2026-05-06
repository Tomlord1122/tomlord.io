<script lang="ts">
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import EditPageModal from '$lib/components/EditPageModal.svelte';
	import { renderMarkdown } from '$lib/util/markdown.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { isSuperUser } from '$lib/util/auth.js';
	import { revalidateISR } from '$lib/api/revalidate.js';
	import { trackVisitor } from '$lib/api/analytics.js';

	// Get data from the server load function
	let { data } = $props();

	// Check if user can edit (super user only)
	let canEdit = $derived(isSuperUser(auth.user));
	let showEditModal = $state(false);
	let pageContent = $derived(data.pageContent);

	// Visitor stats - initialized from SSR data, then updated client-side
	// svelte-ignore state_referenced_locally
	let visitorStats = $state(data.visitorStats);
	let visitorTracked = $state(false);

	// Track visit client-side on mount
	$effect(() => {
		if (browser && !visitorTracked) {
			visitorTracked = true;
			trackVisitor()
				.then((stats) => {
					visitorStats = stats;
				})
				.catch((err) => {
					console.error('Failed to track visitor:', err);
				});
		}
	});

	async function handlePageSaved() {
		console.log('Home page content saved successfully.');
		await revalidateISR('/');
		// Soft refresh via SvelteKit navigation
		const { invalidateAll } = await import('$app/navigation');
		invalidateAll();
	}

	function handleEditCancel() {
		console.log('Edit cancelled.');
	}

	function openEditModal() {
		showEditModal = true;
	}

	let htmlContent = $derived(renderMarkdown(pageContent || '', data.previews));
</script>

<svelte:head>
	<meta property="og:title" content="Home | Tomlord's Blog" />
	<meta
		property="og:description"
		content="Personal blog by Tomlord, sharing tech, projects, and photography"
	/>
	<meta property="og:image" content="https://tomlord.fyi/app_icon.png" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tomlord.fyi" />
</svelte:head>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<h1 class="page-title">
		{#if canEdit}
			<button
				onclick={openEditModal}
				aria-label="Edit Home Page"
				class="transition-colors hover:text-gray-600"
			>
				tom.home
			</button>
		{:else}
			tom.home
		{/if}
	</h1>

	{#if visitorStats}
		<div class="mb-6 flex items-center gap-2 text-sm text-gray-600" in:fly={{ y: 20, duration: 600, delay: 400 }}>
			<span>Welcome! You're visitor</span>
			<span class="font-semibold text-gray-900">
				#{visitorStats.total_count.toLocaleString()}
			</span>
			<span class="text-emerald-600 font-medium">
				+{visitorStats.today_count.toLocaleString()} today
			</span>
			<svg class="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
				<polyline points="16 7 22 7 22 13"></polyline>
			</svg>
		</div>
	{/if}

	<main in:fly={{ y: 100, duration: 1000, delay: 200 }} class="main-content-area">
		{#if pageContent}
			<div class="prose prose-sm sm:prose-lg max-w-none">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html htmlContent}
			</div>
		{:else}
			<p class="text-gray-600">Loading content...</p>
		{/if}
	</main>
</div>

{#if canEdit}
	<EditPageModal
		bind:show={showEditModal}
		pageTitle="Home Page"
		initialContent={pageContent}
		pageName="home"
		availablePhotos={data.availablePhotos || []}
		availableAssets={data.availableAssets || []}
		onSaved={handlePageSaved}
		onCancel={handleEditCancel}
	/>
{/if}
