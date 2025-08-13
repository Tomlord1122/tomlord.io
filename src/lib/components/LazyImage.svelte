<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		src: string;
		alt: string;
		class?: string;
		placeholderClass?: string;
	}

	let { src, alt, class: className = '', placeholderClass = '' }: Props = $props();

	let containerRef = $state<HTMLDivElement>();
	let isVisible = $state(false);
	let isLoaded = $state(false);

	onMount(() => {
		if (!containerRef) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						isVisible = true;
						observer.disconnect();
					}
				});
			},
			{
				rootMargin: '50px',
				threshold: 0
			}
		);

		observer.observe(containerRef);

		return () => {
			observer.disconnect();
		};
	});

	function handleLoad() {
		isLoaded = true;
	}
</script>

<div bind:this={containerRef} class="lazy-image-container {className}">
	{#if isVisible}
		<img
			{src}
			{alt}
			onload={handleLoad}
			class="{className} {isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200"
		/>
	{:else}
		<div class="lazy-image-placeholder {placeholderClass}"></div>
	{/if}
</div>

<style>
	.lazy-image-container {
		position: relative;
	}

	.lazy-image-placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
		background-size: 200% 200%;
		animation: shimmer 1.5s ease-in-out infinite;
		border-radius: 0.25rem;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
