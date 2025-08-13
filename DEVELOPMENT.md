# SvelteKit 個人部落格開發文檔

## 📋 目錄

- [專案概述](#專案概述)
- [技術架構](#技術架構)
- [專案結構](#專案結構)
- [核心功能實現](#核心功能實現)
- [本地開發與部署策略](#本地開發與部署策略)
- [開發指南](#開發指南)
- [最佳實踐](#最佳實踐)

## 🎯 專案概述

這是一個基於 **SvelteKit 2.0** 和 **Svelte 5.0** 構建的現代化個人部落格系統，採用 **JAMstack** 架構，結合了靜態站點生成（SSG）和動態內容管理的優勢。

### 核心特色

- **混合載入策略**：本地 Markdown 文件 + 後端 API 的智能載入
- **自動同步機制**：部署時自動同步部落格內容到後端資料庫
- **響應式設計**：使用 Tailwind CSS 4.0 構建現代化 UI
- **TypeScript 支援**：完整的類型安全保證
- **SEO 優化**：服務端渲染和靜態生成的最佳實踐

## 🏗️ 技術架構

### 前端技術棧

- **SvelteKit 2.16+**：全端 Web 應用框架
- **Svelte 5.0**：響應式 UI 框架
- **TypeScript 5.0**：靜態類型檢查
- **Tailwind CSS 4.0**：實用優先的 CSS 框架
- **Vite 6.2+**：快速建置工具

### 內容管理

- **MDSvex**：Markdown 預處理器，支援 Svelte 組件
- **SVX 格式**：`.svx` 文件，支援 frontmatter 和 Svelte 組件

### 部署與 CI/CD

- **Vercel**：自動部署平台
- **pnpm**：快速、節省磁碟空間的套件管理器

## 📁 專案結構

```
tomlord.io/
├── src/
│   ├── app.html                 # HTML 模板
│   ├── app.css                  # 全域樣式
│   ├── lib/                     # 共用程式庫
│   │   ├── components/          # Svelte 組件
│   │   ├── config.ts            # 配置管理（核心）
│   │   ├── stores/              # 狀態管理
│   │   ├── types/               # TypeScript 類型定義
│   │   └── util/                # 工具函數
│   ├── markdown/                # Markdown 內容
│   │   └── posts/               # 部落格文章
│   ├── routes/                  # 路由配置
│   │   ├── +layout.server.ts    # 全域佈局載入器
│   │   ├── +page.server.ts      # 首頁載入器
│   │   ├── blog/                # 部落格路由
│   │   └── api/                 # API 路由
│   └── content/                 # 靜態內容
├── scripts/                     # 建置腳本
│   └── sync-blogs.js           # 部落格同步腳本
├── static/                      # 靜態資源
└── vercel.json                 # Vercel 配置
```

## 🧠 核心功能實現

### 1. 智能載入策略設計

#### 設計理念

傳統的部落格系統面臨一個關鍵問題：如何在後端服務不可用時（如冷啟動、網路問題）仍能提供內容？我們的解決方案是實現一個**混合載入策略**，結合本地 Markdown 文件和後端 API 的優勢。

#### 實現邏輯

```typescript
// src/lib/config.ts - 核心載入策略
export async function clientFirstLoadWithBackgroundSync<T>(
	localCall: () => Promise<T>, // 本地載入函數
	apiCall?: () => Promise<T>, // API 載入函數（可選）
	onBackgroundSync?: (data: T) => void // 背景同步回調
): Promise<{ data: T; source: 'local' | 'api' }> {
	// 1. 立即載入本地資料（不阻塞）
	const localData = await localCall();

	// 2. 背景中同步 API 資料
	Promise.resolve().then(async () => {
		try {
			const apiData = await apiCall?.();
			// 如果有新資料，觸發更新
			if (onBackgroundSync && JSON.stringify(apiData) !== JSON.stringify(localData)) {
				onBackgroundSync(apiData);
			}
		} catch (error) {
			// 靜默處理錯誤，不影響主要流程
			console.log('Background sync failed (expected for cold start)');
		}
	});

	return { data: localData, source: 'local' };
}
```

#### 載入流程圖

```
用戶訪問 → 立即載入本地 Markdown → 渲染頁面
    ↓
背景檢查後端健康狀態 → 如果健康，同步 API 資料
    ↓
如果有新資料 → 觸發 UI 更新
```

### 2. 後端健康檢查與快取機制

#### 設計考量

頻繁的健康檢查會影響性能，但過期的健康狀態會導致不必要的 API 調用失敗。我們實現了一個**智能快取系統**。

```typescript
// 健康狀態快取配置
const backendHealthCache = {
    isHealthy: boolean;           // 健康狀態
    lastCheck: number;           // 最後檢查時間
    checking: boolean;           // 檢查中標誌
};

// 快取策略
HEALTH_CHECK_CACHE_DURATION: 30000,  // 30秒快取
HEALTH_CHECK_TIMEOUT: 500,           // 500ms 超時
```

#### 快取邏輯

1. **首次訪問**：執行健康檢查
2. **快取期間**：直接返回快取結果
3. **快取過期**：執行新的健康檢查
4. **並發保護**：防止多個同時的健康檢查

### 3. 本地開發與生產部署的無縫切換

#### 環境配置統一化

我們使用 `src/lib/config.ts` 作為單一配置來源，避免在組件中直接導入環境變數：

```typescript
// ❌ 不推薦：直接在組件中導入
import { PUBLIC_BACKEND_URL } from '$env/static/public';

// ✅ 推薦：通過配置模組統一管理
import { config } from '$lib/config';
const apiUrl = config.BACKEND_URL;
```

#### 環境檢測邏輯

```typescript
export const config = {
	// 環境檢測
	get isDevelopment() {
		return this.APP_ENV === 'development' || (browser && window.location.hostname === 'localhost');
	},

	get isProduction() {
		return this.APP_ENV === 'production';
	}
};
```

## 🚀 本地開發與部署策略

### 1. 部落格同步機制

#### 設計理念

在本地開發時，我們直接從 Markdown 文件載入內容，確保開發體驗的流暢性。在生產部署時，我們需要將這些內容同步到後端資料庫，實現內容的持久化和動態管理。

#### 同步腳本實現

```javascript
// scripts/sync-blogs.js
async function syncBlogs() {
	// 1. 掃描本地 Markdown 文件
	const files = fs.readdirSync(postsDir).filter((file) => file.endsWith('.svx'));

	// 2. 解析 frontmatter 和內容
	for (const filename of files) {
		const { frontmatterData } = parseFrontmatter(content);

		// 3. 準備 API 資料結構
		const blogData = {
			title: frontmatterData.title,
			slug: frontmatterData.slug,
			date: frontmatterData.date,
			tags: frontmatterData.tags || []
			// ... 其他欄位
		};

		blogDataArray.push(blogData);
	}

	// 4. 批次同步到後端
	const result = await apiCall('/api/sync-blogs', 'POST', blogDataArray, token);
}
```

#### 部署流程

```json
// vercel.json
{
	"buildCommand": "pnpm build:prod", // 使用生產建置命令
	"outputDirectory": "build",
	"installCommand": "pnpm install"
}
```

```json
// package.json
{
	"scripts": {
		"build:prod": "node scripts/sync-blogs.js && vite build && npm run prepack",
		"sync-blogs": "node scripts/sync-blogs.js"
	}
}
```

#### 同步流程圖

```
本地開發 → 直接讀取 Markdown → 即時預覽
    ↓
部署觸發 → 執行 sync-blogs.js → 解析所有 .svx 文件
    ↓
批次 API 調用 → 同步到後端資料庫 → 建置生產版本
    ↓
部署完成 → 用戶訪問時可從 API 或本地載入
```

### 2. 錯誤處理與降級策略

#### 生產環境容錯

```javascript
// 在生產環境中，即使同步失敗也繼續建置
if (process.env.NODE_ENV === 'production') {
	console.warn('⚠️  Production build continuing without blog sync');
	return; // 不要 process.exit(1)
} else {
	process.exit(1); // 開發環境嚴格要求
}
```

#### 載入降級策略

```typescript
// 多層降級：API → 本地文件 → 預設內容
try {
	const result = await clientFirstLoadWithBackgroundSync(loadFromLocal, loadFromAPI);
	posts = result.data;
} catch (error) {
	console.error('All loading strategies failed:', error);
	posts = []; // 提供空陣列，避免頁面崩潰
}
```

## 🛠️ 開發指南

### 1. 環境設置

#### 安裝依賴

```bash
# 使用 pnpm（推薦）
pnpm install

# 或使用 npm
npm install
```

#### 環境變數配置

創建 `.env.local` 文件：

```bash
PUBLIC_BACKEND_URL=http://localhost:8080
PUBLIC_BACKEND_WS_URL=ws://localhost:8080
PUBLIC_APP_ENV=development
PUBLIC_AUTH_SUPER_USER_EMAIL=your-email@example.com
```

### 2. 新增部落格文章

#### 創建 .svx 文件

在 `src/markdown/posts/` 目錄下創建新的 `.svx` 文件：

```markdown
---
title: '我的第一篇部落格'
slug: 'my-first-blog'
date: '2024-01-01'
description: '這是我寫的第一篇部落格文章'
tags: ['svelte', 'web-development']
lang: 'zh-TW'
duration: '5min'
---

# 我的第一篇部落格

這是文章的內容，支援 **Markdown** 語法。

<script>
  // 可以嵌入 Svelte 組件
  import MyComponent from '$lib/components/MyComponent.svelte';
</script>

<MyComponent />
```

#### Frontmatter 欄位說明

- `title`: 文章標題
- `slug`: URL 路徑（必須唯一）
- `date`: 發布日期（ISO 格式）
- `description`: 文章描述（用於 SEO）
- `tags`: 標籤陣列
- `lang`: 語言代碼
- `duration`: 閱讀時間

### 3. 開發伺服器

```bash
# 啟動開發伺服器
pnpm dev

# 檢查類型錯誤
pnpm check

# 執行測試
pnpm test

# 格式化程式碼
pnpm format
```

### 4. 建置與部署

```bash
# 本地建置
pnpm build

# 生產建置（包含部落格同步）
pnpm build:prod

# 預覽建置結果
pnpm preview
```

## 🎨 最佳實踐

### 1. 組件設計原則

#### 單一職責原則

每個組件只負責一個特定功能，避免過度複雜化：

```svelte
<!-- CommentForm.svelte - 只負責評論表單 -->
<script lang="ts">
	export let postId: string;
	export let onSubmit: (comment: Comment) => void;
</script>

<form on:submit|preventDefault={handleSubmit}>
	<!-- 表單內容 -->
</form>
```

#### 類型安全

使用 TypeScript 確保組件 props 的類型安全：

```typescript
// types/comment.ts
export interface Comment {
	id: string;
	content: string;
	author: string;
	createdAt: string;
	postId: string;
}
```

### 2. 狀態管理

#### 使用 Svelte Stores

對於全域狀態，使用 Svelte 的內建 store 系統：

```typescript
// stores/auth.svelte.ts
import { writable } from 'svelte/store';

export const user = writable<User | null>(null);
export const isAuthenticated = derived(user, ($user) => !!$user);
```

#### 避免 Props Drilling

使用 stores 或 context 避免深層組件傳遞：

```svelte
<!-- 使用 store 而不是 props -->
<script>
	import { user } from '$lib/stores/auth.svelte.ts';
</script>

{#if $user}
	<UserProfile />
{/if}
```

### 3. 效能優化

#### 懶載入

對於大型組件，使用動態導入：

```typescript
// 懶載入組件
const HeavyComponent = await import('$lib/components/HeavyComponent.svelte');
```

#### 圖片優化

使用 `ResponsiveImage` 組件自動處理圖片優化：

```svelte
<script>
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
</script>

<ResponsiveImage
	src="/static/photography_assets/1.webp"
	alt="Beautiful landscape"
	sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 4. 錯誤邊界

#### 優雅降級

在組件中添加錯誤處理：

```svelte
<script>
	import { onMount } from 'svelte';

	let hasError = false;

	onMount(() => {
		// 錯誤處理邏輯
	});
</script>

{#if hasError}
	<div class="error-fallback">
		<p>載入失敗，請稍後再試</p>
		<button on:click={() => window.location.reload()}> 重新載入 </button>
	</div>
{:else}
	<!-- 正常內容 -->
{/if}
```

## 🔧 故障排除

### 常見問題

#### 1. 部落格同步失敗

```bash
# 檢查後端服務是否運行
curl http://localhost:8080/health

# 檢查環境變數
echo $PUBLIC_BACKEND_URL

# 手動執行同步
pnpm sync-blogs <your-jwt-token>
```

#### 2. 建置失敗

```bash
# 清理快取
rm -rf node_modules/.vite
rm -rf .svelte-kit

# 重新安裝依賴
pnpm install

# 檢查 TypeScript 錯誤
pnpm check
```

#### 3. 開發伺服器無法啟動

```bash
# 檢查端口是否被佔用
lsof -i :5173

# 使用不同端口
pnpm dev --port 3000
```

## 📚 學習資源

### SvelteKit 官方文檔

- [SvelteKit 官方指南](https://kit.svelte.dev/docs/introduction)
- [Svelte 5 遷移指南](https://svelte.dev/docs/v5-migration)

### 相關技術

- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [TypeScript 手冊](https://www.typescriptlang.org/docs/)
- [Vite 配置指南](https://vitejs.dev/config/)

### 進階主題

- [Svelte 組件設計模式](https://svelte.dev/docs#template-syntax-component-directives)
- [SvelteKit 路由系統](https://kit.svelte.dev/docs/routing)
- [Svelte 狀態管理](https://svelte.dev/docs#template-syntax-attributes-and-props)

## 🤝 貢獻指南

### 開發流程

1. Fork 專案
2. 創建功能分支：`git checkout -b feature/amazing-feature`
3. 提交變更：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 創建 Pull Request

### 程式碼規範

- 使用 TypeScript 進行類型檢查
- 遵循 Prettier 格式化規則
- 通過 ESLint 檢查
- 編寫測試覆蓋新功能

## 📄 授權

本專案採用 MIT 授權條款。詳見 [LICENSE](LICENSE) 文件。

---

## 🎉 總結

這個 SvelteKit 個人部落格專案展示了現代前端開發的最佳實踐：

1. **架構設計**：混合載入策略解決了冷啟動問題
2. **開發體驗**：本地開發流暢，部署自動化
3. **效能優化**：智能快取和背景同步
4. **錯誤處理**：多層降級確保系統穩定性
5. **類型安全**：完整的 TypeScript 支援

通過這份文檔，你應該能夠理解專案的設計理念，並能夠基於此架構構建自己的個人部落格系統。記住，好的架構設計不僅要解決當前的問題，更要為未來的擴展和維護留下空間。

祝你開發愉快！🚀
