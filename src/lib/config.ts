import {
	PUBLIC_BACKEND_URL,
	PUBLIC_BACKEND_WS_URL,
	PUBLIC_APP_ENV,
} from '$env/static/public';
import { browser } from '$app/environment';

// Environment configuration
export const config = {
	// API Configuration
	BACKEND_URL: PUBLIC_BACKEND_URL || 'http://localhost:8080',
	BACKEND_WS_URL: PUBLIC_BACKEND_WS_URL || 'ws://localhost:8080',

	// Environment detection
	APP_ENV: PUBLIC_APP_ENV || 'development',

	// Performance and reliability settings
	FETCH_TIMEOUT: 3000, // 3 seconds timeout for API calls
	WEBSOCKET_TIMEOUT: 2000, // 2 seconds timeout for WebSocket connection
	RETRY_ATTEMPTS: 2,

	// Computed properties
	get isDevelopment() {
		return this.APP_ENV === 'development' || (browser && window.location.hostname === 'localhost');
	},

	get isProduction() {
		return this.APP_ENV === 'production';
	},

	// API endpoints
	get API() {
		return {
			AUTH_ME: `${this.BACKEND_URL}/auth/me`,
			AUTH_GOOGLE: `${this.BACKEND_URL}/auth/google`,
			AUTH_LOGOUT: `${this.BACKEND_URL}/auth/logout`,
			BLOGS: `${this.BACKEND_URL}/api/blogs`,
			MESSAGES: `${this.BACKEND_URL}/api/messages`,
			WEBSOCKET: `${this.BACKEND_WS_URL}/ws`
		};
	}
};

// Utility function for fetch with timeout and retry
export async function fetchWithTimeout(
	url: string, 
	options: RequestInit = {}, 
	timeout: number = config.FETCH_TIMEOUT
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

// Utility function to attempt API call with immediate fallback
export async function fetchWithFallback<T>(
	apiCall: () => Promise<T>,
	fallbackCall: () => Promise<T>,
	timeout: number = config.FETCH_TIMEOUT
): Promise<T> {
	// Start both API call and a timeout race
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error('API timeout')), timeout);
	});

	try {
		// Race between API call and timeout
		const result = await Promise.race([apiCall(), timeoutPromise]);
		return result;
	} catch (error) {
		console.warn('API call failed or timed out, using fallback:', error);
		return await fallbackCall();
	}
}

// Export individual configs for convenience
export const {
	BACKEND_URL,
	BACKEND_WS_URL,
	APP_ENV,
} = config;
