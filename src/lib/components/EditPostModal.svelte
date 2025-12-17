<script lang="ts">
	import NotionLikeEditor from './NotionLikeEditor.svelte';
	import { calculateDuration, copyImageMarkdown } from '$lib/util/helper.js';
	import type { PostData } from '$lib/types/post.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { updateBlog, deleteBlog } from '$lib/api/blogs.js';
	// Props for the modal
	import type { EditPostModalType } from '../types/post.js';
	let {
		show = $bindable(false),
		postData = $bindable<PostData>({} as PostData),
		allCurrentTags = $bindable([]),
		availableImages = [],
		onSaved = () => {}, // Callback for successful save
		onCancel = () => {}, // Callback for cancellation
		onDeleted = () => {} // Callback for successful deletion
	}: EditPostModalType & { onDeleted?: () => void } = $props();

	// State for the post data being edited
	let title = $state('');
	let slug = $state('');
	let content = $state('');
	let postTags = $state<string[]>([]);
	let newTagInput = $state('');
	let lang = $state('en');
	let isImageSectionActive = $state(false);

	// Initialize form data when modal opens and lock body scroll
	$effect(() => {
		if (show && postData) {
			title = postData.title || '';
			slug = postData.slug || '';
			content = postData.content || '';
			postTags = [...(postData.tags || [])];
			lang = postData.lang || 'en';
			newTagInput = '';
			// Prevent background scrolling when modal is open
			document.body.style.overflow = 'hidden';
		} else {
			// Restore scrolling when modal closes
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});

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

		// Check authentication
		if (!auth.token) {
			alert('You must be logged in to update posts.');
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

		// Create the markdown content with frontmatter for storage
		const fullContent = `---
title: '${title}'
date: '${postData.date || new Date().toISOString().split('T')[0]}'
slug: '${finalSlug}'
lang: '${lang}'
duration: '${durationValue}min'
tags: [${postTags.map((tag) => `'${tag}'`).join(', ')}]
---

${content}`;

		try {
			await updateBlog(
				postData.slug,
				{
					title,
					date: postData.date || new Date().toISOString().split('T')[0],
					lang,
					duration: `${durationValue}min`,
					tags: postTags,
					description: postData.description || '',
					content: fullContent,
					is_published: postData.is_published ?? true
				},
				auth.token
			);

			alert('Post updated successfully!');
			onSaved();
			show = false;
		} catch (error) {
			console.error('Error updating post:', error);
			alert(`Failed to update post: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

	// Function to handle post deletion
	async function handleDeletePost() {
		if (!postData || !postData.slug) {
			alert('Cannot delete: post data is missing.');
			return;
		}

		if (!auth.token) {
			alert('You must be logged in to delete posts.');
			return;
		}

		const confirmDelete = confirm(
			`Are you sure you want to delete "${postData.title}"?\n\nThis action cannot be undone.`
		);

		if (!confirmDelete) {
			return;
		}

		try {
			await deleteBlog(postData.slug, auth.token);
			alert('Post deleted successfully!');
			onDeleted();
			show = false;
		} catch (error) {
			console.error('Error deleting post:', error);
			alert(`Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
</script>

{#if show}
	<!-- Backdrop with blur effect -->
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
		onclick={() => {
			onCancel();
			show = false;
		}}
		role="button"
		tabindex="-1"
		onkeydown={(e) => e.key === 'Escape' && (show = false)}
	></div>

	<!-- Modal content - full screen with small margin -->
	<div
		class="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 sm:inset-4"
	>
		<!-- Header -->
		<div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="text-2xl font-semibold text-gray-800">Edit Post</h2>
			<button
				onclick={() => {
					onCancel();
					show = false;
				}}
				class="rounded-full p-2 text-2xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
			>
				&times;
			</button>
		</div>

		<!-- Scrollable content area -->
		<div class="grow overflow-y-auto px-6 py-4">
			<form
				onsubmit={() => {
					/* handleUpdatePost is called by button */
				}}
				class="space-y-4"
			>
				<section class="flex justify-between">
					<div class="mr-2 w-1/2 gap-3">
						<label for="edit-post-title-input" class="mb-1 block text-sm font-medium text-gray-700"
							>Title</label
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
								class="grow rounded-r-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-gray-500"
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
							class="grow rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-gray-500"
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
						<h4 class="mb-2 text-sm font-medium text-gray-700">Available Images</h4>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							onclick={() => (isImageSectionActive = true)}
							onmouseleave={() => (isImageSectionActive = false)}
							class="grid max-h-96 grid-cols-3 gap-2 rounded-md border p-2 transition-colors sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 {isImageSectionActive
								? 'overflow-y-auto border-blue-300 bg-blue-50'
								: 'overflow-hidden bg-gray-50'}"
						>
							{#each availableImages as imagePath (imagePath)}
								<button
									type="button"
									onclick={() => copyImageMarkdown(imagePath)}
									class="group relative aspect-square rounded border border-gray-200 bg-white p-1 transition-shadow hover:shadow-md"
									title="Click to copy: {imagePath.split('/').pop()}"
								>
									<img
										src={imagePath}
										alt="Preview {imagePath.split('/').pop()}"
										class="h-full w-full rounded object-cover"
									/>
									<span
										class="absolute inset-0 flex items-center justify-center rounded bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
									>
										Copy
									</span>
								</button>
							{/each}
						</div>
						<p class="mt-1 text-xs text-gray-500">
							{isImageSectionActive ? 'Scroll to browse. ' : 'Click to enable scrolling. '}Click an
							image to copy its Markdown.
						</p>
					</div>
				{/if}

				<div class="mt-3">
					<div class="mb-1 flex items-center justify-between">
						<span class="block text-sm font-medium text-gray-700">Content (Markdown)</span>
						<button
							type="button"
							onclick={resetForm}
							class="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
						>
							Reset
						</button>
					</div>
					<NotionLikeEditor
						{content}
						onContentChange={(value) => (content = value)}
						placeholder="Edit your blog post content here using Markdown. Type '/' for commands..."
					/>
				</div>
			</form>
		</div>

		<!-- Footer with action buttons -->
		<div class="flex shrink-0 justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
			<button
				type="button"
				onclick={handleDeletePost}
				class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:ring-4 focus:ring-red-300"
			>
				Delete Post
			</button>
			<div class="flex space-x-3">
				<button
					type="button"
					onclick={() => {
						onCancel();
						show = false;
					}}
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleUpdatePost}
					class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-300"
				>
					Update Post
				</button>
			</div>
		</div>
	</div>
{/if}
