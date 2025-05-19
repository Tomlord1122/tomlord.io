<script lang="ts">
	import { fly } from 'svelte/transition';

	// export let data; // 從 load 函數接收資料 (data.post)
	let {data} = $props(); // Using $props() instead of export let data

	const { title, date, tags, content, duration, lang } = data.post;
	const Component = $derived(content);
</script>

<svelte:head>
	<title>{title} | Tomlord's Blog</title>
	<meta name="twitter:title" content={title} />

</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8">
	<article>
		<header class="mb-8">
			<h1 
				class="text-4xl font-bold text-gray-900 mb-3 leading-tight font-serif">
				{title}
			</h1>
			<p 
				class="text-gray-500 text-sm">
				Posted on {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
			</p>
			<p class="text-gray-500 text-sm">
				Reading time: {duration} 
			</p>
			{#if tags && tags.length > 0}
				<div 
					class="mt-4 flex flex-wrap gap-2">
					{#each tags as tag}
						<span class="bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">{tag}</span>
					{/each}
				</div>
			{/if}
		</header>
		<div 
			in:fly={{ y: 50, duration: 600, delay: 200 }}
			class="prose prose-base max-w-none font-serif"> 
			<Component class="img-center"/>

		</div>
	</article>

	<div
	in:fly={{ y: 50, duration: 600, delay: 200 }} 
	class="mt-12 pt-8 border-t border-gray-200">
		<a href="/blog" class="text-sky-600 hover:text-sky-800 hover:underlin ">&larr; Go back to blog list</a>
	</div>
</div>

