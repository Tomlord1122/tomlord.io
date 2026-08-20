<script lang="ts">
	import NotionLikeEditor from './NotionLikeEditor.svelte';
	import WritingStudio from './WritingStudio.svelte';
	import EditorViewToggle from './EditorViewToggle.svelte';
	import ImagePickerDrawer from './ImagePickerDrawer.svelte';
	import type { EditPageModalType } from '../types/page.js';
	import type { EditorViewMode } from '$lib/types/editor.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { updatePage } from '$lib/api/pages.js';
	import { showToast } from '$lib/stores/toast.svelte.js';

	let {
		show = $bindable(false),
		pageTitle = '',
		initialContent = '',
		pageName = '',
		availablePhotos = [],
		availableAssets = [],
		onSaved = () => {},
		onCancel = () => {}
	}: EditPageModalType = $props();

	let content = $state('');
	let isSaving = $state(false);
	let isDismissedWhileSaving = $state(false);
	let viewMode = $state<EditorViewMode>('write');
	let drawerOpen = $state(false);

	let visible = $derived(show && !isDismissedWhileSaving);
	let hasImages = $derived(availablePhotos.length > 0 || availableAssets.length > 0);

	$effect(() => {
		if (show) {
			isDismissedWhileSaving = false;
			drawerOpen = false;
			content = initialContent;
		}
	});

	function close() {
		onCancel();
		show = false;
	}

	async function handleSavePage() {
		if (isSaving) return;
		if (!content.trim()) {
			alert('Please add some content to save.');
			return;
		}
		if (!auth.token) {
			alert('You must be logged in to save page content.');
			return;
		}

		const nextContent = content.trim();
		isSaving = true;
		isDismissedWhileSaving = true;
		showToast('Saving page...', 'info', 2500);
		try {
			const page = await updatePage(pageName, nextContent, auth.token);
			showToast('Page saved', 'success', 2000);
			onSaved(page.content);
			show = false;
		} catch (error) {
			console.error('Error saving page:', error);
			showToast(
				`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error',
				5000
			);
			isDismissedWhileSaving = false;
		} finally {
			isSaving = false;
		}
	}

	function resetContent() {
		if (confirm('Are you sure you want to reset all changes?')) {
			content = initialContent;
		}
	}

	function handleWindowKey(event: KeyboardEvent) {
		if (!visible) return;
		if ((event.metaKey || event.ctrlKey) && event.key === 's') {
			event.preventDefault();
			handleSavePage();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKey} />

<WritingStudio show={visible} bind:drawerOpen onClose={close} labelledBy="page-editor-title">
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
				<h2 id="page-editor-title" class="truncate text-sm font-medium text-gray-800">
					Edit {pageTitle}
				</h2>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<EditorViewToggle bind:value={viewMode} />
				{#if hasImages}
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
				{/if}
				<button
					type="button"
					onclick={resetContent}
					disabled={isSaving}
					class="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
				>
					Reset
				</button>
				<button
					type="button"
					onclick={handleSavePage}
					disabled={isSaving}
					class="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{isSaving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	{/snippet}

	<NotionLikeEditor
		{content}
		onContentChange={(value) => (content = value)}
		{viewMode}
		placeholder="Edit your page content here using Markdown. Type '/' for commands..."
	/>

	{#snippet footer()}
		<div class="flex items-center justify-end px-4 py-2 sm:px-5">
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
		<ImagePickerDrawer bind:open={drawerOpen} {availablePhotos} {availableAssets} />
	{/snippet}
</WritingStudio>
