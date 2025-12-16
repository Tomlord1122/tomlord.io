<script lang="ts">
	import NotionLikeEditor from './NotionLikeEditor.svelte';
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

	// Initialize content when modal opens and lock body scroll
	$effect(() => {
		if (show) {
			content = initialContent;
			// Prevent background scrolling when modal is open
			document.body.style.overflow = 'hidden';
		} else {
			// Restore scrolling when modal closes
			document.body.style.overflow = '';
		}
		// Cleanup on unmount
		return () => {
			document.body.style.overflow = '';
		};
	});

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

	<!-- Modal content - full screen with small margin -->
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

		<!-- Content area with NotionLikeEditor -->
		<div class="flex min-h-0 grow flex-col">
			<div class="mb-2 flex items-center justify-between px-6 pt-4">
				<span class="text-sm font-medium text-gray-700">Content (Markdown)</span>
				<button
					type="button"
					onclick={resetContent}
					class="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
				>
					Reset
				</button>
			</div>
			<div class="min-h-0 flex-1 px-6 pb-4">
				<NotionLikeEditor
					{content}
					onContentChange={(value) => (content = value)}
					placeholder="Edit your page content here using Markdown. Type '/' for commands..."
				/>
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
