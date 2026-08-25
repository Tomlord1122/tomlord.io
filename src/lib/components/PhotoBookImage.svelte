<script lang="ts">
	import type { PhotoBookSpread } from '$lib/data/photo-book.js';

	let {
		spread,
		side = 'full',
		alt = '',
		loading = 'eager'
	}: {
		spread: PhotoBookSpread;
		side?: 'full' | 'left' | 'right';
		alt?: string;
		loading?: 'eager' | 'lazy';
	} = $props();
</script>

<img
	src={spread.src}
	srcset={spread.srcset}
	sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 700px"
	width={spread.width}
	height={spread.height}
	{alt}
	{loading}
	decoding={loading === 'eager' ? 'sync' : 'async'}
	draggable="false"
	class:half={side !== 'full'}
	class:right={side === 'right'}
/>

<style>
	img {
		display: block;
		width: 100%;
		height: auto;
		pointer-events: none;
		user-select: none;
	}

	img.half {
		width: 200%;
		max-width: none;
	}

	img.half.right {
		margin-left: -100%;
	}
</style>
