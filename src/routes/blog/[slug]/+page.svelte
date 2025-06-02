<script lang="ts">
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import EditPostModal from '$lib/components/EditPostModal.svelte';

	// export let data; // 從 load 函數接收資料 (data.post)
	let {data} = $props(); // Using $props() instead of export let data

	const { title, date, tags, content, duration, slug } = data.post;
	const Component = $derived(content);

	// Check if we're in development mode
	let isDev = $state(false);
	let showEditModal = $state(false);
	let postData = $state({});
	let allTags = $state<string[]>([]);

	// Check environment on client-side
	$effect(() => {
		if (browser) {
			// Only localhost is considered development
			isDev = window.location.hostname === 'localhost';
			// Initialize tags from the current post
			allTags = [...(tags || [])];
		}
	});

	// Load post data for editing
	async function loadPostForEditing() {
		try {
			const response = await fetch(`/api/edit-post?slug=${slug}`);
			if (response.ok) {
				const data = await response.json();
				postData = {
					title: data.metadata.title,
					slug: data.metadata.slug,
					content: data.content,
					tags: data.metadata.tags || [],
					date: data.metadata.date,
					lang: data.metadata.lang || 'en'
				};
				showEditModal = true;
			} else {
				alert('Failed to load post for editing.');
			}
		} catch (error) {
			console.error('Error loading post for editing:', error);
			alert('An error occurred while loading the post for editing.');
		}
	}

	// Callback for successful save
	function handlePostSaved() {
		console.log('Post saved successfully.');
		// If the slug changed, we need to navigate to the new URL
		// For now, we'll just reload the page
		window.location.reload();
	}

	// Callback for modal cancellation
	function handleEditCancel() {
		console.log('Edit cancelled.');
	}

	// Function to open the edit modal
	function openEditModal() {
		loadPostForEditing();
	}
</script>

<svelte:head>
	<meta name="twitter:title" content={title} />
</svelte:head>


	<article class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
		<header class="mb-8 page-title">
			<div class="prose prose-sm sm:prose-base">
				<h1>
					{#if isDev}
						<button
							onclick={openEditModal}
							aria-label="Edit Post"
							class="hover:text-gray-600 transition-colors text-left"
						>
							{title}
						</button>
					{:else}
						{title}
					{/if}
				</h1>
			</div>
			
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
			class="prose prose-sm sm:prose-base max-w-none font-serif"> 
			<Component class="img-center"/>

		</div> 

		<div
		in:fly={{ y: 50, duration: 600, delay: 200 }} 
		class="mt-12 pt-8 border-t border-gray-200">
			<a href="/blog" class="text-sky-600 hover:text-sky-800">&larr; Go back to blog list</a>
		</div>
	</article>



{#if isDev}
	<EditPostModal 
		bind:show={showEditModal}
		{postData}
		bind:allCurrentTags={allTags}
		availableImages={data.availablePhotos || []}
		onSaved={handlePostSaved}
		onCancel={handleEditCancel}
	/>
{/if}

