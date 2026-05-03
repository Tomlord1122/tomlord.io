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
		data?.availablePhotos && Array.isArray(data.availablePhotos)
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

	// Edit order mode state
	let isEditOrderMode = $state(false);
	let reorderedPhotos = $state<
		Array<{ id: string; src: string; alt: string; filename: string; index: number }>
	>([]);
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let isSavingOrder = $state(false);

	// Virtual scrolling and pagination optimization
	const PHOTOS_TO_LOAD_AT_ONCE = 10; // Optimized batch size
	const PRELOAD_THRESHOLD = 3; // Preload when 3 items before the end
	let visiblePhotosCount = $state(PHOTOS_TO_LOAD_AT_ONCE);
	let isLoadingMore = $state(false);
	let loadMoreRequestPending = $state(false);

	// Derived state for displayed photos with virtual scrolling optimization
	let displayedPhotos = $derived(
		photos && photos.length > 0 ? photos.slice(0, visiblePhotosCount) : []
	);

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
					await new Promise((resolve) => setTimeout(resolve, 300));
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
		].filter((index) => index >= 0 && index < photos.length);

		// Use requestIdleCallback for non-blocking preloading
		if ('requestIdleCallback' in window) {
			requestIdleCallback(() => {
				preloadIndices.forEach((index) => {
					const img = new Image();
					img.src = photos[index].src;
				});
			});
		} else {
			// Fallback for browsers without requestIdleCallback
			setTimeout(() => {
				preloadIndices.forEach((index) => {
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

	// Browser-specific initialization with memory management using $effect
	$effect(() => {
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
	});

	// Memory management: Cleanup all timers and listeners on component destroy
	$effect(() => {
		return () => {
			cleanupFunctions.forEach((cleanup) => cleanup());
			cleanupFunctions = [];
		};
	});

	// Performance optimization: Auto-preload when approaching end
	$effect(() => {
		if (photos && photos.length > 0 && displayedPhotos.length > 0) {
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
		const currentIndex = photos.findIndex((photo) => photo.src === imageSrc);
		if (currentIndex !== -1) {
			preloadAdjacentImages(currentIndex);
		}
	}

	function closeFullSizeImage() {
		showFullSizeImage = false;
	}

	// Enhanced carousel functions with preloading
	function openCarouselView(index = 0) {
		console.log('openCarouselView', index);
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

	// Edit order mode functions
	function enterEditMode() {
		reorderedPhotos = [...photos];
		isEditOrderMode = true;
	}

	function exitEditMode() {
		isEditOrderMode = false;
		reorderedPhotos = [];
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragStart(index: number) {
		return (event: DragEvent) => {
			draggedIndex = index;
			event.dataTransfer!.effectAllowed = 'move';
		};
	}

	function handleDragOver(index: number) {
		return (event: DragEvent) => {
			event.preventDefault();
			event.dataTransfer!.dropEffect = 'move';
			if (draggedIndex !== null && draggedIndex !== index) {
				dragOverIndex = index;
			}
		};
	}

	function handleDrop(targetIndex: number) {
		return (event: DragEvent) => {
			event.preventDefault();
			if (draggedIndex === null || draggedIndex === targetIndex) {
				draggedIndex = null;
				dragOverIndex = null;
				return;
			}

			// Swap two photos
			const newPhotos = [...reorderedPhotos];
			const temp = newPhotos[draggedIndex];
			newPhotos[draggedIndex] = newPhotos[targetIndex];
			newPhotos[targetIndex] = temp;

			reorderedPhotos = newPhotos;
			draggedIndex = null;
			dragOverIndex = null;
		};
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	async function saveOrder() {
		if (reorderedPhotos.length === 0) return;

		isSavingOrder = true;
		try {
			const order = reorderedPhotos.map((p) => p.filename);
			const response = await fetch('/api/reorder-photos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ order })
			});
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.message || 'Failed to save order');
			}
			// Full page reload to ensure fresh data and bust image cache
			window.location.reload();
		} catch (err) {
			console.error('Failed to save order:', err);
			alert(err instanceof Error ? err.message : 'Failed to save order');
		} finally {
			isSavingOrder = false;
		}
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
	<meta property="og:title" content="Photography | Tomlord's Blog" />
	<meta
		property="og:description"
		content="Explore my photography collection - capturing moments through the lens"
	/>
	<meta property="og:image" content="https://tomlord.fyi/app_icon.png" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tomlord.fyi/photography" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<!-- Main container -->
<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-3xl">
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

		<div class="flex items-center gap-2">
			<!-- Edit Order button - dev only -->
			{#if isDev && photos && photos.length > 0 && !isEditOrderMode}
				<button
					onclick={() => enterEditMode()}
					class="rounded-lg bg-gray-100 px-2 py-1 text-xs transition-colors hover:bg-gray-200 sm:px-3 dark:bg-gray-800 dark:hover:bg-gray-700"
					title="Edit Photo Order"
				>
					<span class="sm:hidden">Order</span>
					<span class="hidden sm:inline">Edit Order</span>
				</button>
			{/if}

			<!-- Save / Cancel buttons in edit mode -->
			{#if isDev && isEditOrderMode}
				<button
					onclick={saveOrder}
					disabled={isSavingOrder}
					class="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
				>
					{#if isSavingOrder}
						<div class="flex items-center gap-1">
							<div
								class="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
							></div>
							<span class="sm:hidden">Save</span>
							<span class="hidden sm:inline">Saving...</span>
						</div>
					{:else}
						<span class="sm:hidden">Save</span>
						<span class="hidden sm:inline">Save Order</span>
					{/if}
				</button>
				<button
					onclick={exitEditMode}
					disabled={isSavingOrder}
					class="rounded-lg bg-gray-200 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
				>
					<span class="sm:hidden">Cancel</span>
					<span class="hidden sm:inline">Cancel</span>
				</button>
			{/if}

			<!-- Carousel view toggle button - hidden on mobile -->
			{#if photos && photos.length > 0 && !isMobile && !isEditOrderMode}
				<button
					onclick={() => openCarouselView()}
					class="ml-2 rounded-lg bg-gray-100 px-2 py-1 text-xs transition-colors hover:bg-gray-200 sm:ml-4 sm:px-3 dark:bg-gray-800 dark:hover:bg-gray-700"
					title="Carousel View"
				>
					<span class="sm:hidden">Carousel</span>
					<span class="hidden sm:inline">Carousel View</span>
				</button>
			{/if}
		</div>
	</h1>
</div>

<main in:fly={{ y: 100, duration: 800, delay: 100 }} class="main-content-area mt-10">
	{#if isEditOrderMode && reorderedPhotos.length > 0}
		<!-- Edit mode: show all photos with drag-and-drop -->
		<div class="relative">
			<div
				class="grid grid-cols-2 gap-2 transition-opacity md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 {isSavingOrder
					? 'pointer-events-none opacity-50'
					: ''}"
			>
				{#each reorderedPhotos as photo, i (photo.id)}
					<div
						draggable={!isSavingOrder}
						ondragstart={handleDragStart(i)}
						ondragover={handleDragOver(i)}
						ondrop={handleDrop(i)}
						ondragend={handleDragEnd}
						class="cursor-grab transition-all {draggedIndex === i
							? 'opacity-50'
							: ''} {dragOverIndex === i && draggedIndex !== i
							? 'scale-105 ring-2 ring-blue-400'
							: ''}"
						role="button"
						aria-label="Drag to reorder photo {i + 1}"
						tabindex="0"
					>
						<div class="pointer-events-none">
							<ResponsiveImage
								src={photo.src}
								alt={photo.alt}
								loading="eager"
								onclick={() => {}}
							/>
						</div>
						<div class="mt-1 text-center text-xs text-gray-500">{i + 1}</div>
					</div>
				{/each}
			</div>

			{#if isSavingOrder}
				<!-- Saving overlay -->
				<div
					class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-black/60"
					in:fade={{ duration: 150 }}
				>
					<div class="flex flex-col items-center gap-3">
						<div
							class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"
						></div>
						<span class="text-sm font-medium text-gray-700 dark:text-gray-200"
							>Saving order...</span
						>
					</div>
				</div>
			{/if}
		</div>
	{:else if displayedPhotos && displayedPhotos.length > 0}
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
		{#if photos && photos.length > 0 && displayedPhotos.length < photos.length}
			<div class="mt-8 mb-8 text-center" in:fly|global={{ y: 50, duration: 600, delay: 800 }}>
				{#if isLoadingMore}
					<div class="flex items-center justify-center gap-2 px-6 py-3">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
						></div>
						<span>Loading...</span>
					</div>
				{:else}
					<button
						onclick={throttledLoadMore}
						disabled={loadMoreRequestPending}
						class="relative cursor-pointer overflow-hidden rounded-lg px-6 py-3 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-lg backdrop-filter sm:p-4"
		onclick={closeFullSizeImage}
		onkeydown={(e) => e.key === 'Escape' && closeFullSizeImage()}
		role="dialog"
		tabindex="0"
		in:fade={{ duration: 150 }}
	>
		<div class="relative flex max-h-full max-w-full items-center justify-center">
			<!-- Fujifilm-style border container for full-size image -->
			<div
				class="relative flex max-h-[90vh] max-w-[95vw] items-center justify-center rounded-sm bg-white p-1 shadow-2xl sm:max-w-[90vw] sm:p-2"
				style="
					background: #f8f8f8;
					border: 1px solid #2d5016;
					box-shadow: 
						inset 0 0 0 1px #ffffff,
						0 10px 30px rgba(0,0,0,0.4);
				"
			>
				<!-- Fujifilm brand label -->
				<div
					class="absolute -top-4 right-1 rounded-sm bg-green-800 px-1 py-1 text-xs font-bold tracking-wider text-white sm:-top-6 sm:right-2 sm:px-2"
				>
					tom.photography
				</div>

				<!-- Photo container -->
				<div class="relative flex items-center justify-center bg-white">
					<img
						src={currentFullSizeImage}
						alt="Full size view"
						class="max-h-[75vh] max-w-[90vw] object-contain sm:max-h-[80vh] sm:max-w-[85vw]"
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
