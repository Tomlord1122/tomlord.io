<script lang="ts">
	import { browser } from '$app/environment';

	// Mouse position (non-reactive)
	let mouse = { x: 0, y: 0 };

	// Track if we're on mobile
	let isMobile = false;

	// Star data (non-reactive)
	let dots: {
		id: number;
		x: number;
		y: number;
		originalX: number;
		originalY: number;
		size: number;
		color: string;
	}[] = [];

	// Constants - Optimized for performance
	const NUM_DOTS = 100; // Reduced from 150 for better performance
	const GLOW_RADIUS = 100;
	const MAX_GLOW = 0.6;
	const STAR_COLORS = ['#D7A9D7', '#323232'];
	const MOUSE_PULL_FACTOR = 0.55;
	const EASING_FACTOR = 0.2;

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number | null = null;

	// Check if device is mobile
	function checkMobile() {
		if (!browser) return false;

		isMobile = window.innerWidth < 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		return isMobile;
	}

	// Initialize stars
	function initializeDots() {
		const newDots = [];
		const dotCount = isMobile ? 0 : NUM_DOTS;

		for (let i = 0; i < dotCount; i++) {
			const x = Math.random() * window.innerWidth;
			const y = Math.random() * window.innerHeight;
			newDots.push({
				id: i,
				x,
				y,
				originalX: x,
				originalY: y,
				size: Math.random() * 1.5 + 0.5,
				color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
			});
		}
		dots = newDots;
	}

	// Handle pointer movement
	function handlePointerMove(event: PointerEvent) {
		if (isMobile) return;

		mouse.x = event.clientX;
		mouse.y = event.clientY;
	}

	// Handle window resize
	function handleResize() {
		if (canvas) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
	}

	// Calculate glow intensity
	function calculateGlow(dotX: number, dotY: number, mouseX: number, mouseY: number): number {
		const distance = Math.sqrt((dotX - mouseX) ** 2 + (dotY - mouseY) ** 2);
		if (distance < GLOW_RADIUS) {
			return MAX_GLOW * (1 - distance / GLOW_RADIUS) ** 2;
		}
		return 0;
	}

	// Linear interpolation function
	function lerp(start: number, end: number, factor: number): number {
		return start + (end - start) * factor;
	}

	// Update star positions and animation
	function updateDots() {
		if (!ctx || !canvas) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		dots = dots.map((dot) => {
			const newDot = { ...dot };

			// Mouse pull force with easing
			const distance = Math.sqrt(
				(newDot.originalX - mouse.x) ** 2 + (newDot.originalY - mouse.y) ** 2
			);
			let targetX = newDot.originalX;
			let targetY = newDot.originalY;

			if (distance < GLOW_RADIUS) {
				const pull = (1 - distance / GLOW_RADIUS) * MOUSE_PULL_FACTOR;
				const dx = mouse.x - newDot.originalX;
				const dy = mouse.y - newDot.originalY;
				targetX = newDot.originalX + dx * pull;
				targetY = newDot.originalY + dy * pull;
			}

			// Use easing to update position
			newDot.x = lerp(newDot.x, targetX, EASING_FACTOR);
			newDot.y = lerp(newDot.y, targetY, EASING_FACTOR);

			// Draw star with glow effect
			const glowIntensity = calculateGlow(newDot.x, newDot.y, mouse.x, mouse.y);
			if (ctx) {
				ctx.beginPath();
				ctx.arc(newDot.x, newDot.y, newDot.size * (1 + glowIntensity * 1.2), 0, Math.PI * 2);
				ctx.fillStyle = newDot.color;
				ctx.globalAlpha = 0.15 + glowIntensity * 0.5;
				ctx.shadowBlur = 3 + glowIntensity * 15;
				ctx.shadowColor = newDot.color;
				ctx.fill();
				ctx.globalAlpha = 1;
				ctx.shadowBlur = 0;
			}

			return newDot;
		});

		animationFrameId = requestAnimationFrame(updateDots);
	}

	// Initialize canvas and start animation
	function initializeCanvas() {
		if (!canvas) return;

		checkMobile();
		ctx = canvas.getContext('2d');
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		initializeDots();

		// Start animation loop only if not mobile
		if (!isMobile) {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
			animationFrameId = requestAnimationFrame(updateDots);
		}
	}

	// Clean up animation
	function cleanup() {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		ctx = null;
	}

	// Initialize when canvas is available - with delay for better initial load
	$effect(() => {
		if (browser && canvas) {
			// Delay initialization to not block initial render
			const timeoutId = setTimeout(() => {
				initializeCanvas();
			}, 200); // 200ms delay for better perceived performance
			
			return () => {
				clearTimeout(timeoutId);
				cleanup();
			};
		}
	});
</script>

<canvas class="interactive-background" bind:this={canvas}></canvas>

<svelte:window onpointermove={handlePointerMove} onresize={handleResize} />

<style>
	.interactive-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(0, 0, 0, 0.01);
		pointer-events: none;
		z-index: 0;
	}
</style>
