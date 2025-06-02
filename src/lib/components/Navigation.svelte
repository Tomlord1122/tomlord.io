<script lang="ts">
	// Import SvelteKit navigation utilities - using Svelte 5 syntax
	import { page } from '$app/state';
	import { navigating } from '$app/state';
	import { preloadData } from '$app/navigation';
	import { goto } from '$app/navigation';

	// Navigation items configuration
	const navItems = $state([
		{ href: '/', label: 'Home', shortcut: 'h' },
		{ href: '/blog', label: 'Blog', shortcut: 'b' },
		{ href: '/project', label: 'Project', shortcut: 'p' },
		{ href: '/photography', label: 'Photography', shortcut: 'f' }
	]);

	// Check if a route is currently active
	function isActive(href: string): boolean {
		if (href === '/') {
			return page.url.pathname === '/';
		}
		return page.url.pathname.startsWith(href);
	}

	// Preload data when hovering over navigation links
	async function handleMouseEnter(href: string) {
		try {
			await preloadData(href);
		} catch (error) {
			// Silently handle preload errors
			console.debug('Preload failed for:', href);
		}
	}

	// Handle keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		// Only trigger if Alt key is pressed (Alt + letter)
		if (event.altKey && !event.ctrlKey && !event.metaKey) {
			const shortcut = event.key.toLowerCase();
			const navItem = navItems.find((item) => item.shortcut === shortcut);

			if (navItem) {
				event.preventDefault();
				goto(navItem.href);
			}
		}
	}
</script>

<!-- Add keyboard event listener to the window -->
<svelte:window onkeydown={handleKeydown} />

<nav class="p-4" aria-label="Main navigation">
	<div class="container mx-auto">
		<!-- Main navigation row -->
		<div class="flex items-center justify-between">
			<!-- Logo with preloading -->
			<a
				href="/"
				class="transition-transform duration-300 hover:scale-110"
				onmouseenter={() => handleMouseEnter('/')}
				data-sveltekit-preload-data="hover"
			>
				<img
					src="/app_icon.png"
					alt="Tomlord"
					class="h-15 w-15 rounded-2xl border-2 border-gray-300"
				/>
			</a>

			<!-- Navigation Links -->
			<div class="flex items-center gap-4 font-serif text-lg">
				{#each navItems as item}
					{@const active = isActive(item.href)}
					<a
						href={item.href}
						class={`nav-link relative ${active ? 'text-gray-900' : ''}`}
						onmouseenter={() => handleMouseEnter(item.href)}
						data-sveltekit-preload-data="hover"
						aria-current={active ? 'page' : undefined}
					>
						{item.label}

						<!-- Active indicator -->
						{#if active}
							<span
								class="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-gray-900"
								aria-hidden="true"
							></span>
						{/if}

						<!-- Loading indicator for this specific link -->
						{#if navigating && navigating.to?.url.pathname === item.href}
							<span
								class="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-blue-500"
								aria-hidden="true"
							></span>
						{/if}
					</a>
				{/each}
			</div>
		</div>
	</div>
</nav>
