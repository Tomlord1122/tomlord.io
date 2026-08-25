<script lang="ts">
	import { browser } from '$app/environment';
	import type { PhotoBookSpread } from '$lib/data/photo-book.js';
	import PhotoBookImage from './PhotoBookImage.svelte';

	type Direction = 'next' | 'prev';
	type Flip = {
		id: number;
		direction: Direction;
		from: number;
		to: number;
		intro: boolean;
	};

	let {
		spreads,
		introSteps = 3,
		introTargetIndex = spreads.length - 1,
		keyboardEnabled = true
	}: {
		spreads: PhotoBookSpread[];
		introSteps?: number;
		introTargetIndex?: number;
		keyboardEnabled?: boolean;
	} = $props();

	// Props are startup configuration. Changing them would invalidate an in-flight page turn.
	// svelte-ignore state_referenced_locally
	const length = spreads.length;
	// svelte-ignore state_referenced_locally
	const targetIndex = ((introTargetIndex % length) + length) % length;
	// svelte-ignore state_referenced_locally
	const steps = Math.min(Math.max(introSteps, 0), Math.max(length - 1, 0));
	const introStartIndex = (((targetIndex - steps) % length) + length) % length;
	const introTurnDuration = steps > 0 ? Math.max(1, Math.floor(1400 / steps)) : 0;
	const pageLayers = Array.from({ length: 7 }, (_, index) => index + 1);

	let current = $state(introStartIndex);
	let flip = $state<Flip | null>(null);
	let flipId = 0;
	let introActive = $state(false);
	let introStep = 0;
	let mobile = $state(false);
	let reducedMotion = $state(false);
	let mediaReady = $state(false);
	let root: HTMLDivElement;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;

	let activeIndex = $derived(flip?.to ?? current);
	let activeSpread = $derived(spreads[activeIndex]);
	let leftPageDepth = $derived(Math.min(activeIndex, 7));
	let rightPageDepth = $derived(Math.min(Math.max(length - activeIndex - 1, 0), 7));

	$effect(() => {
		if (!browser) return;

		const mobileQuery = window.matchMedia('(max-width: 640px), (pointer: coarse)');
		const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

		const updatePreferences = () => {
			mobile = mobileQuery.matches;
			reducedMotion = motionQuery.matches;
		};

		updatePreferences();
		mediaReady = true;
		mobileQuery.addEventListener('change', updatePreferences);
		motionQuery.addEventListener('change', updatePreferences);

		return () => {
			mobileQuery.removeEventListener('change', updatePreferences);
			motionQuery.removeEventListener('change', updatePreferences);
		};
	});

	$effect(() => {
		if (!browser || !mediaReady) return;

		let cancelled = false;
		let introTimer: ReturnType<typeof setTimeout> | undefined;
		let decodeTimeout: ReturnType<typeof setTimeout> | undefined;

		if (mobile || reducedMotion || steps === 0) {
			current = targetIndex;
			return;
		}

		const introIndices = Array.from(
			{ length: steps + 1 },
			(_, index) => (introStartIndex + index) % length
		);
		const introImages = Array.from(
			root.querySelectorAll<HTMLImageElement>('[data-preload] img')
		).filter((_, index) => introIndices.includes(index));
		const decodeIntro = Promise.allSettled(introImages.map((image) => image.decode?.()));
		const timeout = new Promise<void>((resolve) => {
			decodeTimeout = setTimeout(resolve, 500);
		});

		Promise.race([decodeIntro, timeout]).then(() => {
			if (cancelled) return;
			introTimer = setTimeout(() => {
				if (cancelled) return;
				current = introStartIndex;
				introActive = true;
				introStep = 0;
				startFlip('next', true);
			}, 50);
		});

		return () => {
			cancelled = true;
			clearTimeout(introTimer);
			clearTimeout(decodeTimeout);
		};
	});

	$effect(() => {
		return () => clearTimeout(settleTimer);
	});

	function startFlip(direction: Direction, intro = false) {
		if (length < 2) return;

		if (!intro && introActive) {
			introActive = false;
		}

		const base = flip?.to ?? current;
		if (flip) current = base;
		const to = direction === 'next' ? (base + 1) % length : (base - 1 + length) % length;

		if (reducedMotion) {
			flip = null;
			current = to;
			return;
		}

		flipId += 1;
		flip = { id: flipId, direction, from: base, to, intro };
	}

	function finishFlip(event: AnimationEvent) {
		if (event.target !== event.currentTarget || !flip) return;

		const finished = flip;
		current = finished.to;

		if (finished.intro && introActive && introStep + 1 < steps) {
			introStep += 1;
			flip = null;
			startFlip('next', true);
			return;
		}

		introActive = false;
		if (mobile) {
			clearTimeout(settleTimer);
			settleTimer = setTimeout(() => {
				if (flip?.id === finished.id) flip = null;
			}, 90);
			return;
		}
		flip = null;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			startFlip('prev');
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			startFlip('next');
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (!keyboardEnabled || event.defaultPrevented) return;

		const target = event.target;
		if (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				target.matches('input, textarea, select, [contenteditable="true"]'))
		) {
			return;
		}

		if (document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]')) return;
		handleKeydown(event);
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div
	bind:this={root}
	class:intro={introActive}
	class="photo-book"
	role="group"
	aria-label="Interactive photography book"
	style:--intro-turn-duration={`${introTurnDuration}ms`}
>
	<svg class="motion-filters" width="0" height="0" aria-hidden="true">
		<filter id="photo-book-motion-blur">
			<feGaussianBlur stdDeviation="8 0" />
		</filter>
	</svg>

	<div class="stage">
		<button class="arrow left" onclick={() => startFlip('prev')} aria-label="Previous spread">
			<svg viewBox="0 0 14 44" width="14" height="44" fill="none" aria-hidden="true">
				<polyline
					points="11,3 3,22 11,41"
					stroke="currentColor"
					stroke-width="1.1"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		<div
			class="book"
			style:--left-page-depth={leftPageDepth}
			style:--right-page-depth={rightPageDepth}
		>
			{#each pageLayers as layer (layer)}
				<div
					class="page-layer left"
					class:depleted={layer > leftPageDepth}
					style:--layer={layer}
					aria-hidden="true"
				></div>
				<div
					class="page-layer right"
					class:depleted={layer > rightPageDepth}
					style:--layer={layer}
					aria-hidden="true"
				></div>
			{/each}

			{#if mobile}
				<div class="full stack">
					{#each spreads as spread, index (spread.id)}
						<div class:visible={index === current} class="stacked-spread">
							<PhotoBookImage {spread} alt={index === current ? spread.alt : ''} />
						</div>
					{/each}
				</div>
			{:else if !flip}
				<div class="full">
					<PhotoBookImage spread={spreads[current]} alt={spreads[current].alt} />
				</div>
			{/if}

			{#if flip}
				{#key flip.id}
					<div class="half left {flip.direction === 'next' ? 'out' : 'in'}" aria-hidden="true">
						<PhotoBookImage
							spread={spreads[flip.direction === 'next' ? flip.from : flip.to]}
							side="left"
						/>
					</div>
					<div class="half right {flip.direction === 'next' ? 'in' : 'out'}" aria-hidden="true">
						<PhotoBookImage
							spread={spreads[flip.direction === 'next' ? flip.to : flip.from]}
							side="right"
						/>
					</div>

					<div class="flap {flip.direction}" onanimationend={finishFlip} aria-hidden="true">
						<div class="face front">
							<PhotoBookImage
								spread={spreads[flip.from]}
								side={flip.direction === 'next' ? 'right' : 'left'}
							/>
						</div>
						<div class="face back">
							<PhotoBookImage
								spread={spreads[flip.to]}
								side={flip.direction === 'next' ? 'left' : 'right'}
							/>
						</div>
					</div>
				{/key}
			{/if}

			{#if mediaReady && !mobile}
				<div class="preload" data-preload aria-hidden="true">
					{#each spreads as spread (spread.id)}
						<PhotoBookImage {spread} loading="eager" />
					{/each}
				</div>
			{/if}

			<button class="zone previous" onclick={() => startFlip('prev')} aria-label="Previous spread"
			></button>
			<button class="zone next" onclick={() => startFlip('next')} aria-label="Next spread"></button>
		</div>

		<button class="arrow right" onclick={() => startFlip('next')} aria-label="Next spread">
			<svg viewBox="0 0 14 44" width="14" height="44" fill="none" aria-hidden="true">
				<polyline
					points="3,3 11,22 3,41"
					stroke="currentColor"
					stroke-width="1.1"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>

	<p class="sr-only" aria-live="polite">{activeSpread.alt}</p>
</div>

<style>
	.photo-book {
		width: 100%;
		outline: none;
	}

	.photo-book .book,
	.photo-book .zone,
	.photo-book .arrow {
		outline: none;
	}

	.motion-filters {
		position: absolute;
	}

	.stage {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: center;
	}

	.arrow {
		z-index: 70;
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		border: 0;
		background: transparent;
		padding: 8px 5px;
		color: rgb(75 85 99);
		cursor: pointer;
		transition:
			color 180ms ease,
			transform 180ms ease;
		-webkit-tap-highlight-color: transparent;
	}

	.arrow:hover,
	.arrow:focus-visible {
		color: rgb(17 24 39);
		transform: scale(1.08);
	}

	.book {
		position: relative;
		min-width: 0;
		max-width: 700px;
		flex: 1 1 0;
		aspect-ratio: 16 / 9;
		perspective: 2600px;
	}

	.book::before {
		position: absolute;
		z-index: -1;
		top: 9%;
		right: 7%;
		bottom: 3%;
		left: 7%;
		border-radius: 22px;
		background: rgb(20 22 30 / 0.2);
		filter: blur(28px);
		content: '';
	}

	.page-layer {
		position: absolute;
		z-index: calc(8 - var(--layer));
		top: 3.7%;
		bottom: 3.2%;
		width: 44.3%;
		border: 1px solid rgb(173 170 162 / 0.58);
		background: linear-gradient(105deg, #f1f0ec, #deddd7);
		box-shadow: 0 1px 2px rgb(45 43 38 / 0.12);
		transition:
			opacity 220ms ease,
			visibility 220ms ease;
	}

	.page-layer.depleted {
		opacity: 0;
		visibility: hidden;
	}

	.page-layer.left {
		left: 5.8%;
		border-radius: 18px 2px 4px 18px;
		transform: translate(calc(var(--layer) * -0.8px), calc(var(--layer) * 0.7px))
			rotate(calc(var(--layer) * -0.035deg));
	}

	.page-layer.right {
		right: 5.8%;
		border-radius: 2px 18px 18px 4px;
		transform: translate(calc(var(--layer) * 0.8px), calc(var(--layer) * 0.7px))
			rotate(calc(var(--layer) * 0.035deg));
	}

	.full,
	.stacked-spread {
		position: absolute;
		z-index: 10;
		inset: 0;
	}

	.stacked-spread {
		visibility: hidden;
	}

	.stacked-spread.visible {
		visibility: visible;
	}

	.half {
		position: absolute;
		z-index: 10;
		top: 0;
		bottom: 0;
		width: 50%;
		overflow-x: clip;
		overflow-y: visible;
	}

	.half.left {
		left: 0;
	}

	.half.right {
		left: 50%;
	}

	.half.out {
		animation: fade-out 220ms ease-out 600ms forwards;
	}

	.half.in {
		opacity: 0;
		animation: fade-in 400ms ease forwards;
	}

	.flap {
		position: absolute;
		top: 0;
		bottom: 0;
		z-index: 20;
		width: 50%;
		transform-style: preserve-3d;
		animation: 850ms cubic-bezier(0.42, 0.05, 0.25, 1) forwards;
		will-change: transform;
	}

	.flap.next {
		left: 50%;
		transform-origin: left center;
		animation-name: fold-next;
	}

	.flap.prev {
		left: 0;
		transform-origin: right center;
		animation-name: fold-prev;
	}

	.face {
		position: absolute;
		inset: 0;
		overflow-x: clip;
		overflow-y: visible;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	.face.back {
		transform: rotateY(180deg);
	}

	.intro .flap {
		animation-duration: var(--intro-turn-duration);
		animation-timing-function: linear;
	}

	.intro .half.out {
		animation-duration: calc(var(--intro-turn-duration) * 0.4);
		animation-delay: calc(var(--intro-turn-duration) * 0.5);
	}

	.intro .half.in {
		animation-duration: calc(var(--intro-turn-duration) * 0.5);
	}

	.intro :global(img) {
		filter: url('#photo-book-motion-blur');
	}

	.preload {
		position: absolute;
		top: 0;
		left: 0;
		width: 1px;
		height: 1px;
		overflow: hidden;
		visibility: hidden;
		pointer-events: none;
	}

	.zone {
		position: absolute;
		z-index: 60;
		top: 0;
		bottom: 0;
		width: 50%;
		border: 0;
		background: transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.zone.previous {
		left: 0;
	}

	.zone.next {
		right: 0;
	}

	@keyframes fold-next {
		to {
			transform: rotateY(-180deg);
		}
	}

	@keyframes fold-prev {
		to {
			transform: rotateY(180deg);
		}
	}

	@keyframes fade-out {
		to {
			opacity: 0;
		}
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@media (max-width: 640px) {
		.photo-book {
			width: 100vw;
			margin-inline: calc(50% - 50vw);
		}

		.stage {
			position: relative;
		}

		.book {
			max-width: none;
		}

		.arrow {
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
		}

		.arrow:hover,
		.arrow:focus-visible {
			transform: translateY(-50%) scale(1.08);
		}

		.arrow.left {
			left: 3px;
		}

		.arrow.right {
			right: 3px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flap,
		.half,
		.arrow {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
