<script lang="ts">
	import NotionLikeEditor from './NotionLikeEditor.svelte';
	import WritingStudio from './WritingStudio.svelte';
	import EditorViewToggle from './EditorViewToggle.svelte';
	import ImagePickerDrawer from './ImagePickerDrawer.svelte';
	import { calculateDuration, countContentUnits } from '$lib/util/helper.js';
	import type { PostData } from '$lib/types/post.js';
	import type { PostEditorModalType } from '$lib/types/post.js';
	import type { EditorViewMode } from '$lib/types/editor.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { showToast } from '$lib/stores/toast.svelte.js';
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

	let title = $state('');
	let slug = $state('');
	let content = $state('');
	let postTags = $state<string[]>([]);
	let newTagInput = $state('');
	let lang = $state('en');
	let isSaving = $state(false);
	let isDismissedWhileSaving = $state(false);
	let slugManuallyEdited = $state(false);
	let viewMode = $state<EditorViewMode>('write');
	let drawerOpen = $state(false);

	let visible = $derived(show && !isDismissedWhileSaving);
	let unitCount = $derived(countContentUnits(content, lang));
	let readingMinutes = $derived(calculateDuration(content, lang));
	let unitLabel = $derived(lang === 'zh-tw' ? 'chars' : 'words');

	$effect(() => {
		if (show) {
			isDismissedWhileSaving = false;
			drawerOpen = false;
			if (mode === 'edit' && postData) {
				title = postData.title || '';
				slug = postData.slug || '';
				content = postData.content || '';
				postTags = [...(postData.tags || [])];
				lang = postData.lang || 'en';
				slugManuallyEdited = true;
			} else if (mode === 'create') {
				title = '';
				slug = '';
				content = '';
				postTags = [];
				lang = 'en';
				slugManuallyEdited = false;
			}
			newTagInput = '';
		}
	});

	function slugify(value: string) {
		return value
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^\w-]+/g, '');
	}

	function handleTitleInput(event: Event) {
		title = (event.target as HTMLInputElement).value;
		if (mode === 'create' && !slugManuallyEdited) {
			slug = slugify(title);
		}
	}

	function handleSlugInput(event: Event) {
		slug = (event.target as HTMLInputElement).value;
		slugManuallyEdited = true;
	}

	function close() {
		onCancel();
		show = false;
	}

	async function handleCreatePost() {
		if (isSaving) return;
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

		const finalSlug = slugify(slug);
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

		isSaving = true;
		isDismissedWhileSaving = true;
		showToast('Publishing...', 'info', 2500);
		try {
			const blog = await createBlog(
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
			showToast('Published', 'success', 2000);
			onSaved(blog);
			title = '';
			slug = '';
			content = '';
			postTags = [];
			newTagInput = '';
			show = false;
			isDismissedWhileSaving = false;
		} catch (error) {
			console.error('Error creating post:', error);
			showToast(
				`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error',
				5000
			);
			isDismissedWhileSaving = false;
		} finally {
			isSaving = false;
		}
	}

	async function handleUpdatePost() {
		if (isSaving) return;
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

		const finalSlug = slugify(slug);
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

		isSaving = true;
		isDismissedWhileSaving = true;
		showToast('Updating...', 'info', 2500);
		try {
			const blog = await updateBlog(
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
			showToast('Updated', 'success', 2000);
			onSaved(blog);
			show = false;
			isDismissedWhileSaving = false;
		} catch (error) {
			console.error('Error updating post:', error);
			showToast(
				`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error',
				5000
			);
			isDismissedWhileSaving = false;
		} finally {
			isSaving = false;
		}
	}

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

	function resetForm() {
		if (!confirm('Are you sure you want to reset all changes?')) return;
		if (mode === 'edit' && postData) {
			title = postData.title || '';
			slug = postData.slug || '';
			content = postData.content || '';
			postTags = [...(postData.tags || [])];
			lang = postData.lang || 'en';
			slugManuallyEdited = true;
		} else {
			title = '';
			slug = '';
			content = '';
			postTags = [];
			slugManuallyEdited = false;
		}
		newTagInput = '';
	}

	function handleSave() {
		if (isSaving) return;
		if (mode === 'create') handleCreatePost();
		else handleUpdatePost();
	}

	function handleWindowKey(event: KeyboardEvent) {
		if (!visible) return;
		if ((event.metaKey || event.ctrlKey) && event.key === 's') {
			event.preventDefault();
			handleSave();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKey} />

<WritingStudio show={visible} bind:drawerOpen onClose={close} labelledBy="post-editor-title">
	{#snippet header()}
		<div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
			<div class="flex min-w-0 items-center gap-2">
				<button
					type="button"
					onclick={close}
					class="rounded-md px-2 py-1 text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700"
					aria-label="Close editor"
				>
					&times;
				</button>
				<h2 id="post-editor-title" class="truncate text-sm font-medium text-gray-800">
					{mode === 'create' ? 'New Post' : 'Edit Post'}
				</h2>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<EditorViewToggle bind:value={viewMode} />
				<select
					id="post-lang"
					bind:value={lang}
					class="rounded-md border-gray-200 py-1 text-xs text-gray-700 focus:border-gray-400 focus:ring-gray-400"
				>
					<option value="en">EN</option>
					<option value="zh-tw">ZH</option>
				</select>
				<button
					type="button"
					onclick={() => (drawerOpen = !drawerOpen)}
					class="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors
						{drawerOpen
						? 'border-gray-800 bg-gray-800 text-white'
						: 'border-gray-300 text-gray-600 hover:bg-gray-50'}"
				>
					Images
				</button>
				<button
					type="button"
					onclick={resetForm}
					disabled={isSaving}
					class="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
				>
					Reset
				</button>
				<button
					type="button"
					onclick={handleSave}
					disabled={isSaving}
					class="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{#if isSaving}
						{mode === 'create' ? 'Publishing...' : 'Updating...'}
					{:else}
						{mode === 'create' ? 'Publish' : 'Update'}
					{/if}
				</button>
			</div>
		</div>
	{/snippet}

	{#snippet meta()}
		<input
			type="text"
			id="post-title-input"
			value={title}
			oninput={handleTitleInput}
			placeholder="Untitled post"
			class="w-full border-0 bg-transparent p-0 font-serif text-3xl font-semibold text-gray-900 placeholder:text-gray-300 focus:ring-0"
			required
		/>
		<div class="mt-2 flex items-center text-sm text-gray-400">
			<span class="shrink-0">/blog/</span>
			<input
				type="text"
				id="post-slug-input"
				value={slug}
				oninput={handleSlugInput}
				placeholder="your-post-url"
				class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-500 placeholder:text-gray-300 focus:ring-0"
				required
			/>
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-1.5">
			{#each postTags as tag (tag)}
				<button
					type="button"
					onclick={() => togglePostTag(tag)}
					class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
				>
					{tag} ×
				</button>
			{/each}
			<input
				type="text"
				bind:value={newTagInput}
				placeholder="Add tag"
				list="post-tag-suggestions"
				class="w-36 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						addNewTag();
					}
				}}
			/>
			<datalist id="post-tag-suggestions">
				{#each allCurrentTags as tag (tag)}
					<option value={tag}></option>
				{/each}
			</datalist>
		</div>
	{/snippet}

	<NotionLikeEditor
		{content}
		onContentChange={(value) => (content = value)}
		{viewMode}
		placeholder="{mode === 'create'
			? 'Write'
			: 'Edit'} your blog post content here using Markdown. Type '/' for commands..."
	/>

	{#snippet footer()}
		<div class="flex items-center justify-between px-4 py-2 sm:px-5">
			<div class="flex items-center gap-3">
				{#if mode === 'edit'}
					<button
						type="button"
						onclick={handleDeletePost}
						disabled={isSaving}
						class="text-xs font-medium text-red-600 hover:text-red-700"
					>
						Delete
					</button>
				{/if}
				<p class="text-xs text-gray-400">
					{unitCount.toLocaleString()}
					{unitLabel} · {readingMinutes} min read
				</p>
			</div>
			<button
				type="button"
				onclick={close}
				class="text-xs font-medium text-gray-500 hover:text-gray-700"
			>
				Cancel
			</button>
		</div>
	{/snippet}

	{#snippet drawer()}
		<ImagePickerDrawer bind:open={drawerOpen} {availablePhotos} {availableAssets} enableS3={true} />
	{/snippet}
</WritingStudio>
