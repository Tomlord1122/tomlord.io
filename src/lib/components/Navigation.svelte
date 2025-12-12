<script lang="ts">
	// Import SvelteKit navigation utilities - using Svelte 5 syntax
	import { page } from '$app/state';
	import { navigating } from '$app/state';
	import { preloadData } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { auth } from '$lib/stores/auth.svelte.js';

	// Navigation items configuration
	const navItems = $state([
		{ href: '/', label: 'Home' },
		{ href: '/blog', label: 'Blog' },
		{ href: '/project', label: 'Project' },
		{ href: '/photography', label: 'Photography' }
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
		} catch {
			// Silently handle preload errors
			console.debug('Preload failed for:', href);
		}
	}

	// Handle sign in
	function handleSignIn() {
		auth.login();
	}

	// Handle sign out
	function handleSignOut() {
		auth.logout();
	}
</script>

<nav class="p-2 sm:p-4" aria-label="Main navigation">
	<div class="container mx-auto">
		<!-- Main navigation row -->
		<div class="flex items-center justify-between gap-2">
			<!-- Logo with preloading -->
			<a
				href="/"
				class="shrink-0 transition-transform duration-300 hover:scale-110"
				onmouseenter={() => handleMouseEnter('/')}
				data-sveltekit-preload-data="hover"
			>
				<img
					src="/app_icon.webp"
					alt="Tomlord"
					class="h-10 w-10 rounded-2xl border-2 border-gray-300 sm:h-15 sm:w-15"
				/>
			</a>

			<!-- Navigation Links -->
			<div class="flex flex-wrap items-center justify-end gap-1.5 font-serif text-sm sm:gap-3 sm:text-lg">
				{#each navItems as item (item.href)}
					{@const active = isActive(item.href)}
					{@const isNavigatingTo = navigating?.to?.url.pathname === item.href}
					<a
						href={item.href}
						class={`nav-link relative whitespace-nowrap ${active ? 'text-gray-900' : ''}`}
						onmouseenter={() => handleMouseEnter(item.href)}
						data-sveltekit-preload-data="hover"
						aria-current={active ? 'page' : undefined}
					>
						{item.label}
						<!-- Active indicator -->
						{#if active && !isNavigatingTo}
							<span
								class="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-gray-900"
								in:fly={{ y: 5, duration: 200 }}
								aria-hidden="true"
							></span>
						{/if}
					</a>
				{/each}

				<!-- Auth Button -->
				<span class="mx-0.5 text-gray-300 sm:mx-1">|</span>
				{#if auth.isAuthenticated}
					<button
						onclick={handleSignOut}
						class="nav-link flex shrink-0 cursor-pointer items-center gap-1 text-gray-600 hover:text-gray-900 sm:gap-1.5"
						title="Sign out"
					>
						{#if auth.user?.picture_url}
							<img
								src={auth.user.picture_url}
								alt={auth.user.name || 'User'}
								class="h-5 w-5 rounded-full sm:h-6 sm:w-6"
							/>
						{/if}
						<span class="hidden sm:inline">Sign out</span>
					</button>
				{:else}
					<button
						onclick={handleSignIn}
						class="nav-link cursor-pointer whitespace-nowrap text-gray-600 hover:text-gray-900"
						title="Sign in with Google"
					>
						Sign in
					</button>
				{/if}
			</div>
		</div>
	</div>
</nav>
