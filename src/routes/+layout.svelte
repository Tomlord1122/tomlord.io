<script lang="ts">
	import '../app.css';
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
	let { children } = $props();
</script>

<InteractiveBackground />
<div class="min-h-screen bg-gradient-to-b from-[#EDEDED] to-[#EEEEEE] flex flex-col font-sans">
	<nav class="bg-gradient-to-r from-[#EDEDED] to-[#EEEEEE] p-4 ">
		<div class="container mx-auto flex justify-between items-center">
			
 			<a href="/" class="transition-all duration-300 hover:scale-110">
				<img  src="/app_icon.png" alt="Tomlord" class="w-15 h-15 rounded-2xl border-2 border-gray-300">
			</a>
			<div class="flex items-center gap-4  text-lg">
				<a href="/blog" class="text-gray-700 hover:text-gray-900   ">Blog</a>
				<a href="/project" class="text-gray-700 hover:text-gray-900  ">Project</a>
				<a href="/photography" class="text-gray-700 hover:text-gray-900 ">Photography</a>
			</div>
		</div>
	</nav>
	<main class="flex-1 container mx-auto p-4">
		{@render children()}
	</main>
</div>
