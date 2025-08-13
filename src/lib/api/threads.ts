import { config, fetchWithTimeout } from '$lib/config.js';
import type { ThreadPage, ThreadPost } from '$lib/types/thread.js';

function authHeaders(token: string): HeadersInit {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};
}

async function readError(response: Response, fallback: string): Promise<string> {
	const error = await response.json().catch(() => ({ error: fallback }));
	return error.error || `${fallback}: ${response.status}`;
}

export async function fetchThreads(options?: {
	limit?: number;
	cursor?: string | null;
}): Promise<ThreadPage> {
	const params = new URLSearchParams();
	if (options?.limit) params.set('limit', options.limit.toString());
	if (options?.cursor) params.set('cursor', options.cursor);

	const query = params.toString();
	const response = await fetchWithTimeout(`${config.API.THREADS}${query ? `?${query}` : ''}`);
	if (!response.ok) {
		throw new Error(await readError(response, 'Failed to fetch threads'));
	}
	return response.json();
}

export async function fetchThread(id: string): Promise<ThreadPost> {
	const response = await fetchWithTimeout(`${config.API.THREADS}/${id}`);
	if (!response.ok) {
		throw new Error(await readError(response, 'Failed to fetch thread'));
	}
	const data = await response.json();
	return data.thread;
}

export async function createThread(content: string, token: string): Promise<ThreadPost> {
	const response = await fetchWithTimeout(
		config.API.THREADS,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify({ content })
		},
		10000
	);
	if (!response.ok) {
		throw new Error(await readError(response, 'Failed to create thread'));
	}
	const data = await response.json();
	return data.thread;
}

export async function updateThread(
	id: string,
	content: string,
	token: string
): Promise<ThreadPost> {
	const response = await fetchWithTimeout(
		`${config.API.THREADS}/${id}`,
		{
			method: 'PUT',
			headers: authHeaders(token),
			body: JSON.stringify({ content })
		},
		10000
	);
	if (!response.ok) {
		throw new Error(await readError(response, 'Failed to update thread'));
	}
	const data = await response.json();
	return data.thread;
}

export async function deleteThread(id: string, token: string): Promise<void> {
	const response = await fetchWithTimeout(
		`${config.API.THREADS}/${id}`,
		{
			method: 'DELETE',
			headers: authHeaders(token)
		},
		10000
	);
	if (!response.ok) {
		throw new Error(await readError(response, 'Failed to delete thread'));
	}
}
