<script lang="ts">
	import { marked } from 'marked';
	import { tick } from 'svelte';
	// Props for the modal
	import type { EditPageModalType } from '../types/page.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { updatePage } from '$lib/api/pages.js';
	let {
		show = $bindable(false),
		pageTitle = '',
		initialContent = '',
		pageName = '', // 'home' or 'project' - used for API endpoint
		onSaved = () => {}, // Callback for successful save
		onCancel = () => {} // Callback for cancellation
	}: EditPageModalType = $props();

	// State for the content being edited
	let content = $state('');
	let showPreview = $state(false);

	// Performance: throttle content updates and debounce preview rendering
	let rafId: number | null = null;
	let previewHtml = $state('');
	let previewTimeoutId: number | null = null;

	// Initialize content when modal opens
	$effect(() => {
		if (show) {
			content = initialContent;
			showPreview = false;
			// Focus the content area after DOM update
			tick().then(() => {
				const contentEl = document.getElementById('page-content-textarea');
				contentEl?.focus();
			});
		}
	});

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

	// Function to close the modal
	function closeModal() {
		show = false;
	}

	// Function to handle saving the page content
	async function handleSavePage() {
		if (!content.trim()) {
			alert('Please add some content to save.');
			return;
		}

		// Check authentication
		if (!auth.token) {
			alert('You must be logged in to save page content.');
			return;
		}

		try {
			await updatePage(pageName, content.trim(), auth.token);

			alert('Page content saved successfully!');
			onSaved();
			closeModal();
		} catch (error) {
			console.error('Error saving page:', error);
			alert(`Failed to save page: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// Function to toggle between preview and editor
	function togglePreview() {
		showPreview = !showPreview;
	}

	// Function to reset content to initial state
	function resetContent() {
		if (confirm('Are you sure you want to reset all changes?')) {
			content = initialContent;
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

	<!-- Modal content - full width with max constraint -->
	<div
		class="fixed inset-4 z-50 mx-auto flex max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 sm:inset-6 md:inset-8"
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

		<!-- Scrollable content area -->
		<div class="grow overflow-y-auto px-6 py-4">
			<div class="space-y-4">
				<div class="mt-3">
					<div class="mb-1 flex items-center justify-between">
						<label for="page-content-textarea" class="block text-sm font-medium text-gray-700">
							{showPreview ? 'Live Preview' : 'Content (Markdown)'}
						</label>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={resetContent}
								class="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
							>
								Reset
							</button>
							<button
								type="button"
								onclick={togglePreview}
								class="rounded-md border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
							>
								{showPreview ? 'Edit Content' : 'Show Preview'}
							</button>
						</div>
					</div>

					{#if showPreview}
						<div
							class="prose prose-sm sm:prose-base max-w-none overflow-y-auto rounded-md border border-gray-300 bg-gray-50 p-3"
							style="min-height: calc(25em + 40px);"
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html previewHtml}
						</div>
					{:else}
						<textarea
							id="page-content-textarea"
							value={content}
							oninput={onContentInput}
							rows="20"
							class="w-full rounded-md border border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-gray-500"
							placeholder="Edit your page content here using Markdown..."
						></textarea>
					{/if}
				</div>
			</div>
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
				onclick={handleSavePage}
				class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-300"
			>
				Save Changes
			</button>
		</div>
	</div>
{/if}
