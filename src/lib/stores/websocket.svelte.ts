import { authStore } from './auth.svelte';

// WebSocket message types - matching backend
type MessageType =
	| 'new_comment'
	| 'thumb_update'
	| 'comment_update'
	| 'comment_delete'
	| 'ping'
	| 'pong';

// WebSocket message structure
interface WSMessage {
	type: MessageType;
	payload: any;
	room?: string;
}

// Connection states
enum ConnectionState {
	DISCONNECTED = 'disconnected',
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	RECONNECTING = 'reconnecting',
	FAILED = 'failed'
}

// WebSocket connection manager
class WebSocketManager {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectInterval = 3000; // 3 seconds
	private subscribedRooms = new Set<string>();
	private isInitialized = false;
	private connectionState = ConnectionState.DISCONNECTED;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private connectionCheckTimer: ReturnType<typeof setInterval> | null = null;

	// Event listeners for different message types
	private listeners: Map<MessageType, Set<(payload: any) => void>> = new Map();

	constructor() {
		// Initialize listeners map
		this.listeners.set('new_comment', new Set());
		this.listeners.set('thumb_update', new Set());
		this.listeners.set('comment_update', new Set());
		this.listeners.set('comment_delete', new Set());
		this.listeners.set('ping', new Set());
		this.listeners.set('pong', new Set());
	}

	// Initialize the manager - should be called from a component
	init() {
		if (this.isInitialized) {
			console.log('WebSocket manager already initialized');
			return;
		}

		this.isInitialized = true;
		console.log('Initializing WebSocket manager');

		// Start connection health monitoring
		this.startConnectionMonitoring();

		// Check auth state and connect if authenticated
		const authState = authStore.state;
		if (authState.isAuthenticated) {
			this.connect();
		}
	}

	// Connect to WebSocket with improved error handling
	connect(rooms: string[] = []) {
		// Prevent multiple simultaneous connection attempts
		if (
			this.connectionState === ConnectionState.CONNECTING ||
			this.connectionState === ConnectionState.RECONNECTING
		) {
			console.log('Connection attempt already in progress, skipping...');
			return;
		}

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			console.log('WebSocket already connected');
			// If we have new rooms to subscribe to, add them
			if (rooms.length > 0) {
				this.subscribeToRooms(rooms);
			}
			return;
		}

		this.connectionState =
			this.reconnectAttempts > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING;

		try {
			console.log(
				`${this.connectionState === ConnectionState.RECONNECTING ? 'Reconnecting' : 'Connecting'} to WebSocket...`
			);

			// Clean up any existing connection
			this.cleanup();

			// Include auth token if available
			const token = localStorage.getItem('auth_token');
			let wsUrl = 'ws://localhost:8080/ws';

			// Add rooms as query parameter if provided
			if (rooms.length > 0) {
				const roomsParam = encodeURIComponent(JSON.stringify(rooms));
				wsUrl += `?rooms=${roomsParam}`;
			}

			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				console.log('WebSocket connected successfully');
				this.connectionState = ConnectionState.CONNECTED;
				this.reconnectAttempts = 0;

				// Clear any existing reconnect timer
				if (this.reconnectTimer) {
					clearTimeout(this.reconnectTimer);
					this.reconnectTimer = null;
				}

				// Subscribe to rooms if any
				const allRooms = rooms.length > 0 ? rooms : Array.from(this.subscribedRooms);
				if (allRooms.length > 0) {
					// Wait a bit for connection to stabilize before subscribing
					setTimeout(() => {
						this.subscribeToRooms(allRooms);
					}, 100);
				}
			};

			this.ws.onmessage = (event) => {
				try {
					const message: WSMessage = JSON.parse(event.data);
					this.handleMessage(message);
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error);
				}
			};

			this.ws.onclose = (event) => {
				console.log(`WebSocket disconnected - Code: ${event.code}, Reason: ${event.reason}`);
				this.connectionState = ConnectionState.DISCONNECTED;
				this.ws = null;

				// Only attempt reconnect if it wasn't a clean close and we haven't exceeded max attempts
				if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
					this.attemptReconnect();
				} else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
					this.connectionState = ConnectionState.FAILED;
					console.error('Max reconnection attempts reached, giving up');
				}
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.connectionState = ConnectionState.DISCONNECTED;
			};

			// Set a connection timeout
			setTimeout(() => {
				if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
					console.warn('WebSocket connection timeout');
					this.ws.close();
				}
			}, 10000); // 10 second timeout
		} catch (error) {
			console.error('Failed to create WebSocket connection:', error);
			this.connectionState = ConnectionState.DISCONNECTED;
			this.attemptReconnect();
		}
	}

	// Subscribe to rooms (for comments on specific posts/blogs)
	subscribeToRooms(rooms: string[]) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn('WebSocket not connected, queuing rooms for subscription:', rooms);
			// Add to subscribed rooms for when connection is restored
			rooms.forEach((room) => this.subscribedRooms.add(room));
			return;
		}

		// Add to subscribed rooms
		rooms.forEach((room) => this.subscribedRooms.add(room));

		// Send subscription message
		try {
			this.ws.send(
				JSON.stringify({
					action: 'subscribe',
					rooms: rooms
				})
			);
			console.log('Subscribed to rooms:', rooms);
		} catch (error) {
			console.error('Failed to send subscription message:', error);
		}
	}

	// Unsubscribe from rooms
	unsubscribeFromRooms(rooms: string[]) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn('WebSocket not connected, removing rooms from queue:', rooms);
			// Remove from subscribed rooms anyway
			rooms.forEach((room) => this.subscribedRooms.delete(room));
			return;
		}

		// Remove from subscribed rooms
		rooms.forEach((room) => this.subscribedRooms.delete(room));

		// Send unsubscription message
		try {
			this.ws.send(
				JSON.stringify({
					action: 'unsubscribe',
					rooms: rooms
				})
			);
			console.log('Unsubscribed from rooms:', rooms);
		} catch (error) {
			console.error('Failed to send unsubscription message:', error);
		}
	}

	// Disconnect from WebSocket
	disconnect() {
		console.log('Disconnecting WebSocket...');

		// Clear timers
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.connectionCheckTimer) {
			clearInterval(this.connectionCheckTimer);
			this.connectionCheckTimer = null;
		}

		// Clean up connection
		this.cleanup();

		// Reset state
		this.connectionState = ConnectionState.DISCONNECTED;
		this.reconnectAttempts = 0;
		this.subscribedRooms.clear();
	}

	// Clean up WebSocket connection
	private cleanup() {
		if (this.ws) {
			// Remove event handlers to prevent callbacks
			this.ws.onopen = null;
			this.ws.onmessage = null;
			this.ws.onclose = null;
			this.ws.onerror = null;

			// Close connection if it's open
			if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
				this.ws.close(1000, 'Client disconnect');
			}

			this.ws = null;
		}
	}

	// Add event listener for specific message type
	addEventListener(type: MessageType, callback: (payload: any) => void) {
		const listeners = this.listeners.get(type);
		if (listeners) {
			listeners.add(callback);
		}
	}

	// Remove event listener
	removeEventListener(type: MessageType, callback: (payload: any) => void) {
		const listeners = this.listeners.get(type);
		if (listeners) {
			listeners.delete(callback);
		}
	}

	// Handle incoming messages
	private handleMessage(message: WSMessage) {
		console.log('Received WebSocket message:', message);

		const listeners = this.listeners.get(message.type);
		if (listeners) {
			listeners.forEach((callback) => {
				try {
					callback(message.payload);
				} catch (error) {
					console.error('Error in WebSocket message handler:', error);
				}
			});
		}
	}

	// Attempt to reconnect with exponential backoff
	private attemptReconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error('Max reconnection attempts reached');
			this.connectionState = ConnectionState.FAILED;
			return;
		}

		this.reconnectAttempts++;
		const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000); // Max 30 seconds

		console.log(
			`Attempting to reconnect in ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
		);

		this.reconnectTimer = setTimeout(() => {
			if (this.connectionState !== ConnectionState.CONNECTED) {
				this.connect(Array.from(this.subscribedRooms));
			}
		}, delay);
	}

	// Start connection health monitoring
	private startConnectionMonitoring() {
		if (this.connectionCheckTimer) {
			clearInterval(this.connectionCheckTimer);
		}

		this.connectionCheckTimer = setInterval(() => {
			// Check if connection is actually alive
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				// Connection appears healthy
			} else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
				// Still connecting, wait a bit more
			} else if (this.connectionState === ConnectionState.CONNECTED) {
				// Connection was supposed to be connected but isn't
				console.warn('WebSocket connection lost, attempting to reconnect...');
				this.connectionState = ConnectionState.DISCONNECTED;
				this.attemptReconnect();
			}
		}, 5000); // Check every 5 seconds
	}

	// Get connection status
	get isConnected(): boolean {
		return (
			this.ws !== null &&
			this.ws.readyState === WebSocket.OPEN &&
			this.connectionState === ConnectionState.CONNECTED
		);
	}

	// Get connection state
	get state(): string {
		return this.connectionState;
	}

	// Get subscribed rooms
	get rooms(): string[] {
		return Array.from(this.subscribedRooms);
	}

	// Handle authentication state changes
	onAuthChange(isAuthenticated: boolean) {
		console.log('Auth state changed:', isAuthenticated);

		if (isAuthenticated) {
			// User logged in, connect to WebSocket
			if (!this.isConnected) {
				this.connect();
			}
		} else {
			// User logged out, disconnect from WebSocket
			this.disconnect();
		}
	}

	// Reset manager (useful for testing or cleanup)
	reset() {
		this.isInitialized = false;
		this.disconnect();
	}
}

// Create singleton instance
export const wsManager = new WebSocketManager();

// Export for use in components
export { type MessageType, type WSMessage, ConnectionState };
