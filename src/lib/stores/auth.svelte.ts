import { browser } from '$app/environment';

export interface User {
	id: string;
	google_id: string;
	email: string;
	name: string;
	picture_url?: string;
}

export interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

// Create auth state using Svelte 5 runes
function createAuthStore() {
	let state = $state<AuthState>({
		user: null,
		isAuthenticated: false,
		isLoading: false,
		error: null
	});

	// Initialize from localStorage if browser
	if (browser) {
		const savedToken = localStorage.getItem('auth_token');
		if (savedToken) {
			// Use setTimeout to defer the async operation to avoid blocking
			setTimeout(() => checkAuthStatus(), 0);
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
			const response = await fetch('http://localhost:8080/auth/me', {
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
		window.location.href = 'http://localhost:8080/auth/google';
	}

	function logout() {
		if (!browser) return;

		localStorage.removeItem('auth_token');
		state.user = null;
		state.isAuthenticated = false;
		state.error = null;

		// Optionally call backend logout endpoint
		fetch('http://localhost:8080/auth/logout', {
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
