<script lang="ts">
	import { browser } from '$app/environment';

	// 滑鼠位置（非反應性，因為只在動畫循環中使用）
	let mouse = { x: 0, y: 0 };

	// 星星數據（非反應性）
	let dots: {
		id: number;
		x: number;
		y: number;
		originalX: number;
		originalY: number;
		size: number;
		color: string;
		velocityX: number;
		velocityY: number;
		randomMoveTimer: number;
	}[] = [];

	// 常數
	const NUM_DOTS = 100;
	const GLOW_RADIUS = 200;
	const MAX_GLOW = 1;
	const STAR_COLORS = ['#D7A9D7', '#323232'];
	const MOUSE_PULL_FACTOR = 0.35;
	const RANDOM_MOVE_RANGE = 10;
	const RANDOM_MOVE_SPEED = 0.25;

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number | null = null;

	// 初始化星星
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
				size: Math.random() * 1.75 + 0.5,
				color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
				velocityX: 0,
				velocityY: 0,
				randomMoveTimer: Math.random() * 1000
			});
		}
		dots = newDots;
	}

	// 處理滑鼠移動
	function handleMouseMove(event: MouseEvent) {
		mouse.x = event.clientX;
		mouse.y = event.clientY;
	}

	// 處理視窗大小改變
	function handleResize() {
		if (canvas) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			initializeDots();
		}
	}

	// 計算發光強度（使用非線性插值）
	function calculateGlow(dotX: number, dotY: number, mouseX: number, mouseY: number): number {
		const distance = Math.sqrt((dotX - mouseX) ** 2 + (dotY - mouseY) ** 2);
		if (distance < GLOW_RADIUS) {
			// 使用平方反比來使發光更平滑
			return MAX_GLOW * (1 - distance / GLOW_RADIUS) ** 2;
		}
		return 0;
	}

	// 更新星星位置和動畫
	function updateDots() {
		if (!ctx) return;

		// 清空畫布
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		dots = dots.map(dot => {
			const newDot = { ...dot };
			newDot.randomMoveTimer -= 1;

			// 隨機移動
			if (newDot.randomMoveTimer <= 0) {
				newDot.velocityX = (Math.random() - 0.5) * RANDOM_MOVE_SPEED;
				newDot.velocityY = (Math.random() - 0.5) * RANDOM_MOVE_SPEED;
				newDot.randomMoveTimer = Math.random() * 200 + 50;
			}

			let newX = newDot.x + newDot.velocityX;
			let newY = newDot.y + newDot.velocityY;

			// 限制隨機移動範圍
			const distanceFromOrigin = Math.sqrt(
				(newX - newDot.originalX) ** 2 + (newY - newDot.originalY) ** 2
			);
			if (distanceFromOrigin > RANDOM_MOVE_RANGE) {
				newX = newDot.x + (newDot.originalX - newDot.x) * 0.05;
				newY = newDot.y + (newDot.originalY - newDot.y) * 0.05;
			}

			// 滑鼠拉力
			const distance = Math.sqrt((newDot.originalX - mouse.x) ** 2 + (newDot.originalY - mouse.y) ** 2);
			if (distance < GLOW_RADIUS * 1.5) {
				const pull = (1 - distance / (GLOW_RADIUS * 1.5)) * MOUSE_PULL_FACTOR;
				const dx = mouse.x - newDot.originalX;
				const dy = mouse.y - newDot.originalY;
				newX = newDot.originalX + dx * pull;
				newY = newDot.originalY + dy * pull;
			} else {
				newX = newDot.x + (newDot.originalX - newDot.x) * 0.02;
				newY = newDot.y + (newDot.originalY - newDot.y) * 0.02;
			}

			newDot.x = newX;
			newDot.y = newY;

			// 繪製星星
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

	// 初始化 Canvas 和事件
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