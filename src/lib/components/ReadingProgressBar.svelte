<script lang="ts">
	import { browser } from '$app/environment';

	let scrollProgress = $state(0);

	$effect(() => {
		if (!browser) return;

		function updateScrollProgress() {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			const progress = Math.min((scrollTop / docHeight) * 100, 100);
			scrollProgress = Math.round(progress);
		}

		// Initial calculation
		updateScrollProgress();

		// Add scroll listener
		window.addEventListener('scroll', updateScrollProgress, { passive: true });

		// Cleanup
		return () => {
			window.removeEventListener('scroll', updateScrollProgress);
		};
	});
</script>

<!-- Progress bar container -->
<div class="fixed top-0 right-0 left-0 z-50 h-1 bg-gray-200">
	<div
		class="h-full bg-gradient-to-r from-gray-300 to-gray-400 transition-all duration-300 ease-out"
		style="width: {scrollProgress}%"
	></div>
</div>

<!-- Optional: Show percentage in corner -->
{#if scrollProgress > 0 && scrollProgress < 100}
	<div
		class="fixed top-4 right-4 z-40 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-700 shadow-lg backdrop-blur-sm"
	>
		{scrollProgress}%
	</div>
{/if}
