<script lang="ts">
	import { onMount } from 'svelte';
	import { uploadToStorage } from '$lib/supabase.js';

	let {
		show = $bindable(false),
		onInsert,
		onClose
	}: {
		show?: boolean;
		onInsert?: (markdown: string) => void;
		onClose?: () => void;
	} = $props();

	let container = $state<HTMLDivElement>();
	let excalidrawAPI = $state<any>(null);
	let isExporting = $state(false);

	onMount(() => {
		let root: any;

		async function init() {
			if (!container) return;

			const React = await import('react');
			const ReactDOM = await import('react-dom/client');
			const ExcalidrawLib = await import('@excalidraw/excalidraw');

			root = ReactDOM.createRoot(container);
			root.render(
				React.createElement(ExcalidrawLib.Excalidraw, {
					excalidrawAPI: (api: any) => {
						excalidrawAPI = api;
					}
				})
			);
		}

		init();

		return () => {
			if (root) {
				root.unmount();
			}
		};
	});

	async function handleExport() {
		if (!excalidrawAPI) {
			alert('Drawing canvas not ready yet.');
			return;
		}

		isExporting = true;

		try {
			const ExcalidrawLib = await import('@excalidraw/excalidraw');
			const blob = await ExcalidrawLib.exportToBlob({
				elements: excalidrawAPI.getSceneElements(),
				appState: {
					...excalidrawAPI.getAppState(),
					exportBackground: true,
					exportWithDarkMode: false
				},
				files: excalidrawAPI.getFiles(),
				mimeType: 'image/png'
			});

			const file = new File([blob], `drawing-${Date.now()}.png`, {
				type: 'image/png'
			});

			const path = `drawings/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
			const { publicUrl, error } = await uploadToStorage(file, path);

			if (error) {
				alert(`Upload failed: ${error.message}`);
				return;
			}

			const imageMarkdown = `<div class="flex justify-center">\n<img src="${publicUrl}" alt="Drawing" class="photo-post">\n</div>`;

			onInsert?.(imageMarkdown);
			show = false;
		} catch (err) {
			console.error('Export error:', err);
			alert('Failed to export drawing. Please try again.');
		} finally {
			isExporting = false;
		}
	}

	function handleClose() {
		show = false;
		onClose?.();
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex h-[95vh] w-[95vw] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
			<!-- Header -->
			<div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
				<h2 class="text-lg font-semibold text-gray-800">Drawing Canvas</h2>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={handleExport}
						disabled={isExporting || !excalidrawAPI}
						class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isExporting ? 'Exporting...' : 'Export & Insert'}
					</button>
					<button
						type="button"
						onclick={handleClose}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
					>
						Cancel
					</button>
				</div>
			</div>

			<!-- Canvas Container -->
			<div bind:this={container} class="excalidraw-container flex-1"></div>
		</div>
	</div>
{/if}
