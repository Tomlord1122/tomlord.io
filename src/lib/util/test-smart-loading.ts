import { checkBackendHealth, smartLoadWithFallback } from '$lib/config.js';

// 測試智能載入功能
export async function testSmartLoading() {
	console.log('🧪 Testing Smart Loading Strategy...\n');

	// Test 1: Backend Health Check
	console.log('1️⃣ Testing backend health check...');
	const startTime = Date.now();
	const isHealthy = await checkBackendHealth(false); // Force fresh check
	const healthCheckDuration = Date.now() - startTime;

	console.log(`   Backend status: ${isHealthy ? '🟢 Healthy' : '🔴 Unhealthy'}`);
	console.log(`   Health check duration: ${healthCheckDuration}ms\n`);

	// Test 2: Smart Loading with healthy backend
	if (isHealthy) {
		console.log('2️⃣ Testing smart loading with healthy backend...');
		const apiCallTime = Date.now();

		try {
			const result = await smartLoadWithFallback(
				async () => {
					// Simulate API call
					await new Promise((resolve) => setTimeout(resolve, 100));
					return { message: 'API data' };
				},
				async () => {
					return { message: 'Local data' };
				}
			);

			const apiLoadDuration = Date.now() - apiCallTime;
			console.log(`   Result: ${result.data.message} from ${result.source}`);
			console.log(`   Load duration: ${apiLoadDuration}ms\n`);
		} catch (error) {
			console.error('   Error:', error);
		}
	}

	// Test 3: Smart Loading with unhealthy backend
	console.log('3️⃣ Testing smart loading with forced unhealthy backend...');
	const fallbackTime = Date.now();

	try {
		const result = await smartLoadWithFallback(
			async () => {
				throw new Error('Backend unavailable');
			},
			async () => {
				return { message: 'Local fallback data' };
			}
		);

		const fallbackDuration = Date.now() - fallbackTime;
		console.log(`   Result: ${result.data.message} from ${result.source}`);
		console.log(`   Fallback duration: ${fallbackDuration}ms\n`);
	} catch (error) {
		console.error('   Error:', error);
	}

	// Test 4: Performance comparison
	console.log('4️⃣ Performance Summary:');
	console.log(`   Health check: ${healthCheckDuration}ms (should be < 500ms)`);
	console.log(`   Strategy: ${isHealthy ? 'API-first' : 'Direct local loading'}`);

	if (healthCheckDuration < 500) {
		console.log('   ✅ Health check is fast enough');
	} else {
		console.log('   ⚠️  Health check is slower than expected');
	}

	console.log('\n🎉 Smart loading tests completed!');
}

// 在瀏覽器環境中可以使用的測試函數
export function runSmartLoadingTest() {
	if (typeof window !== 'undefined') {
		testSmartLoading().catch(console.error);
	}
}
