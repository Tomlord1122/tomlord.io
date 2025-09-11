import {
	PUBLIC_BACKEND_URL,
	PUBLIC_BACKEND_WS_URL,
	PUBLIC_APP_ENV,
	PUBLIC_AUTH_SUPER_USER_EMAIL
} from '$env/static/public';
import { browser } from '$app/environment';

// Backend health status cache
const backendHealthCache: {
	isHealthy: boolean;
	lastCheck: number;
	checking: boolean;
} = {
	isHealthy: true,
	lastCheck: 0,
	checking: false
};

// Environment configuration
export const config = {
	// API Configuration
	BACKEND_URL: PUBLIC_BACKEND_URL || 'http://localhost:8080',
	BACKEND_WS_URL: PUBLIC_BACKEND_WS_URL || 'ws://localhost:8080',

	// Environment detection
	APP_ENV: PUBLIC_APP_ENV || 'development',
	AUTH_SUPER_USER_EMAIL: PUBLIC_AUTH_SUPER_USER_EMAIL || 'r12944044@csie.ntu.edu.tw',
	// Performance and reliability settings
	FETCH_TIMEOUT: 1000, // 1 seconds timeout for API calls
	WEBSOCKET_TIMEOUT: 1000, // 1 seconds timeout for WebSocket connection
	RETRY_ATTEMPTS: 2,
	HEALTH_CHECK_TIMEOUT: 500, // Very fast health check
	HEALTH_CHECK_CACHE_DURATION: 30000, // 30 seconds cache

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
			WEBSOCKET: `${this.BACKEND_WS_URL}/ws`,
			HEALTH: `${this.BACKEND_URL}/health`
		};
	}
};

// Fast backend health check with immediate return for first load
export async function checkBackendHealth(
	useCache: boolean = true,
	allowImmediate: boolean = false
): Promise<boolean> {
	const now = Date.now();

	// For initial page load, assume healthy and check in background
	if (allowImmediate && backendHealthCache.lastCheck === 0) {
		// Start background check but don't wait
		setTimeout(() => checkBackendHealth(false, false), 0);
		return true; // Optimistic assumption for faster initial load
	}

	// Use cached result if recent and cache is enabled
	if (
		useCache &&
		!backendHealthCache.checking &&
		now - backendHealthCache.lastCheck < config.HEALTH_CHECK_CACHE_DURATION
	) {
		return backendHealthCache.isHealthy;
	}

	// Prevent multiple simultaneous health checks
	if (backendHealthCache.checking) {
		return backendHealthCache.isHealthy;
	}

	backendHealthCache.checking = true;

	try {
		const response = await fetchWithTimeout(
			config.API.HEALTH,
			{ method: 'GET' },
			config.HEALTH_CHECK_TIMEOUT
		);

		backendHealthCache.isHealthy = response.ok;
		backendHealthCache.lastCheck = now;

		if (backendHealthCache.isHealthy) {
			console.log('🟢 Backend is healthy');
		} else {
			console.warn('🟡 Backend responded but not healthy');
		}

		return backendHealthCache.isHealthy;
	} catch (error) {
		console.warn('🔴 Backend health check failed, using local files:', error);
		backendHealthCache.isHealthy = false;
		backendHealthCache.lastCheck = now;
		return false;
	} finally {
		backendHealthCache.checking = false;
	}
}

// Smart loading strategy - checks health first, then decides
export async function smartLoadWithFallback<T>(
	apiCall: () => Promise<T>,
	fallbackCall: () => Promise<T>,
	forceHealthCheck: boolean = false
): Promise<{ data: T; source: 'api' | 'local' }> {
	// Quick health check first
	const isBackendHealthy = await checkBackendHealth(!forceHealthCheck);

	if (!isBackendHealthy) {
		console.log('📁 Backend unhealthy, loading directly from local files');
		const data = await fallbackCall();
		return { data, source: 'local' };
	}

	// Backend seems healthy, try API with quick fallback
	try {
		const data = await Promise.race([
			apiCall(),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('API call timeout')), config.FETCH_TIMEOUT)
			)
		]);
		console.log('✅ Loaded from API');
		return { data, source: 'api' };
	} catch (error) {
		console.warn('API call failed, falling back to local files:', error);
		// Mark backend as unhealthy for future requests
		backendHealthCache.isHealthy = false;
		backendHealthCache.lastCheck = Date.now();

		const data = await fallbackCall();
		return { data, source: 'local' };
	}
}

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
			signal: controller.signal
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

// Client-first 載入策略 - 針對 cold start 問題優化
export async function clientFirstLoadWithBackgroundSync<T>(
	localCall: () => Promise<T>,
	apiCall?: () => Promise<T>,
	onBackgroundSync?: (data: T) => void
): Promise<{ data: T; source: 'local' | 'api' }> {
	// 立即載入本地資料
	try {
		const localData = await localCall();
		console.log('⚡ Local data loaded immediately');

		// 背景中同步 API 資料（不阻塞主要載入）
		Promise.resolve().then(async () => {
			try {
				// 延長 timeout 以應對 cold start（但不阻塞主流程）
				const apiData = await Promise.race([
					apiCall ? apiCall() : Promise.resolve(null),
					new Promise<never>(
						(_, reject) => setTimeout(() => reject(new Error('Background API timeout')), 3000) // 3秒 timeout
					)
				]);

				// 如果有新資料且有回調函數，則更新
				if (onBackgroundSync && JSON.stringify(apiData) !== JSON.stringify(localData)) {
					console.log('🔄 Background sync completed with new data');
					onBackgroundSync(apiData as T);
				} else {
					console.log('✅ Background sync completed - data is already up to date');
				}
			} catch (error) {
				console.log('🔇 Background sync failed (silent, cold start expected):', error);
			}
		});

		return { data: localData, source: 'local' };
	} catch (localError) {
		console.warn('❌ Local loading failed, falling back to API:', localError);
		// 如果本地載入失敗，還是要等 API
		const apiData = (await (apiCall ? apiCall() : Promise.resolve(null))) as T;
		return { data: apiData, source: 'api' };
	}
}

// 智能預熱策略 - 在背景預熱後端
export async function preWarmBackend(): Promise<void> {
	if (!browser) return; // 只在客戶端執行

	// 延遲預熱，不影響初始載入
	setTimeout(async () => {
		try {
			console.log('🔥 Pre-warming backend...');
			await fetchWithTimeout(config.API.HEALTH, { method: 'GET' }, 5000);
			console.log('✅ Backend pre-warmed successfully');
		} catch {
			console.log('🔇 Backend pre-warm failed (expected for cold start)');
		}
	}, 2000); // 2秒後開始預熱
}

// Export individual configs for convenience
export const { BACKEND_URL, BACKEND_WS_URL, APP_ENV } = config;
