<script lang="ts">
	import { browser } from '$app/environment';
	import type { ResponsiveImageType } from '../types/image.js';

	let { src, alt, loading = 'lazy', onclick = () => {} }: ResponsiveImageType = $props();

	let isLoaded = $state(false);
	let isInView = $state(false);
	let imgElement: HTMLImageElement;

	// 使用 Intersection Observer 來檢測圖片是否進入視窗
	$effect(() => {
		if (!browser || !imgElement) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						isInView = true;
						observer.unobserve(entry.target);
					}
				});
			},
			{
				rootMargin: '50px' // 提前 50px 開始載入
			}
		);

		observer.observe(imgElement);

		return () => {
			observer.disconnect();
		};
	});

	function handleLoad() {
		isLoaded = true;
	}

	// 只有當圖片進入視窗或是 eager 載入時才載入圖片
	let shouldLoad = $derived(loading === 'eager' || isInView);
</script>

<button
	class="relative z-10 aspect-square cursor-pointer overflow-hidden rounded-lg shadow-md"
	{onclick}
>
	<!-- Loading skeleton -->
	{#if !isLoaded}
		<div class="absolute inset-0 flex items-center justify-center bg-gray-100">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
			></div>
		</div>
	{/if}

	<img
		bind:this={imgElement}
		src={shouldLoad ? src : ''}
		{alt}
		class="photo-grid"
		onload={handleLoad}
		style="min-height: 200px;"
	/>
</button>
