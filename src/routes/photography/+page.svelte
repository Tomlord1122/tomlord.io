<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import ImageUploadModal from '$lib/components/ImageUploadModal.svelte';
	import { invalidateAll } from '$app/navigation'; // For refreshing data

	// Get photos data from +page.server.ts load function
	let { data } = $props();

	// isDev state to control visibility of the uploader trigger
	let isDev = $state(false);
	
	// Use a normal variable for this check instead of wrapping in an effect
	if (browser) {
		// Only localhost is considered development for showing the uploader
		isDev = window.location.hostname === 'localhost';
	}

	// State to control the visibility of the image upload modal
	let showImageUploadModal = $state(false);
	
	// State to control the full-size image modal
	let showFullSizeImage = $state(false);
	let currentFullSizeImage = $state('');

	// Track loaded state for each image
	let loadedImages = $state<Record<string, boolean>>({});

	// Function to handle image load completion
	function handleImageLoaded(src: string) {
		loadedImages[src] = true;
	}

	// Function to open the full-size image modal
	function openFullSizeImage(imageSrc: string) {
		currentFullSizeImage = imageSrc;
		showFullSizeImage = true;
	}
	
	// Function to close the full-size image modal
	function closeFullSizeImage() {
		showFullSizeImage = false;
	}

	// Callback for successful upload from the modal
	// Now expects an array of new image paths
	function handleModalUploadSuccess(newImagePaths: string[]) {
		console.log(`${newImagePaths.length} new image(s) uploaded via modal:`, newImagePaths);
		if (newImagePaths.length > 0) {
			invalidateAll(); // Refresh data if at least one image was successful
		}
	}

	// Callback for when the modal is cancelled
	function handleModalCancel() {
		console.log('Image upload modal cancelled.');
		// The modal will close itself due to bind:show
	}

</script>

<svelte:head>
	<meta name="twitter:title" content="Photography | Tomlord's Blog" />
</svelte:head>

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
</div>

<main in:fly={{ y: 100, duration: 1000, delay: 300 }} class="main-content-area mt-10">
	{#if data.photos && data.photos.length > 0}
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 ">
		   <!-- {#each data.photos.slice().reverse() as photo, i (photo.src)} -->
		   {#each data.photos as photo, i (photo.src)}
			   <button 
				   class="aspect-square overflow-hidden rounded-lg shadow-md z-10 cursor-pointer relative"
				   onclick={() => openFullSizeImage(photo.src)}
			   >
				   <!-- Loading skeleton -->
				   {#if !loadedImages[photo.src]}
					   <div class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
						   <div class="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
					   </div>
				   {/if}
				   
				   <img 
					   src={photo.src} 
					   alt={photo.alt} 
					   class="photo-grid {loadedImages[photo.src] ? 'opacity-100' : 'opacity-0'} hover:scale-105 transition-all duration-300"
					   loading="lazy"
					   onload={() => handleImageLoaded(photo.src)}
				   />
			   </button>
		   {/each}
		</div>
	{:else if !data.error}
		<p class="text-gray-600">No photos to display yet. Upload some if you're on localhost!</p>
	{/if}
</main>

<!-- Full-size image modal -->
{#if showFullSizeImage}
	<div 
		class="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
		onclick={closeFullSizeImage}
		onkeydown={(e) => e.key === 'Escape' && closeFullSizeImage()}
		role="dialog"
		tabindex="0"
		in:fade={{ duration: 200 }}
	>
		<div class="max-w-full max-h-full overflow-auto">
			<!-- Loading indicator for full-size image -->
			{#if !loadedImages[currentFullSizeImage + '-full']}
				<div class="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
			{/if}
			
			<img 
				src={currentFullSizeImage} 
				alt="Full size view" 
				class="max-w-full max-h-[90vh] object-contain {loadedImages[currentFullSizeImage + '-full'] ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300"
				onload={() => handleImageLoaded(currentFullSizeImage + '-full')}
			/>
		</div>
		<button 
			class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
			onclick={closeFullSizeImage}
			aria-label="Close image view"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>
	</div>
{/if}

<!-- Conditionally render the ImageUploadModal -->
{#if isDev}
  <ImageUploadModal 
    bind:show={showImageUploadModal}
    onUploadSuccess={handleModalUploadSuccess}
    oncancel={handleModalCancel}
  />
{/if}
