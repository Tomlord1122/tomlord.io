<script lang="ts">
	// Import SvelteKit navigation utilities - using Svelte 5 syntax
	import { page } from '$app/state';
	import { navigating } from '$app/state';
	import { preloadData } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';

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
		} catch (error) {
			// Silently handle preload errors
			console.debug('Preload failed for:', href);
		}
	}
</script>

<nav class="p-4" aria-label="Main navigation">
	<div class="container mx-auto">
		<!-- Main navigation row -->
		<div class="flex items-center justify-between">
			<!-- Logo with preloading -->
			<a
				href="/"
				class="mr-4 transition-transform duration-300 hover:scale-110"
				onmouseenter={() => handleMouseEnter('/')}
				data-sveltekit-preload-data="hover"
			>
				<img
					src="/app_icon.png"
					alt="Tomlord"
					class="h-12 w-12 rounded-2xl border-2 border-gray-300 sm:h-15 sm:w-15"
				/>
			</a>

			<!-- Navigation Links -->
			<div class="flex items-center gap-3 font-serif text-lg">
				{#each navItems as item}
					{@const active = isActive(item.href)}
					{@const isNavigatingTo = navigating.to?.url.pathname === item.href}
					<a
						href={item.href}
						class={`nav-link relative  ${
							active ? 'text-gray-900' : ''
						} `}
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
			</div>
		</div>
	</div>

	<!-- Global loading indicator -->
	{#if navigating.to}
		<div
			class="fixed top-0 right-0 left-0 z-50"
			in:fade={{ duration: 150 }}
			out:fade={{ duration: 300 }}
		>
			<div class="progress-bar h-1 bg-blue-500"></div>
		</div>
	{/if}
</nav>

<style>
	/* Progress bar animation */
	.progress-bar {
		animation: progress 1s ease-in-out infinite;
		transform-origin: left;
	}

	@keyframes progress {
		0% {
			transform: scaleX(0);
		}
		50% {
			transform: scaleX(0.6);
		}
		100% {
			transform: scaleX(1);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
