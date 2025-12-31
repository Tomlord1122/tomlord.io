/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced function with cancel() and flush() methods
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): {
	(...args: Parameters<T>): void;
	cancel: () => void;
	flush: () => void;
} {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Parameters<T> | null = null;

	const debounced = (...args: Parameters<T>): void => {
		lastArgs = args;

		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			timeoutId = null;
			if (lastArgs !== null) {
				func(...lastArgs);
				lastArgs = null;
			}
		}, wait);
	};

	debounced.cancel = (): void => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		lastArgs = null;
	};

	debounced.flush = (): void => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		if (lastArgs !== null) {
			func(...lastArgs);
			lastArgs = null;
		}
	};

	return debounced;
}
