<script lang="ts">
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import ImageUploadModal from '$lib/components/ImageUploadModal.svelte';
	import { invalidateAll } from '$app/navigation'; // For refreshing data

	// Get photos data from +page.server.ts load function
	let { data } = $props();

	// isDev state to control visibility of the uploader trigger
	let isDev = $state(false);
	$effect(() => {
		if (browser) {
			// Only localhost is considered development for showing the uploader
			isDev = window.location.hostname === 'localhost';
		}
	});

	// State to control the visibility of the image upload modal
	let showImageUploadModal = $state(false);

	// Callback for successful upload from the modal
	// Now expects an array of new image paths
	function handleModalUploadSuccess(newImagePaths: string[]) {
		console.log(`${newImagePaths.length} new image(s) uploaded via modal:`, newImagePaths);
		if (newImagePaths.length > 0) {
			invalidateAll(); // Refresh data if at least one image was successful
		}
		// Modal will close itself if all uploads were successful (handled internally in modal now)
		// Or, if we want to ensure it closes if ANY upload was successful:
		if (newImagePaths.length > 0) {
		    // showImageUploadModal = false; // This is already handled by bind:show and internal logic of modal if all successful
        // The modal itself calls onUploadSuccess and then if all good, parent `show` prop changes, effect cleans up.
        // If not all successful, modal stays open to show errors.
		}
	}

	// Callback for when the modal is cancelled
	function handleModalCancel() {
		console.log('Image upload modal cancelled.');
		// The modal will close itself due to bind:show
	}

</script>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto">
	
	<h1 class="page-title flex justify-between items-center">
		{#if isDev}
			<!-- Button to open the image upload modal -->
			<button 
				onclick={() => showImageUploadModal = true} 
				
			>
				tom.photography
			</button>
		{:else}
			tom.photography
		{/if}
	</h1>

	{#if data.error}
		<p class="text-red-500 bg-red-100 border border-red-400 p-3 rounded-md">Error loading photos: {data.error}</p>
	{/if}

	<main in:fly={{ y: 100, duration: 1000, delay: 300 }} class="main-content-area">
	 {#if data.photos && data.photos.length > 0}
		 <div class="grid grid-cols-1 md:grid-cols-2 gap-3 not-prose">
			{#each data.photos as photo, i (photo.src)} <!-- Added key for #each -->
				<div 
					in:fly={{
						y: 50, 
						duration: 600 + (i % 2) * 200, 
						delay: 300 + Math.floor(i / 2) * 300 
					}}
					class="aspect-square overflow-hidden rounded-lg shadow-md z-10"
				>
					<img 
						src={photo.src} 
						alt={photo.alt} 
						class="photo-grid transition-transform hover:scale-105 duration-300"
						loading="lazy"
					/>
				</div>
			{/each}
		 </div>
	 {:else if !data.error}
	 	<p class="text-gray-600">No photos to display yet. Upload some if you're on localhost!</p>
	 {/if}
	</main>
</div>

<!-- Conditionally render the ImageUploadModal -->
{#if isDev}
  <ImageUploadModal 
    bind:show={showImageUploadModal}
    onUploadSuccess={handleModalUploadSuccess}
    oncancel={handleModalCancel}
  />
{/if}

