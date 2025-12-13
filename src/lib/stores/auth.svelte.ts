import { browser } from '$app/environment';
import { config } from '$lib/config.js';

export interface User {
	id: string;
	google_id: string;
	email: string;
	name: string;
	picture_url?: string;
	is_super_user?: boolean;
}

export interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

// Create auth state using Svelte 5 runes
function createAuthStore() {
	const state = $state<AuthState>({
		user: null,
		isAuthenticated: false,
		isLoading: false,
		error: null
	});

	// Initialize from localStorage if browser - non-blocking
	if (browser) {
		const savedToken = localStorage.getItem('auth_token');
		if (savedToken) {
			// Defer auth check to not block initial render
			setTimeout(() => checkAuthStatus(), 100); // Increased delay for better UX
		}
	}

	async function checkAuthStatus() {
		if (!browser) return;

		const token = localStorage.getItem('auth_token');
		if (!token) {
			state.isAuthenticated = false;
			state.user = null;
			return;
		}

		state.isLoading = true;
		state.error = null;

		try {
			const response = await fetch(`${config.API.AUTH_ME}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				state.user = data.user;
				state.isAuthenticated = true;
			} else {
				// Token is invalid, remove it
				localStorage.removeItem('auth_token');
				state.isAuthenticated = false;
				state.user = null;
			}
		} catch (error) {
			console.error('Error checking auth status:', error);
			state.error = 'Failed to check authentication status';
			state.isAuthenticated = false;
			state.user = null;
		} finally {
			state.isLoading = false;
		}
	}

	function login() {
		if (!browser) return;

		// Redirect to backend OAuth endpoint
		window.location.href = `${config.API.AUTH_GOOGLE}`;
	}

	function logout() {
		if (!browser) return;

		localStorage.removeItem('auth_token');
		state.user = null;
		state.isAuthenticated = false;
		state.error = null;

		// Optionally call backend logout endpoint
		fetch(`${config.API.AUTH_LOGOUT}`, {
			method: 'POST'
		}).catch(console.error);
	}

	function setToken(token: string) {
		if (!browser) return;

		localStorage.setItem('auth_token', token);
		checkAuthStatus();
	}

	function clearError() {
		state.error = null;
	}

	// Return readonly state and methods
	return {
		get state() {
			return state;
		},
		login,
		logout,
		setToken,
		checkAuthStatus,
		clearError
	};
}

// Create and export the auth store instance
export const authStore = createAuthStore();

// Export a simplified auth object for direct access to common properties
// This provides a cleaner API: auth.user, auth.token, auth.login(), auth.logout()
export const auth = {
	get user() {
		return authStore.state.user;
	},
	get isAuthenticated() {
		return authStore.state.isAuthenticated;
	},
	get isLoading() {
		return authStore.state.isLoading;
	},
	get token() {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('auth_token');
		}
		return null;
	},
	login: authStore.login,
	logout: authStore.logout,
	setToken: authStore.setToken,
	checkAuthStatus: authStore.checkAuthStatus
};
