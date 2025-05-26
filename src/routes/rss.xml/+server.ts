import type { RequestHandler } from './$types.js';
import type { PostMetadata } from '$lib/types/types.js';

export const GET: RequestHandler = async () => {
  const posts: PostMetadata[] = [];
  
  // Reuse your existing post loading logic
  const postModules = import.meta.glob('/src/markdown/posts/**/*.svx', {
    eager: true,
  });

  for (const postPath in postModules) {
    const file = postModules[postPath];
    if (file && typeof file === 'object' && 'metadata' in file) {
      const metadata = file.metadata as PostMetadata;
      if (metadata.slug && metadata.title && metadata.date) {
        posts.push({
          title: metadata.title,
          date: metadata.date,
          slug: metadata.slug,
          description: metadata.description || '',
          tags: metadata.tags || [],
          lang: metadata.lang,
        });
      }
    }
  }

  // Sort posts by date (newest first)
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const xml = generateRSSFeed(posts);
  
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600' // Cache for 1 hour
    }
  });
};

function generateRSSFeed(posts: PostMetadata[]): string {
  const siteUrl = 'https://tomlord.io'; // Update this to your actual domain
  const rssItems = posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description || post.title}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post.tags.map(tag => `<category>${tag}</category>`).join('')}
      <language>${post.lang || 'zh-tw'}</language>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tomlord's Blog</title>
    <description>Personal blog and learning journey</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>zh-tw</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <managingEditor>r12944044@csie.ntu.edu.tw (Tomlord)</managingEditor>
    <webMaster>r12944044@csie.ntu.edu.tw (Tomlord)</webMaster>
    ${rssItems}
  </channel>
</rss>`;
} 