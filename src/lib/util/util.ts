/**
 * Returns a markdown template for a new blog post
 * @returns Blog post template string
 */
export function getNewBlogTemplate() {
  return `---
title: '新文章標題'
date: '${new Date().toISOString().split('T')[0]}'
slug: 'new-post-slug'
description: '這裡是文章的簡短描述，會顯示在文章列表中。'
tags: ['標籤1', '標籤2', '標籤3']
---

# 文章標題

這是文章的主要內容。您可以在這裡使用標準的 Markdown 語法。
您也可以在這裡使用 Svelte 組件！

## 副標題

普通段落文字可以這樣寫。**這是粗體文字**，*這是斜體文字*。

### 程式碼區塊

\`\`\`javascript
// 這是程式碼區塊
const greeting = "Hello World";
console.log(greeting);
\`\`\`

### 列表

1. 第一項
2. 第二項
3. 第三項

- 無序列表項目
- 另一個項目
- 再一個項目

### 引用

> 這是一個引用區塊。
> 可以有多行。

### 圖片

![圖片描述](https://via.placeholder.com/800x400)

### 連結

[這是一個連結](https://example.com)
`;
}

/**
 * Saves the blog content to a file
 * @param content Blog content
 * @param slug Blog slug
 */
export async function saveBlogPost(content: string, slug: string) {
  try {
    // In a real implementation, this would connect to your backend
    // Since client-side JS can't write directly to the filesystem,
    // you'd need a server endpoint to handle this
    
    // For now, we'll provide instructions in the UI
    return {
      success: true,
      message: `Blog post "${slug}" has been prepared. In a production environment, this would save to your server.`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error saving blog post: ${error}`
    };
  }
}
