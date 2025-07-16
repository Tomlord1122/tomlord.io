<script lang="ts">
	import { browser } from '$app/environment';
	import type { ResponsiveImageType } from '../types/image.js';

	let { src, alt, loading = 'lazy', onclick = () => {} }: ResponsiveImageType = $props();

	// Optimization: Use more specific state management
	let isLoaded = $state(false);
	let isInView = $state(false);
	let hasError = $state(false);
	let imgElement: HTMLImageElement;

	// Optimization: Cache observer configuration
	const OBSERVER_CONFIG = {
		rootMargin: '50px', // Start loading 50px in advance
		threshold: 0.01 // Only need 1% visibility to trigger
	};

	// Optimization: Use single effect to manage Intersection Observer
	$effect(() => {
		if (!browser || !imgElement || loading === 'eager') return;

		// Optimization: Use WeakMap to avoid creating duplicate observers
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						isInView = true;
						observer.unobserve(entry.target);
						break; // Stop when found
					}
				}
			},
			OBSERVER_CONFIG
		);

		observer.observe(imgElement);

		return () => {
			observer.disconnect();
		};
	});

	// Optimization: Merge event handlers
	function handleLoad() {
		isLoaded = true;
		hasError = false;
	}

	function handleError() {
		hasError = true;
		isLoaded = false;
	}

	// Optimization: Use more efficient derived state
	let shouldLoad = $derived(loading === 'eager' || isInView);
	let actualSrc = $derived(shouldLoad ? src : '');
	
	// Optimization: Calculate style state
	let imageStyles = $derived(() => {
		const opacity = isLoaded ? 1 : 0;
		const transition = 'opacity 0.3s ease-in-out';
		return `opacity: ${opacity}; transition: ${transition} duration-300;`;
	});

	// Optimization: More precise state reset
	$effect(() => {
		if (src) {
			isLoaded = false;
			hasError = false;
			// Keep isInView unchanged to avoid unnecessary re-detection
		}
	});
</script>

<button
	class="relative z-10 aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 shadow-md transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-gray-500 duration-200"
	{onclick}
	aria-label={alt}
>
	<!-- Optimization: Add placeholder and error state -->
	{#if !isLoaded && !hasError && shouldLoad}
		<div class="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
			<div class="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
		</div>
	{/if}
	
	{#if hasError}
		<div class="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
			<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
		</div>
	{/if}

	<img
		bind:this={imgElement}
		src={actualSrc}
		{alt}
		class="photo-grid"
		onload={handleLoad}
		onerror={handleError}
		style={imageStyles()}
		loading={loading}
		decoding="async"
	/>
</button>
