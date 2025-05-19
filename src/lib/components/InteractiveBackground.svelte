<script lang="ts">
	import { browser } from '$app/environment';

	// Mouse/touch position (non-reactive)
	let mouse = { x: 0, y: 0 };

	// Star data (non-reactive)
	let dots: {
		id: number;
		x: number;
		y: number;
		originalX: number;
		originalY: number;
		targetX: number; // Added: target position
		targetY: number; // Added: target position
		size: number;
		color: string;
		velocityX: number;
		velocityY: number;
		randomMoveTimer: number;
	}[] = [];

	// Constants
	const NUM_DOTS = 50;
	const GLOW_RADIUS = 100;
	const MAX_GLOW = 0.3;
	const STAR_COLORS = ['#D7A9D7', '#323232'];
	const MOUSE_PULL_FACTOR = 0.25;
	const RANDOM_MOVE_RANGE = 10;
	const RANDOM_MOVE_SPEED = 0.25;
	const EASING_FACTOR = 0.2; // Added: easing factor, controls movement smoothness

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number | null = null;

	// Initialize stars
	function initializeDots() {
		const newDots = [];
		for (let i = 0; i < NUM_DOTS; i++) {
			const x = Math.random() * window.innerWidth;
			const y = Math.random() * window.innerHeight;
			newDots.push({
				id: i,
				x,
				y,
				originalX: x,
				originalY: y,
				targetX: x, // Initialize target position
				targetY: y, // Initialize target position
				size: Math.random() * 2.5 + 0.5,
				color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
				velocityX: 0,
				velocityY: 0,
				randomMoveTimer: Math.random() * 1000
			});
		}
		dots = newDots;
	}

	// Handle mouse movement
	function handleMouseMove(event: MouseEvent) {
		mouse.x = event.clientX;
		mouse.y = event.clientY;
	}

	// Handle window resize
	function handleResize() {
		if (canvas) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			initializeDots();
		}
	}

	// Calculate glow intensity (using non-linear interpolation)
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
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		dots = dots.map(dot => {
			const newDot = { ...dot };
			newDot.randomMoveTimer -= 1;

			// Random movement
			if (newDot.randomMoveTimer <= 0) {
				newDot.velocityX = (Math.random() - 0.5) * RANDOM_MOVE_SPEED;
				newDot.velocityY = (Math.random() - 0.5) * RANDOM_MOVE_SPEED;
				newDot.randomMoveTimer = Math.random() * 200 + 50;
			}

			// Calculate target position (random movement)
			let targetX = newDot.x + newDot.velocityX;
			let targetY = newDot.y + newDot.velocityY;

			// Limit random movement range
			const distanceFromOrigin = Math.sqrt(
				(targetX - newDot.originalX) ** 2 + (targetY - newDot.originalY) ** 2
			);
			if (distanceFromOrigin > RANDOM_MOVE_RANGE) {
				targetX = newDot.originalX;
				targetY = newDot.originalY;
			}

			// Mouse pull force
			const distance = Math.sqrt((newDot.originalX - mouse.x) ** 2 + (newDot.originalY - mouse.y) ** 2);
			if (distance < GLOW_RADIUS * 1.5) {
				const pull = (1 - distance / (GLOW_RADIUS * 1.5)) * MOUSE_PULL_FACTOR;
				const dx = mouse.x - newDot.originalX;
				const dy = mouse.y - newDot.originalY;
				targetX = newDot.originalX + dx * pull;
				targetY = newDot.originalY + dy * pull;
			} else {
				targetX = newDot.originalX;
				targetY = newDot.originalY;
			}

			// Use easing to update actual position
			newDot.targetX = targetX;
			newDot.targetY = targetY;
			newDot.x = lerp(newDot.x, newDot.targetX, EASING_FACTOR);
			newDot.y = lerp(newDot.y, newDot.targetY, EASING_FACTOR);

			// Draw star
			const glowIntensity = calculateGlow(newDot.x, newDot.y, mouse.x, mouse.y);
			if (ctx){
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

	// Initialize Canvas and events
	$effect(() => {
		if (browser && canvas) {
			ctx = canvas.getContext('2d');
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;

			initializeDots();
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('resize', handleResize);
			animationFrameId = requestAnimationFrame(updateDots);

			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('resize', handleResize);
				if (animationFrameId) {
					cancelAnimationFrame(animationFrameId);
					animationFrameId = null;
				}
				ctx = null;
			};
		}
	});
</script>

<canvas class="interactive-background" bind:this={canvas}></canvas>

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