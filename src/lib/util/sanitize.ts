/**
 * Isomorphic HTML sanitizer.
 *
 * We use `sanitize-html` for both browser and server because:
 *   - DOMPurify on the server requires a DOM (jsdom or linkedom). jsdom has
 *     ESM/CJS conflicts on Vercel, and linkedom doesn't expose enough of the
 *     DOM API for DOMPurify to recognize it as a valid environment.
 *   - `sanitize-html` is pure JS (htmlparser2), works synchronously in both
 *     environments, and supports the same allow-list approach we need.
 *
 * The allow-list mirrors the previous DOMPurify config: standard prose tags
 * plus SVG (for Mermaid diagrams) and iframes (for embedded videos).
 */

import sanitizeHtml from 'sanitize-html';

const SVG_TAGS = [
	'svg',
	'g',
	'path',
	'rect',
	'text',
	'tspan',
	'line',
	'polygon',
	'polyline',
	'circle',
	'ellipse',
	'marker',
	'defs',
	'use',
	'title',
	'desc',
	'foreignObject',
	'clipPath',
	'pattern',
	'stop',
	'linearGradient',
	'radialGradient'
];

const SVG_ATTRS = [
	'viewBox',
	'fill',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-dasharray',
	'stroke-linecap',
	'stroke-linejoin',
	'fill-opacity',
	'd',
	'points',
	'marker-end',
	'marker-start',
	'marker-mid',
	'transform',
	'x',
	'y',
	'width',
	'height',
	'rx',
	'ry',
	'cx',
	'cy',
	'r',
	'x1',
	'y1',
	'x2',
	'y2',
	'font-family',
	'font-size',
	'font-weight',
	'text-anchor',
	'dominant-baseline',
	'opacity',
	'class',
	'id',
	'style',
	'xmlns',
	'version'
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		// Default sanitize-html tags (prose) + extras we use
		...sanitizeHtml.defaults.allowedTags,
		'img',
		'iframe',
		...SVG_TAGS
	],
	allowedAttributes: {
		'*': ['class', 'id', 'style', 'title'],
		a: ['href', 'name', 'target', 'rel'],
		img: ['src', 'alt', 'width', 'height', 'loading', 'class'],
		iframe: [
			'src',
			'width',
			'height',
			'allow',
			'allowfullscreen',
			'frameborder',
			'scrolling',
			'title'
		],
		// SVG: every SVG-related tag may carry every SVG-related attr
		...Object.fromEntries(SVG_TAGS.map((tag) => [tag, SVG_ATTRS]))
	},
	allowedSchemes: ['http', 'https', 'mailto', 'data'],
	allowedSchemesByTag: {
		// data: URIs are common for inline SVG / images
		img: ['http', 'https', 'data'],
		a: ['http', 'https', 'mailto']
	},
	// Required for Mermaid SVG output (self-closing tags etc.)
	parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
	allowVulnerableTags: false
};

/**
 * Sync, isomorphic HTML sanitizer used by `renderMarkdown`.
 * Drop-in replacement for `DOMPurify.sanitize(html, {...})`.
 */
export function sanitize(html: string): string {
	return sanitizeHtml(html, SANITIZE_OPTIONS);
}
