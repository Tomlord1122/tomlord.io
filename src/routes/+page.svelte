<script lang="ts">
	// This script block is where you can add JavaScript logic for your page if needed later.
	// For now, we'll leave it empty as we're just adding static content.
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import EditPageModal from '$lib/components/EditPageModal.svelte';
	import { marked } from 'marked';

	// Get data from the server load function
	let { data } = $props();

	// Check if we're in development mode
	let isDev = $state(false);
	let showEditModal = $state(false);
	let pageContent = $state(data.pageContent);

	// Check environment on client-side
	$effect(() => {
		if (browser) {
			// Only localhost is considered development
			isDev = window.location.hostname === 'localhost';
		}
	});

	// Update pageContent when data changes (e.g., after editing)
	$effect(() => {
		pageContent = data.pageContent;
	});

	// Callback for successful save
	function handlePageSaved() {
		console.log('Home page content saved successfully.');
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


<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base  mx-auto">
	
	<h1 
		class="page-title">
		{#if isDev}
			<button
				onclick={openEditModal}
				aria-label="Edit Home Page"
				class="hover:text-gray-600 transition-colors"
			>
				tom.home
			</button>
		{:else}
			tom.home
		{/if}
	</h1>


	<main in:fly={{ y: 100, duration: 1000, delay: 200 }} 
		class="main-content-area">
		{#if pageContent}
			<div class="prose prose-sm sm:prose-base max-w-none">
				{@html htmlContent}
			</div>
		{:else}
			<p class="text-gray-600">Loading content...</p>
		{/if}
	</main>
</div>

{#if isDev}
	<EditPageModal 
		bind:show={showEditModal}
		pageTitle="Home Page"
		initialContent={pageContent}
		pageName="home"
		onSaved={handlePageSaved}
		onCancel={handleEditCancel}
	/>
{/if}
