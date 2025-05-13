<script lang="ts">
	import { fly } from 'svelte/transition';
	
	// 假设这是你的照片数据
	const photos = [
		{ src: '/photo/1.png', alt: 'Photo 1' },
		{ src: '/photo/2.png', alt: 'Photo 2' },
		{ src: '/photo/3.png', alt: 'Photo 3' },
	];
</script>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base  mx-auto">
	
	<!-- A large heading for the page title or your name -->
	<h1 
		class="page-title">
		tom.photography
	</h1>

	<main in:fly={{ y: 100, duration: 1000, delay: 600 }} 
		class="main-content-area ">
	<!-- Ariticle list -->
	 <div class="grid grid-cols-1 md:grid-cols-2 gap-3 not-prose">
		{#each photos as photo, i}
			<div 
				in:fly={{ 
					y: 50, 
					duration: 600 + (i % 2) * 200, 
					delay: 300 + Math.floor(i / 2) * 300 
				}}
				class="aspect-square overflow-hidden rounded-lg shadow-md"
			>
				<img 
					src={photo.src} 
					alt={photo.alt} 
					class="photo-grid transition-transform hover:scale-105 duration-300"
					loading="lazy"
				/>
			</div>
		{/each}
	 </div>
	 
	</main>
</div>

