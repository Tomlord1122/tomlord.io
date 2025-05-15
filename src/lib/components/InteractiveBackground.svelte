<script lang="ts">
	import { browser } from '$app/environment';

	let mouse = $state({ x: 0, y: 0 });

	let dots = $state<{ 
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

	const NUM_DOTS = 75; // Total number of dots, you can adjust this number
	const GLOW_RADIUS = 100; // Radius of mouse influence where dots start to glow (in pixels)
	const MAX_GLOW = 0.3; // Maximum glow intensity for dots
	const STAR_COLORS = ['#ffffff', '#323232'];
	const MOUSE_PULL_FACTOR = 0.15; // How strongly stars are pulled toward the mouse
	const RANDOM_MOVE_RANGE = 10; // Maximum distance for random movement
	const RANDOM_MOVE_SPEED = 0.25; // Speed of random movement

	$effect(() => {
		// Ensure the following code only runs in browser environment
		if (browser) {
			// Initialize random positions for dots
			const tempDots = [];
			for (let i = 0; i < NUM_DOTS; i++) {
				const x = Math.random() * window.innerWidth;
				const y = Math.random() * window.innerHeight;
				tempDots.push({
					id: i, // Unique identifier for each dot
					x: x, // Random x coordinate within window width
					y: y, // Random y coordinate within window height
					originalX: x, // Store original position to return to
					originalY: y, // Store original position to return to
					size: Math.random() * 0.85 + 0.5, // Random size between 0.5 and 2
					color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)], // Random color
					velocityX: 0, // Initial velocity X
					velocityY: 0, // Initial velocity Y
					randomMoveTimer: Math.random() * 1000 // Random timer for movement changes
				});
			}
			dots = tempDots; // Assign the generated dots array to the $state variable dots

			// Define the mouse movement event handler
			const handleMouseMove = (event: MouseEvent) => {
				mouse.x = event.clientX; // Update mouse x coordinate
				mouse.y = event.clientY; // Update mouse y coordinate
				
				// Update dot positions based on mouse position
				dots = dots.map(dot => {
					const distance = Math.sqrt((dot.originalX - mouse.x) ** 2 + (dot.originalY - mouse.y) ** 2);
					
					if (distance < GLOW_RADIUS * 1.5) {
						// Calculate pull factor based on distance
						const pull = (1 - distance / (GLOW_RADIUS * 1.5)) * MOUSE_PULL_FACTOR;
						
						// Calculate new position with slight pull toward mouse
						const dx = mouse.x - dot.originalX;
						const dy = mouse.y - dot.originalY;
						
						return {
							...dot,
							x: dot.originalX + dx * pull,
							y: dot.originalY + dy * pull
						};
					}
					
					// If far from mouse, gradually return to original position
					return {
						...dot,
						x: dot.x + (dot.originalX - dot.x) * 0.02,
						y: dot.y + (dot.originalY - dot.y) * 0.02
					};
				});
			};

			// Define the window resize event handler
			const handleResize = () => {
				// When window size changes, redistribute dots randomly
				const newDots = [];
				for (let i = 0; i < NUM_DOTS; i++) {
					const x = Math.random() * window.innerWidth;
					const y = Math.random() * window.innerHeight;
					newDots.push({
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
				dots = newDots;
			};

			// Create animation frame handler for random movement
			const updateRandomMovement = () => {
				// Update each dot's position with random movement
				dots = dots.map(dot => {
					// Decrease timer and generate new random velocities when timer reaches zero
					dot.randomMoveTimer -= 1;
					
					if (dot.randomMoveTimer <= 0) {
						// Set new random velocity
						dot.velocityX = (Math.random() - 0.5) * RANDOM_MOVE_SPEED;
						dot.velocityY = (Math.random() - 0.5) * RANDOM_MOVE_SPEED;
						// Reset timer with random duration
						dot.randomMoveTimer = Math.random() * 200 + 50;
					}
					
					// Apply velocity to position
					let newX = dot.x + dot.velocityX;
					let newY = dot.y + dot.velocityY;
					
					// Keep stars within range of their original position
					const distanceFromOrigin = Math.sqrt(
						(newX - dot.originalX) ** 2 + 
						(newY - dot.originalY) ** 2
					);
					
					if (distanceFromOrigin > RANDOM_MOVE_RANGE) {
						// If too far, move back toward original position
						newX = dot.x + (dot.originalX - dot.x) * 0.05;
						newY = dot.y + (dot.originalY - dot.y) * 0.05;
					}
					
					return {
						...dot,
						x: newX,
						y: newY
					};
				});
				
				// Continue animation loop
				animationFrameId = requestAnimationFrame(updateRandomMovement);
			};
			
			// Start animation loop
			let animationFrameId = requestAnimationFrame(updateRandomMovement);

			// Add event listeners
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('resize', handleResize);

			// Cleanup function: remove event listeners and cancel animation frame
			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('resize', handleResize);
				cancelAnimationFrame(animationFrameId);
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
