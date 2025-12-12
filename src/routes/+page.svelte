<script lang="ts">
	import { fly } from 'svelte/transition';
	import EditPageModal from '$lib/components/EditPageModal.svelte';
	import { marked } from 'marked';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { isSuperUser } from '$lib/util/auth.js';

	// Get data from the server load function
	let { data } = $props();

	// Check if user can edit (super user only)
	let canEdit = $derived(isSuperUser(auth.user));
	let showEditModal = $state(false);
	let pageContent = $derived(data.pageContent);

	function handlePageSaved() {
		console.log('Home page content saved successfully.');
		// Instead of full page reload, use SvelteKit's invalidateAll
		import('$app/navigation').then(({ invalidateAll }) => {
			invalidateAll();
		});
	}

	function handleEditCancel() {
		console.log('Edit cancelled.');
	}

	function openEditModal() {
		showEditModal = true;
	}

	let htmlContent = $derived(marked(pageContent || ''));
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
		onSaved={handlePageSaved}
		onCancel={handleEditCancel}
	/>
{/if}
