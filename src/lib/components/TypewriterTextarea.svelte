<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		value?: string;
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
	}

	let {
		value = $bindable(''),
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
		soundVolume = 0.1
	}: Props = $props();

	let textareaElement: HTMLTextAreaElement;
	let audioContext: AudioContext | null = null;
	let isFocused = $state(false);
	let isTyping = $state(false);
	let isComposing = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout>;

	// Different typewriter sounds for variety
	const createTypewriterSound = (
		keyType: 'normal' | 'space' | 'enter' | 'backspace' = 'normal'
	) => {
		if (!audioContext || !enableSound) return;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

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
				const baseFreq = 1000 + Math.random() * 200;
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
	};

	const handleInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
		onInput?.(e);
	};

	const handleFocus = (e: FocusEvent) => {
		isFocused = true;
		onFocus?.(e);
	};

	const handleBlur = (e: FocusEvent) => {
		isFocused = false;
		isTyping = false;
		onBlur?.(e);
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
				audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

<div class="typewriter-textarea-container">
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
		style:resize
		onkeydown={handleKeydown}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		oncompositionstart={handleCompositionStart}
		oncompositionend={handleCompositionEnd}
	></textarea>
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

	/* Cursor animation for more typewriter feel */
	.typewriter-textarea:focus {
		caret-color: #4f46e5;
		animation: cursor-blink 1s infinite;
	}

	@keyframes cursor-blink {
		0%,
		50% {
			caret-color: #4f46e5;
		}
		51%,
		100% {
			caret-color: transparent;
		}
	}
</style>
