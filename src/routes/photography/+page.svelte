<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import ImageUploadModal from '$lib/components/ImageUploadModal.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
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
	const PHOTOS_TO_LOAD_AT_ONCE = 10; // 每次載入 10 張照片
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

		// await new Promise(resolve => setTimeout(resolve, 1000));

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

	// Function to go to next photo in carousel
	function nextPhoto() {
		if (photos && currentCarouselIndex < photos.length - 1) {
			currentCarouselIndex++;
		} else if (photos) {
			currentCarouselIndex = 0; // Loop back to first
		}
	}

	// Function to go to previous photo in carousel
	function prevPhoto() {
		if (currentCarouselIndex > 0) {
			currentCarouselIndex--;
		} else if (photos) {
			currentCarouselIndex = photos.length - 1; // Loop to last
		}
	}

	// Function to go to specific photo
	function goToPhoto(index: number) {
		currentCarouselIndex = index;
	}

	// Handle keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (!showCarouselView) return;
		
		switch (e.key) {
			case 'ArrowRight':
				e.preventDefault();
				nextPhoto();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				prevPhoto();
				break;
			case 'Escape':
				e.preventDefault();
				closeCarouselView();
				break;
		}
	}

	// Touch/swipe handling
	let touchStartX = 0;
	let touchEndX = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.changedTouches[0].screenX;
	}

	function handleTouchEnd(e: TouchEvent) {
		touchEndX = e.changedTouches[0].screenX;
		handleSwipe();
	}

	function handleSwipe() {
		const swipeThreshold = 50;
		const diff = touchStartX - touchEndX;

		if (Math.abs(diff) > swipeThreshold) {
			if (diff > 0) {
				// Swiped left, go to next photo
				nextPhoto();
			} else {
				// Swiped right, go to previous photo
				prevPhoto();
			}
		}
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

<svelte:window onkeydown={handleKeydown} />

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
				class="ml-4 rounded-lg bg-gray-100 px-3 py-1 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
				title="Carousel View"
			>
				🎠
			</button>
		{/if}
	</h1>
</div>

<main in:fly={{ y: 100, duration: 1000, delay: 100 }} class="main-content-area mt-10">
	{#if displayedPhotos && displayedPhotos.length > 0}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each displayedPhotos as photo, i (photo.src)}
				<div in:fade|global={{ duration: 300, delay: (i % 10) * 50 + 200 }}>
					<ResponsiveImage
						src={photo.src}
						alt={photo.alt}
						loading={i < 10 ? 'eager' : 'lazy'}
						onclick={() => openFullSizeImage(photo.src)}
					/>
				</div>
			{/each}
		</div>

		<!-- "Load More" Button -->
		{#if photos && displayedPhotos.length < photos.length && !isLoadingMore}
			<div class="mt-8 mb-8 text-center" in:fly|global={{ y: 100, duration: 1000, delay: 1500 }}>
				<button
					onclick={loadMorePhotos}
					class="relative cursor-pointer overflow-hidden rounded-lg px-6 py-3"
				>
					Load More Photos ({displayedPhotos.length} / {photos.length})
				</button>
			</div>
		{/if}
	{:else}
		<p class="text-gray-600">No photos to display yet. Upload some if you're on localhost!</p>
	{/if}
</main>

<!-- Full-size image modal -->
{#if showFullSizeImage}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-lg backdrop-filter"
		onclick={closeFullSizeImage}
		onkeydown={(e) => e.key === 'Escape' && closeFullSizeImage()}
		role="dialog"
		tabindex="0"
		in:fade={{ duration: 200 }}
	>
		<div class="max-h-full max-w-full overflow-auto">
			<img
				src={currentFullSizeImage}
				alt="Full size view"
				class="max-h-[90vh] max-w-full object-contain"
				loading="eager"
			/>
		</div>
	</div>
{/if}

<!-- Carousel view modal -->
{#if showCarouselView && photos && photos.length > 0}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg"
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
		in:fade={{ duration: 300 }}
	>
		<!-- Close button -->
		<button
			onclick={closeCarouselView}
			aria-label="Close carousel"
			class="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>

		<!-- Photo counter -->
		<div class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-white">
			{currentCarouselIndex + 1} / {photos.length}
		</div>

		<!-- Carousel container with limited width -->
		<div class="w-full max-w-4xl px-8">
			<!-- Navigation arrows outside the carousel -->
			<div class="relative">
				<button
					onclick={prevPhoto}
					class="absolute left-[-4rem] top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
					disabled={photos.length <= 1}
					aria-label="Previous photo"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15,18 9,12 15,6"></polyline>
					</svg>
				</button>
				
				<button
					onclick={nextPhoto}
					class="absolute right-[-4rem] top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
					disabled={photos.length <= 1}
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9,18 15,12 9,6"></polyline>
					</svg>
				</button>

				<!-- Carousel sliding container -->
				<div class="relative h-[60vh] overflow-hidden rounded-lg">
					<div class="flex h-full transition-transform duration-300 ease-out" style="transform: translateX(-{currentCarouselIndex * 100}%)">
						{#each photos as photo, index}
							<div class="relative flex-shrink-0 w-full h-full">
								<!-- Background photos (previous and next) with lower opacity and scale -->
								{#if Math.abs(index - currentCarouselIndex) === 1}
									<img
										src={photo.src}
										alt={photo.alt}
										class="absolute inset-0 w-full h-full object-cover opacity-30 scale-95 transition-all duration-300"
										loading="lazy"
									/>
								{/if}
								
								<!-- Current photo - fully visible and scaled normally -->
								{#if index === currentCarouselIndex}
									<img
										src={photo.src}
										alt={photo.alt}
										class="absolute inset-0 w-full h-full object-cover scale-100 transition-all duration-300 z-10"
										loading="eager"
									/>
								{/if}
								
								<!-- Photos further away are completely hidden -->
								{#if Math.abs(index - currentCarouselIndex) > 1}
									<img
										src={photo.src}
										alt={photo.alt}
										class="absolute inset-0 w-full h-full object-cover opacity-0 scale-90 transition-all duration-300"
										loading="lazy"
									/>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Thumbnail navigation -->
		<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pb-4 pt-8">
			<div class="flex justify-center">
				<div class="flex gap-2 overflow-x-auto px-4 pb-2" style="max-width: 90vw;">
					{#each photos as photo, index}
						<button
							onclick={() => goToPhoto(index)}
							class="flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all {currentCarouselIndex === index ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-80'}"
						>
							<img
								src={photo.src}
								alt={photo.alt}
								class="h-16 w-16 object-cover"
								loading="lazy"
							/>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Conditionally render the ImageUploadModal -->
{#if isDev}
	<ImageUploadModal
		bind:show={showImageUploadModal}
		onUploadSuccess={handleModalUploadSuccess}
		onCancel={handleModalCancel}
	/>
{/if}
