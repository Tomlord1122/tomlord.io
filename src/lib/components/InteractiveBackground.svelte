<script lang="ts">
	import { browser } from '$app/environment';

	// Mouse/touch position (non-reactive)
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
		targetX: number; // Added: target position
		targetY: number; // Added: target position
		size: number;
		color: string;
		velocityX: number;
		velocityY: number;
		randomMoveTimer: number;
	}[] = [];

	// Constants
	const NUM_DOTS = browser && window.innerWidth < 768 ? 10 : 75; // Fewer dots on mobile
	const GLOW_RADIUS = 100;
	const MAX_GLOW = 0.3;
	const STAR_COLORS = ['#D7A9D7', '#323232'];
	const MOUSE_PULL_FACTOR = 0.25;
	const RANDOM_MOVE_RANGE = browser && window.innerWidth < 768 ? 5 : 10; // Less movement on mobile
	const RANDOM_MOVE_SPEED = browser && window.innerWidth < 768 ? 0.1 : 0.25; // Slower on mobile
	const EASING_FACTOR = 0.2; // Added: easing factor, controls movement smoothness

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number | null = null;

	// Check if device is mobile
	function checkMobile() {
		if (browser) {
			isMobile = window.innerWidth < 768 || 
				('ontouchstart' in window) || 
				(navigator.maxTouchPoints > 0);
		}
	}

	// Initialize stars
	function initializeDots() {
		checkMobile(); // Update mobile status
		const newDots = [];
		const dotCount = isMobile ? Math.min(20, NUM_DOTS) : NUM_DOTS; // Even fewer dots on confirmed mobile
		
		for (let i = 0; i < dotCount; i++) {
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
				size: Math.random() * (isMobile ? 1.0 : 1.5) + 0.5, // Smaller dots on mobile
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
		// On mobile, make mouse interactions less sensitive
		if (!isMobile || Math.random() > 0.7) { // Only update position sometimes on mobile
			mouse.x = event.clientX;
			mouse.y = event.clientY;
		}
	}


	// Handle window resize
	function handleResize() {
		if (canvas) {
			checkMobile(); // Update mobile status
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			initializeDots();
		}
	}

	// Calculate glow intensity (using non-linear interpolation)
	function calculateGlow(dotX: number, dotY: number, mouseX: number, mouseY: number): number {
		const distance = Math.sqrt((dotX - mouseX) ** 2 + (dotY - mouseY) ** 2);
		if (distance < GLOW_RADIUS) {
			// Reduce glow effect on mobile
			const maxGlow = isMobile ? MAX_GLOW * 0.7 : MAX_GLOW;
			return maxGlow * (1 - distance / GLOW_RADIUS) ** 2;
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

			// Random movement - less frequent on mobile
			if (newDot.randomMoveTimer <= 0) {
				newDot.velocityX = (Math.random() - 0.5) * (isMobile ? RANDOM_MOVE_SPEED * 0.5 : RANDOM_MOVE_SPEED);
				newDot.velocityY = (Math.random() - 0.5) * (isMobile ? RANDOM_MOVE_SPEED * 0.5 : RANDOM_MOVE_SPEED);
				newDot.randomMoveTimer = Math.random() * (isMobile ? 300 : 200) + (isMobile ? 100 : 50);
			}

			// Calculate target position (random movement)
			let targetX = newDot.x + newDot.velocityX;
			let targetY = newDot.y + newDot.velocityY;

			// Limit random movement range
			const distanceFromOrigin = Math.sqrt(
				(targetX - newDot.originalX) ** 2 + (targetY - newDot.originalY) ** 2
			);
			if (distanceFromOrigin > (isMobile ? RANDOM_MOVE_RANGE * 0.5 : RANDOM_MOVE_RANGE)) {
				targetX = newDot.originalX;
				targetY = newDot.originalY;
			}

			// Mouse pull force - reduced on mobile
			const distance = Math.sqrt((newDot.originalX - mouse.x) ** 2 + (newDot.originalY - mouse.y) ** 2);
			if (distance < GLOW_RADIUS * (isMobile ? 1.0 : 1.5)) {
				const pull = (1 - distance / (GLOW_RADIUS * (isMobile ? 1.0 : 1.5))) * 
					(isMobile ? MOUSE_PULL_FACTOR * 0.5 : MOUSE_PULL_FACTOR);
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
			newDot.x = lerp(newDot.x, newDot.targetX, isMobile ? EASING_FACTOR * 0.7 : EASING_FACTOR);
			newDot.y = lerp(newDot.y, newDot.targetY, isMobile ? EASING_FACTOR * 0.7 : EASING_FACTOR);

			// Draw star
			const glowIntensity = calculateGlow(newDot.x, newDot.y, mouse.x, mouse.y);
			if (ctx){
				ctx.beginPath();
				ctx.arc(newDot.x, newDot.y, newDot.size * (1 + glowIntensity * (isMobile ? 0.8 : 1.2)), 0, Math.PI * 2);
				ctx.fillStyle = newDot.color;
				ctx.globalAlpha = (isMobile ? 0.1 : 0.15) + glowIntensity * (isMobile ? 0.3 : 0.5);
				ctx.shadowBlur = (isMobile ? 2 : 3) + glowIntensity * (isMobile ? 8 : 15);
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
			checkMobile(); // Check if we're on mobile
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