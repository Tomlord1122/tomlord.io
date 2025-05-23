<script lang="ts">
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
	<meta name="twitter:title" content="Projects | Tomlord's Blog" />
</svelte:head>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto">
	
	<!-- A large heading for the page title or your name -->
	<h1 
		class="page-title">
		{#if isDev}
			<button
				onclick={openEditModal}
				aria-label="Edit Project Page"
				class="hover:text-gray-600 transition-colors"
			>
				tom.project
			</button>
		{:else}
			tom.project
		{/if}
	</h1>

	<main in:fly={{ y: 100, duration: 1000, delay: 200 }} 
		class="main-content-area">
		<div class="prose prose-sm sm:prose-lg max-w-none">
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

