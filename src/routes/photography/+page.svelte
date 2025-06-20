<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import ImageUploadModal from '$lib/components/ImageUploadModal.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import { invalidateAll } from '$app/navigation';

	// Get data from both page and layout
	let { data } = $props();

	// Performance optimization: Add stable photo IDs and enhanced photo objects
	let photos = $derived(
		data.availablePhotos
			? data.availablePhotos.map((photoUrl: string, index: number) => {
					const filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
					// Create stable ID based on filename and index for better key performance
					const stableId = `${filename.replace(/\.[^/.]+$/, '')}_${index}`;
					return {
						id: stableId,
						src: photoUrl,
						alt: `Photo ${filename}`,
						filename,
						index
					};
				})
			: []
	);

	// State management
	let isDev = $state(false);
	let isMobile = $state(false);
	let showImageUploadModal = $state(false);
	let showFullSizeImage = $state(false);
	let currentFullSizeImage = $state('');

	// Virtual scrolling and pagination optimization
	const PHOTOS_TO_LOAD_AT_ONCE = 10; // Optimized batch size
	const PRELOAD_THRESHOLD = 3; // Preload when 3 items before the end
	let visiblePhotosCount = $state(PHOTOS_TO_LOAD_AT_ONCE);
	let isLoadingMore = $state(false);
	let loadMoreRequestPending = $state(false);

	// Derived state for displayed photos with virtual scrolling optimization
	let displayedPhotos = $derived(photos ? photos.slice(0, visiblePhotosCount) : []);

	// Carousel view state
	let showCarouselView = $state(false);
	let currentCarouselIndex = $state(0);

	// Memory management: Store cleanup functions
	let cleanupFunctions: (() => void)[] = [];

	// Performance optimization: Debounced resize handler
	function createDebouncedResize() {
		let timeoutId: ReturnType<typeof setTimeout>;
		
		const debouncedHandler = () => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				isMobile = window.innerWidth < 768;
			}, 250); // 250ms debounce
		};

		const cleanup = () => {
			clearTimeout(timeoutId);
			window.removeEventListener('resize', debouncedHandler);
		};

		window.addEventListener('resize', debouncedHandler);
		return cleanup;
	}

	// Performance optimization: Throttled load more function
	function createThrottledLoadMore() {
		let lastCallTime = 0;
		const throttleDelay = 500; // 500ms throttle

		return async function loadMorePhotos() {
			const now = Date.now();
			
			// Throttle rapid calls
			if (now - lastCallTime < throttleDelay) return;
			lastCallTime = now;

			// Prevent concurrent requests
			if (isLoadingMore || loadMoreRequestPending) return;
			
			isLoadingMore = true;
			loadMoreRequestPending = true;

			try {
				// Simulate loading delay only in dev mode for better UX testing
				if (isDev) {
					await new Promise(resolve => setTimeout(resolve, 300));
				}

				visiblePhotosCount += PHOTOS_TO_LOAD_AT_ONCE;
				
				// Ensure we don't exceed available photos
				if (photos && visiblePhotosCount > photos.length) {
					visiblePhotosCount = photos.length;
				}
			} finally {
				isLoadingMore = false;
				loadMoreRequestPending = false;
			}
		};
	}

	// Initialize throttled load more function
	const throttledLoadMore = createThrottledLoadMore();

	// Performance optimization: Preloading strategy for better UX
	function preloadAdjacentImages(currentIndex: number) {
		if (!photos || photos.length === 0) return;

		const preloadIndices = [
			currentIndex - 1,
			currentIndex + 1,
			currentIndex - 2,
			currentIndex + 2
		].filter(index => index >= 0 && index < photos.length);

		// Use requestIdleCallback for non-blocking preloading
		if ('requestIdleCallback' in window) {
			requestIdleCallback(() => {
				preloadIndices.forEach(index => {
					const img = new Image();
					img.src = photos[index].src;
				});
			});
		} else {
			// Fallback for browsers without requestIdleCallback
			setTimeout(() => {
				preloadIndices.forEach(index => {
					const img = new Image();
					img.src = photos[index].src;
				});
			}, 100);
		}
	}

	// Performance optimization: Batch invalidation with debouncing
	let invalidationPending = $state(false);
	let invalidationTimeout: ReturnType<typeof setTimeout>;

	function batchedInvalidateAll() {
		if (invalidationPending) return;
		
		invalidationPending = true;
		clearTimeout(invalidationTimeout);
		
		invalidationTimeout = setTimeout(async () => {
			try {
				await invalidateAll();
			} finally {
				invalidationPending = false;
			}
		}, 1000); // Batch invalidations within 1 second
	}

	// Browser-specific initialization with memory management
	if (browser) {
		// Development mode detection
		isDev = window.location.hostname === 'localhost';
		
		// Initial mobile detection
		isMobile = window.innerWidth < 768;
		
		// Setup debounced resize handler
		const resizeCleanup = createDebouncedResize();
		cleanupFunctions.push(resizeCleanup);

		// Cleanup invalidation timeout
		cleanupFunctions.push(() => {
			clearTimeout(invalidationTimeout);
		});
	}

	// Memory management: Cleanup all timers and listeners on component destroy
	$effect(() => {
		return () => {
			cleanupFunctions.forEach(cleanup => cleanup());
			cleanupFunctions = [];
		};
	});

	// Performance optimization: Auto-preload when approaching end
	$effect(() => {
		if (photos && displayedPhotos.length > 0) {
			const remainingPhotos = photos.length - displayedPhotos.length;
			
			// Auto-load more when approaching the end
			if (remainingPhotos > 0 && remainingPhotos <= PRELOAD_THRESHOLD && !isLoadingMore) {
				throttledLoadMore();
			}
		}
	});

	// Enhanced image modal functions with preloading
	function openFullSizeImage(imageSrc: string) {
		currentFullSizeImage = imageSrc;
		showFullSizeImage = true;
		
		// Find current image index and preload adjacent images
		const currentIndex = photos.findIndex(photo => photo.src === imageSrc);
		if (currentIndex !== -1) {
			preloadAdjacentImages(currentIndex);
		}
	}

	function closeFullSizeImage() {
		showFullSizeImage = false;
	}

	// Enhanced carousel functions with preloading
	function openCarouselView(index = 0) {
		if (isMobile) return; // Prevent carousel on mobile
		currentCarouselIndex = index;
		showCarouselView = true;
		preloadAdjacentImages(index);
	}

	function closeCarouselView() {
		showCarouselView = false;
	}

	function handleCarouselIndexChange(index: number) {
		currentCarouselIndex = index;
		preloadAdjacentImages(index);
	}

	// Optimized upload success handler with batched invalidation
	function handleModalUploadSuccess(newImagePaths: string[]) {
		console.log(`${newImagePaths.length} new image(s) uploaded`);
		if (newImagePaths.length > 0) {
			batchedInvalidateAll(); // Use batched invalidation
		}
	}

	function handleModalCancel() {
		console.log('Image upload modal cancelled.');
	}

	// Performance optimization: Keyboard navigation enhancement
	function handleKeydown(event: KeyboardEvent) {
		if (showFullSizeImage && event.key === 'Escape') {
			event.preventDefault();
			closeFullSizeImage();
		}
	}
</script>

<svelte:head>
	<meta name="twitter:title" content="Photography | Tomlord's Blog" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<!-- Main container -->
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
		
		<!-- Carousel view toggle button - hidden on mobile -->
		{#if photos && photos.length > 0 && !isMobile}
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
		<!-- Optimized grid with stable keys and virtual scrolling -->
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each displayedPhotos as photo, i (photo.id)}
				<div 
					in:fade|global={{ 
						duration: 250, 
						delay: Math.min((i % PHOTOS_TO_LOAD_AT_ONCE) * 30, 400) + 150 
					}}
				>
					<ResponsiveImage
						src={photo.src}
						alt={photo.alt}
						loading={i < 20 ? 'eager' : 'lazy'}
						onclick={() => openFullSizeImage(photo.src)}
					/>
				</div>
			{/each}
		</div>

		<!-- Optimized "Load More" Button with throttling -->
		{#if photos && displayedPhotos.length < photos.length}
			<div class="mt-8 mb-8 text-center" in:fly|global={{ y: 50, duration: 600, delay: 800 }}>
				{#if isLoadingMore}
					<div class="flex items-center justify-center gap-2 px-6 py-3">
						<div class="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
						<span>Loading...</span>
					</div>
				{:else}
					<button
						onclick={throttledLoadMore}
						disabled={loadMoreRequestPending}
						class="relative cursor-pointer overflow-hidden rounded-lg px-6 py-3 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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

<!-- Enhanced full-size image modal with keyboard navigation -->
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
			<div 
				class="relative p-1 sm:p-2 bg-white rounded-sm shadow-2xl max-w-[95vw] max-h-[90vh] sm:max-w-[90vw] flex items-center justify-center" 
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
						decoding="async"
					/>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Enhanced Photo Carousel Component with preloading -->
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