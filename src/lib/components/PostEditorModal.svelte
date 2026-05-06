<script lang="ts">
	import NotionLikeEditor from './NotionLikeEditor.svelte';
	import S3Modal from './S3Modal.svelte';
	import LazyImage from './LazyImage.svelte';
	import {
		calculateDuration,
		copyImageMarkdown,
		buildPhotoPostHTML,
		getImageDimensions
	} from '$lib/util/helper.js';
	import { listDrawings, deleteFromStorage, type StorageFile } from '$lib/supabase.js';
	import type { PostData } from '$lib/types/post.js';
	import type { PostEditorModalType } from '$lib/types/post.js';
	import { SvelteSet } from 'svelte/reactivity';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { createBlog, updateBlog, deleteBlog } from '$lib/api/blogs.js';

	let {
		show = $bindable(false),
		mode,
		postData = $bindable<PostData | undefined>(undefined),
		allCurrentTags = $bindable([]),
		availablePhotos = [],
		availableAssets = [],
		onSaved = () => {},
		onCancel = () => {},
		onDeleted = () => {}
	}: PostEditorModalType = $props();

	// Form state
	let title = $state('');
	let slug = $state('');
	let content = $state('');
	let postTags = $state<string[]>([]);
	let newTagInput = $state('');
	let lang = $state('en');

	// Image picker state — default to Content collection
	let imagePickerCollection = $state<'photography' | 'content' | 's3'>('content');
	let isImageSectionActive = $state(false);
	let showS3Modal = $state(false);

	// S3 storage images
	let s3Images = $state<StorageFile[]>([]);
	let s3Loading = $state(false);
	let s3Deleting = new SvelteSet<string>();

	async function loadS3Images() {
		s3Loading = true;
		const { files, error } = await listDrawings();
		if (error) {
			console.error('Failed to load S3 images:', error.message);
		} else {
			s3Images = files;
		}
		s3Loading = false;
	}

	async function deleteS3Image(name: string) {
		if (!confirm(`Delete "${name}" from S3 storage? This cannot be undone.`)) return;
		s3Deleting.add(name);
		try {
			const { error } = await deleteFromStorage(`drawings/${name}`);
			if (error) {
				alert(`Delete failed: ${error.message}`);
			} else {
				s3Images = s3Images.filter((img) => img.name !== name);
			}
		} finally {
			s3Deleting.delete(name);
		}
	}

	async function copyS3ImageMarkdown(publicUrl: string) {
		// Probe dimensions so the inserted snippet carries width/height attributes
		// (prevents layout shift when the post is rendered).
		const dimensions = await getImageDimensions(publicUrl);
		const markdown = buildPhotoPostHTML(publicUrl, dimensions);
		navigator.clipboard.writeText(markdown).catch(() => {
			// fallback: insert into content
			const separator = content.trim().length > 0 && !content.endsWith('\n\n') ? '\n\n' : '';
			content = content + separator + markdown + '\n';
		});
	}

	let activeImages = $derived(
		imagePickerCollection === 'photography' ? availablePhotos : availableAssets
	);

	// Initialise form when modal opens and lock body scroll
	$effect(() => {
		if (show) {
			if (mode === 'edit' && postData) {
				title = postData.title || '';
				slug = postData.slug || '';
				content = postData.content || '';
				postTags = [...(postData.tags || [])];
				lang = postData.lang || 'en';
			} else if (mode === 'create') {
				title = '';
				slug = '';
				content = '';
				postTags = [];
				lang = 'en';
			}
			newTagInput = '';
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});

	// ── Create ────────────────────────────────────────────────────────────────
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
			title = '';
			slug = '';
			content = '';
			postTags = [];
			newTagInput = '';
			show = false;
		} catch (error) {
			console.error('Error creating post:', error);
			alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// ── Update ────────────────────────────────────────────────────────────────
	async function handleUpdatePost() {
		if (!postData || typeof postData.slug !== 'string' || !postData.slug.trim()) {
			alert('Developer Alert: Original slug is missing or invalid in postData.');
			console.error(
				'PostEditorModal Error: originalSlug is missing or invalid. postData.slug:',
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
			alert('Please enter a URL slug for your post.');
			return;
		}
		if (!auth.token) {
			alert('You must be logged in to update posts.');
			return;
		}

		const finalSlug = slug
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^\w-]+/g, '');
		const durationValue = calculateDuration(content, lang);

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

	// ── Delete ────────────────────────────────────────────────────────────────
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
		if (!confirmDelete) return;

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

	// ── Tags ──────────────────────────────────────────────────────────────────
	function togglePostTag(tag: string) {
		const index = postTags.indexOf(tag);
		postTags = index > -1 ? postTags.filter((t) => t !== tag) : [...postTags, tag];
	}

	function addNewTag() {
		const newTag = newTagInput.trim();
		if (newTag) {
			if (!postTags.includes(newTag)) postTags = [...postTags, newTag];
			if (!allCurrentTags.includes(newTag)) allCurrentTags = [...allCurrentTags, newTag].sort();
		}
		newTagInput = '';
	}

	// ── Reset ─────────────────────────────────────────────────────────────────
	function resetForm() {
		if (!confirm('Are you sure you want to reset all changes?')) return;
		if (mode === 'edit' && postData) {
			title = postData.title || '';
			slug = postData.slug || '';
			content = postData.content || '';
			postTags = [...(postData.tags || [])];
			lang = postData.lang || 'en';
		} else {
			title = '';
			slug = '';
			content = '';
			postTags = [];
		}
		newTagInput = '';
	}

	function handleSave() {
		if (mode === 'create') handleCreatePost();
		else handleUpdatePost();
	}

	function handleS3Upload(imageMarkdown: string) {
		navigator.clipboard.writeText(imageMarkdown).catch(() => {
			// fallback: insert into content
			const separator = content.trim().length > 0 && !content.endsWith('\n\n') ? '\n\n' : '';
			content = content + separator + imageMarkdown + '\n';
		});
		// Refresh S3 list if the tab is active
		if (imagePickerCollection === 's3') {
			loadS3Images();
		}
	}
</script>

{#if show}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/60 transition-opacity duration-300"
		onclick={() => {
			onCancel();
			show = false;
		}}
		role="button"
		tabindex="-1"
		onkeydown={(e) => e.key === 'Escape' && (show = false)}
	></div>

	<!-- Modal -->
	<div
		class="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 sm:inset-4"
	>
		<!-- Header -->
		<div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="text-2xl font-semibold text-gray-800">
				{mode === 'create' ? 'Create New Post' : 'Edit Post'}
			</h2>
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

		<!-- Scrollable body -->
		<div class="grow overflow-y-auto px-6 py-4">
			<form onsubmit={() => {}} class="space-y-4">
				<!-- Title + Slug -->
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
							>URL Slug</label
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
								class="grow rounded-r-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-gray-500"
								required
							/>
						</div>
					</div>
				</section>

				<!-- Language -->
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

				<!-- Tags -->
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

				<!-- Image picker -->
				<div class="mt-4 border-t border-gray-200 pt-4">
					<div class="mb-2 flex items-center justify-between">
						<h4 class="text-sm font-medium text-gray-700">Available Images</h4>
						<!-- Collection toggle + Upload -->
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (showS3Modal = true)}
								class="rounded-md border border-purple-300 px-3 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-50
									{imagePickerCollection === 's3' ? 'visible' : 'invisible'}"
							>
								+ Upload
							</button>
							<div class="flex overflow-hidden rounded-md border border-gray-300">
								<button
									type="button"
									onclick={() => (imagePickerCollection = 'content')}
									class="px-3 py-1 text-xs font-medium transition-colors duration-150
										{imagePickerCollection === 'content'
										? 'bg-gray-800 text-white'
										: 'bg-white text-gray-600 hover:bg-gray-50'}"
								>
									Content
								</button>
								<button
									type="button"
									onclick={() => (imagePickerCollection = 'photography')}
									class="border-l border-gray-300 px-3 py-1 text-xs font-medium transition-colors duration-150
										{imagePickerCollection === 'photography'
										? 'bg-gray-800 text-white'
										: 'bg-white text-gray-600 hover:bg-gray-50'}"
								>
									Photography
								</button>
								<button
									type="button"
									onclick={() => {
										imagePickerCollection = 's3';
										if (s3Images.length === 0) loadS3Images();
									}}
									class="border-l border-gray-300 px-3 py-1 text-xs font-medium transition-colors duration-150
										{imagePickerCollection === 's3'
										? 'bg-gray-800 text-white'
										: 'bg-white text-gray-600 hover:bg-gray-50'}"
								>
									S3 Image
								</button>
							</div>
						</div>
					</div>

					{#if imagePickerCollection === 's3'}
						{#if s3Loading}
							<p class="rounded-md bg-gray-50 p-3 text-xs text-gray-500">Loading S3 images...</p>
						{:else if s3Images.length > 0}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								onclick={() => (isImageSectionActive = true)}
								onmouseleave={() => (isImageSectionActive = false)}
								style="scrollbar-gutter: stable;"
								class="grid max-h-96 grid-cols-3 gap-2 rounded-md border p-2 transition-colors sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8
									{isImageSectionActive
									? 'overflow-y-auto border-blue-300 bg-blue-50'
									: 'overflow-hidden bg-gray-50'}"
							>
								{#each s3Images as image (image.name)}
									<div
										class="group relative aspect-square rounded border border-gray-200 bg-white p-1 transition-shadow hover:shadow-md"
									>
										<!-- Copy button — covers the whole card -->
										<button
											type="button"
											onclick={() => copyS3ImageMarkdown(image.publicUrl)}
											class="absolute inset-0 rounded"
											title="Click to copy: {image.name}"
										>
											<LazyImage
												src={image.publicUrl}
												alt="S3 {image.name}"
												class="h-full w-full rounded object-cover"
											/>
											<span
												class="absolute inset-0 flex items-center justify-center rounded bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
											>
												Copy
											</span>
										</button>
										<!-- Delete button — top-right corner -->
										<button
											type="button"
											onclick={() => deleteS3Image(image.name)}
											disabled={s3Deleting.has(image.name)}
											class="absolute top-0.5 right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 disabled:bg-gray-400"
											title="Delete {image.name}"
											aria-label="Delete {image.name}"
										>
											{#if s3Deleting.has(image.name)}
												<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
													<circle
														class="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														stroke-width="4"
													></circle>
													<path
														class="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
													></path>
												</svg>
											{:else}
												<svg
													class="h-3 w-3"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="3"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											{/if}
										</button>
									</div>
								{/each}
							</div>
							<p class="mt-1 text-xs text-gray-500">
								{isImageSectionActive ? 'Scroll to browse. ' : 'Click to enable scrolling. '}Click
								an image to copy its Markdown.
							</p>
						{:else}
							<p class="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
								No S3 images yet. Click "+ Upload" to add one.
							</p>
						{/if}
					{:else if activeImages.length > 0}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							onclick={() => (isImageSectionActive = true)}
							onmouseleave={() => (isImageSectionActive = false)}
							style="scrollbar-gutter: stable;"
							class="grid max-h-96 grid-cols-3 gap-2 rounded-md border p-2 transition-colors sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8
								{isImageSectionActive
								? 'overflow-y-auto border-blue-300 bg-blue-50'
								: 'overflow-hidden bg-gray-50'}"
						>
							{#each activeImages as imagePath (imagePath)}
								<button
									type="button"
									onclick={() => copyImageMarkdown(imagePath)}
									class="group relative aspect-square rounded border border-gray-200 bg-white p-1 transition-shadow hover:shadow-md"
									title="Click to copy: {imagePath.split('/').pop()}"
								>
									<LazyImage
										src={imagePath}
										alt="Preview {imagePath.split('/').pop() ?? ''}"
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
					{:else}
						<p class="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
							No {imagePickerCollection === 'content' ? 'content' : 'photography'} images available yet.
						</p>
					{/if}
				</div>

				<!-- Content editor -->
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
					<div class="h-[500px]">
						<NotionLikeEditor
							{content}
							onContentChange={(value) => (content = value)}
							placeholder="{mode === 'create'
								? 'Write'
								: 'Edit'} your blog post content here using Markdown. Type '/' for commands..."
						/>
					</div>
				</div>
			</form>
		</div>

		<!-- Footer -->
		<div class="flex shrink-0 justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
			<!-- Delete only shown in edit mode -->
			{#if mode === 'edit'}
				<button
					type="button"
					onclick={handleDeletePost}
					class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:ring-4 focus:ring-red-300"
				>
					Delete Post
				</button>
			{:else}
				<div></div>
			{/if}

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
					onclick={handleSave}
					class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-300"
				>
					{mode === 'create' ? 'Create Post' : 'Update Post'}
				</button>
			</div>
		</div>
	</div>
{/if}

<S3Modal bind:show={showS3Modal} onInsert={handleS3Upload} />
