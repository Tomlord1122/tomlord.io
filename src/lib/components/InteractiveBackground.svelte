<script lang="ts">
	import { browser } from '$app/environment';

	let mouse = $state({ x: 0, y: 0 });

	let dots = $state<{ id: number; x: number; y: number; size: number; color: string; originalX: number; originalY: number }[]>([]);

	const NUM_DOTS = 75; // Total number of dots, you can adjust this number.
	const GLOW_RADIUS = 100; // Radius of mouse influence where dots start to glow (in pixels).
	const MAX_GLOW = 0.3; // Maximum glow intensity for dots (reduced from 1 to 0.5)
	const STAR_COLORS = ['#ffffff', '#323232'];
	const MOUSE_PULL_FACTOR = 0.15; // How strongly stars are pulled toward the mouse

	$effect(() => {
		// Ensure the following code only runs in browser environment, as the window object doesn't exist during server-side rendering.
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
					color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)] // Random color from the array
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
						color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
					});
				}
				dots = newDots;
			};

			// Add 'mousemove' event listener to window, calling handleMouseMove when mouse moves
			window.addEventListener('mousemove', handleMouseMove);
			// Add 'resize' event listener to window, calling handleResize when window size changes
			window.addEventListener('resize', handleResize);

			// $effect cleanup function: remove event listeners when component is destroyed or $effect re-runs, to prevent memory leaks.
			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('resize', handleResize);
			};
		}
	});

	// Function to calculate dot glow intensity
	// Input: dot coordinates (dotX, dotY), mouse coordinates (mouseX, mouseY)
	// Output: glow intensity (value between 0 and MAX_GLOW)
	function calculateGlow(dotX: number, dotY: number, mouseX: number, mouseY: number): number {
		// Calculate the straight-line distance between mouse and dot (using Pythagorean theorem)
		const distance = Math.sqrt((dotX - mouseX) ** 2 + (dotY - mouseY) ** 2);

		// If distance is less than the predefined GLOW_RADIUS
		if (distance < GLOW_RADIUS) {
			// Glow intensity is inversely proportional to distance: closer means stronger glow.
			// (1 - distance / GLOW_RADIUS) calculates a ratio from 0 to 1, where 1 is at distance 0, and 0 is at distance GLOW_RADIUS.
			return MAX_GLOW * (1 - distance / GLOW_RADIUS);
		}
		// If distance is greater than glow radius, glow intensity is 0.
		return 0;
	}
</script>

<!-- HTML Template Section -->
<!-- This is the interactive background container, it fills the entire screen -->
<div class="interactive-background">
	<!-- Svelte's {#each ...} syntax to iterate through each dot object in the dots array -->
	<!-- (dot.id) is the key, helping Svelte efficiently update the list -->
	{#each dots as dot (dot.id)}
		<!-- {@const ...} is used to declare a constant in the template, here we calculate the current glow intensity for each dot -->
		{@const glowIntensity = calculateGlow(dot.x, dot.y, mouse.x, mouse.y)}
		<!-- Render a single dot div element -->
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
		position: fixed; /* Fixed position, doesn't scroll with the scrollbar */
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
		position: absolute; /* Absolute positioning, relative to the interactive-background container */
		border-radius: 50%; /* Make stars circular */
		/* CSS transition effects for smooth changes in opacity, size, and shadow */
		transition: opacity 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.3s ease-out;
		/* will-change is a performance hint, telling the browser these properties will change, allowing for optimizations */
		will-change: opacity, transform, box-shadow, left, top;
		/* Create a twinkling effect with animation */
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
