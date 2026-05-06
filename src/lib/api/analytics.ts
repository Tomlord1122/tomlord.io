import { config, fetchWithTimeout } from '$lib/config.js';

export interface VisitorStats {
	today_count: number;
	total_count: number;
	recent?: Array<{
		date: string;
		visit_count: number;
	}>;
}

export interface TrackVisitorResponse extends VisitorStats {
	is_new_visit: boolean;
}

function getOrCreateVisitorKey(): string {
	const storageKey = 'tomlord.visitor_key';
	const existing = localStorage.getItem(storageKey);
	if (existing) return existing;

	const key = crypto.randomUUID();
	localStorage.setItem(storageKey, key);
	return key;
}

/**
 * Fetch current visitor stats from the backend
 */
export async function fetchVisitorStats(): Promise<VisitorStats> {
	const response = await fetchWithTimeout(config.API.VISITORS, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch visitor stats: ${response.status}`);
	}

	return response.json();
}

/**
 * Record a visit and get updated stats
 */
export async function trackVisitor(): Promise<TrackVisitorResponse> {
	const visitorKey = getOrCreateVisitorKey();

	const response = await fetchWithTimeout(
		config.API.VISITORS_TRACK,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Visitor-Key': visitorKey
			}
		},
		5000
	);

	if (!response.ok) {
		throw new Error(`Failed to track visitor: ${response.status}`);
	}

	return response.json();
}
