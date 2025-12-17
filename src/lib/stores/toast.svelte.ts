// Simple toast notification store using Svelte 5 runes

interface Toast {
	id: number;
	message: string;
	type: 'success' | 'error' | 'info';
}

let toasts = $state<Toast[]>([]);
let nextId = 0;

export function showToast(
	message: string,
	type: 'success' | 'error' | 'info' = 'success',
	duration = 1000
) {
	const id = nextId++;
	toasts.push({ id, message, type });

	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, duration);
}

export function getToasts() {
	return toasts;
}
