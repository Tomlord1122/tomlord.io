<script lang="ts">
	import {fly } from 'svelte/transition';
</script>

<svelte:head>
	<meta name="twitter:title" content="Projects | Tomlord's Blog" />
	<meta name="twitter:image" content="%sveltekit.assets%/app_icon.png" />
</svelte:head>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base  mx-auto">
	
	<!-- A large heading for the page title or your name -->
	<h1 
		class="page-title">
		tom.project
	</h1>

	<main in:fly={{ y: 100, duration: 1000, delay: 300 }} 
		class="main-content-area">
		<ul>
			<li>
				<p>
					<a href="https://github.com/Tomlord1122/go-recipe">go-recipe</a>:
				A TUI app that can store commands you frequently use.
				</p>
			</li>
		</ul>
	 
	</main>
</div>

