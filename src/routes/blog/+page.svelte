<script lang="ts">
	import { fade, fly, slide } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import NewPostModal from '$lib/components/NewPostModal.svelte';
	import { browser } from '$app/environment';

	// Props are now received using $props() in Svelte 5
	let { data } = $props();

	let selectedTags = $state<string[]>([]);
	let showCreatePostModal = $state(false);
	let isDev = $state(false);
	let language = $state<string>('');
	let searchKeyword = $state<string>('');
	let tagSearchKeyword = $state<string>('');

	// Check environment on client-side
	$effect(() => {
		if (browser) {
			// Only localhost is considered development
			isDev = window.location.hostname === 'localhost';
		}
	});

	let initialTags = [...new Set(data.posts.flatMap((post) => post.tags || []))].sort();
	let allTags = $state(initialTags);

	$effect(() => {
		const tagsFromCurrentPosts = [...new SvelteSet(data.posts.flatMap((post) => post.tags || []))];
		const combinedTagsSet = new SvelteSet(tagsFromCurrentPosts);
		allTags.forEach((tag) => combinedTagsSet.add(tag));
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
			selectedTags = selectedTags.filter((t) => t !== tag);
		} else {
			// If tag is not selected, add it
			selectedTags = [...selectedTags, tag];
		}
	}

	let filteredTags = $derived(
		allTags.filter(
			(tag) =>
				tagSearchKeyword.trim() === '' || tag.toLowerCase().includes(tagSearchKeyword.toLowerCase())
		)
	);

	let filteredPosts = $derived(
		data.posts.filter((post) => {
			const languageMatch = language === 'en' ? post.lang === 'en' : true;
			const tagMatch =
				selectedTags.length === 0 || selectedTags.every((tag) => post.tags?.includes(tag));
			const titleMatch =
				searchKeyword.trim() === '' ||
				post.title.toLowerCase().includes(searchKeyword.toLowerCase());

			return languageMatch && tagMatch && titleMatch;
		})
	);

	// Progressive rendering of filtered posts (client-side pagination)
	const PAGE_SIZE = 20;
	let visibleCount = $state(PAGE_SIZE);
	let isLoadingMore = $state(false);
	let sentinelEl: HTMLDivElement | null = $state(null);

	let visiblePosts = $derived(filteredPosts.slice(0, visibleCount));
	let hasMorePosts = $derived(visibleCount < filteredPosts.length);

	// Reset pagination whenever filters change
	$effect(() => {
		visibleCount = Math.min(PAGE_SIZE, filteredPosts.length);
		isLoadingMore = false;
	});

	async function loadMorePosts() {
		if (!hasMorePosts || isLoadingMore) return;
		isLoadingMore = true;
		// Allow next frame to keep UI smooth
		await Promise.resolve();
		visibleCount = Math.min(visibleCount + PAGE_SIZE, filteredPosts.length);
		isLoadingMore = false;
	}

	// IntersectionObserver to auto-load on scroll near the bottom
	$effect(() => {
		if (!sentinelEl) return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						void loadMorePosts();
					}
				}
			},
			{ root: null, rootMargin: '0px', threshold: 0.1 }
		);

		observer.observe(sentinelEl);
		return () => observer.disconnect();
	});

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
		const tagsExclusivelyFromPosts = [
			...new Set(data.posts.flatMap((post) => post.tags || []))
		].sort();
		allTags = tagsExclusivelyFromPosts;
		// We ensure the modal is closed.
		showCreatePostModal = false;
	}

	function openCreatePostModal() {
		// When opening the modal, ensure allTags is up-to-date with the latest from posts,
		// in case it was modified by a previous cancellation.
		const currentTagsFromData = [...new Set(data.posts.flatMap((post) => post.tags || []))].sort();
		if (JSON.stringify(allTags) !== JSON.stringify(currentTagsFromData)) {
			allTags = currentTagsFromData;
		}
		showCreatePostModal = true;
	}

	let tagContainer: HTMLElement | null = $state(null);
	let canScrollLeft = $state(false);
	let canScrollRight = $state(true);

	function updateScrollButtons() {
		if (tagContainer) {
			const { scrollLeft, scrollWidth, clientWidth } = tagContainer;
			canScrollLeft = scrollLeft > 0;
			canScrollRight = scrollLeft < scrollWidth - clientWidth - 1;
		}
	}

	function scrollTags(direction: 'left' | 'right') {
		if (tagContainer) {
			const scrollAmount = 200;
			tagContainer.scrollBy({
				left: direction === 'left' ? -scrollAmount : scrollAmount,
				behavior: 'smooth'
			});
		}
	}

	$effect(() => {
		if (tagContainer) {
			updateScrollButtons();
		}
	});
</script>

<svelte:head>
	<meta name="twitter:title" content="Blog | Tomlord's Blog" />
	<meta
		name="twitter:description"
		content="Read my latest thoughts on tech, projects, and life - sharing insights about distributed systems and modern development"
	/>
	<meta name="twitter:image" content="https://tomlord.fyi/app_icon.png" />
	<meta name="twitter:image:alt" content="Tomlord's Blog" />

	<meta property="og:title" content="Blog | Tomlord's Blog" />
	<meta
		property="og:description"
		content="Read my latest thoughts on tech, projects, and life - sharing insights about distributed systems and modern development"
	/>
	<meta property="og:image" content="https://tomlord.fyi/app_icon.png" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tomlord.fyi/blog" />
</svelte:head>

<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<h1 class="page-title">
		{#if isDev}
			<button
				onclick={openCreatePostModal}
				aria-label="Create New Post"
				class="transition-colors hover:text-gray-600"
			>
				tom.changelog
			</button>
		{:else}
			tom.changelog
		{/if}
	</h1>

	<animate in:fade={{ duration: 800, delay: 100 }}>
		<div class="not-prose font-serif">
			<div class="flex w-full flex-col justify-between sm:flex-row">
				<div class="flex items-center">
					<label class="flex cursor-pointer items-center gap-1 text-sm text-gray-500">
						<input
							type="checkbox"
							checked={language === 'en'}
							onclick={() => {
								language = language === 'en' ? '' : 'en';
							}}
							class="form-checkbox h-4 w-4 rounded border-gray-300 text-gray-400 focus:ring-gray-500"
						/>
						English Only
					</label>
				</div>
				<div class="mt-2 flex flex-col gap-2 sm:mt-0 sm:flex-row">
					<input
						type="text"
						bind:value={tagSearchKeyword}
						placeholder="Search tags"
						class="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-all duration-200 outline-none focus:border-transparent focus:ring-2 focus:ring-gray-400"
					/>
					<input
						type="text"
						bind:value={searchKeyword}
						placeholder="Search by title"
						class="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-all duration-200 outline-none focus:border-transparent focus:ring-2 focus:ring-gray-400"
					/>
				</div>
			</div>
		</div>

		{#if allTags.length > 0}
			<div class="not-prose font-serif">
				<div class="flex w-full justify-between">
					<h3 class="text-md text-gray-700">Filter by Tags</h3>
					{#if selectedTags.length > 0}
						<button
							type="button"
							onclick={() => (selectedTags = [])}
							class="text-sm text-gray-600 hover:text-gray-800 hover:underline"
						>
							clear all tags ({selectedTags.length})
						</button>
					{/if}
				</div>

				<div class="group relative">
					<!-- 左箭頭按鈕 -->
					{#each [{ direction: 'left' as const, canScroll: canScrollLeft, path: 'M15 19l-7-7 7-7' }, { direction: 'right' as const, canScroll: canScrollRight, path: 'M9 5l7 7-7 7' }] as { direction, canScroll, path } (direction)}
						{#if canScroll}
							<button
								type="button"
								onclick={() => scrollTags(direction)}
								class="absolute top-1/2 {direction}-0 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1 opacity-0 shadow-md transition-opacity group-hover:opacity-100 hover:bg-white"
								aria-label="Scroll tags {direction}"
							>
								<svg
									class="h-4 w-4 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={path} />
								</svg>
							</button>
						{/if}
					{/each}

					<div
						bind:this={tagContainer}
						onscroll={updateScrollButtons}
						id="tag-container"
						class="scrollbar-hide flex min-h-[40px] items-center gap-2 overflow-x-auto scroll-smooth px-4 py-2"
						style="scrollbar-width: none; -ms-overflow-style: none;"
					>
						{#if filteredTags.length > 0}
							{#each filteredTags as tag (tag)}
								{@const isSelected = selectedTags.includes(tag)}
								<button
									transition:fade={{ duration: 300 }}
									type="button"
									onclick={() => toggleTag(tag)}
									class={`flex-shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap
										${
											isSelected
												? 'border-gray-400 bg-gray-300 '
												: 'border-gray-300 bg-gray-100 hover:bg-gray-200'
										} transition-colors duration-150`}
								>
									{tag}
								</button>
							{/each}
						{:else}
							<p
								transition:fade={{ duration: 200 }}
								class="flex-shrink-0 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs whitespace-nowrap text-gray-500"
							>
								No tags found
							</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</animate>

	<main in:fly={{ y: 100, duration: 800, delay: 100 }} class="main-content-area not-prose">
		{#if filteredPosts && filteredPosts.length > 0}
			<ul class="list-none">
				{#each visiblePosts as post, index (post.slug)}
					<li
						class="mb-1 border-b border-l border-gray-300 pt-2 pl-2"
						transition:slide={{ duration: 400, delay: index * 50 }}
					>
						<a href="/blog/{post.slug}" class="inline-block underline underline-offset-4">
							<h2 class="prose prose-sm sm:prose-lg text-gray-700 hover:text-gray-900">
								{post.title}
							</h2>
						</a>
						<div class="text-sm text-gray-500">
							<p>
								{new Date(post.date).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</p>
							{#if post.tags && post.tags.length > 0}
								<div class="relative">
									<div
										id="post-tags-{index}"
										class="scrollbar-hide flex gap-1 overflow-x-auto scroll-smooth"
										style="scrollbar-width: none; -ms-overflow-style: none;"
									>
										{#each post.tags as tag (tag)}
											<span
												class="flex-shrink-0 rounded-full bg-gray-200 px-2 py-1 text-xs whitespace-nowrap text-gray-700"
											>
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
			<!-- Infinite scroll sentinel and manual control -->
			<div bind:this={sentinelEl} class="h-6"></div>
			<div class="mt-2 flex items-center justify-center">
				{#if hasMorePosts}
					<button
						onclick={() => void loadMorePosts()}
						class="text-sm text-gray-600 underline hover:text-gray-800"
					>
						Load more posts
					</button>
				{:else}
					<p class="text-xs text-gray-400">No more posts</p>
				{/if}
			</div>
		{:else}
			<p class="text-gray-600" in:fade={{ duration: 300, delay: 300 }}>
				{#if selectedTags.length > 0 || searchKeyword.trim() !== ''}
					No posts match the filter.
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
