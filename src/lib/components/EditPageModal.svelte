<script lang="ts">
	import NotionLikeEditor from './NotionLikeEditor.svelte';
	import LazyImage from './LazyImage.svelte';
	import type { EditPageModalType } from '../types/page.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { updatePage } from '$lib/api/pages.js';
	import { showToast } from '$lib/stores/toast.svelte.js';
	import { copyImageMarkdown } from '$lib/util/helper.js';

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

	// Image picker state — default to Content collection
	let imagePickerCollection = $state<'photography' | 'content'>('content');
	let isImageSectionActive = $state(false);

	let activeImages = $derived(
		imagePickerCollection === 'photography' ? availablePhotos : availableAssets
	);

	$effect(() => {
		if (show) {
			isDismissedWhileSaving = false;
			content = initialContent;
		}
	});

	$effect(() => {
		document.body.style.overflow = show && !isDismissedWhileSaving ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	function closeModal() {
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
			closeModal();
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
</script>

{#if show && !isDismissedWhileSaving}
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
			<h2 class="text-2xl font-semibold text-gray-800">Edit {pageTitle}</h2>
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
		<div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
			<!-- Image picker -->
			{#if availablePhotos.length > 0 || availableAssets.length > 0}
				<div class="mb-4 border-b border-gray-200 pb-4">
					<div class="mb-2 flex items-center justify-between">
						<h4 class="text-sm font-medium text-gray-700">Available Images</h4>
						<!-- Collection toggle -->
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
						</div>
					</div>

					{#if activeImages.length > 0}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							onclick={() => (isImageSectionActive = true)}
							onmouseleave={() => (isImageSectionActive = false)}
							style="scrollbar-gutter: stable;"
							class="grid max-h-64 grid-cols-3 gap-2 rounded-md border p-2 transition-colors sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8
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
			{/if}

			<!-- Content editor -->
			<div class="mb-2 flex shrink-0 items-center justify-between">
				<span class="text-sm font-medium text-gray-700">Content (Markdown)</span>
				<button
					type="button"
					onclick={resetContent}
					disabled={isSaving}
					class="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
				>
					Reset
				</button>
			</div>
			<div class="min-h-0 flex-1 overflow-hidden">
				<NotionLikeEditor
					{content}
					onContentChange={(value) => (content = value)}
					placeholder="Edit your page content here using Markdown. Type '/' for commands..."
				/>
			</div>
		</div>

		<!-- Footer -->
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
				onclick={handleSavePage}
				disabled={isSaving}
				class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-300 disabled:cursor-not-allowed disabled:bg-gray-400"
			>
				{isSaving ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	</div>
{/if}
