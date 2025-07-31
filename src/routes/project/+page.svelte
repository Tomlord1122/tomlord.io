<script lang="ts">
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import EditPageModal from '$lib/components/EditPageModal.svelte';
	import { marked } from 'marked';

	// Get data from the server load function
	let { data } = $props();

	// Check if we're in development mode
	let isDev = $derived(browser && window.location.hostname === 'localhost');
	let showEditModal = $state(false);
	let pageContent = $derived(data.pageContent);

	// Callback for successful save
	function handlePageSaved() {
		console.log('Project page content saved successfully.');
		// Reload the page to get the updated content from the server
		window.location.reload();
	}

	// Callback for modal cancellation
	function handleEditCancel() {
		console.log('Edit cancelled.');
	}

	// Function to open the edit modal
	function openEditModal() {
		showEditModal = true;
	}

	// Derived HTML content for rendering
	let htmlContent = $derived(marked(pageContent || ''));
</script>

<svelte:head>
	<meta name="description" content="My learning journey" />
	
	<!-- Open Graph tags for better social sharing -->
	<meta property="og:title" content="Projects | Tomlord's Blog" />
	<meta property="og:description" content="My learning journey" />
	<meta property="og:image" content="https://tomlord.fyi/app_icon.png" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tomlord.fyi/project" />
</svelte:head>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<!-- A large heading for the page title or your name -->
	<h1 class="page-title">
		{#if isDev}
			<button
				onclick={openEditModal}
				aria-label="Edit Project Page"
				class="transition-colors hover:text-gray-600"
			>
				tom.project
			</button>
		{:else}
			tom.project
		{/if}
	</h1>

	<main in:fly={{ y: 100, duration: 800, delay: 100 }} class="main-content-area">
		<div class="prose prose-sm sm:prose-lg max-w-none">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html htmlContent}
		</div>
	</main>
</div>

{#if isDev}
	<EditPageModal
		bind:show={showEditModal}
		pageTitle="Project Page"
		initialContent={pageContent}
		pageName="project"
		onSaved={handlePageSaved}
		onCancel={handleEditCancel}
	/>
{/if}
