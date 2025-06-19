<script lang="ts">
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

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

	// ---- Mobile detection ----
	let isMobile = $state(false);
	let resizeHandler: (() => void) | null = null;
	
	// Initialize mobile detection safely
	$effect(() => {
		if (!browser) return;
		
		// Initial check
		isMobile = window.innerWidth < 768;
		
		// Create handler
		resizeHandler = () => {
			isMobile = window.innerWidth < 768;
		};
		
		// Add listener
		window.addEventListener('resize', resizeHandler, { passive: true });
		
		// Cleanup
		return () => {
			if (resizeHandler) {
				window.removeEventListener('resize', resizeHandler);
				resizeHandler = null;
			}
		};
	});

	// Function to go to next photo in carousel
	function nextPhoto() {
		if (isProcessingTouch) return; // Prevent rapid fire
		
		if (photos && photos.length > 0) {
			if (currentIndex < photos.length - 1) {
				onIndexChange(currentIndex + 1);
			} else {
				onIndexChange(0); // Loop back to first
			}
		}
	}

	// Function to go to previous photo in carousel
	function prevPhoto() {
		if (isProcessingTouch) return; // Prevent rapid fire
		
		if (photos && photos.length > 0) {
			if (currentIndex > 0) {
				onIndexChange(currentIndex - 1);
			} else {
				onIndexChange(photos.length - 1); // Loop to last
			}
		}
	}

	// Function to go to specific photo
	function goToPhoto(index: number) {
		if (isProcessingTouch) return; // Prevent rapid fire
		
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

	// 手機端觸控事件處理
	let touchStartX = 0;
	let touchStartY = 0;
	let isProcessingTouch = false;
	
	function handleTouchStart(e: TouchEvent) {
		if (!show || !isMobile || isProcessingTouch) return;
		
		e.preventDefault();
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}
	
	function handleTouchEnd(e: TouchEvent) {
		if (!show || !isMobile || isProcessingTouch) return;
		
		e.preventDefault();
		isProcessingTouch = true;
		
		const touchEndX = e.changedTouches[0].clientX;
		const touchEndY = e.changedTouches[0].clientY;
		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;
		
		// 確保是水平滑動而非垂直滑動，並且有足夠的滑動距離
		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 80) {
			if (deltaX > 0) {
				prevPhoto(); // 向右滑動，顯示上一張
			} else {
				nextPhoto(); // 向左滑動，顯示下一張
			}
		}
		
		// 防止連續觸發
		setTimeout(() => {
			isProcessingTouch = false;
		}, 300);
	}

	// 優化版本的 visibleCarouselPhotos - 減少重複計算
	let visibleCarouselPhotos = $derived(() => {
		// 早期返回避免不必要的計算
		if (!photos || !show || photos.length === 0 || currentIndex < 0 || currentIndex >= photos.length) {
			return [];
		}
		
		// 手機端只顯示當前圖片，桌面端顯示前後各一張
		const range = isMobile ? 0 : 1;
		const result = [];
		
		const startIdx = Math.max(0, currentIndex - range);
		const endIdx = Math.min(photos.length - 1, currentIndex + range);
		
		for (let i = startIdx; i <= endIdx; i++) {
			const offset = i - currentIndex;
			result.push({ 
				photo: photos[i], 
				index: i, 
				wrappedOffset: offset 
			});
		}
		
		return result;
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
			class="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
		>
			<svg width="20" height="20" class="sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>

		<!-- Photo counter -->
		<div class="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 sm:px-4 py-1 sm:py-2 text-white font-mono text-xs sm:text-sm">
			{currentIndex + 1} / {photos.length}
		</div>

		<!-- Navigation arrows - 手機端隱藏，使用觸控滑動 -->
		{#if !isMobile}
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
		{/if}

		<!-- Layered photo display container -->
		<div 
			class="relative w-full h-full flex items-center justify-center px-2 sm:px-8 py-8 sm:py-16 overflow-hidden"
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
		>
			<div class="relative max-w-full max-h-full flex items-center justify-center">
				{#each visibleCarouselPhotos() as { photo, index, wrappedOffset } (photo.src)}
					{@const translateX = isMobile ? wrappedOffset * 100 : wrappedOffset * 200}
					{@const scale = isMobile ? (1 - Math.abs(wrappedOffset) * 0.1) : (1 - Math.abs(wrappedOffset) * 0.05)}
					<div 
						class="absolute transition-all duration-300 ease-out"
						style="
							transform: 
								translateX({translateX}px) 
								translateY({Math.abs(wrappedOffset) * (isMobile ? 4 : 8)}px) 
								rotate({wrappedOffset * (isMobile ? 1 : 2)}deg) 
								scale({scale});
							z-index: {10 - Math.abs(wrappedOffset)};
							opacity: {wrappedOffset === 0 ? 1 : (isMobile ? 0.2 : 0.4 - Math.abs(wrappedOffset) * 0.15)};
						"
					>
						<!-- Fujifilm-style border container -->
						<div class="relative p-1 sm:p-2 bg-white rounded-sm shadow-2xl max-w-[90vw] max-h-[50vh] sm:max-w-[80vw] sm:max-h-[60vh] flex items-center justify-center" 
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
								<div class="absolute -top-3 sm:-top-5 right-0 sm:right-1 text-xs font-bold text-white bg-green-800 px-1 sm:px-2 py-1 tracking-wider rounded-sm">
									tom.photography-{String(index + 1).padStart(2, '0')}
								</div>
							{/if}
							
							<!-- Photo container -->
							<div class="relative bg-white flex items-center justify-center">
								<img
									src={photo.src}
									alt={photo.alt}
									class="max-h-[45vh] max-w-[85vw] sm:max-h-[55vh] sm:max-w-[75vw] object-contain transition-all duration-300"
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
		<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pb-2 sm:pb-4 pt-4 sm:pt-8">
			<div class="flex justify-center">
				<div 
					class="flex mt-1 sm:mt-2 gap-1 sm:gap-2 overflow-x-auto px-2 sm:px-4 pb-1 sm:pb-2 scroll-smooth"
					style="max-width: 95vw;"
				>
					{#if photos.length > (isMobile ? 6 : 10)}
						<!-- For large collections, show only a subset of thumbnails around current photo for performance -->
						{@const maxThumbnails = isMobile ? 5 : 7}
						{@const startIndex = Math.max(0, Math.min(currentIndex - Math.floor(maxThumbnails/2), photos.length - maxThumbnails))}
						{@const endIndex = Math.min(photos.length, startIndex + maxThumbnails)}
						
						{#if startIndex > 0}
							<button
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									goToPhoto(0);
								}}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-400 opacity-50 hover:opacity-70 transition-all duration-200 flex items-center justify-center bg-gray-800 text-white text-xs font-bold"
								style="width: {isMobile ? '48px' : '64px'}; height: {isMobile ? '48px' : '64px'};"
							>
								1
							</button>
							{#if startIndex > 1}
								<div class="flex items-center justify-center text-white opacity-50 px-1">...</div>
							{/if}
						{/if}
						
						{#each photos.slice(startIndex, endIndex) as photo, localIndex}
							{@const index = startIndex + localIndex}
							<button
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									goToPhoto(index);
								}}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 {currentIndex === index ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-80'}"
							>
								<img
									src={photo.src}
									alt={photo.alt}
									class="{isMobile ? 'h-12 w-12' : 'h-16 w-16'} object-cover"
									loading="lazy"
									decoding="async"
								/>
							</button>
						{/each}
						
						{#if endIndex < photos.length}
							{#if endIndex < photos.length - 1}
								<div class="flex items-center justify-center text-white opacity-50 px-1">...</div>
							{/if}
							<button
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									goToPhoto(photos.length - 1);
								}}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-400 opacity-50 hover:opacity-70 transition-all duration-200 flex items-center justify-center bg-gray-800 text-white text-xs font-bold"
								style="width: {isMobile ? '48px' : '64px'}; height: {isMobile ? '48px' : '64px'};"
							>
								{photos.length}
							</button>
						{/if}
					{:else}
						<!-- For smaller collections, show all thumbnails -->
						{#each photos as photo, index}
							<button
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									goToPhoto(index);
								}}
								class="flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 {currentIndex === index ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-80'}"
							>
								<img
									src={photo.src}
									alt={photo.alt}
									class="{isMobile ? 'h-12 w-12' : 'h-16 w-16'} object-cover"
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