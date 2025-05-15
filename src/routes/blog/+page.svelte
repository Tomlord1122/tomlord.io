<script lang="ts">
	import { fly } from 'svelte/transition';
	import NewPostModal from '$lib/components/NewPostModal.svelte';
	import { browser } from '$app/environment';

	// Props are now received using $props() in Svelte 5
	let { data } = $props();

	// Reactive state for selected tags
	let selectedTags = $state<string[]>([]);

	// State to control the visibility of the new post modal
	let showCreatePostModal = $state(false);

	// Check if we're in development mode
	let isDev = $state(false);

	// Check environment on client-side
	$effect(() => {
		if (browser) {
			// Only localhost is considered development
			isDev = window.location.hostname === 'localhost';
		}
	});

	// Derive a unique, sorted list of all tags from the posts
	let allTags = $derived(
		[...new Set(data.posts.flatMap(post => post.tags || []))].sort()
	);

	// Function to toggle a tag's selection status
	function toggleTag(tag: string) {
		const index = selectedTags.indexOf(tag);
		if (index > -1) {
			// If tag is already selected, remove it
			selectedTags = selectedTags.filter(t => t !== tag);
		} else {
			// If tag is not selected, add it
			selectedTags = [...selectedTags, tag];
		}
	}

	// Derived list of posts filtered by the selected tags
	// A post is included if it contains ALL of the selected tags
	let filteredPosts = $derived(
		data.posts.filter(post => {
			if (selectedTags.length === 0) {
				return true; // Show all posts if no tags are selected
			}
			return selectedTags.every(tag => post.tags?.includes(tag));
		})
	);

</script>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto">
	
	<h1 
		class="page-title mb-0">
		{#if isDev}
			<button
			onclick={() => showCreatePostModal = true}
			aria-label="Create New Post"
			>
			tom.changelog
			</button>
		{:else}
		tom.changelog
		{/if}
	</h1>


	<!-- Tag selection area -->
	{#if allTags.length > 0}
		<div
		class="mb-8 not-prose font-serif">
			<h3 class="text-lg  mb-2 text-gray-700">Filter by Tags:</h3>
			<div class="flex flex-wrap gap-2">
				{#each allTags as tag}
					{@const isSelected = selectedTags.includes(tag)}
					<button 
						onclick={() => toggleTag(tag)}
						class={`px-3 py-1 text-xs rounded-full border 
								${isSelected 
									? 'bg-gray-200 text-gray-600 border-gray-300' 
									: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
								} transition-colors duration-150`}
					>
						{tag}
					</button>
				{/each}
			</div>
			{#if selectedTags.length > 0}
				<button 
					onclick={() => selectedTags = []}
					class="mt-4 text-sm text-gray-600 hover:text-gray-800 hover:underline"
				>
					Clear all tags
				</button>
			{/if}
		</div>
	{/if}

	<main in:fly={{ y: 100, duration: 1000, delay: 300 }} 
		  class="main-content-area not-prose ">
		
		{#if filteredPosts && filteredPosts.length > 0} 
			<ul class="list-none">
				{#each filteredPosts as post (post.slug)}
					<li class="border-b border-gray-200 last:border-b-0 first:mb-1 pt-2" >
						<a href="/blog/{post.slug}" class="underline underline-offset-4">
							<h2 class="text-xl text-gray-700 hover:text-gray-900 mb-1">{post.title}</h2>
						</a>
						<div class="text-sm text-gray-500 flex">
							<p class="my-0">
							<!-- Modify the date to be in the format of "May 15, 2025" -->
							 <!-- If we want to use Taiwan date do this: zh-TW, otherwise use en-US -->
							{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} 
							</p>
							{#if post.tags && post.tags.length > 0}
							<div class="flex flex-wrap gap-2 justify-items-center items-center ml-2">
								{#each post.tags as tag}
									<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{tag}</span>
								{/each}
							</div>
							{/if}
						</div>
						{#if post.description}
							<p class="text-gray-500 mt-1">{post.description}</p>
						{/if}
						
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-gray-600">
				{#if selectedTags.length > 0}
					No posts match the selected tags.
				{:else}
					No posts yet.
				{/if}
			</p>
		{/if}
	</main>

	
</div>

{#if showCreatePostModal && isDev}
	<NewPostModal bind:show={showCreatePostModal} allCurrentTags={allTags} />
{/if}
