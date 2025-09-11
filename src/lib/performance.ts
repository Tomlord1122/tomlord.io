import { browser } from '$app/environment';

// Performance optimization utilities
export class PerformanceOptimizer {
	private static instance: PerformanceOptimizer;
	private initialized = false;

	static getInstance(): PerformanceOptimizer {
		if (!PerformanceOptimizer.instance) {
			PerformanceOptimizer.instance = new PerformanceOptimizer();
		}
		return PerformanceOptimizer.instance;
	}

	// Initialize performance optimizations
	init() {
		if (!browser || this.initialized) return;

		this.initialized = true;

		// Preload critical resources
		this.preloadCriticalResources();

		// Setup performance monitoring
		this.setupPerformanceMonitoring();

		// Optimize images loading
		this.optimizeImageLoading();
	}

	private preloadCriticalResources() {
		// Preload critical CSS and fonts
		const criticalResources = [{ href: '/app_icon.webp', as: 'image' }];

		criticalResources.forEach((resource) => {
			const link = document.createElement('link');
			link.rel = 'preload';
			link.href = resource.href;
			link.as = resource.as;
			document.head.appendChild(link);
		});
	}

	private setupPerformanceMonitoring() {
		// Monitor Core Web Vitals
		if ('web-vital' in window) {
			// This would integrate with web-vitals library if needed
			console.log('Performance monitoring initialized');
		}
	}

	private optimizeImageLoading() {
		// Implement lazy loading for images
		if ('IntersectionObserver' in window) {
			const imageObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const img = entry.target as HTMLImageElement;
						if (img.dataset.src) {
							img.src = img.dataset.src;
							img.removeAttribute('data-src');
							imageObserver.unobserve(img);
						}
					}
				});
			});

			// Observe all images with data-src
			document.querySelectorAll('img[data-src]').forEach((img) => {
				imageObserver.observe(img);
			});
		}
	}

	// Debounce utility for performance
	debounce<T extends (...args: any[]) => any>(
		func: T,
		wait: number
	): (...args: Parameters<T>) => void {
		let timeout: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	// Throttle utility for performance
	throttle<T extends (...args: any[]) => any>(
		func: T,
		limit: number
	): (...args: Parameters<T>) => void {
		let inThrottle: boolean;
		return (...args: Parameters<T>) => {
			if (!inThrottle) {
				func.apply(this, args);
				inThrottle = true;
				setTimeout(() => (inThrottle = false), limit);
			}
		};
	}
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();
