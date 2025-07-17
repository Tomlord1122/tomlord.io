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

// Export individual configs for convenience
export const {
	BACKEND_URL,
	BACKEND_WS_URL,
	APP_ENV,
} = config;
