<script lang="ts">
	import { onMount } from 'svelte';
	import { renderMarkdown } from '$lib/util/markdown.js';

	interface Props {
		content: string;
		onContentChange: (value: string) => void;
		placeholder?: string;
		minHeight?: string;
	}

	let {
		content,
		onContentChange,
		placeholder = "Type '/' for commands or start writing...",
		minHeight = '400px'
	}: Props = $props();

	let editorRef = $state<HTMLTextAreaElement>();
	let previewRef = $state<HTMLDivElement>();
	let showSlashMenu = $state(false);
	let slashMenuPosition = $state({ x: 0, y: 0 });
	let slashMenuItems = $state<Array<{ label: string; action: () => void; icon: string }>>([]);
	let selectedSlashIndex = $state(0);
	let slashSearchQuery = $state('');

	// Editor mode state
	let editorMode = $state<'edit' | 'preview' | 'split'>('edit');
	let isMobile = $state(false);

	function checkMobile() {
		if (typeof window !== 'undefined') {
			isMobile = window.innerWidth < 768; // md breakpoint
			// Set responsive defaults
			editorMode = isMobile ? 'edit' : 'split';
		}
	}

	// Sync scroll between editor and preview with debouncing
	let scrollSyncTimeout: ReturnType<typeof setTimeout>;
	let isScrollingSynced = false;

	function syncScroll(source: 'editor' | 'preview') {
		if (editorMode !== 'split' || isScrollingSynced) return;

		// Clear previous timeout
		if (scrollSyncTimeout) {
			clearTimeout(scrollSyncTimeout);
		}

		// Mark as syncing immediately to prevent feedback loops
		isScrollingSynced = true;

		// Small debounce for smooth scrolling
		scrollSyncTimeout = setTimeout(() => {
			try {
				if (source === 'editor' && editorRef && previewRef) {
					// Calculate scroll ratio with bounds checking
					const maxScrollTop = Math.max(0, editorRef.scrollHeight - editorRef.clientHeight);
					if (maxScrollTop > 0) {
						const scrollRatio = Math.min(1, Math.max(0, editorRef.scrollTop / maxScrollTop));
						const previewMaxScroll = Math.max(0, previewRef.scrollHeight - previewRef.clientHeight);
						previewRef.scrollTop = scrollRatio * previewMaxScroll;
					}
				} else if (source === 'preview' && previewRef && editorRef) {
					// Calculate scroll ratio with bounds checking
					const maxScrollTop = Math.max(0, previewRef.scrollHeight - previewRef.clientHeight);
					if (maxScrollTop > 0) {
						const scrollRatio = Math.min(1, Math.max(0, previewRef.scrollTop / maxScrollTop));
						const editorMaxScroll = Math.max(0, editorRef.scrollHeight - editorRef.clientHeight);
						editorRef.scrollTop = scrollRatio * editorMaxScroll;
					}
				}
			} catch (error) {
				console.warn('Scroll sync error:', error);
			}

			// Reset sync flag after a delay to allow the synced scroll to complete
			setTimeout(() => {
				isScrollingSynced = false;
			}, 50);
		}, 16); // ~60fps debounce
	}

	// Slash command definitions
	const slashCommands = [
		{
			label: 'Heading 1',
			action: () => insertText('# '),
			icon: 'H1',
			keywords: ['heading', 'h1', 'title']
		},
		{
			label: 'Heading 2',
			action: () => insertText('## '),
			icon: 'H2',
			keywords: ['heading', 'h2', 'subtitle']
		},
		{
			label: 'Heading 3',
			action: () => insertText('### '),
			icon: 'H3',
			keywords: ['heading', 'h3']
		},
		{
			label: 'Bold Text',
			action: () => insertText('**', '**'),
			icon: 'B',
			keywords: ['bold', 'strong']
		},
		{
			label: 'Italic Text',
			action: () => insertText('*', '*'),
			icon: 'I',
			keywords: ['italic', 'emphasis']
		},
		{
			label: 'Bullet List',
			action: () => insertText('- '),
			icon: '•',
			keywords: ['list', 'bullet', 'ul']
		},
		{
			label: 'Numbered List',
			action: () => insertText('1. '),
			icon: '1.',
			keywords: ['list', 'numbered', 'ol']
		},
		{
			label: 'Code Block',
			action: () => insertText('```\n', '\n```'),
			icon: '<>',
			keywords: ['code', 'block']
		},
		{
			label: 'Inline Code',
			action: () => insertText('`', '`'),
			icon: '`',
			keywords: ['code', 'inline']
		},
		{
			label: 'Quote',
			action: () => insertText('> '),
			icon: '"',
			keywords: ['quote', 'blockquote']
		},
		{
			label: 'Link',
			action: () => insertText('[', '](url)'),
			icon: '🔗',
			keywords: ['link', 'url']
		},
		{
			label: 'Horizontal Rule',
			action: () => insertText('---\n'),
			icon: '—',
			keywords: ['rule', 'line', 'divider']
		}
	];

	function insertText(before: string, after: string = '') {
		if (!editorRef) return;

		const start = editorRef.selectionStart;
		const end = editorRef.selectionEnd;
		const selectedText = content.substring(start, end);

		// If we're inserting from slash menu, remove the slash
		let actualStart = start;
		if (showSlashMenu && start > 0 && content[start - 1] === '/') {
			actualStart = start - 1;
		}

		const newContent =
			content.substring(0, actualStart) + before + selectedText + after + content.substring(end);

		onContentChange(newContent);

		// Position cursor
		setTimeout(() => {
			if (editorRef) {
				const newCursorPos = actualStart + before.length + selectedText.length;
				editorRef.setSelectionRange(newCursorPos, newCursorPos);
				editorRef.focus();
			}
		}, 0);

		hideSlashMenu();
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		onContentChange(target.value);
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Handle tab indentation and unindentation
		if (event.key === 'Tab') {
			event.preventDefault();
			if (event.shiftKey) {
				// Shift+Tab: Remove indentation
				removeIndentation();
			} else {
				// Tab: Add indentation
				insertText('\t');
			}
			return;
		}

		if (showSlashMenu && event.target === editorRef) {
			// Only handle Escape from editor when slash menu is open
			if (event.key === 'Escape') {
				event.preventDefault();
				hideSlashMenu();
				return;
			}
		}

		// Handle slash command trigger
		if (event.key === '/') {
			setTimeout(() => {
				if (editorRef) {
					// Calculate cursor position in textarea
					const cursorPosition = getCursorPosition();
					showSlashMenu = true;
					slashMenuPosition = {
						x: cursorPosition.x,
						y: cursorPosition.y + 20 // Add some offset below the cursor
					};
					updateSlashMenu('');
					selectedSlashIndex = 0;
					// Auto-focus search input
					setTimeout(() => {
						const searchInput = document.querySelector('.slash-menu input');
						if (searchInput instanceof HTMLInputElement) {
							searchInput.focus();
						}
					}, 50);
				}
			}, 0);
		}

		// Handle other shortcuts
		if (event.ctrlKey || event.metaKey) {
			switch (event.key) {
				case 'b':
					event.preventDefault();
					insertText('**', '**');
					break;
				case 'i':
					event.preventDefault();
					insertText('*', '*');
					break;
				case '`':
					event.preventDefault();
					insertText('`', '`');
					break;
			}
		}
	}

	function hideSlashMenu() {
		showSlashMenu = false;
		slashMenuItems = [];
		selectedSlashIndex = 0;
		slashSearchQuery = '';

		// Return focus to the editor textarea
		setTimeout(() => {
			if (editorRef) {
				editorRef.focus();
			}
		}, 0);
	}

	function removeIndentation() {
		if (!editorRef) return;

		const start = editorRef.selectionStart;
		const end = editorRef.selectionEnd;

		// Find the start of the current line
		const beforeCursor = content.substring(0, start);
		const lineStart = beforeCursor.lastIndexOf('\n') + 1;
		const currentLine = content.substring(lineStart, start);

		// Check if line starts with tab or spaces
		if (currentLine.startsWith('\t')) {
			// Remove one tab
			const newContent = content.substring(0, lineStart) + content.substring(lineStart + 1);
			onContentChange(newContent);

			// Adjust cursor position
			setTimeout(() => {
				if (editorRef) {
					editorRef.setSelectionRange(start - 1, end - 1);
					editorRef.focus();
				}
			}, 0);
		} else if (currentLine.startsWith('    ')) {
			// Remove 4 spaces
			const newContent = content.substring(0, lineStart) + content.substring(lineStart + 4);
			onContentChange(newContent);

			// Adjust cursor position
			setTimeout(() => {
				if (editorRef) {
					editorRef.setSelectionRange(start - 4, end - 4);
					editorRef.focus();
				}
			}, 0);
		}
	}

	function getCursorPosition() {
		if (!editorRef) return { x: 0, y: 0 };

		// Create a temporary element to measure text dimensions
		const mirror = document.createElement('div');
		const computed = window.getComputedStyle(editorRef);

		// Copy textarea styles to mirror element
		mirror.style.position = 'absolute';
		mirror.style.visibility = 'hidden';
		mirror.style.whiteSpace = 'pre-wrap';
		mirror.style.wordWrap = 'break-word';
		mirror.style.top = '0';
		mirror.style.left = '0';
		mirror.style.width = computed.width;
		mirror.style.font = computed.font;
		mirror.style.fontSize = computed.fontSize;
		mirror.style.fontFamily = computed.fontFamily;
		mirror.style.fontWeight = computed.fontWeight;
		mirror.style.lineHeight = computed.lineHeight;
		mirror.style.letterSpacing = computed.letterSpacing;
		mirror.style.padding = computed.padding;
		mirror.style.border = computed.border;
		mirror.style.boxSizing = computed.boxSizing;

		document.body.appendChild(mirror);

		// Get text up to cursor position
		const textBeforeCursor = content.substring(0, editorRef.selectionStart);
		mirror.textContent = textBeforeCursor;

		// Create a span for the cursor position
		const cursorSpan = document.createElement('span');
		cursorSpan.textContent = '|';
		mirror.appendChild(cursorSpan);

		// Get cursor position relative to viewport
		const cursorSpanRect = cursorSpan.getBoundingClientRect();

		// Calculate FIXED position (relative to viewport, not container)
		// This ensures the menu stays visible even with scrollable content
		let x = cursorSpanRect.left;
		let y = cursorSpanRect.top + 24; // Position below cursor line

		// Cleanup
		document.body.removeChild(mirror);

		// Boundary checking to keep menu within viewport
		const menuWidth = 288; // w-72 = 288px
		const menuHeight = 300; // Approximate menu height
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// Adjust X position if menu would go off right edge
		if (x + menuWidth > viewportWidth) {
			x = Math.max(10, viewportWidth - menuWidth - 10);
		}

		// Adjust Y position if menu would go off bottom edge
		if (y + menuHeight > viewportHeight) {
			y = Math.max(10, cursorSpanRect.top - menuHeight - 10); // Position above cursor
		}

		// Ensure minimum positioning
		x = Math.max(10, x);
		y = Math.max(10, y);

		return { x, y };
	}

	function updateSlashMenu(query: string) {
		slashSearchQuery = query;
		if (query.trim() === '') {
			slashMenuItems = slashCommands;
		} else {
			slashMenuItems = slashCommands.filter(
				(cmd) =>
					cmd.label.toLowerCase().includes(query.toLowerCase()) ||
					cmd.keywords.some((keyword) => keyword.toLowerCase().includes(query.toLowerCase()))
			);
		}
		selectedSlashIndex = 0;
	}

	function handleClickOutside(event: MouseEvent) {
		if (showSlashMenu && event.target instanceof Element && !event.target.closest('.slash-menu')) {
			hideSlashMenu();
		}
	}

	onMount(() => {
		checkMobile();

		const handleResize = () => {
			checkMobile();
		};

		document.addEventListener('click', handleClickOutside);
		window.addEventListener('resize', handleResize);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<!-- Notion-like Editor with Live Preview -->
<div class="relative w-full">
	<!-- Mode Switcher Toolbar -->
	<div class="border-b border-gray-200 bg-gray-50 p-2">
		<div class="flex items-center justify-between">
			<div class="flex rounded-md border border-gray-300 bg-white p-0.5">
				<button
					type="button"
					onclick={() => (editorMode = 'edit')}
					class="rounded px-2 py-1 text-xs font-medium transition-colors {editorMode === 'edit'
						? 'bg-gray-600 text-white shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
				>
					Edit
				</button>
				{#if !isMobile}
					<button
						type="button"
						onclick={() => (editorMode = 'split')}
						class="rounded px-2 py-1 text-xs font-medium transition-colors {editorMode === 'split'
							? 'bg-gray-600 text-white shadow-sm'
							: 'text-gray-600 hover:text-gray-900'}"
					>
						Split
					</button>
				{/if}
				<button
					type="button"
					onclick={() => (editorMode = 'preview')}
					class="rounded px-2 py-1 text-xs font-medium transition-colors {editorMode === 'preview'
						? 'bg-gray-600 text-white shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
				>
					Preview
				</button>
			</div>
			<span class="text-xs text-gray-500">
				{isMobile ? 'Mobile' : 'Desktop'} Mode
			</span>
		</div>
	</div>

	<!-- Editor Content -->
	<div
		class="flex {editorMode === 'split' ? 'divide-x divide-gray-200' : ''}"
		style="height: 600px;"
	>
		<!-- Editor Pane -->
		{#if editorMode === 'edit' || editorMode === 'split'}
			<div class="flex-1 {editorMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col">
				<textarea
					bind:this={editorRef}
					value={content}
					oninput={handleInput}
					onkeydown={handleKeyDown}
					onscroll={() => syncScroll('editor')}
					{placeholder}
					class="scrollbar-stable text-editor w-full flex-1 resize-none overflow-y-auto border-0 p-4 font-mono text-sm text-gray-900 focus:ring-0 focus:outline-none"
					style="min-height: {minHeight};"
				></textarea>
			</div>
		{/if}

		<!-- Live Preview Pane -->
		{#if editorMode === 'preview' || editorMode === 'split'}
			<div class="flex-1 {editorMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col">
				<div
					bind:this={previewRef}
					onscroll={() => syncScroll('preview')}
					class="scrollbar-stable markdown-content compact flex-1 overflow-y-auto p-4 text-wrap"
					style="min-height: {minHeight};"
				>
					{#if content.trim()}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html renderMarkdown(content)}
					{:else}
						<p class="text-gray-500 italic">
							{placeholder}
						</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Enhanced Slash Command Menu -->
	{#if showSlashMenu}
		<div
			class="slash-menu fixed z-100 w-72 rounded-lg border border-gray-200 bg-white shadow-lg"
			style="left: {slashMenuPosition.x}px; top: {slashMenuPosition.y}px;"
		>
			<!-- Search Input -->
			<div class="border-b border-gray-200 p-3">
				<input
					type="text"
					value={slashSearchQuery}
					oninput={(e) => updateSlashMenu((e.target as HTMLInputElement).value)}
					onkeydown={(e) => {
						switch (e.key) {
							case 'ArrowDown':
								e.preventDefault();
								selectedSlashIndex = Math.min(selectedSlashIndex + 1, slashMenuItems.length - 1);
								break;
							case 'ArrowUp':
								e.preventDefault();
								selectedSlashIndex = Math.max(selectedSlashIndex - 1, 0);
								break;
							case 'Enter':
								if (slashMenuItems.length > 0) {
									e.preventDefault();
									slashMenuItems[selectedSlashIndex]?.action();
								}
								break;
							case 'Escape':
								e.preventDefault();
								hideSlashMenu();
								break;
						}
					}}
					placeholder="Search commands..."
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
				/>
			</div>

			<!-- Command List -->
			<div class="scrollbar-stable max-h-64 overflow-y-auto p-2">
				{#if slashMenuItems.length > 0}
					{#each slashMenuItems as item, index (item.label)}
						<button
							type="button"
							onclick={item.action}
							class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors {index ===
							selectedSlashIndex
								? 'bg-gray-100 text-gray-900'
								: 'text-gray-700 hover:bg-gray-50'}"
						>
							<span
								class="mr-3 flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600"
							>
								{item.icon}
							</span>
							{item.label}
						</button>
					{/each}
				{:else}
					<div class="px-3 py-2 text-sm text-gray-500">No commands found</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
