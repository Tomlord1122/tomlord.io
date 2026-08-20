<script lang="ts">
	interface Props {
		value?: string;
		textareaRef?: HTMLTextAreaElement | undefined;
		placeholder?: string;
		class?: string;
		id?: string;
		required?: boolean;
		disabled?: boolean;
		rows?: number;
		wrap?: 'soft' | 'hard' | null;
		onKeydown?: (e: KeyboardEvent) => void;
		onInput?: (e: Event) => void;
		onFocus?: (e: FocusEvent) => void;
		onBlur?: (e: FocusEvent) => void;
		onCompositionstart?: (e: CompositionEvent) => void;
		onCompositionend?: (e: CompositionEvent) => void;
		onPaste?: (e: ClipboardEvent) => void;
		onScroll?: (e: Event) => void;
	}

	let {
		value = $bindable(''),
		textareaRef = $bindable<HTMLTextAreaElement | undefined>(undefined),
		placeholder = '',
		class: className = '',
		id = '',
		required = false,
		disabled = false,
		rows,
		wrap = 'soft',
		onKeydown,
		onInput,
		onFocus,
		onBlur,
		onCompositionstart,
		onCompositionend,
		onPaste,
		onScroll
	}: Props = $props();

	let textareaElement = $state<HTMLTextAreaElement>();

	// Sync internal textareaElement to the bindable textareaRef
	$effect(() => {
		if (textareaElement) {
			textareaRef = textareaElement;
		}
	});

	const handleKeydown = (e: KeyboardEvent) => {
		onKeydown?.(e);
	};

	const handleInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
		onInput?.(e);
	};

	const handleFocus = (e: FocusEvent) => {
		onFocus?.(e);
	};

	const handleBlur = (e: FocusEvent) => {
		onBlur?.(e);
	};

	const handleCompositionStart = (e: CompositionEvent) => {
		onCompositionstart?.(e);
	};

	const handleCompositionEnd = (e: CompositionEvent) => {
		onCompositionend?.(e);
	};

	const handlePaste = (e: ClipboardEvent) => {
		onPaste?.(e);
	};

	const handleScroll = (e: Event) => {
		onScroll?.(e);
	};
</script>

<div class="typewriter-textarea-container">
	<textarea
		bind:this={textareaElement}
		{placeholder}
		{id}
		{required}
		{disabled}
		{rows}
		{wrap}
		{value}
		class={`
			typewriter-textarea
			${className}
			${disabled ? 'typewriter-disabled' : ''}
		`}
		onkeydown={handleKeydown}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		oncompositionstart={handleCompositionStart}
		oncompositionend={handleCompositionEnd}
		onpaste={handlePaste}
		onscroll={handleScroll}
	></textarea>
</div>

<style>
	.typewriter-textarea-container {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-height: 0;
	}

	.typewriter-textarea {
		flex: 1;
		min-height: 0;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		letter-spacing: 0.5px;
		line-height: 1.6;
	}

	.typewriter-disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background-color: #f5f5f5;
	}
</style>
