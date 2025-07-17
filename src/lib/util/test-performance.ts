import { config, fetchWithTimeout, fetchWithFallback } from '$lib/config.js';

// Performance testing utilities for blog loading
export class PerformanceTest {
	private results: Array<{
		test: string;
		duration: number;
		success: boolean;
		error?: string;
	}> = [];

	// Test API timeout mechanism
	async testAPITimeout(url: string, timeout: number = 1000): Promise<boolean> {
		const startTime = Date.now();
		try {
			await fetchWithTimeout(url, {}, timeout);
			const duration = Date.now() - startTime;
			this.results.push({
				test: `API Timeout Test (${timeout}ms)`,
				duration,
				success: true
			});
			return true;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.results.push({
				test: `API Timeout Test (${timeout}ms)`,
				duration,
				success: false,
				error: (error as Error).message
			});
			// Should timeout within expected time range
			return duration >= timeout && duration < timeout + 500;
		}
	}

	// Test fallback mechanism
	async testFallbackMechanism(): Promise<boolean> {
		const startTime = Date.now();
		try {
			const failingAPI = async () => {
				throw new Error('API unavailable');
			};

			const workingFallback = async () => {
				return { data: 'fallback data' };
			};

			const result = await fetchWithFallback(failingAPI, workingFallback, 1000);
			const duration = Date.now() - startTime;

			this.results.push({
				test: 'Fallback Mechanism Test',
				duration,
				success: result.data === 'fallback data'
			});

			return result.data === 'fallback data';
		} catch (error) {
			const duration = Date.now() - startTime;
			this.results.push({
				test: 'Fallback Mechanism Test',
				duration,
				success: false,
				error: (error as Error).message
			});
			return false;
		}
	}

	// Test blog loading performance
	async testBlogLoading(): Promise<boolean> {
		const startTime = Date.now();
		try {
			// Simulate blog loading
			const apiCall = async () => {
				const response = await fetchWithTimeout(`${config.API.BLOGS}/?limit=5&published=true`);
				if (!response.ok) throw new Error('API failed');
				return await response.json();
			};

			const fallbackCall = async () => {
				// Simulate local file loading
				return { blogs: [] };
			};

			await fetchWithFallback(apiCall, fallbackCall, 1500);
			const duration = Date.now() - startTime;

			this.results.push({
				test: 'Blog Loading Performance',
				duration,
				success: duration < 2000 // Should complete within 2 seconds
			});

			return duration < 2000;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.results.push({
				test: 'Blog Loading Performance',
				duration,
				success: false,
				error: (error as Error).message
			});
			return false;
		}
	}

	// Run all tests
	async runAllTests(): Promise<void> {
		console.log('🚀 Starting performance tests...\n');

		// Test 1: API timeout with unreachable endpoint
		console.log('Testing API timeout mechanism...');
		await this.testAPITimeout('http://localhost:9999/nonexistent', 1000);

		// Test 2: Fallback mechanism
		console.log('Testing fallback mechanism...');
		await this.testFallbackMechanism();

		// Test 3: Blog loading performance
		console.log('Testing blog loading performance...');
		await this.testBlogLoading();

		this.printResults();
	}

	// Print test results
	private printResults(): void {
		console.log('\n📊 Performance Test Results:');
		console.log('================================');

		let passedTests = 0;
		let totalDuration = 0;

		this.results.forEach((result, index) => {
			const status = result.success ? '✅ PASS' : '❌ FAIL';
			const duration = `${result.duration}ms`;
			
			console.log(`${index + 1}. ${result.test}`);
			console.log(`   Status: ${status}`);
			console.log(`   Duration: ${duration}`);
			
			if (result.error) {
				console.log(`   Error: ${result.error}`);
			}
			console.log('');

			if (result.success) passedTests++;
			totalDuration += result.duration;
		});

		console.log(`Summary: ${passedTests}/${this.results.length} tests passed`);
		console.log(`Total duration: ${totalDuration}ms`);
		console.log('================================\n');

		// Performance recommendations
		if (totalDuration > 5000) {
			console.log('⚠️  Performance Warning: Total test duration exceeded 5 seconds');
		} else {
			console.log('✅ Performance: All tests completed within acceptable time');
		}
	}

	// Clear results
	clearResults(): void {
		this.results = [];
	}
} 