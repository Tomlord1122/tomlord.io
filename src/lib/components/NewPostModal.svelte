<script lang="ts">
	import { marked } from 'marked';
	import { calculateDuration, copyImageMarkdown } from '$lib/util/helper.js';
	import type { NewPostModalType } from '../types/post.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { createBlog } from '$lib/api/blogs.js';
	let {
		show = $bindable(false),
		allCurrentTags = $bindable([]),
		availableImages = [], // New prop for available image paths
		onSaved = () => {}, // Default to an empty function
		onCancel = () => {} // Default to an empty function
	}: NewPostModalType = $props();

	let lang = $state('en');
	// State for the new post data
	let title = $state('');
	let slug = $state(''); // Separate state for customizable slug
	let content = $state('');
	let postTags = $state<string[]>([]); // Tags selected for this new post
	let newTagInput = $state(''); // For typing a new tag
	let showPreview = $state(false); // Controls whether to show preview or editor

	// Performance: throttle content updates and debounce preview rendering
	let rafId: number | null = null;
	let previewHtml = $state('');
	let previewTimeoutId: number | null = null;

	// Function to close the modal
	function closeModal() {
		show = false; // This updates the 'show' prop in the parent component
	}

	// Debounce preview rendering to avoid heavy work on every keystroke
	$effect(() => {
		if (!showPreview) return;
		if (previewTimeoutId !== null) {
			clearTimeout(previewTimeoutId);
		}
		previewTimeoutId = window.setTimeout(() => {
			const maybeHtml = marked(content || '');
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

	// Function to handle post creation
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

		// Check authentication
		if (!auth.token) {
			alert('You must be logged in to create posts.');
			return;
		}

		const finalSlug = slug
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^\w-]+/g, '');

		const duration = calculateDuration(content, lang);
		const dateStr = new Date().toISOString().split('T')[0];

		// Create the markdown content with frontmatter for storage
		const fullContent = `---
title: '${title}'
date: '${dateStr}'
slug: '${finalSlug}'
lang: '${lang}'
duration: '${duration}min'
tags: [${postTags.map((tag) => `'${tag}'`).join(', ')}]
---

${content}`;

		try {
			await createBlog(
				{
					title,
					slug: finalSlug,
					date: dateStr,
					lang,
					duration: `${duration}min`,
					tags: postTags,
					description: '',
					content: fullContent,
					is_published: true
				},
				auth.token
			);

			alert('Post created successfully!');
			onSaved();
			// Reset form and close modal
			title = '';
			slug = '';
			content = '';
			postTags = [];
			newTagInput = '';
			closeModal();
		} catch (error) {
			console.error('Error creating post:', error);
			alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// Function to toggle a tag for the new post
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
			if (!postTags.includes(newTag)) {
				postTags = [...postTags, newTag];
			}
			if (!allCurrentTags.includes(newTag)) {
				allCurrentTags = [...allCurrentTags, newTag].sort();
			}
		}
		newTagInput = '';
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

	<!-- Modal content - full width with max constraint -->
	<div
		class="fixed inset-4 z-50 mx-auto flex max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 sm:inset-6 md:inset-8"
	>
		<!-- Header -->
		<div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="text-2xl font-semibold text-gray-800">Create New Post</h2>
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
					/* handleCreatePost is called by button, prevent default form submission if any */
				}}
				class="space-y-4"
			>
				<section class="flex justify-between">
					<div class="mr-2 w-1/2 gap-3">
						<label for="post-title-input" class="mb-1 block text-sm font-medium text-gray-700"
							>Title</label
						>
						<input
							type="text"
							id="post-title-input"
							bind:value={title}
							class="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-gray-500"
							required
						/>
					</div>

					<div class="w-1/2">
						<label for="post-slug-input" class="mb-1 block text-sm font-medium text-gray-700"
							>URL Slug (for the post URL)</label
						>
						<div class="flex items-center">
							<span
								class="rounded-l-md border border-r-0 border-gray-300 bg-gray-100 p-2 text-gray-500"
								>/blog/</span
							>
							<input
								type="text"
								id="post-slug-input"
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
						<label for="post-lang" class="mb-1 block text-sm font-medium text-gray-700"
							>Language</label
						>
						<select
							id="post-lang"
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
				{#if availableImages.length > 0}
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
						<label for="post-content" class="block text-sm font-medium text-gray-700">
							{showPreview ? 'Live Preview' : 'Content (Markdown)'}
						</label>
						<button
							type="button"
							onclick={() => (showPreview = !showPreview)}
							class="rounded-md border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
						>
							{showPreview ? 'Edit Content' : 'Show Preview'}
						</button>
					</div>

					{#if showPreview}
						<div
							class="prose prose-sm sm:prose-base z-20 max-w-none overflow-y-auto rounded-md border border-gray-300 bg-gray-50 p-3"
							style="min-height: calc(20em + 40px);"
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html previewHtml}
						</div>
					{:else}
						<textarea
							id="post-content"
							value={content}
							oninput={onContentInput}
							rows="15"
							class="z-20 w-full rounded-md border border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-gray-500"
							placeholder="Write your blog post content here using Markdown..."
						></textarea>
					{/if}
				</div>
			</form>
		</div>

		<!-- Footer with action buttons -->
		<div class="flex shrink-0 justify-end space-x-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
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
				onclick={handleCreatePost}
				class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
			>
				Create Post
			</button>
		</div>
	</div>
{/if}
