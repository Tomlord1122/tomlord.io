<script lang="ts">
	import { fade } from 'svelte/transition';

	// Props
	let { 
		photos = [], 
		show = false, 
		currentIndex = 0,
		onClose = () => {},
		onIndexChange = (index: number) => {}
	}: {
		photos: Array<{ src: string; alt: string; filename: string }>;
		show: boolean;
		currentIndex: number;
		onClose: () => void;
		onIndexChange: (index: number) => void;
	} = $props();

	// Optimization: Pre-compute commonly used values to avoid repeated calculations
	const TRANSLATE_DISTANCE = 200;
	const SCALE_FACTOR = 0.05;
	const ROTATION_FACTOR = 2;
	const Y_OFFSET_FACTOR = 8;

	// Optimization: Use Map to cache calculation results
	const transformCache = new Map<string, string>();
	
	// Optimization: Batch event handler to avoid creating separate handlers for each thumbnail
	function handleThumbnailClick(event: Event) {
		event.preventDefault();
		event.stopPropagation();
		
		const target = event.target as HTMLElement;
		const button = target.closest('button') as HTMLButtonElement;
		
		if (button && button.dataset.index) {
			const index = parseInt(button.dataset.index, 10);
			
			if (!isNaN(index) && index >= 0 && index < photos.length) {
				goToPhoto(index);
			}
		}
	}

	// Function to go to next photo in carousel
	function nextPhoto() {
		if (photos && photos.length > 0) {
			const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
			onIndexChange(nextIndex);
		}
	}

	// Function to go to previous photo in carousel
	function prevPhoto() {
		if (photos && photos.length > 0) {
			const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
			onIndexChange(prevIndex);
		}
	}

	// Function to go to specific photo
	function goToPhoto(index: number) {
		if (photos && photos.length > 0 && index >= 0 && index < photos.length) {
			onIndexChange(index);
		}
	}

	// Handle keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (!show || !photos || photos.length === 0) return;
		
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
				onClose();
				break;
		}
	}

	// Optimization: Simplified visibleCarouselPhotos calculation
	let visibleCarouselPhotos = $derived(() => {
		if (!photos || !show || photos.length === 0 || currentIndex < 0 || currentIndex >= photos.length) {
			return [];
		}
		
		// Optimization: Directly calculate three indices to avoid loops
		const prevIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
		const nextIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
		
		return [
			{ photo: photos[prevIndex], index: prevIndex, wrappedOffset: -1 },
			{ photo: photos[currentIndex], index: currentIndex, wrappedOffset: 0 },
			{ photo: photos[nextIndex], index: nextIndex, wrappedOffset: 1 }
		];
	});

	// Optimization: Pre-compute thumbnail range to avoid calculations in template
	let thumbnailRange = $derived(() => {
		if (!photos || photos.length === 0) return { start: 0, end: 0, showFirst: false, showLast: false };
		
		if (photos.length <= 10) {
			return { start: 0, end: photos.length, showFirst: false, showLast: false };
		}
		
		const maxThumbnails = 7;
		const start = Math.max(0, Math.min(currentIndex - Math.floor(maxThumbnails/2), photos.length - maxThumbnails));
		const end = Math.min(photos.length, start + maxThumbnails);
		
		return {
			start,
			end,
			showFirst: start > 0,
			showLast: end < photos.length
		};
	});

	// Optimization: Pre-compute style strings
	function getPhotoStyle(wrappedOffset: number): string {
		const cacheKey = `${wrappedOffset}`;
		
		if (transformCache.has(cacheKey)) {
			return transformCache.get(cacheKey)!;
		}
		
		const translateX = wrappedOffset * TRANSLATE_DISTANCE;
		const translateY = Math.abs(wrappedOffset) * Y_OFFSET_FACTOR;
		const rotate = wrappedOffset * ROTATION_FACTOR;
		const scale = 1 - Math.abs(wrappedOffset) * SCALE_FACTOR;
		const zIndex = 10 - Math.abs(wrappedOffset);
		const opacity = wrappedOffset === 0 ? 1 : 0.4 - Math.abs(wrappedOffset) * 0.15;
		
		const style = `
			transform: translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale});
			z-index: ${zIndex};
			opacity: ${opacity};
		`;
		
		transformCache.set(cacheKey, style);
		return style;
	}

	// Optimization: Clear cache to prevent memory leaks
	$effect(() => {
		return () => {
			transformCache.clear();
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Carousel view modal with Fujifilm layered photo effect -->
{#if show && photos && photos.length > 0}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg"
		in:fade={{ duration: 200 }}
	>
		<!-- Close button -->
		<button
			onclick={onClose}
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
			{currentIndex + 1} / {photos.length}
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

		<!-- Optimization: Use pre-computed styles -->
		<div class="relative w-full h-full flex items-center justify-center px-8 py-16 overflow-hidden">
			<div class="relative max-w-full max-h-full flex items-center justify-center">
				{#each visibleCarouselPhotos() as { photo, index, wrappedOffset } (photo.src)}
					<div 
						class="absolute transition-all duration-300 ease-out"
						style={getPhotoStyle(wrappedOffset)}
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

		<!-- Optimization: Use batch event handling and pre-computed range -->
		<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pb-4 pt-8">
			<div class="flex justify-center">
				<div 
					class="flex mt-2 gap-2 overflow-x-auto px-4 pb-2 scroll-smooth"
					style="max-width: 95vw;"
					onclick={handleThumbnailClick}
					onkeydown={handleThumbnailClick}
					role="listbox"
					tabindex="0"
				>
					{#if photos.length > 10}
						{@const range = thumbnailRange()}
						{#if range.showFirst}
							<button
								data-index="0"
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-400 opacity-50 hover:opacity-70 transition-all duration-200 flex items-center justify-center bg-gray-800 text-white text-xs font-bold"
								style="width: 64px; height: 64px;"
							>
								1
							</button>
							{#if range.start > 1}
								<div class="flex items-center justify-center text-white opacity-50 px-1">...</div>
							{/if}
						{/if}
						
						{#each photos.slice(range.start, range.end) as photo, localIndex}
							{@const index = range.start + localIndex}
							<button
								data-index={index}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 {currentIndex === index ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-80'}"
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
						
						{#if range.showLast}
							{#if range.end < photos.length - 1}
								<div class="flex items-center justify-center text-white opacity-50 px-1">...</div>
							{/if}
							<button
								data-index={photos.length - 1}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-400 opacity-50 hover:opacity-70 transition-all duration-200 flex items-center justify-center bg-gray-800 text-white text-xs font-bold"
								style="width: 64px; height: 64px;"
							>
								{photos.length}
							</button>
						{/if}
					{:else}
						{#each photos as photo, index}
							<button
								data-index={index}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 {currentIndex === index ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-80'}"
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