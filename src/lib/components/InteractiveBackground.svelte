<script lang="ts">
	import { browser } from '$app/environment';

	let mouse = $state.raw({ x: 0, y: 0 });

	// Use raw state to prevent deep reactivity
	let dots = $state.raw<{ 
		id: number; 
		x: number; 
		y: number; 
		size: number; 
		color: string; 
		originalX: number; 
		originalY: number;
		velocityX: number;  
		velocityY: number;  
		randomMoveTimer: number;
	}[]>([]);

	const NUM_DOTS = 25; // Total number of dots, you can adjust this number
	const GLOW_RADIUS = 100; // Radius of mouse influence where dots start to glow (in pixels)
	const MAX_GLOW = 0.3; // Maximum glow intensity for dots
	const STAR_COLORS = ['#ffffff', '#323232'];
	const MOUSE_PULL_FACTOR = 0.15; // How strongly stars are pulled toward the mouse
	const RANDOM_MOVE_RANGE = 10; // Maximum distance for random movement
	const RANDOM_MOVE_SPEED = 0.25; // Speed of random movement

	let animationFrameId: number; // Declare animationFrameId here

	// Use a non-reactive variable for animation updates
	let _dotsInternal: typeof dots = [];

	// Define the mouse movement event handler
	function handleMouseMove(event: MouseEvent) {
		mouse = { x: event.clientX, y: event.clientY };
		
		// Update internal state first without triggering reactivity
		_dotsInternal = _dotsInternal.map(dot => {
			const distance = Math.sqrt((dot.originalX - mouse.x) ** 2 + (dot.originalY - mouse.y) ** 2);
			
			const newDot = {...dot};
			if (distance < GLOW_RADIUS * 1.5) {
				const pull = (1 - distance / (GLOW_RADIUS * 1.5)) * MOUSE_PULL_FACTOR;
				const dx = mouse.x - newDot.originalX;
				const dy = mouse.y - newDot.originalY;
				
				newDot.x = newDot.originalX + dx * pull;
				newDot.y = newDot.originalY + dy * pull;
			} else {
				newDot.x = newDot.x + (newDot.originalX - newDot.x) * 0.02;
				newDot.y = newDot.y + (newDot.originalY - newDot.y) * 0.02;
			}
			return newDot;
		});
		
		// Then update reactive state once
		dots = [..._dotsInternal];
	}

	// Define the window resize event handler
	function handleResize() {
		const newDotsArray = [];
		for (let i = 0; i < NUM_DOTS; i++) {
			const x = Math.random() * window.innerWidth;
			const y = Math.random() * window.innerHeight;
			newDotsArray.push({
				id: i,
				x: x,
				y: y,
				originalX: x,
				originalY: y,
				size: Math.random() * 1.5 + 0.5,
				color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
				velocityX: 0,
				velocityY: 0,
				randomMoveTimer: Math.random() * 1000
			});
		}
		_dotsInternal = newDotsArray;
		dots = [..._dotsInternal];
	}

	// Create animation frame handler for random movement
	function updateRandomMovement() {
		// Work with the non-reactive internal state
		_dotsInternal = _dotsInternal.map(dot => {
			const newDot = {...dot};
			newDot.randomMoveTimer -= 1;
			
			if (newDot.randomMoveTimer <= 0) {
				newDot.velocityX = (Math.random() - 0.5) * RANDOM_MOVE_SPEED;
				newDot.velocityY = (Math.random() - 0.5) * RANDOM_MOVE_SPEED;
				newDot.randomMoveTimer = Math.random() * 200 + 50;
			}
			
			let newX = newDot.x + newDot.velocityX;
			let newY = newDot.y + newDot.velocityY;
			
			const distanceFromOrigin = Math.sqrt(
				(newX - newDot.originalX) ** 2 + 
				(newY - newDot.originalY) ** 2
			);
			
			if (distanceFromOrigin > RANDOM_MOVE_RANGE) {
				newX = newDot.x + (newDot.originalX - newDot.x) * 0.05;
				newY = newDot.y + (newDot.originalY - newDot.y) * 0.05;
			}
			
			newDot.x = newX;
			newDot.y = newY;
			return newDot;
		});
		
		// Update the reactive state only once per frame
		dots = [..._dotsInternal];
		
		animationFrameId = requestAnimationFrame(updateRandomMovement);
	}

	$effect(() => {
		if (browser) {
			// Initialize random positions for dots
			const tempDots = [];
			for (let i = 0; i < NUM_DOTS; i++) {
				const x = Math.random() * window.innerWidth;
				const y = Math.random() * window.innerHeight;
				tempDots.push({
					id: i,
					x: x,
					y: y,
					originalX: x,
					originalY: y,
					size: Math.random() * 0.85 + 0.5,
					color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
					velocityX: 0,
					velocityY: 0,
					randomMoveTimer: Math.random() * 1000
				});
			}
			
			// Set both internal and reactive states
			_dotsInternal = tempDots;
			dots = [...tempDots];

			// Add event listeners
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('resize', handleResize);

			// Start animation loop
			animationFrameId = requestAnimationFrame(updateRandomMovement);

			// Cleanup function
			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('resize', handleResize);
				if (animationFrameId) {
					cancelAnimationFrame(animationFrameId);
				}
			};
		}
	});

	// Function to calculate dot glow intensity
	function calculateGlow(dotX: number, dotY: number, mouseX: number, mouseY: number): number {
		// Calculate the straight-line distance between mouse and dot
		const distance = Math.sqrt((dotX - mouseX) ** 2 + (dotY - mouseY) ** 2);

		// If distance is less than the predefined GLOW_RADIUS
		if (distance < GLOW_RADIUS) {
			// Glow intensity is inversely proportional to distance
			return MAX_GLOW * (1 - distance / GLOW_RADIUS);
		}
		// If distance is greater than glow radius, glow intensity is 0
		return 0;
	}
</script>

<!-- HTML Template Section -->
<div class="interactive-background">
	{#each dots as dot (dot.id)}
		{@const glowIntensity = calculateGlow(dot.x, dot.y, mouse.x, mouse.y)}
		<div
			class="star"
			style="
				left: {dot.x}px;
				top: {dot.y}px;
				width: {dot.size}px;
				height: {dot.size}px;
				background-color: {dot.color};
				opacity: {0.15 + glowIntensity * 0.5};
				transform: scale({1 + glowIntensity * 1.2}) rotate({glowIntensity * 180}deg);
				box-shadow: 0 0 {3 + glowIntensity * 15}px {2 + glowIntensity * 7}px {dot.color};
			"
		>
			<div class="star-inner" style="background-color: {dot.color};"></div>
		</div>
	{/each}
</div>

<!-- CSS Styles Section -->
<style>
	.interactive-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw; 
		height: 100vh; 
		overflow: hidden;
		z-index: 0; 
		background-color: rgba(0, 0, 0, 0.01); 
		pointer-events: none;
	}

	.star {
		position: absolute;
		border-radius: 50%;
		transition: opacity 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.3s ease-out;
		will-change: opacity, transform, box-shadow, left, top;
		animation: twinkle 5s infinite alternate;
	}
	
	.star-inner {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		filter: blur(0.5px);
	}
	
	@keyframes twinkle {
		0% {
			opacity: 0.15;
			transform: scale(0.8);
		}
		50% {
			opacity: 0.3;
			transform: scale(1);
		}
		100% {
			opacity: 0.2;
			transform: scale(0.9);
		}
	}
</style>
