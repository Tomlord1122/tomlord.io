import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { markedHighlight } from 'marked-highlight';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { renderMermaidSVG } from 'beautiful-mermaid';
import Prism from 'prismjs';

// Import Prism languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-go';

// Configure marked with enhanced features
marked.use(
	gfmHeadingId(),
	markedHighlight({
		langPrefix: 'hljs language-',
		highlight(code, lang) {
			if (lang && Prism.languages[lang]) {
				return Prism.highlight(code, Prism.languages[lang], lang);
			}
			return code;
		}
	}),
	{
		renderer: {
			code({ text, lang, escaped }) {
				if (lang === 'mermaid') {
					try {
						const svg = renderMermaidSVG(text, {
							bg: '#ffffff',
							fg: '#27272a',
							accent: '#52525b',
							transparent: true
						});
						return `<div class="mermaid-diagram">${svg}</div>`;
					} catch (err) {
						console.error('Mermaid rendering error:', err);
						const safeText = escaped ? text : escapeHtml(text);
						return `<pre class="mermaid-error"><code class="language-mermaid">${safeText}</code></pre>`;
					}
				}
				return false;
			}
		}
	}
);

// Configure marked options
marked.setOptions({
	breaks: true, // Convert line breaks to <br>
	gfm: true // Enable GitHub Flavored Markdown
});

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Render markdown text to HTML safely with enhanced features
 */
export function renderMarkdown(text: string): string {
	if (!text) return '';

	try {
		const html = marked(text) as string;
		return DOMPurify.sanitize(html, {
			ADD_TAGS: [
				'iframe',
				'svg',
				'g',
				'path',
				'rect',
				'text',
				'line',
				'polygon',
				'polyline',
				'circle',
				'ellipse',
				'marker',
				'defs',
				'use',
				'title',
				'foreignObject',
				'tspan',
				'clipPath',
				'pattern',
				'stop',
				'linearGradient',
				'radialGradient',
				'desc'
			],
			ADD_ATTR: [
				'allow',
				'allowfullscreen',
				'frameborder',
				'scrolling',
				'viewBox',
				'fill',
				'stroke',
				'stroke-width',
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
				'version',
				'fill-opacity',
				'stroke-opacity',
				'stroke-dasharray',
				'stroke-linecap',
				'stroke-linejoin'
			]
		});
	} catch (error) {
		console.error('Markdown rendering error:', error);
		return DOMPurify.sanitize(text);
	}
}

/**
 * Get a preview of markdown content (first few lines)
 */
export function getMarkdownPreview(text: string, maxLength: number = 150): string {
	if (!text) return '';

	// Remove markdown syntax for preview
	const plainText = text
		.replace(/#{1,6}\s+/g, '') // Remove headers
		.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
		.replace(/\*(.*?)\*/g, '$1') // Remove italic
		.replace(/`(.*?)`/g, '$1') // Remove inline code
		.replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
		.replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
		.replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
		.replace(/\n+/g, ' ') // Replace newlines with spaces
		.trim();

	return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
}
