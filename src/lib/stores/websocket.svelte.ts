import { authStore } from './auth.svelte';

// WebSocket message types - matching backend
type MessageType = 'new_comment' | 'thumb_update' | 'comment_update' | 'comment_delete';

// WebSocket message structure
interface WSMessage {
	type: MessageType;
	payload: any;
	room?: string;
}

// WebSocket connection manager
class WebSocketManager {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectInterval = 3000; // 3 seconds
	private subscribedRooms = new Set<string>();
	private isInitialized = false;
	
	// Event listeners for different message types
	private listeners: Map<MessageType, Set<(payload: any) => void>> = new Map();

	constructor() {
		// Initialize listeners map
		this.listeners.set('new_comment', new Set());
		this.listeners.set('thumb_update', new Set());
		this.listeners.set('comment_update', new Set());
		this.listeners.set('comment_delete', new Set());
	}

	// Initialize the manager - should be called from a component
	init() {
		if (this.isInitialized) return;
		this.isInitialized = true;
		
		// Check auth state and connect if authenticated
		const authState = authStore.state;
		if (authState.isAuthenticated) {
			this.connect();
		}
	}

	// Connect to WebSocket
	connect(rooms: string[] = []) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			return; // Already connected
		}

		try {
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
				console.log('WebSocket connected');
				this.reconnectAttempts = 0;
				
				// Subscribe to rooms if any
				if (rooms.length > 0) {
					this.subscribeToRooms(rooms);
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

			this.ws.onclose = () => {
				console.log('WebSocket disconnected');
				this.ws = null;
				this.attemptReconnect();
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
			};

		} catch (error) {
			console.error('Failed to connect to WebSocket:', error);
			this.attemptReconnect();
		}
	}

	// Disconnect WebSocket
	disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.subscribedRooms.clear();
	}

	// Subscribe to rooms (for comments on specific posts/blogs)
	subscribeToRooms(rooms: string[]) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn('WebSocket not connected, cannot subscribe to rooms');
			return;
		}

		// Add to subscribed rooms
		rooms.forEach(room => this.subscribedRooms.add(room));

		// Send subscription message
		this.ws.send(JSON.stringify({
			action: 'subscribe',
			rooms: rooms
		}));
	}

	// Unsubscribe from rooms
	unsubscribeFromRooms(rooms: string[]) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			return;
		}

		// Remove from subscribed rooms
		rooms.forEach(room => this.subscribedRooms.delete(room));

		// Send unsubscription message
		this.ws.send(JSON.stringify({
			action: 'unsubscribe',
			rooms: rooms
		}));
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
			listeners.forEach(callback => {
				try {
					callback(message.payload);
				} catch (error) {
					console.error('Error in WebSocket message handler:', error);
				}
			});
		}
	}

	// Attempt to reconnect
	private attemptReconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error('Max reconnection attempts reached');
			return;
		}

		this.reconnectAttempts++;
		console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

		setTimeout(() => {
			if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
				this.connect(Array.from(this.subscribedRooms));
			}
		}, this.reconnectInterval * this.reconnectAttempts);
	}

	// Get connection status
	get isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	// Get subscribed rooms
	get rooms(): string[] {
		return Array.from(this.subscribedRooms);
	}

	// Handle authentication state changes
	onAuthChange(isAuthenticated: boolean) {
		if (isAuthenticated) {
			this.connect();
		} else {
			this.disconnect();
		}
	}
}

// Create singleton instance
export const wsManager = new WebSocketManager();

// Export for use in components
export { type MessageType, type WSMessage }; 