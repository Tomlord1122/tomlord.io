# Tomlord.io API Documentation

This document provides comprehensive documentation for all public APIs, functions, and components in the Tomlord.io Svelte application.

## Table of Contents

1. [Configuration](#configuration)
2. [Type Definitions](#type-definitions)
3. [Components](#components)
4. [Stores](#stores)
5. [Utility Functions](#utility-functions)
6. [Navigation](#navigation)
7. [API Routes](#api-routes)

---

## Configuration

### `config` Object

The main configuration object that provides environment-specific settings and API endpoints.

```typescript
import { config } from '$lib/config.js';
```

#### Properties

- `BACKEND_URL` (string): Backend API base URL
- `BACKEND_WS_URL` (string): WebSocket backend URL
- `APP_ENV` (string): Current environment ('development' | 'production')
- `FETCH_TIMEOUT` (number): API call timeout in milliseconds (default: 1000)
- `WEBSOCKET_TIMEOUT` (number): WebSocket connection timeout (default: 1000)
- `RETRY_ATTEMPTS` (number): Number of retry attempts for failed requests (default: 2)
- `HEALTH_CHECK_TIMEOUT` (number): Health check timeout (default: 500)
- `HEALTH_CHECK_CACHE_DURATION` (number): Health check cache duration (default: 30000)

#### Computed Properties

- `isDevelopment` (boolean): Returns true if in development environment
- `isProduction` (boolean): Returns true if in production environment
- `API` (object): Object containing all API endpoints

#### API Endpoints

```typescript
config.API = {
	AUTH_ME: `${BACKEND_URL}/auth/me`,
	AUTH_GOOGLE: `${BACKEND_URL}/auth/google`,
	AUTH_LOGOUT: `${BACKEND_URL}/auth/logout`,
	BLOGS: `${BACKEND_URL}/api/blogs`,
	MESSAGES: `${BACKEND_URL}/api/messages`,
	WEBSOCKET: `${BACKEND_WS_URL}/ws`,
	HEALTH: `${BACKEND_URL}/health`
};
```

### `checkBackendHealth(useCache?: boolean): Promise<boolean>`

Checks if the backend is healthy and responsive.

```typescript
import { checkBackendHealth } from '$lib/config.js';

// Check backend health (uses cache by default)
const isHealthy = await checkBackendHealth();

// Force fresh health check
const isHealthy = await checkBackendHealth(false);
```

**Parameters:**

- `useCache` (boolean, optional): Whether to use cached health check result (default: true)

**Returns:** Promise<boolean> - True if backend is healthy

### `smartLoadWithFallback<T>(apiCall, fallbackCall, forceHealthCheck?): Promise<{data: T, source: 'api' | 'local'}>`

Smart loading strategy that checks backend health first, then decides whether to use API or local fallback.

```typescript
import { smartLoadWithFallback } from '$lib/config.js';

const result = await smartLoadWithFallback(
	() => fetch('/api/data'),
	() => loadLocalData(),
	false
);

console.log(result.data); // The loaded data
console.log(result.source); // 'api' or 'local'
```

**Parameters:**

- `apiCall` (() => Promise<T>): Function that calls the API
- `fallbackCall` (() => Promise<T>): Function that loads local data
- `forceHealthCheck` (boolean, optional): Force fresh health check (default: false)

**Returns:** Promise<{data: T, source: 'api' | 'local'}>

### `fetchWithTimeout(url, options?, timeout?): Promise<Response>`

Utility function for fetch with timeout and retry capabilities.

```typescript
import { fetchWithTimeout } from '$lib/config.js';

const response = await fetchWithTimeout(
	'https://api.example.com/data',
	{ method: 'GET' },
	5000 // 5 second timeout
);
```

**Parameters:**

- `url` (string): The URL to fetch
- `options` (RequestInit, optional): Fetch options
- `timeout` (number, optional): Timeout in milliseconds (default: config.FETCH_TIMEOUT)

**Returns:** Promise<Response>

### `fetchWithFallback<T>(apiCall, fallbackCall, timeout?): Promise<T>`

Attempts API call with immediate fallback if it fails or times out.

```typescript
import { fetchWithFallback } from '$lib/config.js';

const data = await fetchWithFallback(
	() => fetch('/api/data').then((r) => r.json()),
	() => loadLocalData(),
	3000 // 3 second timeout
);
```

**Parameters:**

- `apiCall` (() => Promise<T>): Function that calls the API
- `fallbackCall` (() => Promise<T>): Function that provides fallback data
- `timeout` (number, optional): Timeout in milliseconds (default: config.FETCH_TIMEOUT)

**Returns:** Promise<T>

---

## Type Definitions

### Post Types

#### `PostMetadata`

```typescript
interface PostMetadata {
	title: string;
	date: string;
	slug: string;
	description: string;
	tags: string[];
	lang: string;
	duration: string;
}
```

#### `Post`

```typescript
interface Post extends Omit<PostMetadata, 'description'> {
	content: string; // Markdown/HTML content as string
	duration: string;
	description: string;
}
```

#### `PostData`

```typescript
interface PostData {
	title: string;
	slug: string;
	content: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description: string;
	is_published: boolean;
}
```

#### `Frontmatter`

```typescript
interface Frontmatter {
	title?: string;
	date?: string;
	slug?: string;
	description?: string;
	tags?: string[];
	lang?: string;
	duration?: string;
	[key: string]: string | string[] | undefined;
}
```

### Comment Types

#### `Comment`

```typescript
interface Comment {
	id: string;
	user_id: string;
	user_name: string;
	user_picture: string;
	post_slug: string;
	blog_id?: string;
	message: string;
	thumb_count: number;
	created_at: string;
	updated_at: string;
	user_thumbed?: boolean;
}
```

#### `CreateCommentRequest`

```typescript
interface CreateCommentRequest {
	user_id: string;
	post_slug: string;
	blog_id?: string;
	message: string;
}
```

#### `CommentListRequest`

```typescript
interface CommentListRequest {
	post_slug?: string;
	blog_id?: string;
	blog_slug?: string;
	limit?: number;
	offset?: number;
	user_id?: string;
}
```

#### `BlogPost`

```typescript
interface BlogPost {
	id: string;
	title: string;
	slug: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description?: string;
	is_published: boolean;
	created_at: string;
	updated_at: string;
	message_count?: number;
}
```

### Auth Types

#### `User`

```typescript
interface User {
	id: string;
	google_id: string;
	email: string;
	name: string;
	picture_url?: string;
}
```

#### `AuthState`

```typescript
interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}
```

---

## Components

### TypewriterTextarea

A textarea component with typewriter sound effects and visual feedback.

```typescript
import TypewriterTextarea from '$lib/components/TypewriterTextarea.svelte';
```

#### Props

```typescript
interface Props {
	value?: string; // Two-way binding for textarea value
	placeholder?: string; // Placeholder text
	class?: string; // Additional CSS classes
	id?: string; // HTML id attribute
	required?: boolean; // Required field
	disabled?: boolean; // Disabled state
	readonly?: boolean; // Read-only state
	rows?: number; // Number of rows (default: 4)
	cols?: number; // Number of columns
	maxlength?: number; // Maximum character length
	minlength?: number; // Minimum character length
	wrap?: 'soft' | 'hard' | null; // Text wrapping (default: 'soft')
	resize?: 'none' | 'both' | 'horizontal' | 'vertical'; // Resize behavior (default: 'vertical')
	onKeydown?: (e: KeyboardEvent) => void; // Keydown event handler
	onInput?: (e: Event) => void; // Input event handler
	onFocus?: (e: FocusEvent) => void; // Focus event handler
	onBlur?: (e: FocusEvent) => void; // Blur event handler
	onCompositionstart?: (e: CompositionEvent) => void; // Composition start handler
	onCompositionend?: (e: CompositionEvent) => void; // Composition end handler
	enableSound?: boolean; // Enable typewriter sounds (default: true)
	soundVolume?: number; // Sound volume 0-1 (default: 0.1)
}
```

#### Usage Example

```svelte
<script>
	import TypewriterTextarea from '$lib/components/TypewriterTextarea.svelte';

	let content = '';

	function handleKeydown(e) {
		console.log('Key pressed:', e.key);
	}
</script>

<TypewriterTextarea
	bind:value={content}
	placeholder="Start typing..."
	rows={6}
	enableSound={true}
	soundVolume={0.2}
	onKeydown={handleKeydown}
	class="w-full rounded-lg border p-4"
/>
```

#### Features

- **Typewriter Sounds**: Different sounds for normal keys, space, enter, and backspace
- **Visual Feedback**: Subtle animations and visual cues during typing
- **Accessibility**: Full keyboard navigation and screen reader support
- **IME Support**: Proper handling of composition events for international input
- **Responsive Design**: Adapts to different screen sizes
- **Customizable**: Extensive prop options for customization

### Navigation

Navigation component for site-wide navigation.

```typescript
import Navigation from '$lib/components/Navigation.svelte';
```

#### Usage Example

```svelte
<script>
	import Navigation from '$lib/components/Navigation.svelte';
</script>

<Navigation />
```

### CommentForm

Form component for creating new comments.

```typescript
import CommentForm from '$lib/components/CommentForm.svelte';
```

#### Props

```typescript
interface CommentFormProps {
	postSlug: string;
	blogId?: string;
	onSubmit?: (comment: CreateCommentRequest) => void;
	onCancel?: () => void;
}
```

#### Usage Example

```svelte
<script>
	import CommentForm from '$lib/components/CommentForm.svelte';

	function handleSubmit(comment) {
		console.log('New comment:', comment);
	}
</script>

<CommentForm postSlug="my-blog-post" blogId="blog-123" onSubmit={handleSubmit} />
```

### CommentList

Component for displaying a list of comments with sorting and pagination.

```typescript
import CommentList from '$lib/components/CommentList.svelte';
```

#### Props

```typescript
interface CommentListProps {
	postSlug?: string;
	blogId?: string;
	blogSlug?: string;
	limit?: number;
	offset?: number;
	userId?: string;
	sortBy?: 'time' | 'likes';
}
```

#### Usage Example

```svelte
<script>
	import CommentList from '$lib/components/CommentList.svelte';
</script>

<CommentList postSlug="my-blog-post" limit={10} sortBy="time" />
```

### PhotoCarousel

Image carousel component for photography portfolio.

```typescript
import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
```

#### Props

```typescript
interface PhotoCarouselProps {
	images: string[];
	startIndex?: number;
	autoPlay?: boolean;
	interval?: number;
	showThumbnails?: boolean;
	showControls?: boolean;
}
```

#### Usage Example

```svelte
<script>
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';

	const images = ['/photos/image1.jpg', '/photos/image2.jpg', '/photos/image3.jpg'];
</script>

<PhotoCarousel {images} startIndex={0} autoPlay={true} interval={3000} showThumbnails={true} />
```

### ResponsiveImage

Responsive image component with lazy loading and optimization.

```typescript
import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
```

#### Props

```typescript
interface ResponsiveImageProps {
	src: string;
	alt: string;
	sizes?: string;
	loading?: 'lazy' | 'eager';
	class?: string;
	width?: number;
	height?: number;
}
```

#### Usage Example

```svelte
<script>
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
</script>

<ResponsiveImage
	src="/images/hero.jpg"
	alt="Hero image"
	sizes="(max-width: 768px) 100vw, 50vw"
	loading="lazy"
	class="rounded-lg shadow-lg"
/>
```

### ReadingProgressBar

Progress bar component that shows reading progress through a page.

```typescript
import ReadingProgressBar from '$lib/components/ReadingProgressBar.svelte';
```

#### Usage Example

```svelte
<script>
	import ReadingProgressBar from '$lib/components/ReadingProgressBar.svelte';
</script>

<ReadingProgressBar />
```

### InteractiveBackground

Interactive background component with animated effects.

```typescript
import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
```

#### Props

```typescript
interface InteractiveBackgroundProps {
	intensity?: number;
	color?: string;
	speed?: number;
}
```

#### Usage Example

```svelte
<script>
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
</script>

<InteractiveBackground intensity={0.5} color="#4f46e5" speed={2} />
```

---

## Stores

### Auth Store

Authentication state management using Svelte 5 runes.

```typescript
import { authStore } from '$lib/stores/auth.svelte';
```

#### State

```typescript
interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}
```

#### Methods

- `login()`: Redirects to Google OAuth login
- `logout()`: Logs out user and clears local storage
- `setToken(token: string)`: Sets authentication token
- `checkAuthStatus()`: Checks current authentication status
- `clearError()`: Clears any authentication errors

#### Usage Example

```svelte
<script>
	import { authStore } from '$lib/stores/auth.svelte';

	// Access state
	$: user = authStore.state.user;
	$: isAuthenticated = authStore.state.isAuthenticated;

	// Use methods
	function handleLogin() {
		authStore.login();
	}

	function handleLogout() {
		authStore.logout();
	}
</script>

{#if isAuthenticated}
	<p>Welcome, {user.name}!</p>
	<button on:click={handleLogout}>Logout</button>
{:else}
	<button on:click={handleLogin}>Login with Google</button>
{/if}
```

### WebSocket Store

WebSocket connection management for real-time features.

```typescript
import { websocketStore } from '$lib/stores/websocket.svelte';
```

#### Connection States

```typescript
enum ConnectionState {
	DISCONNECTED = 'disconnected',
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	RECONNECTING = 'reconnecting',
	FAILED = 'failed'
}
```

#### Message Types

```typescript
type MessageType =
	| 'new_comment'
	| 'thumb_update'
	| 'comment_update'
	| 'comment_delete'
	| 'ping'
	| 'pong';
```

#### Methods

- `init()`: Initialize WebSocket manager
- `connect(rooms?: string[])`: Connect to WebSocket with optional room subscriptions
- `disconnect()`: Disconnect from WebSocket
- `subscribeToRooms(rooms: string[])`: Subscribe to specific rooms
- `unsubscribeFromRooms(rooms: string[])`: Unsubscribe from rooms
- `addEventListener(type: MessageType, callback)`: Add event listener for message types
- `removeEventListener(type: MessageType, callback)`: Remove event listener

#### Usage Example

```svelte
<script>
	import { websocketStore } from '$lib/stores/websocket.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		// Initialize WebSocket
		websocketStore.init();

		// Connect to specific rooms
		websocketStore.connect(['blog-comments', 'general']);

		// Listen for new comments
		websocketStore.addEventListener('new_comment', (payload) => {
			console.log('New comment received:', payload);
		});

		// Listen for thumb updates
		websocketStore.addEventListener('thumb_update', (payload) => {
			console.log('Thumb update:', payload);
		});
	});
</script>

<div>
	Connection status: {websocketStore.state}
	Connected rooms: {websocketStore.rooms.join(', ')}
</div>
```

---

## Utility Functions

### `calculateDuration(text: string, language: string): number`

Calculates reading duration for text content based on language.

```typescript
import { calculateDuration } from '$lib/util/helper.js';

const duration = calculateDuration('This is a sample text for reading.', 'en');
console.log(duration); // Output: 1 (in minutes)
```

**Parameters:**

- `text` (string): The text content to analyze
- `language` (string): Language code ('en', 'zh-tw', etc.)

**Returns:** number - Reading duration in minutes

**Language-specific behavior:**

- English: 180 words per minute
- Chinese: 300 characters per minute

### `copyImageMarkdown(imagePath: string): Promise<void>`

Copies image markdown to clipboard.

```typescript
import { copyImageMarkdown } from '$lib/util/helper.js';

await copyImageMarkdown('/images/photo.jpg');
// Copies: <div class="flex justify-center">
//         <img src="/images/photo.jpg" alt="photo.jpg" class="photo-post">
//         </div>
```

**Parameters:**

- `imagePath` (string): Path to the image file

**Returns:** Promise<void>

---

## Navigation

### `getCurrentRouteMetadata(): RouteMetadata | null`

Gets metadata for the current route.

```typescript
import { getCurrentRouteMetadata } from '$lib/navigation.js';

const metadata = getCurrentRouteMetadata();
if (metadata) {
	console.log(metadata.title); // "Home - Tomlord"
	console.log(metadata.icon); // "🏠"
}
```

**Returns:** RouteMetadata | null

### `getBreadcrumbs(): Array<{label: string, href: string, active: boolean}>`

Generates breadcrumbs for the current route.

```typescript
import { getBreadcrumbs } from '$lib/navigation.js';

const breadcrumbs = getBreadcrumbs();
// Returns: [
//   { label: 'Home', href: '/', active: false },
//   { label: 'Blog', href: '/blog', active: true }
// ]
```

**Returns:** Array of breadcrumb objects

### `navigateTo(href: string, options?: NavigationOptions): Promise<void>`

Enhanced navigation function with additional options.

```typescript
import { navigateTo } from '$lib/navigation.js';

await navigateTo('/blog', {
	replaceState: false,
	noScroll: false,
	keepFocus: true,
	trackHistory: true
});
```

**Parameters:**

- `href` (string): Target URL
- `options` (object, optional):
  - `replaceState` (boolean): Replace current history entry
  - `noScroll` (boolean): Prevent automatic scrolling
  - `keepFocus` (boolean): Maintain focus state
  - `trackHistory` (boolean): Track in navigation history

### `goBack(): Promise<void>`

Navigate back in history.

```typescript
import { goBack } from '$lib/navigation.js';

await goBack();
```

### `canGoBack(): boolean`

Check if navigation back is possible.

```typescript
import { canGoBack } from '$lib/navigation.js';

if (canGoBack()) {
	// Show back button
}
```

**Returns:** boolean

### `getNavigationSuggestions(): Array<{href: string, metadata: RouteMetadata}>`

Get navigation suggestions for the current context.

```typescript
import { getNavigationSuggestions } from '$lib/navigation.js';

const suggestions = getNavigationSuggestions();
// Returns array of suggested routes with metadata
```

**Returns:** Array of navigation suggestions

---

## API Routes

### POST `/api/add-post`

Creates a new blog post with both backend database and local file storage.

**Request Body:**

```typescript
{
	filename: string;
	content: string; // Markdown content with frontmatter
}
```

**Response:**

```typescript
{
  success: boolean;
  blogId?: string;
  error?: string;
  requiresAuth?: boolean;
}
```

**Example:**

```typescript
const response = await fetch('/api/add-post', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	},
	body: JSON.stringify({
		filename: 'my-new-post.svx',
		content: `---
title: My New Post
date: 2024-01-15
slug: my-new-post
description: A great new post
tags: ['svelte', 'web']
lang: en
duration: 5min
---

# My New Post

This is the content of my new post...
`
	})
});
```

### POST `/api/edit-post`

Updates an existing blog post.

**Request Body:**

```typescript
{
	postId: string;
	filename: string;
	content: string;
}
```

**Response:**

```typescript
{
  success: boolean;
  error?: string;
}
```

### POST `/api/edit-page`

Updates a static page.

**Request Body:**

```typescript
{
	pageId: string;
	content: string;
}
```

**Response:**

```typescript
{
  success: boolean;
  error?: string;
}
```

### POST `/api/upload-image`

Uploads an image file.

**Request Body:** FormData with image file

**Response:**

```typescript
{
  success: boolean;
  imagePath?: string;
  error?: string;
}
```

### POST `/api/sync-blogs`

Synchronizes blog data between backend and local files.

**Response:**

```typescript
{
  success: boolean;
  syncedCount?: number;
  error?: string;
}
```

---

## Environment Variables

The application uses the following environment variables:

```bash
# Backend Configuration
PUBLIC_BACKEND_URL=http://localhost:8080
PUBLIC_BACKEND_WS_URL=ws://localhost:8080

# Environment
PUBLIC_APP_ENV=development
```

---

## Error Handling

The application implements comprehensive error handling:

1. **Network Errors**: Automatic fallback to local data when backend is unavailable
2. **Authentication Errors**: Graceful handling of expired tokens
3. **Validation Errors**: User-friendly error messages for form validation
4. **WebSocket Errors**: Automatic reconnection with exponential backoff

---

## Performance Optimizations

1. **Smart Loading**: Health checks before API calls with local fallback
2. **Caching**: Backend health status caching (30 seconds)
3. **Lazy Loading**: Images and components loaded on demand
4. **Connection Pooling**: WebSocket connection reuse
5. **Debouncing**: Input events debounced for better performance

---

## Security Considerations

1. **Authentication**: JWT token-based authentication with Google OAuth
2. **Authorization**: Role-based access control for admin features
3. **Input Validation**: Server-side validation for all user inputs
4. **CSRF Protection**: Built-in SvelteKit CSRF protection
5. **Content Security Policy**: CSP headers for XSS prevention

---

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Features Used**: WebSocket, Web Audio API, Fetch API, ES2020+
- **Fallbacks**: Graceful degradation for older browsers

---

## Contributing

When contributing to this codebase:

1. Follow the existing TypeScript patterns
2. Use Svelte 5 runes for state management
3. Implement proper error handling
4. Add comprehensive JSDoc comments
5. Write unit tests for new functionality
6. Follow the established naming conventions

---

## License

This documentation is part of the Tomlord.io project. Please refer to the project's license file for usage terms.

---

## Language Versions

- [English Version](./API_DOCUMENTATION.md)
- [繁體中文版本](./API_DOCUMENTATION_zh-tw.md)
