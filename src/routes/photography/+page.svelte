<script lang="ts">
	import {fly } from 'svelte/transition';
</script>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base  mx-auto">
	
	<!-- A large heading for the page title or your name -->
	<h1 
		class="page-title">
		Photography
	</h1>

	<main in:fly={{ y: 100, duration: 1000, delay: 600 }} 
		class="main-content-area">
	<!-- Ariticle list -->
	No photography yet.
	 
	</main>
</div>

