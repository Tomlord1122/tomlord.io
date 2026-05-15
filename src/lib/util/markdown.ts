import { marked } from 'marked';
// Isomorphic, sync HTML sanitizer (sanitize-html under the hood). DOMPurify
// can't be used here because every server-side strategy we tried (jsdom,
// linkedom) either crashes Vercel or fails DOMPurify's environment check.
import { sanitize } from './sanitize.js';
import { markedHighlight } from 'marked-highlight';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { renderMermaidSVG } from 'beautiful-mermaid';
import Prism from 'prismjs';
import { buildEmbedHTML } from './embed.js';
import type { LinkPreview } from '$lib/types/preview.js';

export type TocItem = {
	id: string;
	text: string;
	level: 1 | 2 | 3 | 4;
};

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
				if (lang?.trim().toLowerCase() === 'mermaid') {
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

function stripHeadingMarkdown(text: string): string {
	return text
		.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
		.replace(/[`*_~]/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/g, (_match, entity) => {
			const normalized = entity.toLowerCase();
			if (normalized === 'colon') return ':';
			if (normalized.startsWith('#x'))
				return String.fromCharCode(parseInt(normalized.slice(2), 16));
			if (normalized.startsWith('#')) return String.fromCharCode(Number(normalized.slice(1)));
			return '';
		})
		.trim();
}

function slugifyHeading(text: string): string {
	return text
		.toLowerCase()
		.replace(/[\0-\x1F!-\/:-@\[-\^`\{-~]/g, '')
		.replace(/ /g, '-');
}

/**
 * Extract a heading-based table of contents from markdown content.
 * Mirrors the id generation used by marked-gfm-heading-id closely enough for
 * article anchors while avoiding a second full markdown render.
 */
export function extractTableOfContents(text: string): TocItem[] {
	if (!text) return [];

	const toc: TocItem[] = [];
	const slugs = new Map<string, number>();
	let inFence = false;

	for (const line of text.split('\n')) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}

		if (inFence) continue;

		const match = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
		if (!match) continue;

		const level = match[1].length as TocItem['level'];
		const headingText = stripHeadingMarkdown(match[2]);
		if (!headingText) continue;

		const baseSlug = slugifyHeading(headingText);
		const count = slugs.get(baseSlug) ?? 0;
		slugs.set(baseSlug, count + 1);

		toc.push({
			id: count === 0 ? baseSlug : `${baseSlug}-${count}`,
			text: headingText,
			level
		});
	}

	return toc;
}

/**
 * Render markdown text to HTML safely with enhanced features.
 * Optionally provides a map of pre-fetched link previews for [[embed|url]] blocks.
 */
export function renderMarkdown(text: string, previews?: Record<string, LinkPreview>): string {
	if (!text) return '';

	try {
		// Preprocess custom [[embed|url]] blocks before marked parsing.
		// Embeds are inline chips, so they can appear anywhere in the text.
		const processed = text.replace(
			/\[\[embed\|([^|\]]+)(?:\|([^\]]*))?\]\]/g,
			(_match, url, customLabel) => {
				return buildEmbedHTML(url.trim(), previews?.[url.trim()], customLabel);
			}
		);

		const html = marked(processed) as string;
		return sanitize(html);
	} catch (error) {
		console.error('Markdown rendering error:', error);
		return sanitize(text);
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
		.replace(/\[\[embed\|([^|\]]+)(?:\|([^\]]*))?\]\]/g, (_match, url, customLabel) => {
			// Custom label takes priority, otherwise show the domain.
			if (customLabel?.trim()) return customLabel.trim();
			try {
				return new URL(url).hostname.replace(/^www\./, '');
			} catch {
				return '';
			}
		})
		.replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
		.replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
		.replace(/\n+/g, ' ') // Replace newlines with spaces
		.trim();

	return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
}
