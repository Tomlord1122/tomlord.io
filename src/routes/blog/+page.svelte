<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import NewPostModal from '$lib/components/NewPostModal.svelte';
	import { browser } from '$app/environment';

	// Props are now received using $props() in Svelte 5
	let { data } = $props();

	let selectedTags = $state<string[]>([]);
	let showCreatePostModal = $state(false);
	let isDev = $state(false); 
	let language = $state<string>("");
	let searchKeyword = $state<string>("");
	let tagSearchKeyword = $state<string>("");

	// Check environment on client-side
	$effect(() => {
		if (browser) {
			// Only localhost is considered development
			isDev = window.location.hostname === 'localhost';
		}
	});

	let initialTags = [...new Set(data.posts.flatMap(post => post.tags || []))].sort();
	let allTags = $state(initialTags);

	$effect(() => {
		const tagsFromCurrentPosts = [...new Set(data.posts.flatMap(post => post.tags || []))];
		const combinedTagsSet = new Set(tagsFromCurrentPosts);
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

	let filteredTags = $derived(
		allTags.filter(tag => 
			tagSearchKeyword.trim() === "" || 
			tag.toLowerCase().includes(tagSearchKeyword.toLowerCase())
		)
	);

	let filteredPosts = $derived(
		data.posts.filter(post => {
			const languageMatch = language === "en" ? post.lang === "en" : true;
			const tagMatch = selectedTags.length === 0 || selectedTags.every(tag => post.tags?.includes(tag));
			const titleMatch = searchKeyword.trim() === "" || 
				post.title.toLowerCase().includes(searchKeyword.toLowerCase());
			
			return languageMatch && tagMatch && titleMatch;
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

<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-lg">
	<h1 class="page-title">
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

	<animate in:fade={{ duration: 800, delay: 200 }}> 
		<div class="not-prose font-serif">
			<div class="flex w-full justify-between">
				<div class="flex items-center gap-1">
					<label class="flex items-center cursor-pointer gap-1 text-sm text-gray-500">
						<input 
							type="checkbox" 
							checked={language === "en"} 
							onclick={() => {language === "en"? language = "": language = "en"}} 
							class="form-checkbox h-4 w-4 text-gray-400 rounded border-gray-300 focus:ring-gray-500"
						/>
						English Only
					</label>
				</div>
				<div>
					<input 
						type="text"
						bind:value={searchKeyword}
						placeholder="Search by title"
						class="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none transition-all duration-200"
					/>
				</div>
			</div>
		</div>
	
		{#if allTags.length > 0}
			<div class="not-prose font-serif">
				<div class="flex justify-between w-full">
					<h3 class="text-md text-gray-700">Filter by Tags</h3>
					{#if selectedTags.length > 0}
					<button 
						type="button"
						onclick={() => selectedTags = []}
						class="text-sm text-gray-600 hover:text-gray-800 hover:underline"
					>
					clear all tags ({selectedTags.length})
					</button>
					{/if}
				</div>
				
				<div class="relative">
					<div 
						id="tag-container"
						class="flex gap-2 overflow-x-auto scrollbar-hide pb-2 scroll-smooth min-h-[32px]" 
						style="scrollbar-width: none; -ms-overflow-style: none;"
					>
						{#each filteredTags as tag}
							{@const isSelected = selectedTags.includes(tag)}
							<button 
								type="button"
								onclick={() => toggleTag(tag)}
								class={`px-3 py-1 text-xs rounded-full border whitespace-nowrap flex-shrink-0
										${isSelected 
											? 'bg-gray-200 text-gray-600 border-gray-300' 
											: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
										} transition-colors duration-150`}
							>
								{tag}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</animate>


	<main in:fly={{ y: 100, duration: 1000, delay: 200 }} class="main-content-area not-prose">
		{#if filteredPosts && filteredPosts.length > 0}
			<ul class="list-none">
				{#each filteredPosts as post, index (post.slug)}
					<li class="border pl-2 border-gray-200 last:border-b-0 first:mb-1 pt-2 shadow-sm">
						<a href="/blog/{post.slug}" class="underline underline-offset-4 inline-block">
							<h2 class="prose prose-sm sm:prose-lg text-gray-700 hover:text-gray-900 mb-1">{post.title}</h2>
						</a>
						<div class="text-sm text-gray-500">
							<p class="mb-1">
							{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} 
							</p>
							{#if post.tags && post.tags.length > 0}
								<div class="relative">
									<div 
										id="post-tags-{index}"
										class="flex gap-1 overflow-x-auto scrollbar-hide pb-1 scroll-smooth" 
										style="scrollbar-width: none; -ms-overflow-style: none;"
									>
										{#each post.tags as tag}
											<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
												{tag}
											</span>
										{/each}
									</div>
								</div>
							{/if}
						</div>						
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-gray-600">
				{#if selectedTags.length > 0 || searchKeyword.trim() !== ""}
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
		onSaved={handlePostCreationSuccess}
		onCancel={handlePostCreationCancel}
	/>
{/if}