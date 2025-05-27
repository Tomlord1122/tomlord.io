<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import ImageUploadModal from '$lib/components/ImageUploadModal.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
	import { invalidateAll } from '$app/navigation'; // For refreshing data
	import { quintOut } from 'svelte/easing'; // For a smooth animation

	// Get data from both page and layout
	let { data } = $props();

	// Create photo objects from layout's availablePhotos
	let photos = $derived(
		data.availablePhotos ? data.availablePhotos.map((photoUrl: string) => {
			const filename = photoUrl.substring(photoUrl.lastIndexOf("/") + 1);
			return {
				src: photoUrl,
				alt: `Photo ${filename}`,
				filename
			};
		}) : []
	);

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

	// ---- Load More 分頁載入狀態 ----
	const PHOTOS_TO_LOAD_AT_ONCE = 10; // 每次載入 10 張照片
	let visiblePhotosCount = $state(PHOTOS_TO_LOAD_AT_ONCE);
	let isLoadingMore = $state(false);

	// ---- Derived state for displayed photos ----
	let displayedPhotos = $derived(photos ? photos.slice(0, visiblePhotosCount) : []);

	// ---- Function to load more photos ----
	async function loadMorePhotos() {
		isLoadingMore = true;
		
		// await new Promise(resolve => setTimeout(resolve, 200));
		
		visiblePhotosCount += PHOTOS_TO_LOAD_AT_ONCE;
		// Ensure we don't try to show more photos than available
		if (photos && visiblePhotosCount > photos.length) {
			visiblePhotosCount = photos.length;
		}
		
		isLoadingMore = false;
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
	function handleModalUploadSuccess(newImagePaths: string[]) {
		console.log(`${newImagePaths.length} new image(s) uploaded`);
		if (newImagePaths.length > 0) {
			invalidateAll(); // Refresh data if at least one image was successful
		}
	}

	// Callback for when the modal is cancelled
	function handleModalCancel() {
		console.log('Image upload modal cancelled.');
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
				class="hover:text-gray-600 transition-colors"
			>
				tom.photography
			</button>
		{:else}
			tom.photography
		{/if}
	</h1>
</div>

<main in:fly={{ y: 100, duration: 1000, delay: 100 }} class="main-content-area mt-10">
	{#if displayedPhotos && displayedPhotos.length > 0}
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
		   {#each displayedPhotos as photo, i (photo.src)}
			   <ResponsiveImage 
				   src={photo.src}
				   alt={photo.alt}
				   loading={i < 6 ? "eager" : "lazy"}
				   onclick={() => openFullSizeImage(photo.src)}
			   />
		   {/each}
		</div>
		
		<!-- 載入更多照片的狀態指示 -->
		{#if isLoadingMore}
			<div class="text-center mt-8 mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-100">
					<div class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
					<span class="text-gray-600">Loading more photos...</span>
				</div>
			</div>
		{/if}
	{:else}
		<p class="text-gray-600">No photos to display yet. Upload some if you're on localhost!</p>
	{/if}

	<!-- "Load More" Button -->
	{#if photos && displayedPhotos.length < photos.length && !isLoadingMore}
		<div class="text-center mt-8 mb-8">
			<button 
				onclick={loadMorePhotos}
				class="relative overflow-hidden px-6 py-3 rounded-lg animate-pulse"
			>
				Load More Photos ({displayedPhotos.length} / {photos.length})
			</button>
		</div>
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
			<img 
				src={currentFullSizeImage}
				alt="Full size view" 
				class="max-w-full max-h-[90vh] object-contain"
				loading="eager"
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
