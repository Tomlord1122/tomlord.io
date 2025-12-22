<script lang="ts">
	import { onMount } from 'svelte';

	interface WindowWithWebkitAudio extends Window {
		webkitAudioContext?: typeof AudioContext;
		AudioContext?: typeof AudioContext;
	}

	interface Props {
		value?: string;
		textareaRef?: HTMLTextAreaElement | undefined;
		placeholder?: string;
		class?: string;
		id?: string;
		required?: boolean;
		disabled?: boolean;
		readonly?: boolean;
		rows?: number;
		cols?: number;
		maxlength?: number;
		minlength?: number;
		wrap?: 'soft' | 'hard' | null;
		resize?: 'none' | 'both' | 'horizontal' | 'vertical';
		onKeydown?: (e: KeyboardEvent) => void;
		onInput?: (e: Event) => void;
		onFocus?: (e: FocusEvent) => void;
		onBlur?: (e: FocusEvent) => void;
		onCompositionstart?: (e: CompositionEvent) => void;
		onCompositionend?: (e: CompositionEvent) => void;
		enableSound?: boolean;
		soundVolume?: number;
		style?: string;
	}

	let {
		value = $bindable(''),
		textareaRef = $bindable<HTMLTextAreaElement | undefined>(undefined),
		placeholder = '',
		class: className = '',
		id = '',
		required = false,
		disabled = false,
		readonly = false,
		rows = 4,
		cols,
		maxlength,
		minlength,
		wrap = 'soft',
		resize = 'vertical',
		onKeydown,
		onInput,
		onFocus,
		onBlur,
		onCompositionstart,
		onCompositionend,
		enableSound = true,
		soundVolume = 0.1,
		style = ''
	}: Props = $props();

	let textareaElement = $state<HTMLTextAreaElement>();
	let containerElement = $state<HTMLDivElement>();

	// Sync internal textareaElement to the bindable textareaRef
	$effect(() => {
		if (textareaElement) {
			textareaRef = textareaElement;
		}
	});
	let audioContext: AudioContext | null = null;
	let isFocused = $state(false);
	let isTyping = $state(false);
	let isComposing = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout>;

	// Custom caret state
	let caretPosition = $state({ x: 0, y: 0 });
	let caretVisible = $state(false);
	let caretTrail = $state<Array<{ x: number; y: number; opacity: number }>>([]);
	let lastCaretUpdate = $state(0);

	// Calculate caret position from textarea selection
	function updateCaretPosition() {
		if (!textareaElement || !containerElement || !isFocused) {
			caretVisible = false;
			return;
		}

		const cursorIndex = textareaElement.selectionStart;
		const textBeforeCursor = value.substring(0, cursorIndex);

		// Create mirror element to measure text
		const mirror = document.createElement('div');
		const computed = window.getComputedStyle(textareaElement);

		// Copy all relevant styles
		mirror.style.cssText = `
			position: absolute;
			visibility: hidden;
			white-space: pre-wrap;
			word-wrap: break-word;
			overflow-wrap: break-word;
			width: ${computed.width};
			font: ${computed.font};
			font-size: ${computed.fontSize};
			font-family: ${computed.fontFamily};
			font-weight: ${computed.fontWeight};
			line-height: ${computed.lineHeight};
			letter-spacing: ${computed.letterSpacing};
			padding: ${computed.padding};
			border: ${computed.border};
			box-sizing: ${computed.boxSizing};
		`;

		document.body.appendChild(mirror);

		// Create text content with cursor marker
		const textNode = document.createTextNode(textBeforeCursor);
		const cursorSpan = document.createElement('span');
		cursorSpan.textContent = '\u200B'; // Zero-width space

		mirror.appendChild(textNode);
		mirror.appendChild(cursorSpan);

		// Get cursor position relative to mirror
		const cursorRect = cursorSpan.getBoundingClientRect();
		const mirrorRect = mirror.getBoundingClientRect();

		// Calculate position relative to container
		const textareaRect = textareaElement.getBoundingClientRect();
		const containerRect = containerElement.getBoundingClientRect();

		const prevX = caretPosition.x;
		const prevY = caretPosition.y;

		const newX = cursorRect.left - mirrorRect.left + (textareaRect.left - containerRect.left) - textareaElement.scrollLeft;
		const newY = cursorRect.top - mirrorRect.top + (textareaRect.top - containerRect.top) - textareaElement.scrollTop;

		// Add to trail if position changed significantly
		const distance = Math.sqrt(Math.pow(newX - prevX, 2) + Math.pow(newY - prevY, 2));
		if (distance > 3 && caretVisible) {
			const now = Date.now();
			if (now - lastCaretUpdate > 16) { // ~60fps throttle
				// Add previous position to trail
				caretTrail = [
					{ x: prevX, y: prevY, opacity: 0.6 },
					...caretTrail.slice(0, 4).map(t => ({ ...t, opacity: t.opacity * 0.5 }))
				].filter(t => t.opacity > 0.05);
				lastCaretUpdate = now;
			}
		}

		caretPosition = { x: newX, y: newY };
		caretVisible = true;

		// Cleanup
		document.body.removeChild(mirror);

		// Fade out trail
		setTimeout(() => {
			caretTrail = caretTrail.map(t => ({ ...t, opacity: t.opacity * 0.7 })).filter(t => t.opacity > 0.05);
		}, 50);
	}

	// Update caret on various events
	$effect(() => {
		if (isFocused && textareaElement) {
			// Track value changes to update caret
			value; // dependency
			updateCaretPosition();
		}
	});

	// Different typewriter sounds for variety
	const createTypewriterSound = (
		keyType: 'normal' | 'space' | 'enter' | 'backspace' = 'normal'
	) => {
		if (!audioContext || !enableSound) return;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		const baseFreq = 1000 + Math.random() * 200;

		// Different sounds for different key types
		switch (keyType) {
			case 'space':
				oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.01);
				gainNode.gain.setValueAtTime(soundVolume * 0.8, audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
				oscillator.start(audioContext.currentTime);
				oscillator.stop(audioContext.currentTime + 0.05);
				break;
			case 'enter':
				oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.01);
				gainNode.gain.setValueAtTime(soundVolume * 1.3, audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.06);
				oscillator.start(audioContext.currentTime);
				oscillator.stop(audioContext.currentTime + 0.06);
				break;
			case 'backspace':
				oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.008);
				gainNode.gain.setValueAtTime(soundVolume * 0.9, audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.04);
				oscillator.start(audioContext.currentTime);
				oscillator.stop(audioContext.currentTime + 0.04);
				break;
			default:
				// Random variation for normal keys - crisp mechanical keyboard sound
				oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(
					baseFreq * 0.6,
					audioContext.currentTime + 0.008
				);
				gainNode.gain.setValueAtTime(soundVolume * 1.1, audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.04);
				oscillator.start(audioContext.currentTime);
				oscillator.stop(audioContext.currentTime + 0.04);
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		// Skip sound during composition (IME input)
		if (isComposing) {
			onKeydown?.(e);
			return;
		}

		// Create appropriate typewriter sound
		if (e.key === ' ') {
			createTypewriterSound('space');
		} else if (e.key === 'Enter') {
			createTypewriterSound('enter');
		} else if (e.key === 'Backspace' || e.key === 'Delete') {
			createTypewriterSound('backspace');
		} else if (
			![
				'Shift',
				'Control',
				'Alt',
				'Meta',
				'CapsLock',
				'Tab',
				'Escape',
				'ArrowUp',
				'ArrowDown',
				'ArrowLeft',
				'ArrowRight'
			].includes(e.key)
		) {
			createTypewriterSound('normal');
		}

		// Visual feedback for typing
		if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) {
			isTyping = true;
			clearTimeout(typingTimeout);
			typingTimeout = setTimeout(() => {
				isTyping = false;
			}, 200);
		}

		onKeydown?.(e);

		// Update caret position for navigation keys
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
			requestAnimationFrame(() => updateCaretPosition());
		}
	};

	const handleInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
		onInput?.(e);
		// Update caret after input
		requestAnimationFrame(() => updateCaretPosition());
	};

	const handleFocus = (e: FocusEvent) => {
		isFocused = true;
		onFocus?.(e);
		// Initial caret position update
		requestAnimationFrame(() => updateCaretPosition());
	};

	const handleBlur = (e: FocusEvent) => {
		isFocused = false;
		isTyping = false;
		caretVisible = false;
		caretTrail = [];
		onBlur?.(e);
	};

	const handleClick = () => {
		requestAnimationFrame(() => updateCaretPosition());
	};

	const handleSelect = () => {
		requestAnimationFrame(() => updateCaretPosition());
	};

	const handleScroll = () => {
		requestAnimationFrame(() => updateCaretPosition());
	};

	const handleCompositionStart = (e: CompositionEvent) => {
		isComposing = true;
		onCompositionstart?.(e);
	};

	const handleCompositionEnd = (e: CompositionEvent) => {
		isComposing = false;
		onCompositionend?.(e);
	};

	onMount(() => {
		// Initialize Web Audio API
		if (enableSound && typeof window !== 'undefined') {
			try {
				const win = window as unknown as WindowWithWebkitAudio;
				const AudioContextCtor = win.AudioContext ?? win.webkitAudioContext;
				if (AudioContextCtor) {
					audioContext = new AudioContextCtor();
				}
			} catch (error) {
				console.warn('Web Audio API not supported:', error);
			}
		}

		return () => {
			if (audioContext) {
				audioContext.close();
			}
			clearTimeout(typingTimeout);
		};
	});
</script>

<div class="typewriter-textarea-container" bind:this={containerElement}>
	<textarea
		bind:this={textareaElement}
		{placeholder}
		{id}
		{required}
		{disabled}
		{readonly}
		{rows}
		{cols}
		{maxlength}
		{minlength}
		{wrap}
		{value}
		class={`
			typewriter-textarea
			${className}
			${isFocused ? 'typewriter-focused' : ''}
			${isTyping ? 'typewriter-typing' : ''}
			${disabled ? 'typewriter-disabled' : ''}
		`}
		style="{style}; resize: {resize};"
		onkeydown={handleKeydown}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		onclick={handleClick}
		onselect={handleSelect}
		onscroll={handleScroll}
		oncompositionstart={handleCompositionStart}
		oncompositionend={handleCompositionEnd}
	></textarea>

	<!-- Custom animated caret with comet trail -->
	{#if caretVisible && isFocused}
		<!-- Comet trail particles -->
		{#each caretTrail as trail, i (i)}
			<div
				class="caret-trail"
				style="
					left: {trail.x}px;
					top: {trail.y}px;
					opacity: {trail.opacity};
					transform: scale({0.3 + trail.opacity * 0.7});
				"
			></div>
		{/each}

		<!-- Main caret with glow -->
		<div
			class="custom-caret"
			class:typing={isTyping}
			style="left: {caretPosition.x}px; top: {caretPosition.y}px;"
		>
			<div class="caret-glow"></div>
			<div class="caret-line"></div>
		</div>
	{/if}
</div>

<style>
	.typewriter-textarea-container {
		position: relative;
		display: block;
		width: 100%;
	}

	.typewriter-textarea {
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		letter-spacing: 0.5px;
		line-height: 1.6;
		/* Hide native caret */
		caret-color: transparent;
	}

	.typewriter-focused {
		box-shadow:
			0 0 0 2px rgba(59, 130, 246, 0.3),
			0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.typewriter-typing {
		background-color: rgba(249, 250, 251, 0.8);
		transform: translateY(-1px) scale(1.001);
	}

	.typewriter-disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background-color: #f5f5f5;
	}

	/* Subtle animation for the container when typing */
	.typewriter-textarea-container:has(.typewriter-typing) {
		animation: subtle-shake 0.15s ease-in-out;
	}

	@keyframes subtle-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-0.3px);
		}
		75% {
			transform: translateX(0.3px);
		}
	}

	/* Custom caret styles */
	.custom-caret {
		position: absolute;
		pointer-events: none;
		z-index: 10;
		transition: left 0.08s cubic-bezier(0.22, 1, 0.36, 1),
					top 0.08s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.caret-line {
		width: 2px;
		height: 1.2em;
		background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
		border-radius: 1px;
		animation: caret-blink 1s ease-in-out infinite;
		box-shadow: 0 0 4px rgba(99, 102, 241, 0.6);
	}

	.caret-glow {
		position: absolute;
		width: 8px;
		height: 1.4em;
		left: -3px;
		top: -0.1em;
		background: radial-gradient(ellipse at center, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
		filter: blur(2px);
		animation: glow-pulse 1.5s ease-in-out infinite;
	}

	.custom-caret.typing .caret-line {
		animation: none;
		opacity: 1;
		transform: scaleY(1.05);
		box-shadow: 0 0 8px rgba(139, 92, 246, 0.8),
					0 0 16px rgba(168, 85, 247, 0.4);
	}

	.custom-caret.typing .caret-glow {
		animation: none;
		opacity: 0.8;
		transform: scale(1.3);
	}

	@keyframes caret-blink {
		0%, 45% {
			opacity: 1;
		}
		50%, 95% {
			opacity: 0.3;
		}
		100% {
			opacity: 1;
		}
	}

	@keyframes glow-pulse {
		0%, 100% {
			opacity: 0.5;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.2);
		}
	}

	/* Comet trail particles */
	.caret-trail {
		position: absolute;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, rgba(168, 85, 247, 0.4) 50%, transparent 100%);
		pointer-events: none;
		z-index: 9;
		filter: blur(1px);
		transition: opacity 0.15s ease-out, transform 0.15s ease-out;
	}
</style>
