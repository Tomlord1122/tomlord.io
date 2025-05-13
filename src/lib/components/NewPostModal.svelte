<script lang="ts">
    import { marked } from 'marked';
	import { tick } from 'svelte'; // To wait for DOM updates

	// Props for the modal
	// 'show' is two-way bindable to control visibility from the parent
	// 'allCurrentTags' is the list of all tags currently used in your blog
	let { show = $bindable(false), allCurrentTags } = $props<{
		show: boolean;
		allCurrentTags: string[];
	}>();

	// State for the new post data
	let title = $state('');
	let content = $state('');
	let postTags = $state<string[]>([]); // Tags selected for this new post
	let newTagInput = $state(''); // For typing a new tag
	let showPreview = $state(false); // Controls whether to show preview or editor

	// Get current date and format it
	const currentDate = new Date();
	const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

	// Reactive derived value for the HTML preview of the Markdown content
	let markdownPreview = $derived(marked(content || ''));

	// Function to close the modal
	function closeModal() {
		show = false; // This updates the 'show' prop in the parent component
	}

	// Function to handle post creation (currently logs to console)
	async function handleCreatePost() {
		if (!title.trim()) {
			alert('Please enter a title for your post.');
			return;
		}
		if (!content.trim()) {
			alert('Please add some content to your post.');
			return;
		}

		const slug = title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
		
		// Create the markdown content with frontmatter
		const frontmatter = `---
title: '${title}'
date: '${new Date().toISOString().split('T')[0]}'
slug: '${slug}'
description: ''
tags: [${postTags.map(tag => `'${tag}'`).join(', ')}]
---

${content}`;

		try {
			// Updated API endpoint path to match your server endpoint
			const response = await fetch('/api', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					filename: `${slug}.svx`,
					content: frontmatter
				})
			});

			if (response.ok) {
				alert('Post created successfully!');
				// Reset form and close modal
				title = '';
				content = '';
				postTags = [];
				newTagInput = '';
				closeModal();
			} else {
				const errorData = await response.json().catch(() => ({}));
				console.error('Server error:', errorData);
				alert(`Failed to create post: ${errorData.message || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error creating post:', error);
			alert('An error occurred while creating the post.');
		}
	}

	// Function to toggle a tag for the new post
	function togglePostTag(tag: string) {
		const index = postTags.indexOf(tag);
		if (index > -1) {
			postTags = postTags.filter(t => t !== tag);
		} else {
			postTags = [...postTags, tag];
		}
	}

	// Function to add a new tag from the input field
	function addNewTag() {
		const newTag = newTagInput.trim();
		if (newTag && !postTags.includes(newTag) && !allCurrentTags.includes(newTag)) {
			// Add to the post's tags and also to the list of all available tags for future use
			// In a real app, allCurrentTags might be managed differently (e.g., derived from a global store or API)
			postTags = [...postTags, newTag];
			// We might want to update `allCurrentTags` in the parent if this new tag should be globally available immediately.
			// For now, we'll just add it to the current post.
		} else if (newTag && (postTags.includes(newTag) || allCurrentTags.includes(newTag))) {
			// If it's an existing global tag and not selected, select it for the post
			if (!postTags.includes(newTag)) {
				postTags = [...postTags, newTag];
			}
		}
		newTagInput = ''; // Clear the input
	}

	// Function to toggle between preview and editor
	function togglePreview() {
		showPreview = !showPreview;
	}

	// Focus the title input when the modal becomes visible
	$effect(() => {
		if (show) {
			// Wait for the next DOM update cycle before trying to focus
			tick().then(() => {
				const titleEl = document.getElementById('post-title-input');
				titleEl?.focus();
			});
		}
	});

</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-auto">
		<div class="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-2xl font-semibold text-gray-800">Create New Post</h2>
				<button onclick={closeModal} class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
			</div>

			<div class="flex-grow overflow-y-auto pr-2"> 
				<form onsubmit={() => {}} class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-5 gap-3">
						<div class="md:col-span-3">
							<label for="post-title-input" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
							<input 
								type="text" 
								id="post-title-input"
								bind:value={title} 
								class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
								required
							/>
						</div>

						<div class="md:col-span-2">
							<p class="block text-sm font-medium text-gray-700 mb-1">Date</p>
							<p class="p-2 bg-gray-100 rounded-md text-gray-700">{formattedDate}</p>
						</div>
					</div>

					<div class="space-y-2">
						<div>
							<p class="block text-sm font-medium text-gray-700 mb-1">Tags</p>
							<div class="flex flex-wrap gap-2 mb-1">
								{#each allCurrentTags as tag}
									{@const isSelected = postTags.includes(tag)}
									<button 
										type="button"
										onclick={() => togglePostTag(tag)}
										class={`px-3 py-1 text-xs rounded-full border 
												${isSelected 
													? 'bg-blue-500 text-white border-blue-600' 
													: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
												} transition-colors duration-150`}
									>
										{tag}
									</button>
								{/each}
							</div>
							
						</div>
						<div class="flex items-center gap-2">
							<input 
								type="text" 
								bind:value={newTagInput} 
								placeholder="Add new tag"
								class="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
								onkeypress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewTag(); }}}
							/>
							<button 
								type="button" 
								onclick={addNewTag}
								class="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
							>
								Add Tag
							</button>
						</div>
						{#if postTags.length > 0}
							<div class="mt-1">
								<p class="text-xs text-gray-600">Selected tags for this post:</p>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each postTags as tag}
										<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
					
					<div class="mt-3">
						<div class="flex justify-between items-center mb-1">
							<label for="post-content" class="block text-sm font-medium text-gray-700">
								{showPreview ? 'Live Preview' : 'Content (Markdown)'}
							</label>
							<button 
								type="button"
								onclick={togglePreview}
								class="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
							>
								{showPreview ? 'Edit Content' : 'Show Preview'}
							</button>
						</div>
						
						{#if showPreview}
							<div 
								class="prose prose-sm sm:prose-base max-w-none p-3 border border-gray-300 rounded-md bg-gray-50 overflow-y-auto"
								style="min-height: calc(20em + 40px);"
							>
								{@html markdownPreview}
							</div>
						{:else}
							<textarea 
								id="post-content"
								bind:value={content} 
								rows="15"
								class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
								placeholder="Write your blog post content here using Markdown..."
							></textarea>
						{/if}
					</div>

					<div class="sticky bottom-0 bg-white flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6 pb-2">
						<button 
							type="button" 
							onclick={closeModal}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 border border-gray-300"
						>
							Cancel
						</button>
						<button 
							type="button"
							onclick={handleCreatePost}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
						>
							Create Post
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
