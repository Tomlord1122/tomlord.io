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

	$effect(() => {
		if (browser) {
			isDev = window.location.hostname === 'localhost';
		}
	});

	$effect(() => {
		pageContent = data.pageContent;
	});

	function handlePageSaved() {
		console.log('Home page content saved successfully.');
		window.location.reload();
	}

	function handleEditCancel() {
		console.log('Edit cancelled.');
	}

	function openEditModal() {
		showEditModal = true;
	}

	let htmlContent = $derived(marked(pageContent || ''));
</script>


<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto">
	
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
			<div class="prose prose-sm sm:prose-lg max-w-none">
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
