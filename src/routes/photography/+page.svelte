<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import ImageUploadModal from '$lib/components/ImageUploadModal.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import { invalidateAll } from '$app/navigation'; // For refreshing data

	// Get data from both page and layout
	let { data } = $props();

	// Create photo objects from layout's availablePhotos
	let photos = $derived(
		data.availablePhotos
			? data.availablePhotos.map((photoUrl: string) => {
					const filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
					return {
						src: photoUrl,
						alt: `Photo ${filename}`,
						filename
					};
				})
			: []
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
	const PHOTOS_TO_LOAD_AT_ONCE = 10; // Increased from 10 to 15 for better performance
	let visiblePhotosCount = $state(PHOTOS_TO_LOAD_AT_ONCE);
	let isLoadingMore = $state(false);

	// ---- Derived state for displayed photos ----
	let displayedPhotos = $derived(photos ? photos.slice(0, visiblePhotosCount) : []);

	// ---- Carousel view state ----
	let showCarouselView = $state(false);
	let currentCarouselIndex = $state(0);

	// ---- Function to load more photos ----
	async function loadMorePhotos() {
		isLoadingMore = true;

		// Simulate loading delay only in dev mode
		await new Promise(resolve => setTimeout(resolve, 300));

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

	// Function to open carousel view
	function openCarouselView(index = 0) {
		currentCarouselIndex = index;
		showCarouselView = true;
	}

	// Function to close carousel view
	function closeCarouselView() {
		showCarouselView = false;
	}

	// Function to handle carousel index change
	function handleCarouselIndexChange(index: number) {
		currentCarouselIndex = index;
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
<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<h1 class="page-title flex items-center justify-between">
		{#if isDev}
			<!-- Button to open the image upload modal -->
			<button
				onclick={() => (showImageUploadModal = true)}
				class="transition-colors hover:text-gray-600"
			>
				tom.photography
			</button>
		{:else}
			tom.photography
		{/if}
		
		<!-- Carousel view toggle button -->
		{#if photos && photos.length > 0}
			<button
				onclick={() => openCarouselView()}
				class="ml-2 sm:ml-4 rounded-lg bg-gray-100 px-2 py-1 text-xs sm:px-3 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
				title="Carousel View"
			>
				<span class="sm:hidden">Carousel</span>
				<span class="hidden sm:inline">Carousel View</span>
			</button>
		{/if}
	</h1>
</div>

<main in:fly={{ y: 100, duration: 800, delay: 100 }} class="main-content-area mt-10">
	{#if displayedPhotos && displayedPhotos.length > 0}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each displayedPhotos as photo, i (photo.src)}
				<div in:fade|global={{ duration: 250, delay: Math.min((i % PHOTOS_TO_LOAD_AT_ONCE) * 30, 400) + 150 }}>
					<ResponsiveImage
						src={photo.src}
						alt={photo.alt}
						loading={i < 20 ? 'eager' : 'lazy'}
						onclick={() => openFullSizeImage(photo.src)}
					/>
				</div>
			{/each}
		</div>

		<!-- "Load More" Button -->
		{#if photos && displayedPhotos.length < photos.length}
			<div class="mt-8 mb-8 text-center" in:fly|global={{ y: 50, duration: 600, delay: 800 }}>
				{#if isLoadingMore}
					<div class="flex items-center justify-center gap-2 px-6 py-3">
						<div class="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
						<span>Loading...</span>
					</div>
				{:else}
					<button
						onclick={loadMorePhotos}
						class="relative cursor-pointer overflow-hidden rounded-lg px-6 py-3 transition-transform hover:scale-105"
					>
						Load More Photos ({displayedPhotos.length} / {photos.length})
					</button>
				{/if}
			</div>
		{/if}
	{:else}
		<p class="text-gray-600">No photos to display yet. Upload some if you're on localhost!</p>
	{/if}
</main>

<!-- Full-size image modal -->
{#if showFullSizeImage}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-lg backdrop-filter"
		onclick={closeFullSizeImage}
		onkeydown={(e) => e.key === 'Escape' && closeFullSizeImage()}
		role="dialog"
		tabindex="0"
		in:fade={{ duration: 150 }}
	>
		<div class="relative max-h-full max-w-full flex items-center justify-center">
			<!-- Fujifilm-style border container for full-size image -->
			<div class="relative p-1 sm:p-2 bg-white rounded-sm shadow-2xl max-w-[95vw] max-h-[90vh] sm:max-w-[90vw] flex items-center justify-center" 
				style="
					background: #f8f8f8;
					border: 1px solid #2d5016;
					box-shadow: 
						inset 0 0 0 1px #ffffff,
						0 10px 30px rgba(0,0,0,0.4);
				"
			>
				<!-- Fujifilm brand label -->
				<div class="absolute -top-4 sm:-top-6 right-1 sm:right-2 text-xs font-bold text-white bg-green-800 px-1 sm:px-2 py-1 tracking-wider rounded-sm">
					tom.photography
				</div>
				
				<!-- Photo container -->
				<div class="relative bg-white flex items-center justify-center">
					<img
						src={currentFullSizeImage}
						alt="Full size view"
						class="max-h-[75vh] max-w-[90vw] sm:max-h-[80vh] sm:max-w-[85vw] object-contain"
						loading="eager"
					/>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Photo Carousel Component -->
<PhotoCarousel
	{photos}
	show={showCarouselView}
	currentIndex={currentCarouselIndex}
	onClose={closeCarouselView}
	onIndexChange={handleCarouselIndexChange}
/>

<!-- Conditionally render the ImageUploadModal -->
{#if isDev}
	<ImageUploadModal
		bind:show={showImageUploadModal}
		onUploadSuccess={handleModalUploadSuccess}
		onCancel={handleModalCancel}
	/>
{/if}