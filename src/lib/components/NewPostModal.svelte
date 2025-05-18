<script lang="ts">
    import { marked } from 'marked';
	import { tick } from 'svelte'; // To wait for DOM updates

	// Props for the modal
	// 'show' is two-way bindable to control visibility from the parent
	// 'allCurrentTags' is the list of all tags currently used in your blog, now also two-way bindable
	// 'oncreated' is a callback for when a post is successfully created
	// 'oncancel' is a callback for when the modal is closed without creating a post
	// 'availableImages' is a new prop for available image paths
	let { 
		show = $bindable(false), 
		allCurrentTags = $bindable([]),
		availableImages = [], // New prop for available image paths
		oncreated = () => {}, // Default to an empty function
		oncancel = () => {}    // Default to an empty function
	} = $props<{
		show: boolean;
		allCurrentTags: string[];
		availableImages?: string[]; // Optional array of image paths
		oncreated: () => void; // Callback for successful post creation
		oncancel: () => void;  // Callback for cancellation
	}>();

	let lang = $state('en');
	let duration = $state(1); // Store as a number, default to 1
	$inspect(duration);
	// State for the new post data
	let title = $state('');
	let slug = $state(''); // Separate state for customizable slug
	let content = $state('');
	let postTags = $state<string[]>([]); // Tags selected for this new post
	let newTagInput = $state(''); // For typing a new tag
	let showPreview = $state(false); // Controls whether to show preview or editor
 
	// Effect to automatically calculate reading duration based on content
	$effect(() => {
		const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
		// Calculate duration: 1 minute per 100 words, round up
		const calculatedDuration = Math.ceil(words / 100);
		// Set duration, ensuring it's at least 1 minute
		duration = Math.max(1, calculatedDuration);
	});
	

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
		if (!slug.trim()) {
			alert('Please enter a URL slug for your post.');
			return;
		}
		
		// Use the custom slug, but still sanitize it
		const finalSlug = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
		
		// Create the markdown content with frontmatter
		const frontmatter = `---
title: '${title}'
date: '${new Date().toISOString().split('T')[0]}'
slug: '${finalSlug}'
lang: '${lang}'
duration: '${duration}min'
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
					filename: `${finalSlug}.svx`,
					content: frontmatter
				})
			});

			if (response.ok) {
				alert('Post created successfully!');
				oncreated(); // Call the oncreated callback
				// Reset form and close modal
				title = '';
				slug = '';
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
		if (newTag) { // Make sure the new tag is not just empty spaces
			// Add to the post's specific tags if it's not already there
			if (!postTags.includes(newTag)) {
				postTags = [...postTags, newTag];
			}

			// Now, let's check if this tag is new to our global list of 'allCurrentTags'
			// If it is, we add it. Because 'allCurrentTags' is bound to the parent's 'allTags' state,
			// this change will immediately reflect in the parent component.
			if (!allCurrentTags.includes(newTag)) {
				allCurrentTags = [...allCurrentTags, newTag].sort(); // Add and keep the list sorted
			}
		}
		newTagInput = ''; // Clear the input field
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

	// Function to copy image markdown to clipboard
	async function copyImageMarkdown(imagePath: string) {
		const markdown = `<div class="flex justify-center">
  <img src="${imagePath}" alt="${imagePath.split('/').pop()}" class="h-1/2 w-1/2 rounded-lg hover:scale-105 transition-all duration-300 shadow-md">
</div>`;
		try {
			await navigator.clipboard.writeText(markdown);
			alert(`Copied to clipboard: ${markdown}`);
		} catch (err) {
			console.error('Failed to copy text: ', err);
			alert('Failed to copy markdown. You can manually copy: ' + markdown);
		}
	}

</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-auto">
		<div class="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-4xl  max-h-[90vh] flex flex-col">
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-2xl font-semibold text-gray-800">Create New Post</h2>
				<button 
					onclick={() => {
						oncancel(); // Call the oncancel callback
						show = false;   // Then close the modal
					}} 
					class="text-gray-500 hover:text-gray-700 text-2xl"
				>
					&times;
				</button>
			</div>

			<div class="flex-grow overflow-y-auto pr-2"> 
				<form onsubmit={() => { /* handleCreatePost is called by button, prevent default form submission if any */ }} class="space-y-4">
					<section class="flex justify-between">
						<div class="gap-3 w-1/2 mr-2">
								<label for="post-title-input" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
								<input 
									type="text" 
									id="post-title-input"
									bind:value={title} 
									class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
									required
								/>
	
						</div>
						
						<div class="w-1/2">
							<label for="post-slug-input" class="block text-sm font-medium text-gray-700 mb-1">URL Slug (for the post URL)</label>
							<div class="flex items-center">
								<span class="text-gray-500 p-2 bg-gray-100 rounded-l-md border border-r-0 border-gray-300">/blog/</span>
								<input 
									type="text" 
									id="post-slug-input"
									bind:value={slug} 
									placeholder="your-post-url"
									class="flex-grow p-2 border border-gray-300 rounded-r-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
									required
								/>
							</div>
							
						</div>
					</section>
				

					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<label for="post-lang" class="block text-sm font-medium text-gray-700 mb-1">Language</label>
							<select 
								id="post-lang"
								bind:value={lang}
								class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="en">English</option>
								<option value="zh-tw">Traditional Chinese</option>
							</select>
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
													? 'bg-gray-500 text-white border-gray-600' 
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
					
					<!-- Section to display available images -->
					{#if availableImages && availableImages.length > 0}
						<div class="mt-4 pt-4 border-t border-gray-200">
							<h4 class="text-md font-medium text-gray-700 mb-2">Available Images</h4>
							<div class="max-h-96 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 border rounded-md bg-gray-50">
								{#each availableImages.slice().reverse() as imagePath (imagePath)}
									<div class="text-xs p-1.5 border border-gray-200 rounded bg-white shadow-sm hover:shadow-md transition-shadow">
										<img src={imagePath} alt="Preview {imagePath.split('/').pop()}" class="w-full h-24 object-cover rounded mb-1.5"/>
										<p class="truncate text-gray-600" title={imagePath}>{imagePath.split('/').pop()}</p>
										<button 
											type="button"
											onclick={() => copyImageMarkdown(imagePath)}
											class="mt-1 w-full text-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-[10px] leading-tight"
										>
											Copy MD
										</button>
									</div>
								{/each}
							</div>
							<p class="text-xs text-gray-500 mt-1">Click "Copy MD" to get the Markdown for an image.</p>
						</div>
					{/if}

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
								class="w-full  p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
								placeholder="Write your blog post content here using Markdown..."
							></textarea>
						{/if}
					</div>

					<div class="sticky bottom-0 bg-white flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6 pb-2">
						<button 
							type="button" 
							onclick={() => {
								oncancel(); // Call the oncancel callback
								show = false;   // Then close the modal
							}}
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
