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
						observer.unobserve(entry.target); // 觀察到後就停止觀察
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

	// 只有當圖片進入視窗或是 eager 載入時才設定圖片來源
	let actualSrc = $derived(loading === 'eager' || isInView ? src : '');

	// 當 src prop 改變時，重置 isLoaded 狀態，以便為新圖片顯示載入器
	$effect(() => {
		if (src) {
			isLoaded = false;
			// actualSrc 會依賴 isInView 更新，如果需要，會觸發新的載入
		}
	});
</script>

<button
	class="relative z-10 aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 shadow-md"
	{onclick}
>

	<img
		bind:this={imgElement}
		src={actualSrc}
		{alt}
		class="photo-grid"
		onload={handleLoad}
		style:opacity={isLoaded ? 1 : 0}
	/>
</button>
