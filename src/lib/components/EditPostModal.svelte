<script lang="ts">
	import { marked } from 'marked';
	import { calculateDuration, copyImageMarkdown } from '$lib/util/helper.js';
	import type { PostData } from '$lib/types/post.js';
	// Props for the modal
	import type { EditPostModalType } from '../types/post.js';
	let {
		show = $bindable(false),
		postData = $bindable<PostData>({} as PostData),
		allCurrentTags = $bindable([]),
		availableImages = [],
		onSaved = () => {}, // Callback for successful save
		onCancel = () => {} // Callback for cancellation
	}: EditPostModalType = $props();

	// State for the post data being edited
	let title = $state('');
	let slug = $state('');
	let content = $state('');
	let postTags = $state<string[]>([]);
	let newTagInput = $state('');
	let showPreview = $state(false);
	let lang = $state('en');

	// Performance: throttle content updates and debounce preview rendering
	let rafId: number | null = null;
	let previewHtml = $state('');
	let previewTimeoutId: number | null = null;

	// Initialize form data when modal opens
	$effect(() => {
		if (show && postData) {
			title = postData.title || '';
			slug = postData.slug || '';
			content = postData.content || '';
			postTags = [...(postData.tags || [])];
			lang = postData.lang || 'en';
			showPreview = false; // Ensure preview is off initially
			newTagInput = '';
		}
	});

	// Debounce preview rendering to avoid heavy work on every keystroke
	$effect(() => {
		if (!showPreview) return;
		if (previewTimeoutId !== null) {
			clearTimeout(previewTimeoutId);
		}
		previewTimeoutId = window.setTimeout(() => {
			const maybeHtml = marked(content);
			Promise.resolve(maybeHtml).then((html) => {
				previewHtml = html;
			});
			previewTimeoutId = null;
		}, 120);
	});

	function onContentInput(event: Event) {
		const value = (event.target as HTMLTextAreaElement).value;
		if (rafId !== null) cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			content = value;
			rafId = null;
		});
	}

	// Function to handle post update
	async function handleUpdatePost() {
		// Ensure originalSlug is present and valid
		if (!postData || typeof postData.slug !== 'string' || !postData.slug.trim()) {
			alert(
				'Developer Alert: Original slug is missing or invalid in postData. See console for details.'
			);
			console.error(
				'EditPostModal Error: originalSlug is missing or invalid. postData.slug:',
				postData?.slug
			);
			return;
		}

		if (!title.trim()) {
			alert('Please enter a title for your post.');
			return;
		}
		if (!content.trim()) {
			alert('Please add some content to your post.');
			return;
		}
		if (!slug.trim()) {
			// This 'slug' is the new slug from the input
			alert('Please enter a URL slug for your post.');
			return;
		}

		// Use the custom slug, but still sanitize it
		const finalSlug = slug
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^\w-]+/g, '');

		// Calculate duration on demand
		const durationValue = calculateDuration(content, lang);

		// Create the markdown content with frontmatter
		const frontmatter = `---
title: '${title}'
date: '${postData.date || new Date().toISOString().split('T')[0]}'
slug: '${finalSlug}'
lang: '${lang}'
duration: '${durationValue}min'
tags: [${postTags.map((tag) => `'${tag}'`).join(', ')}]
---

${content}`;

		// Log the actual payload being sent
		const payload = {
			originalSlug: postData.slug, // This is the crucial one
			newSlug: finalSlug,
			content: frontmatter
		};

		try {
			const response = await fetch('/api/edit-post', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload) // Use the logged payload
			});

			if (response.ok) {
				alert('Post updated successfully!');
				onSaved(); // Call the onSaved callback
				show = false;
			} else {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Unknown server error or non-JSON response' }));
				console.error('Server error response:', response.status, errorData);
				alert(`Failed to update post: ${errorData.message || response.statusText}`);
			}
		} catch (error) {
			console.error('Error updating post (network or client-side issue):', error);
			alert('An error occurred while updating the post.');
		}
	}

	// Function to toggle a tag for the post
	function togglePostTag(tag: string) {
		const index = postTags.indexOf(tag);
		if (index > -1) {
			postTags = postTags.filter((t) => t !== tag);
		} else {
			postTags = [...postTags, tag];
		}
	}

	// Function to add a new tag from the input field
	function addNewTag() {
		const newTag = newTagInput.trim();
		if (newTag) {
			// Add to the post's specific tags if it's not already there
			if (!postTags.includes(newTag)) {
				postTags = [...postTags, newTag];
			}

			// Add to global tags if not already there
			if (!allCurrentTags.includes(newTag)) {
				allCurrentTags = [...allCurrentTags, newTag].sort();
			}
		}
		newTagInput = '';
	}

	// Function to reset form to original values
	function resetForm() {
		if (confirm('Are you sure you want to reset all changes?')) {
			title = postData.title || '';
			slug = postData.slug || '';
			content = postData.content || '';
			postTags = [...(postData.tags || [])];
			lang = postData.lang || 'en';
			newTagInput = '';
		}
	}
</script>

{#if show}
	<div
		class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black p-4"
	>
		<div class="flex max-h-[90vh] w-4xl flex-col rounded-lg bg-white p-6 shadow-xl sm:p-8">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-semibold text-gray-800">Edit Post</h2>
				<button
					onclick={() => {
						onCancel();
						show = false;
					}}
					class="text-2xl text-gray-500 hover:text-gray-700"
				>
					&times;
				</button>
			</div>

			<div class="flex-grow overflow-y-auto pr-2">
				<form
					onsubmit={() => {
						/* handleUpdatePost is called by button */
					}}
					class="space-y-4"
				>
					<section class="flex justify-between">
						<div class="mr-2 w-1/2 gap-3">
							<label
								for="edit-post-title-input"
								class="mb-1 block text-sm font-medium text-gray-700">Title</label
							>
							<input
								type="text"
								id="edit-post-title-input"
								bind:value={title}
								class="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-gray-500"
								required
							/>
						</div>

						<div class="w-1/2">
							<label for="edit-post-slug-input" class="mb-1 block text-sm font-medium text-gray-700"
								>URL Slug</label
							>
							<div class="flex items-center">
								<span
									class="rounded-l-md border border-r-0 border-gray-300 bg-gray-100 p-2 text-gray-500"
									>/blog/</span
								>
								<input
									type="text"
									id="edit-post-slug-input"
									bind:value={slug}
									placeholder="your-post-url"
									class="flex-grow rounded-r-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-gray-500"
									required
								/>
							</div>
						</div>
					</section>

					<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
						<div>
							<label for="edit-post-lang" class="mb-1 block text-sm font-medium text-gray-700"
								>Language</label
							>
							<select
								id="edit-post-lang"
								bind:value={lang}
								class="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-gray-500"
							>
								<option value="en">English</option>
								<option value="zh-tw">Traditional Chinese</option>
							</select>
						</div>
					</div>

					<div class="space-y-2">
						<div>
							<p class="mb-1 block text-sm font-medium text-gray-700">Tags</p>
							<div class="mb-1 flex flex-wrap gap-2">
								{#each allCurrentTags as tag (tag)}
									{@const isSelected = postTags.includes(tag)}
									<button
										type="button"
										onclick={() => togglePostTag(tag)}
										class={`rounded-full border px-3 py-1 text-xs 
                                                ${
																									isSelected
																										? 'border-gray-600 bg-gray-500 text-white'
																										: 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
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
								class="flex-grow rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-gray-500"
								onkeypress={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										addNewTag();
									}
								}}
							/>
							<button
								type="button"
								onclick={addNewTag}
								class="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
							>
								Add Tag
							</button>
						</div>
						{#if postTags.length > 0}
							<div class="mt-1">
								<p class="text-xs text-gray-600">Selected tags for this post:</p>
								<div class="mt-1 flex flex-wrap gap-1">
									{#each postTags as tag (tag)}
										<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
											>{tag}</span
										>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Section to display available images -->
					{#if availableImages && availableImages.length > 0}
						<div class="mt-4 border-t border-gray-200 pt-4">
							<h4 class="text-md mb-2 font-medium text-gray-700">Available Images</h4>
							<div
								class="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto rounded-md border bg-gray-50 p-2 sm:grid-cols-3 md:grid-cols-4"
							>
								{#each availableImages as imagePath (imagePath)}
									<div
										class="rounded border border-gray-200 bg-white p-1.5 text-xs shadow-sm transition-shadow hover:shadow-md"
									>
										<img
											src={imagePath}
											alt="Preview {imagePath.split('/').pop()}"
											class="mb-1.5 h-24 w-full rounded object-cover"
										/>
										<p class="truncate text-gray-600" title={imagePath}>
											{imagePath.split('/').pop()}
										</p>
										<button
											type="button"
											onclick={() => copyImageMarkdown(imagePath)}
											class="mt-1 w-full rounded bg-blue-500 px-2 py-1 text-center text-[10px] leading-tight text-white hover:bg-blue-600"
										>
											Copy MD
										</button>
									</div>
								{/each}
							</div>
							<p class="mt-1 text-xs text-gray-500">
								Click "Copy MD" to get the Markdown for an image.
							</p>
						</div>
					{/if}

					<div class="mt-3">
						<div class="mb-1 flex items-center justify-between">
							<label for="edit-post-content" class="block text-sm font-medium text-gray-700">
								{showPreview ? 'Live Preview' : 'Content (Markdown)'}
							</label>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={resetForm}
									class="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
								>
									Reset
								</button>
								<button
									type="button"
									onclick={() => (showPreview = !showPreview)}
									class="rounded-md border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
								>
									{showPreview ? 'Edit Content' : 'Show Preview'}
								</button>
							</div>
						</div>

						{#if showPreview}
							<div
								class="prose prose-sm sm:prose-base max-w-none overflow-y-auto rounded-md border border-gray-300 bg-gray-50 p-3"
								style="min-height: calc(20em + 40px);"
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html previewHtml}
							</div>
						{:else}
							<textarea
								id="edit-post-content"
								value={content}
								oninput={onContentInput}
								rows="15"
								class="w-full rounded-md border border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-gray-500"
								placeholder="Edit your blog post content here using Markdown..."
							></textarea>
						{/if}
					</div>

					<div
						class="sticky bottom-0 z-20 mt-6 flex justify-end space-x-3 border-t border-gray-200 bg-white pt-4 pb-2"
					>
						<button
							type="button"
							onclick={() => {
								onCancel();
								show = false;
							}}
							class="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={handleUpdatePost}
							class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:ring-4 focus:ring-green-300"
						>
							Update Post
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
