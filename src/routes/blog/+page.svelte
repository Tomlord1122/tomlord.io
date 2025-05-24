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
	// languate could be en or zh-tw
	let language = $state<string>("");
	// Check environment on client-side
	$effect(() => {
		if (browser) {
			// Only localhost is considered development
			isDev = window.location.hostname === 'localhost';
		}
	});

	// Initialize allTags from data.posts, but make it a $state so it can be modified
	// We get the initial set of tags from your posts data
	let initialTags = [...new Set(data.posts.flatMap(post => post.tags || []))].sort();
	let allTags = $state(initialTags);

	// This $effect is a special Svelte 5 feature. It runs code whenever its dependencies change.
	// Here, it runs if 'data.posts' changes or if 'allTags' itself changes (though we guard against loops).
	// Its job is to make sure 'allTags' stays up-to-date with any tags coming from 'data.posts'
	// (e.g., if the page data is refreshed), while also preserving tags added dynamically via the modal.

	$effect(() => {
		// This effect keeps 'allTags' synchronized with 'data.posts' and any
		// tags that were part of a successfully created post (via bind:allCurrentTags).
		const tagsFromCurrentPosts = [...new Set(data.posts.flatMap(post => post.tags || []))];
		
		const combinedTagsSet = new Set(tagsFromCurrentPosts);
		// Add all tags currently in 'allTags'. This ensures that if a new post was just created,
		// its tags (which are in 'allTags' due to binding) are preserved even if 'data.posts'
		// hasn't reloaded yet. If the modal was cancelled, 'handlePostCreationCancel' will have
		// already cleaned 'allTags'.
		allTags.forEach(tag => combinedTagsSet.add(tag));
		
		const mergedSortedTags = Array.from(combinedTagsSet).sort();

		if (JSON.stringify(allTags) !== JSON.stringify(mergedSortedTags)) {
			allTags = mergedSortedTags;
		}
	});

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

	// Called when a post is successfully created in the modal
	function handlePostCreationSuccess() {
		console.log('Post created successfully. New tags (if any) are already in allTags.');
		// 'allTags' would have been updated by the modal via bind:allCurrentTags.
		// The $effect above will ensure 'allTags' stays consistent when data.posts updates.
		// We ensure the modal is closed (though bind:show should handle this too).
		showCreatePostModal = false; 
	}

	// Called when the modal is closed without creating a post
	function handlePostCreationCancel() {
		console.log('Modal cancelled. Reverting any temporarily added tags from allTags.');
		// Reset 'allTags' to only those tags that actually exist in 'data.posts'.
		// This removes any tags that were added in the modal session but not saved with a post.
		const tagsExclusivelyFromPosts = [...new Set(data.posts.flatMap(post => post.tags || []))].sort();
		allTags = tagsExclusivelyFromPosts;
		// We ensure the modal is closed.
		showCreatePostModal = false;
	}

	function openCreatePostModal() {
		// When opening the modal, ensure allTags is up-to-date with the latest from posts,
		// in case it was modified by a previous cancellation.
		const currentTagsFromData = [...new Set(data.posts.flatMap(post => post.tags || []))].sort();
		if (JSON.stringify(allTags) !== JSON.stringify(currentTagsFromData)) {
			allTags = currentTagsFromData;
		}
		showCreatePostModal = true;
	}

</script>

<svelte:head>
	<meta name="twitter:title" content="Blog | Tomlord's Blog" />
</svelte:head>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto">
	
	<h1 
		class="page-title mb-0">
		{#if isDev}
			<button
			onclick={openCreatePostModal}
			aria-label="Create New Post"
			class="hover:text-gray-600 transition-colors"
			>
			tom.changelog
			</button>
		{:else}
		tom.changelog
		{/if}
		
	</h1>

	<div class="mb-4 not-prose font-serif">
		<div class="flex gap-2 mb-4">
			<label class="flex items-center gap-2 cursor-pointer">
				<input 
					type="checkbox" 
					checked={language === "en"} 
					onclick={() => {language === "en"? language = "": language = "en"}} 
					class="form-checkbox h-4 w-4 text-gray-400 rounded border-gray-300 focus:ring-gray-500"
				/>
				<span class="text-sm text-gray-500">English Only</span>
			</label>
		</div>
	</div>


		<!-- Tag selection area -->
			{#if allTags.length > 0}
				<div class="mb-8 not-prose font-serif">
					<h3 class="text-lg mb-2 text-gray-700">Filter by Tags:</h3>
					<div class="flex flex-wrap gap-2">
						{#each allTags as tag}
							{@const isSelected = selectedTags.includes(tag)}
							<button 
								type="button"
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
							type="button"
							onclick={() => selectedTags = []}
							class="mt-4 text-sm text-gray-600 hover:text-gray-800 hover:underline"
						>
							Clear all tags
						</button>
					{/if}
				</div>
			{/if}
	

	<main in:fly={{ y: 100, duration: 1000, delay: 200 }} 
		  class="main-content-area not-prose ">
		
		{#if filteredPosts && filteredPosts.length > 0}
			<ul class="list-none">
				{#each filteredPosts.filter(post => language === "en" ? post.lang === "en" : true) as post (post.slug)}
					<li class="border-b border-gray-200 last:border-b-0 first:mb-1 pt-2" >
						<a href="/blog/{post.slug}" class="underline underline-offset-4">
							<h2 class="prose prose-sm sm:prose-lg  text-gray-700 hover:text-gray-900 mb-1">{post.title}</h2>
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
	<NewPostModal 
		bind:show={showCreatePostModal} 
		bind:allCurrentTags={allTags} 
		availableImages={data.availablePhotos || []}
		oncreated={handlePostCreationSuccess}
		oncancel={handlePostCreationCancel}
	/>
{/if}
