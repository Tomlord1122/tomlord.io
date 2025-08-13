import type { User } from '$lib/stores/auth.svelte.js';

/**
 * Check if a user has super user privileges
 * Uses the is_super_user flag from backend (set during /auth/me response)
 * @param user - The user object to check
 * @returns true if the user is a super user, false otherwise
 */
export function isSuperUser(user: User | null): boolean {
	if (!user) {
		return false;
	}

	// Use the backend-provided flag for security
	// This ensures super user check is done server-side
	return user.is_super_user === true;
}

/**
 * Check if a user can delete a specific comment
 * @param user - The current user
 * @param commentUserId - The user ID of the comment author
 * @returns true if the user can delete the comment, false otherwise
 */
export function canDeleteComment(user: User | null, commentUserId: string): boolean {
	if (!user) {
		return false;
	}

	// Super users can delete any comment
	if (isSuperUser(user)) {
		return true;
	}

	// Regular users can only delete their own comments
	return user.id === commentUserId;
}
