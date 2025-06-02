import { page } from "$app/state";
import { goto } from "$app/navigation";
import { browser } from "$app/environment";

// Navigation route metadata
export interface RouteMetadata {
  title: string;
  description?: string;
  breadcrumb?: string;
  icon?: string;
}

// Route configuration with metadata
export const routes: Record<string, RouteMetadata> = {
  "/": {
    title: "Home - Tomlord",
    description: "Welcome to Tomlord's personal website",
    breadcrumb: "Home",
    icon: "🏠",
  },
  "/blog": {
    title: "Blog - Tomlord",
    description: "Thoughts, tutorials, and updates",
    breadcrumb: "Blog",
    icon: "📝",
  },
  "/project": {
    title: "Projects - Tomlord",
    description: "My coding projects and experiments",
    breadcrumb: "Projects",
    icon: "🚀",
  },
  "/photography": {
    title: "Photography - Tomlord",
    description: "My photography portfolio",
    breadcrumb: "Photography",
    icon: "📸",
  },
};

/**
 * Get metadata for the current route
 */
export function getCurrentRouteMetadata(): RouteMetadata | null {
  if (!browser) return null;

  const pathname = page.url.pathname;

  // Check for exact match first
  if (routes[pathname]) {
    return routes[pathname];
  }

  // Check for partial matches (for dynamic routes)
  for (const [route, metadata] of Object.entries(routes)) {
    if (pathname.startsWith(route) && route !== "/") {
      return metadata;
    }
  }

  return null;
}

/**
 * Generate breadcrumbs for the current route
 */
export function getBreadcrumbs(): Array<{
  label: string;
  href: string;
  active: boolean;
}> {
  if (!browser) return [];

  const pathname = page.url.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = [];

  // Always start with home
  breadcrumbs.push({
    label: "Home",
    href: "/",
    active: pathname === "/",
  });

  // Build breadcrumbs from path segments
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const metadata = routes[currentPath];

    if (metadata) {
      breadcrumbs.push({
        label: metadata.breadcrumb || metadata.title,
        href: currentPath,
        active: currentPath === pathname,
      });
    } else {
      // For dynamic routes, use the segment as label
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
        active: currentPath === pathname,
      });
    }
  }

  return breadcrumbs;
}

/**
 * Navigation history management
 */
class NavigationHistory {
  private history: string[] = [];
  private maxHistory = 10;

  add(path: string) {
    // Remove if already exists to avoid duplicates
    this.history = this.history.filter((p) => p !== path);
    // Add to beginning
    this.history.unshift(path);
    // Keep only maxHistory items
    this.history = this.history.slice(0, this.maxHistory);
  }

  get recent(): string[] {
    return [...this.history];
  }

  getPrevious(): string | null {
    return this.history[1] || null;
  }

  clear() {
    this.history = [];
  }
}

export const navigationHistory = new NavigationHistory();

/**
 * Enhanced navigation function with history tracking
 */
export async function navigateTo(
  href: string,
  options: {
    replaceState?: boolean;
    noScroll?: boolean;
    keepFocus?: boolean;
    trackHistory?: boolean;
  } = {},
) {
  const {
    replaceState = false,
    noScroll = false,
    keepFocus = false,
    trackHistory = true,
  } = options;

  if (trackHistory) {
    navigationHistory.add(href);
  }

  await goto(href, {
    replaceState,
    noScroll,
    keepFocus,
  });
}

/**
 * Go back to previous page in navigation history
 */
export async function goBack() {
  const previous = navigationHistory.getPrevious();
  if (previous) {
    await navigateTo(previous, { trackHistory: false });
  } else if (browser) {
    // Fallback to browser history
    window.history.back();
  }
}

/**
 * Check if we can go back in navigation history
 */
export function canGoBack(): boolean {
  return navigationHistory.getPrevious() !== null;
}

/**
 * Get navigation suggestions based on current route
 */
export function getNavigationSuggestions(): Array<{
  href: string;
  metadata: RouteMetadata;
}> {
  if (!browser) return [];

  const currentPath = page.url.pathname;
  const suggestions = [];

  for (const [href, metadata] of Object.entries(routes)) {
    if (href !== currentPath) {
      suggestions.push({ href, metadata });
    }
  }

  return suggestions;
}

// Initialize navigation history tracking
if (browser) {
  // Track initial page
  navigationHistory.add(page.url.pathname);
}
