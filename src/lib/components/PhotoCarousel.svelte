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
		if (
			!photos ||
			!show ||
			photos.length === 0 ||
			currentIndex < 0 ||
			currentIndex >= photos.length
		) {
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
		if (!photos || photos.length === 0)
			return { start: 0, end: 0, showFirst: false, showLast: false };

		if (photos.length <= 10) {
			return { start: 0, end: photos.length, showFirst: false, showLast: false };
		}

		const maxThumbnails = 7;
		const start = Math.max(
			0,
			Math.min(currentIndex - Math.floor(maxThumbnails / 2), photos.length - maxThumbnails)
		);
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
			class="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>

		<!-- Photo counter -->
		<div
			class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 font-mono text-sm text-white"
		>
			{currentIndex + 1} / {photos.length}
		</div>

		<!-- Navigation arrows -->
		<button
			onclick={prevPhoto}
			class="absolute top-1/2 left-4 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70"
			disabled={photos.length <= 1}
			aria-label="Previous photo"
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<polyline points="15,18 9,12 15,6"></polyline>
			</svg>
		</button>

		<button
			onclick={nextPhoto}
			class="absolute top-1/2 right-4 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70"
			disabled={photos.length <= 1}
			aria-label="Next photo"
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<polyline points="9,18 15,12 9,6"></polyline>
			</svg>
		</button>

		<!-- Optimization: Use pre-computed styles -->
		<div class="relative flex h-full w-full items-center justify-center overflow-hidden px-8 py-16">
			<div class="relative flex max-h-full max-w-full items-center justify-center">
				{#each visibleCarouselPhotos() as { photo, index, wrappedOffset } (photo.src)}
					<div
						class="absolute transition-all duration-300 ease-out"
						style={getPhotoStyle(wrappedOffset)}
					>
						<!-- Fujifilm-style border container -->
						<div
							class="relative flex max-h-[60vh] max-w-[80vw] items-center justify-center rounded-sm bg-white p-2 shadow-2xl"
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
								<div
									class="absolute -top-5 right-1 rounded-sm bg-green-800 px-2 py-1 text-xs font-bold tracking-wider text-white"
								>
									tom.photography-{String(index + 1).padStart(2, '0')}
								</div>
							{/if}

							<!-- Photo container -->
							<div class="relative flex items-center justify-center bg-white">
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
		<div
			class="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4"
		>
			<div class="flex justify-center">
				<div
					class="mt-2 flex gap-2 overflow-x-auto scroll-smooth px-4 pb-2"
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
								class="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-gray-400 bg-gray-800 text-xs font-bold text-white opacity-50 transition-all duration-200 hover:opacity-70"
								style="width: 64px; height: 64px;"
							>
								1
							</button>
							{#if range.start > 1}
								<div class="flex items-center justify-center px-1 text-white opacity-50">...</div>
							{/if}
						{/if}

						{#each photos.slice(range.start, range.end) as photo, localIndex}
							{@const index = range.start + localIndex}
							<button
								data-index={index}
								class="flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 {currentIndex ===
								index
									? 'scale-110 border-white shadow-lg'
									: 'border-transparent opacity-60 hover:opacity-80'}"
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
								<div class="flex items-center justify-center px-1 text-white opacity-50">...</div>
							{/if}
							<button
								data-index={photos.length - 1}
								class="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-gray-400 bg-gray-800 text-xs font-bold text-white opacity-50 transition-all duration-200 hover:opacity-70"
								style="width: 64px; height: 64px;"
							>
								{photos.length}
							</button>
						{/if}
					{:else}
						{#each photos as photo, index}
							<button
								data-index={index}
								class="flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 {currentIndex ===
								index
									? 'scale-110 border-white shadow-lg'
									: 'border-transparent opacity-60 hover:opacity-80'}"
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
