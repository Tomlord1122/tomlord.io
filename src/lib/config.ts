import {
	PUBLIC_BACKEND_URL,
	PUBLIC_BACKEND_WS_URL,
	PUBLIC_APP_ENV,
	PUBLIC_AUTH_SUPER_USER_EMAIL
} from '$env/static/public';
import { browser } from '$app/environment';

// Environment configuration
export const config = {
	// API Configuration
	BACKEND_URL: PUBLIC_BACKEND_URL || 'http://localhost:8080',
	BACKEND_WS_URL: PUBLIC_BACKEND_WS_URL || 'ws://localhost:8080',

	// Environment detection
	APP_ENV: PUBLIC_APP_ENV || 'development',
	AUTH_SUPER_USER_EMAIL: PUBLIC_AUTH_SUPER_USER_EMAIL || 'r12944044@csie.ntu.edu.tw',

	// Performance and reliability settings
	FETCH_TIMEOUT: 5000, // 5 seconds timeout for API calls
	WEBSOCKET_TIMEOUT: 5000, // 5 seconds timeout for WebSocket connection

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
			PAGES: `${this.BACKEND_URL}/api/pages`,
			MESSAGES: `${this.BACKEND_URL}/api/messages`,
			WEBSOCKET: `${this.BACKEND_WS_URL}/ws`,
			HEALTH: `${this.BACKEND_URL}/health`
		};
	}
};

// Utility function for fetch with timeout
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
			signal: controller.signal
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

// Export individual configs for convenience
export const { BACKEND_URL, BACKEND_WS_URL, APP_ENV } = config;
