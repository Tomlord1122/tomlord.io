<script lang="ts">
	import ThreadCard from '$lib/components/ThreadCard.svelte';
	import ThreadEditorModal from '$lib/components/ThreadEditorModal.svelte';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { isSuperUser } from '$lib/util/auth.js';
	import { deleteThread } from '$lib/api/threads.js';
	import { showToast } from '$lib/stores/toast.svelte.js';
	import { goto } from '$app/navigation';
	import type { ThreadPost } from '$lib/types/thread.js';
	import type { LinkPreview } from '$lib/types/preview.js';

	let { data } = $props();

	let thread = $derived<ThreadPost>(data.thread);
	let showEditor = $state(false);
	let canEdit = $derived(isSuperUser(auth.user));
	let override = $state<ThreadPost | null>(null);
	let visible = $derived(override ?? thread);
	let plain = $derived(visible.content.replace(/[#>*_`[\]]/g, '').slice(0, 140));
	let previews = $state<Record<string, LinkPreview>>({});

	$effect(() => {
		let cancelled = false;
		Promise.resolve(data.previews).then((next) => {
			if (!cancelled) previews = next ?? {};
		});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		thread;
		override = null;
	});

	async function handleDelete() {
		if (!confirm('Delete this thread?')) return;
		if (data.mock) {
			await goto('/thread');
			return;
		}
		if (!auth.token) return;
		try {
			await deleteThread(visible.id, auth.token);
			await goto('/thread');
		} catch (error) {
			showToast(error instanceof Error ? error.message : 'Delete failed', 'error', 3000);
		}
	}
</script>

<svelte:head>
	<title>{plain || 'Thread'} - Tomlord</title>
	<meta name="description" content={plain} />
	<meta property="og:title" content="Thread | Tomlord" />
	<meta property="og:description" content={plain} />
	<meta property="og:url" content="https://tomlord.fyi/thread/{visible.id}" />
</svelte:head>

<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<a href="/thread" class="not-prose text-sm text-gray-500 hover:text-gray-900">← Thread</a>
	<div class="mt-3">
		<ThreadCard
			thread={visible}
			collapsible={false}
			{previews}
			{canEdit}
			onEdit={() => (showEditor = true)}
			onDelete={handleDelete}
		/>
	</div>
</div>

{#if canEdit}
	<ThreadEditorModal
		bind:show={showEditor}
		thread={visible}
		onSaved={(saved) => (override = saved)}
	/>
{/if}
