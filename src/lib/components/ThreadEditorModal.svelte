<script lang="ts">
	import NotionLikeEditor from './NotionLikeEditor.svelte';
	import WritingStudio from './WritingStudio.svelte';
	import EditorViewToggle from './EditorViewToggle.svelte';
	import type { EditorViewMode } from '$lib/types/editor.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { createThread, updateThread } from '$lib/api/threads.js';
	import { showToast } from '$lib/stores/toast.svelte.js';
	import type { ThreadPost } from '$lib/types/thread.js';

	const MAX_CHARS = 2000;

	let {
		show = $bindable(false),
		thread = null,
		onSaved = () => {},
		onCancel = () => {}
	}: {
		show: boolean;
		thread?: ThreadPost | null;
		onSaved?: (thread: ThreadPost) => void;
		onCancel?: () => void;
	} = $props();

	let content = $state('');
	let isSaving = $state(false);
	let viewMode = $state<EditorViewMode>('write');
	let visible = $derived(show);
	let remaining = $derived(MAX_CHARS - content.trim().length);

	$effect(() => {
		if (show) {
			content = thread?.content ?? '';
			viewMode = 'write';
		}
	});

	function close() {
		onCancel();
		show = false;
	}

	async function save() {
		if (isSaving) return;
		const next = content.trim();
		if (!next) {
			showToast('Write something first', 'error', 2500);
			return;
		}
		if (next.length > MAX_CHARS) {
			showToast(`Keep it under ${MAX_CHARS} characters`, 'error', 3000);
			return;
		}
		if (!auth.token) {
			showToast('Sign in as admin to post', 'error', 3000);
			return;
		}

		isSaving = true;
		try {
			const saved = thread
				? await updateThread(thread.id, next, auth.token)
				: await createThread(next, auth.token);
			showToast(thread ? 'Thread updated' : 'Thread posted', 'success', 1800);
			onSaved(saved);
			show = false;
		} catch (error) {
			showToast(error instanceof Error ? error.message : 'Save failed', 'error', 4000);
		} finally {
			isSaving = false;
		}
	}

	function handleWindowKey(event: KeyboardEvent) {
		if (!visible) return;
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			save();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKey} />

<WritingStudio show={visible} onClose={close} labelledBy="thread-editor-title">
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
				<h2 id="thread-editor-title" class="truncate text-sm font-medium text-gray-800">
					{thread ? 'Edit thread' : 'New thread'}
				</h2>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-xs {remaining < 0 ? 'text-red-600' : 'text-gray-400'}">{remaining}</span>
				<EditorViewToggle bind:value={viewMode} />
				<button
					type="button"
					onclick={save}
					disabled={isSaving || remaining < 0}
					class="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{isSaving ? 'Saving...' : 'Post'}
				</button>
			</div>
		</div>
	{/snippet}

	<NotionLikeEditor
		{content}
		onContentChange={(value) => (content = value)}
		{viewMode}
		placeholder="A short note. Markdown is fine."
	/>
</WritingStudio>
