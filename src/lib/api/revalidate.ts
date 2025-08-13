import { browser, dev } from '$app/environment';

/**
 * Trigger Vercel ISR revalidation for a given path.
 * Does nothing in development.
 */
export async function revalidateISR(path: string): Promise<void> {
	if (dev) {
		console.log(`[dev] Skipping ISR revalidation for ${path}`);
		return;
	}

	try {
		const token = browser ? localStorage.getItem('auth_token') : null;
		const response = await fetch(`/api/revalidate?path=${encodeURIComponent(path)}`, {
			method: 'POST',
			headers: token ? { Authorization: `Bearer ${token}` } : undefined
		});
		if (!response.ok) {
			console.error(`ISR revalidation failed for ${path}:`, await response.text());
		} else {
			console.log(`ISR revalidation sent for ${path}`);
		}
	} catch (e) {
		console.error(`ISR revalidation error for ${path}:`, e);
	}
}
