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

	// Touch/swipe handling with improved performance
	let touchStartX = 0;
	let touchEndX = 0;
	let isSwiping = false;

	function handleTouchStart(e: TouchEvent) {
		if (!showCarouselView) return;
		// Only handle single-finger touch
		if (e.touches && e.touches.length === 1) {
			touchStartX = e.touches[0].screenX;
			isSwiping = false;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!showCarouselView) return;
		// Only handle single-finger touch
		if (e.touches && e.touches.length === 1) {
			// Prevent default scrolling behavior during swipe
			e.preventDefault();
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!showCarouselView) return;
		// Only handle single-finger touch
		if (e.changedTouches && e.changedTouches.length === 1) {
			touchEndX = e.changedTouches[0].screenX;
			if (!isSwiping) {
				handleSwipe();
			}
		}
	}

	function handleSwipe() {
		const swipeThreshold = 50;
		const diff = touchStartX - touchEndX;

		if (Math.abs(diff) > swipeThreshold) {
			isSwiping = true;
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

	// Performance optimizations: Memoize visible carousel photos to avoid unnecessary calculations
	let visibleCarouselPhotos = $derived(() => {
		if (!photos || !showCarouselView) return [];
		
		const result = [];
		for (let i = 0; i < photos.length; i++) {
			const offset = i - currentCarouselIndex;
			const wrappedOffset = offset > photos.length / 2 ? offset - photos.length : offset < -photos.length / 2 ? offset + photos.length : offset;
			if (Math.abs(wrappedOffset) <= 1) {
				result.push({ photo: photos[i], index: i, wrappedOffset });
			}
		}
		return result;
	});
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
				class="ml-4 rounded-lg bg-gray-100 px-3 py-1 text-xs transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
				title="Carousel View"
			>
				Carousel View
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-lg backdrop-filter"
		onclick={closeFullSizeImage}
		onkeydown={(e) => e.key === 'Escape' && closeFullSizeImage()}
		role="dialog"
		tabindex="0"
		in:fade={{ duration: 150 }}
	>
		<div class="relative max-h-full max-w-full flex items-center justify-center">
			<!-- Fujifilm-style border container for full-size image -->
			<div class="relative p-2 bg-white rounded-sm shadow-2xl max-w-[90vw] max-h-[90vh] flex items-center justify-center" 
				style="
					background: #f8f8f8;
					border: 1px solid #2d5016;
					box-shadow: 
						inset 0 0 0 1px #ffffff,
						0 10px 30px rgba(0,0,0,0.4);
				"
			>
				<!-- Fujifilm brand label -->
				<div class="absolute -top-6 right-2 text-xs font-bold text-white bg-green-800 px-2 py-1 tracking-wider rounded-sm">
					tom.photography
				</div>
				
				<!-- Photo container -->
				<div class="relative bg-white flex items-center justify-center">
					<img
						src={currentFullSizeImage}
						alt="Full size view"
						class="max-h-[80vh] max-w-[85vw] object-contain"
						loading="eager"
					/>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Carousel view modal with Fujifilm layered photo effect -->
{#if showCarouselView && photos && photos.length > 0}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		in:fade={{ duration: 200 }}
		style="touch-action: pan-y;" 
	>
		<!-- Close button -->
		<button
			onclick={closeCarouselView}
			aria-label="Close carousel"
			class="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>

		<!-- Photo counter -->
		<div class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-white font-mono text-sm">
			{currentCarouselIndex + 1} / {photos.length}
		</div>

		<!-- Navigation arrows -->
		<button
			onclick={prevPhoto}
			class="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
			disabled={photos.length <= 1}
			aria-label="Previous photo"
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="15,18 9,12 15,6"></polyline>
			</svg>
		</button>
		
		<button
			onclick={nextPhoto}
			class="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
			disabled={photos.length <= 1}
			aria-label="Next photo"
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9,18 15,12 9,6"></polyline>
			</svg>
		</button>

		<!-- Layered photo display container -->
		<div class="relative w-full h-full flex items-center justify-center px-8 py-16 overflow-hidden">
			<div class="relative max-w-full max-h-full flex items-center justify-center">
				{#each visibleCarouselPhotos() as { photo, index, wrappedOffset } (photo.src)}
					<div 
						class="absolute transition-all duration-300 ease-out"
						style="
							transform: 
								translateX({wrappedOffset * 200}px) 
								translateY({Math.abs(wrappedOffset) * 8}px) 
								rotate({wrappedOffset * 2}deg) 
								scale({1 - Math.abs(wrappedOffset) * 0.05});
							z-index: {10 - Math.abs(wrappedOffset)};
							opacity: {wrappedOffset === 0 ? 1 : 0.4 - Math.abs(wrappedOffset) * 0.15};
						"
					>
						<!-- Fujifilm-style border container -->
						<div class="relative p-2 bg-white rounded-sm shadow-2xl max-w-[80vw] max-h-[60vh] flex items-center justify-center" 
							style="
								background: #f8f8f8;
								border: 1px solid #2d5016;
								box-shadow: 
									inset 0 0 0 1px #ffffff,
									0 8px 25px rgba(0,0,0,0.3);
							"
						>
							{#if wrappedOffset === 0}
								<!-- Fujifilm brand label -->
								<div class="absolute -top-5 right-1 text-xs font-bold text-white bg-green-800 px-2 py-1 tracking-wider rounded-sm">
									tom.photography-{String(index + 1).padStart(2, '0')}
								</div>
								
							{/if}
							
							<!-- Photo container -->
							<div class="relative bg-white flex items-center justify-center">
								<img
									src={photo.src}
									alt={photo.alt}
									class="max-h-[55vh] max-w-[75vw] object-contain transition-all duration-300"
									loading={wrappedOffset === 0 ? 'eager' : 'lazy'}
									decoding="async"
								/>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Virtualized thumbnail navigation -->
		<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pb-4 pt-8">
			<div class="flex justify-center">
				<div 
					class="flex mt-2 gap-2 overflow-x-auto px-4 pb-2 scroll-smooth"
					style="max-width: 90vw;"
				>
					{#if photos.length > 10}
						<!-- For large collections, show only a subset of thumbnails around current photo for performance -->
						{@const startIndex = Math.max(0, Math.min(currentCarouselIndex - 3, photos.length - 7))}
						{@const endIndex = Math.min(photos.length, startIndex + 7)}
						
						{#if startIndex > 0}
							<button
								onclick={() => goToPhoto(0)}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-400 opacity-50 hover:opacity-70 transition-all duration-200 flex items-center justify-center bg-gray-800 text-white text-xs font-bold"
								style="width: 64px; height: 64px;"
							>
								1
							</button>
							{#if startIndex > 1}
								<div class="flex items-center justify-center text-white opacity-50 px-2">...</div>
							{/if}
						{/if}
						
						{#each photos.slice(startIndex, endIndex) as photo, localIndex}
							{@const index = startIndex + localIndex}
							<button
								onclick={() => goToPhoto(index)}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 {currentCarouselIndex === index ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-80'}"
							>
								<img
									src={photo.src}
									alt={photo.alt}
									class="h-16 w-16 object-cover"
									loading="lazy"
									decoding="async"
								/>
							</button>
						{/each}
						
						{#if endIndex < photos.length}
							{#if endIndex < photos.length - 1}
								<div class="flex items-center justify-center text-white opacity-50 px-2">...</div>
							{/if}
							<button
								onclick={() => goToPhoto(photos.length - 1)}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-400 opacity-50 hover:opacity-70 transition-all duration-200 flex items-center justify-center bg-gray-800 text-white text-xs font-bold"
								style="width: 64px; height: 64px;"
							>
								{photos.length}
							</button>
						{/if}
					{:else}
						<!-- For smaller collections (≤10), show all thumbnails -->
						{#each photos as photo, index}
							<button
								onclick={() => goToPhoto(index)}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 {currentCarouselIndex === index ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-80'}"
							>
								<img
									src={photo.src}
									alt={photo.alt}
									class="h-16 w-16 object-cover"
									loading="lazy"
									decoding="async"
								/>
							</button>
						{/each}
					{/if}
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