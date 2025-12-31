<script lang="ts">
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
		style = ''
	}: Props = $props();

	let textareaElement = $state<HTMLTextAreaElement>();
	let isFocused = $state(false);

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
		isFocused = true;
		onFocus?.(e);
	};

	const handleBlur = (e: FocusEvent) => {
		isFocused = false;
		onBlur?.(e);
	};

	const handleCompositionStart = (e: CompositionEvent) => {
		onCompositionstart?.(e);
	};

	const handleCompositionEnd = (e: CompositionEvent) => {
		onCompositionend?.(e);
	};
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
			${disabled ? 'typewriter-disabled' : ''}
		`}
		style="{style}; resize: {resize};"
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

	.typewriter-disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background-color: #f5f5f5;
	}
</style>
