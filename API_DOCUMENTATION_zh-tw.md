# Tomlord.io API 文件

本文件提供 Tomlord.io Svelte 應用程式中所有公開 API、函數和元件的完整文件。

## 目錄

1. [配置](#配置)
2. [型別定義](#型別定義)
3. [元件](#元件)
4. [狀態管理](#狀態管理)
5. [工具函數](#工具函數)
6. [導航](#導航)
7. [API 路由](#api-路由)

---

## 配置

### `config` 物件

提供環境特定設定和 API 端點的主要配置物件。

```typescript
import { config } from '$lib/config.js';
```

#### 屬性

- `BACKEND_URL` (string): 後端 API 基礎 URL
- `BACKEND_WS_URL` (string): WebSocket 後端 URL
- `APP_ENV` (string): 當前環境 ('development' | 'production')
- `FETCH_TIMEOUT` (number): API 呼叫超時時間（毫秒，預設：1000）
- `WEBSOCKET_TIMEOUT` (number): WebSocket 連線超時（預設：1000）
- `RETRY_ATTEMPTS` (number): 失敗請求的重試次數（預設：2）
- `HEALTH_CHECK_TIMEOUT` (number): 健康檢查超時（預設：500）
- `HEALTH_CHECK_CACHE_DURATION` (number): 健康檢查快取時間（預設：30000）

#### 計算屬性

- `isDevelopment` (boolean): 開發環境時返回 true
- `isProduction` (boolean): 生產環境時返回 true
- `API` (object): 包含所有 API 端點的物件

#### API 端點

```typescript
config.API = {
	AUTH_ME: `${BACKEND_URL}/auth/me`,
	AUTH_GOOGLE: `${BACKEND_URL}/auth/google`,
	AUTH_LOGOUT: `${BACKEND_URL}/auth/logout`,
	BLOGS: `${BACKEND_URL}/api/blogs`,
	MESSAGES: `${BACKEND_URL}/api/messages`,
	WEBSOCKET: `${BACKEND_WS_URL}/ws`,
	HEALTH: `${BACKEND_URL}/health`
};
```

### `checkBackendHealth(useCache?: boolean): Promise<boolean>`

檢查後端是否健康且響應正常。

```typescript
import { checkBackendHealth } from '$lib/config.js';

// 檢查後端健康狀態（預設使用快取）
const isHealthy = await checkBackendHealth();

// 強制重新健康檢查
const isHealthy = await checkBackendHealth(false);
```

**參數：**

- `useCache` (boolean, 可選): 是否使用快取的健康檢查結果（預設：true）

**返回：** Promise<boolean> - 後端健康時返回 true

### `smartLoadWithFallback<T>(apiCall, fallbackCall, forceHealthCheck?): Promise<{data: T, source: 'api' | 'local'}>`

智慧載入策略，先檢查後端健康狀態，然後決定使用 API 或本地備用方案。

```typescript
import { smartLoadWithFallback } from '$lib/config.js';

const result = await smartLoadWithFallback(
	() => fetch('/api/data'),
	() => loadLocalData(),
	false
);

console.log(result.data); // 載入的資料
console.log(result.source); // 'api' 或 'local'
```

**參數：**

- `apiCall` (() => Promise<T>): 呼叫 API 的函數
- `fallbackCall` (() => Promise<T>): 載入本地資料的函數
- `forceHealthCheck` (boolean, 可選): 強制重新健康檢查（預設：false）

**返回：** Promise<{data: T, source: 'api' | 'local'}>

### `fetchWithTimeout(url, options?, timeout?): Promise<Response>`

具有超時和重試功能的 fetch 工具函數。

```typescript
import { fetchWithTimeout } from '$lib/config.js';

const response = await fetchWithTimeout(
	'https://api.example.com/data',
	{ method: 'GET' },
	5000 // 5 秒超時
);
```

**參數：**

- `url` (string): 要獲取的 URL
- `options` (RequestInit, 可選): Fetch 選項
- `timeout` (number, 可選): 超時時間（毫秒，預設：config.FETCH_TIMEOUT）

**返回：** Promise<Response>

### `fetchWithFallback<T>(apiCall, fallbackCall, timeout?): Promise<T>`

嘗試 API 呼叫，如果失敗或超時則立即使用備用方案。

```typescript
import { fetchWithFallback } from '$lib/config.js';

const data = await fetchWithFallback(
	() => fetch('/api/data').then((r) => r.json()),
	() => loadLocalData(),
	3000 // 3 秒超時
);
```

**參數：**

- `apiCall` (() => Promise<T>): 呼叫 API 的函數
- `fallbackCall` (() => Promise<T>): 提供備用資料的函數
- `timeout` (number, 可選): 超時時間（毫秒，預設：config.FETCH_TIMEOUT）

**返回：** Promise<T>

---

## 型別定義

### 文章型別

#### `PostMetadata`

```typescript
interface PostMetadata {
	title: string;
	date: string;
	slug: string;
	description: string;
	tags: string[];
	lang: string;
	duration: string;
}
```

#### `Post`

```typescript
interface Post extends Omit<PostMetadata, 'description'> {
	content: string; // Markdown/HTML 內容字串
	duration: string;
	description: string;
}
```

#### `PostData`

```typescript
interface PostData {
	title: string;
	slug: string;
	content: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description: string;
	is_published: boolean;
}
```

#### `Frontmatter`

```typescript
interface Frontmatter {
	title?: string;
	date?: string;
	slug?: string;
	description?: string;
	tags?: string[];
	lang?: string;
	duration?: string;
	[key: string]: string | string[] | undefined;
}
```

### 評論型別

#### `Comment`

```typescript
interface Comment {
	id: string;
	user_id: string;
	user_name: string;
	user_picture: string;
	post_slug: string;
	blog_id?: string;
	message: string;
	thumb_count: number;
	created_at: string;
	updated_at: string;
	user_thumbed?: boolean;
}
```

#### `CreateCommentRequest`

```typescript
interface CreateCommentRequest {
	user_id: string;
	post_slug: string;
	blog_id?: string;
	message: string;
}
```

#### `CommentListRequest`

```typescript
interface CommentListRequest {
	post_slug?: string;
	blog_id?: string;
	blog_slug?: string;
	limit?: number;
	offset?: number;
	user_id?: string;
}
```

#### `BlogPost`

```typescript
interface BlogPost {
	id: string;
	title: string;
	slug: string;
	date: string;
	lang: string;
	duration: string;
	tags: string[];
	description?: string;
	is_published: boolean;
	created_at: string;
	updated_at: string;
	message_count?: number;
}
```

### 認證型別

#### `User`

```typescript
interface User {
	id: string;
	google_id: string;
	email: string;
	name: string;
	picture_url?: string;
}
```

#### `AuthState`

```typescript
interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}
```

---

## 元件

### TypewriterTextarea

具有打字機音效和視覺回饋的文字區域元件。

```typescript
import TypewriterTextarea from '$lib/components/TypewriterTextarea.svelte';
```

#### 屬性

```typescript
interface Props {
	value?: string; // 文字區域值的雙向綁定
	placeholder?: string; // 佔位符文字
	class?: string; // 額外 CSS 類別
	id?: string; // HTML id 屬性
	required?: boolean; // 必填欄位
	disabled?: boolean; // 禁用狀態
	readonly?: boolean; // 唯讀狀態
	rows?: number; // 行數（預設：4）
	cols?: number; // 列數
	maxlength?: number; // 最大字元長度
	minlength?: number; // 最小字元長度
	wrap?: 'soft' | 'hard' | null; // 文字換行（預設：'soft'）
	resize?: 'none' | 'both' | 'horizontal' | 'vertical'; // 調整大小行為（預設：'vertical'）
	onKeydown?: (e: KeyboardEvent) => void; // 按鍵按下事件處理器
	onInput?: (e: Event) => void; // 輸入事件處理器
	onFocus?: (e: FocusEvent) => void; // 焦點事件處理器
	onBlur?: (e: FocusEvent) => void; // 失焦事件處理器
	onCompositionstart?: (e: CompositionEvent) => void; // 組合開始處理器
	onCompositionend?: (e: CompositionEvent) => void; // 組合結束處理器
	enableSound?: boolean; // 啟用打字機音效（預設：true）
	soundVolume?: number; // 音效音量 0-1（預設：0.1）
}
```

#### 使用範例

```svelte
<script>
	import TypewriterTextarea from '$lib/components/TypewriterTextarea.svelte';

	let content = '';

	function handleKeydown(e) {
		console.log('按下的按鍵:', e.key);
	}
</script>

<TypewriterTextarea
	bind:value={content}
	placeholder="開始輸入..."
	rows={6}
	enableSound={true}
	soundVolume={0.2}
	onKeydown={handleKeydown}
	class="w-full rounded-lg border p-4"
/>
```

#### 功能特色

- **打字機音效**: 一般按鍵、空格、換行和退格鍵的不同音效
- **視覺回饋**: 輸入時的細微動畫和視覺提示
- **無障礙支援**: 完整的鍵盤導航和螢幕閱讀器支援
- **輸入法支援**: 正確處理國際輸入的組合事件
- **響應式設計**: 適應不同螢幕尺寸
- **可自訂**: 豐富的屬性選項供自訂

### Navigation

網站導航元件。

```typescript
import Navigation from '$lib/components/Navigation.svelte';
```

#### 使用範例

```svelte
<script>
	import Navigation from '$lib/components/Navigation.svelte';
</script>

<Navigation />
```

### CommentForm

建立新評論的表單元件。

```typescript
import CommentForm from '$lib/components/CommentForm.svelte';
```

#### 屬性

```typescript
interface CommentFormProps {
	postSlug: string;
	blogId?: string;
	onSubmit?: (comment: CreateCommentRequest) => void;
	onCancel?: () => void;
}
```

#### 使用範例

```svelte
<script>
	import CommentForm from '$lib/components/CommentForm.svelte';

	function handleSubmit(comment) {
		console.log('新評論:', comment);
	}
</script>

<CommentForm postSlug="my-blog-post" blogId="blog-123" onSubmit={handleSubmit} />
```

### CommentList

顯示評論列表的元件，支援排序和分頁。

```typescript
import CommentList from '$lib/components/CommentList.svelte';
```

#### 屬性

```typescript
interface CommentListProps {
	postSlug?: string;
	blogId?: string;
	blogSlug?: string;
	limit?: number;
	offset?: number;
	userId?: string;
	sortBy?: 'time' | 'likes';
}
```

#### 使用範例

```svelte
<script>
	import CommentList from '$lib/components/CommentList.svelte';
</script>

<CommentList postSlug="my-blog-post" limit={10} sortBy="time" />
```

### PhotoCarousel

攝影作品集的圖片輪播元件。

```typescript
import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
```

#### 屬性

```typescript
interface PhotoCarouselProps {
	images: string[];
	startIndex?: number;
	autoPlay?: boolean;
	interval?: number;
	showThumbnails?: boolean;
	showControls?: boolean;
}
```

#### 使用範例

```svelte
<script>
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';

	const images = ['/photos/image1.jpg', '/photos/image2.jpg', '/photos/image3.jpg'];
</script>

<PhotoCarousel {images} startIndex={0} autoPlay={true} interval={3000} showThumbnails={true} />
```

### ResponsiveImage

具有延遲載入和最佳化的響應式圖片元件。

```typescript
import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
```

#### 屬性

```typescript
interface ResponsiveImageProps {
	src: string;
	alt: string;
	sizes?: string;
	loading?: 'lazy' | 'eager';
	class?: string;
	width?: number;
	height?: number;
}
```

#### 使用範例

```svelte
<script>
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
</script>

<ResponsiveImage
	src="/images/hero.jpg"
	alt="主要圖片"
	sizes="(max-width: 768px) 100vw, 50vw"
	loading="lazy"
	class="rounded-lg shadow-lg"
/>
```

### ReadingProgressBar

顯示頁面閱讀進度的進度條元件。

```typescript
import ReadingProgressBar from '$lib/components/ReadingProgressBar.svelte';
```

#### 使用範例

```svelte
<script>
	import ReadingProgressBar from '$lib/components/ReadingProgressBar.svelte';
</script>

<ReadingProgressBar />
```

### InteractiveBackground

具有動畫效果的互動背景元件。

```typescript
import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
```

#### 屬性

```typescript
interface InteractiveBackgroundProps {
	intensity?: number;
	color?: string;
	speed?: number;
}
```

#### 使用範例

```svelte
<script>
	import InteractiveBackground from '$lib/components/InteractiveBackground.svelte';
</script>

<InteractiveBackground intensity={0.5} color="#4f46e5" speed={2} />
```

---

## 狀態管理

### Auth Store

使用 Svelte 5 runes 的認證狀態管理。

```typescript
import { authStore } from '$lib/stores/auth.svelte';
```

#### 狀態

```typescript
interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}
```

#### 方法

- `login()`: 重定向到 Google OAuth 登入
- `logout()`: 登出使用者並清除本地儲存
- `setToken(token: string)`: 設定認證令牌
- `checkAuthStatus()`: 檢查當前認證狀態
- `clearError()`: 清除任何認證錯誤

#### 使用範例

```svelte
<script>
	import { authStore } from '$lib/stores/auth.svelte';

	// 存取狀態
	$: user = authStore.state.user;
	$: isAuthenticated = authStore.state.isAuthenticated;

	// 使用方法
	function handleLogin() {
		authStore.login();
	}

	function handleLogout() {
		authStore.logout();
	}
</script>

{#if isAuthenticated}
	<p>歡迎，{user.name}！</p>
	<button on:click={handleLogout}>登出</button>
{:else}
	<button on:click={handleLogin}>使用 Google 登入</button>
{/if}
```

### WebSocket Store

即時功能的 WebSocket 連線管理。

```typescript
import { websocketStore } from '$lib/stores/websocket.svelte';
```

#### 連線狀態

```typescript
enum ConnectionState {
	DISCONNECTED = 'disconnected',
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	RECONNECTING = 'reconnecting',
	FAILED = 'failed'
}
```

#### 訊息型別

```typescript
type MessageType =
	| 'new_comment'
	| 'thumb_update'
	| 'comment_update'
	| 'comment_delete'
	| 'ping'
	| 'pong';
```

#### 方法

- `init()`: 初始化 WebSocket 管理器
- `connect(rooms?: string[])`: 連線到 WebSocket，可選房間訂閱
- `disconnect()`: 斷開 WebSocket 連線
- `subscribeToRooms(rooms: string[])`: 訂閱特定房間
- `unsubscribeFromRooms(rooms: string[])`: 取消訂閱房間
- `addEventListener(type: MessageType, callback)`: 為訊息型別新增事件監聽器
- `removeEventListener(type: MessageType, callback)`: 移除事件監聽器

#### 使用範例

```svelte
<script>
	import { websocketStore } from '$lib/stores/websocket.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		// 初始化 WebSocket
		websocketStore.init();

		// 連線到特定房間
		websocketStore.connect(['blog-comments', 'general']);

		// 監聽新評論
		websocketStore.addEventListener('new_comment', (payload) => {
			console.log('收到新評論:', payload);
		});

		// 監聽按讚更新
		websocketStore.addEventListener('thumb_update', (payload) => {
			console.log('按讚更新:', payload);
		});
	});
</script>

<div>
	連線狀態: {websocketStore.state}
	已連線房間: {websocketStore.rooms.join(', ')}
</div>
```

---

## 工具函數

### `calculateDuration(text: string, language: string): number`

根據語言計算文字內容的閱讀時間。

```typescript
import { calculateDuration } from '$lib/util/helper.js';

const duration = calculateDuration('這是一段用於閱讀的範例文字。', 'zh-tw');
console.log(duration); // 輸出: 1 (分鐘)
```

**參數：**

- `text` (string): 要分析的文字內容
- `language` (string): 語言代碼 ('en', 'zh-tw', 等)

**返回：** number - 閱讀時間（分鐘）

**語言特定行為：**

- 英文: 每分鐘 180 個單字
- 中文: 每分鐘 300 個字元

### `copyImageMarkdown(imagePath: string): Promise<void>`

將圖片 Markdown 複製到剪貼簿。

```typescript
import { copyImageMarkdown } from '$lib/util/helper.js';

await copyImageMarkdown('/images/photo.jpg');
// 複製: <div class="flex justify-center">
//       <img src="/images/photo.jpg" alt="photo.jpg" class="photo-post">
//       </div>
```

**參數：**

- `imagePath` (string): 圖片檔案路徑

**返回：** Promise<void>

---

## 導航

### `getCurrentRouteMetadata(): RouteMetadata | null`

獲取當前路由的元資料。

```typescript
import { getCurrentRouteMetadata } from '$lib/navigation.js';

const metadata = getCurrentRouteMetadata();
if (metadata) {
	console.log(metadata.title); // "首頁 - Tomlord"
	console.log(metadata.icon); // "🏠"
}
```

**返回：** RouteMetadata | null

### `getBreadcrumbs(): Array<{label: string, href: string, active: boolean}>`

為當前路由生成麵包屑導航。

```typescript
import { getBreadcrumbs } from '$lib/navigation.js';

const breadcrumbs = getBreadcrumbs();
// 返回: [
//   { label: '首頁', href: '/', active: false },
//   { label: '部落格', href: '/blog', active: true }
// ]
```

**返回：** 麵包屑物件陣列

### `navigateTo(href: string, options?: NavigationOptions): Promise<void>`

具有額外選項的增強導航函數。

```typescript
import { navigateTo } from '$lib/navigation.js';

await navigateTo('/blog', {
	replaceState: false,
	noScroll: false,
	keepFocus: true,
	trackHistory: true
});
```

**參數：**

- `href` (string): 目標 URL
- `options` (object, 可選):
  - `replaceState` (boolean): 替換當前歷史記錄項目
  - `noScroll` (boolean): 防止自動滾動
  - `keepFocus` (boolean): 維持焦點狀態
  - `trackHistory` (boolean): 在導航歷史中追蹤

### `goBack(): Promise<void>`

在歷史記錄中向後導航。

```typescript
import { goBack } from '$lib/navigation.js';

await goBack();
```

### `canGoBack(): boolean`

檢查是否可以向後導航。

```typescript
import { canGoBack } from '$lib/navigation.js';

if (canGoBack()) {
	// 顯示返回按鈕
}
```

**返回：** boolean

### `getNavigationSuggestions(): Array<{href: string, metadata: RouteMetadata}>`

獲取當前上下文的導航建議。

```typescript
import { getNavigationSuggestions } from '$lib/navigation.js';

const suggestions = getNavigationSuggestions();
// 返回具有元資料的建議路由陣列
```

**返回：** 導航建議陣列

---

## API 路由

### POST `/api/add-post`

建立新的部落格文章，同時儲存到後端資料庫和本地檔案。

**請求主體：**

```typescript
{
	filename: string;
	content: string; // 包含前置資料的 Markdown 內容
}
```

**回應：**

```typescript
{
  success: boolean;
  blogId?: string;
  error?: string;
  requiresAuth?: boolean;
}
```

**範例：**

```typescript
const response = await fetch('/api/add-post', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	},
	body: JSON.stringify({
		filename: 'my-new-post.svx',
		content: `---
title: 我的新文章
date: 2024-01-15
slug: my-new-post
description: 一篇很棒的新文章
tags: ['svelte', 'web']
lang: zh-tw
duration: 5min
---

# 我的新文章

這是我的新文章內容...
`
	})
});
```

### POST `/api/edit-post`

更新現有的部落格文章。

**請求主體：**

```typescript
{
	postId: string;
	filename: string;
	content: string;
}
```

**回應：**

```typescript
{
  success: boolean;
  error?: string;
}
```

### POST `/api/edit-page`

更新靜態頁面。

**請求主體：**

```typescript
{
	pageId: string;
	content: string;
}
```

**回應：**

```typescript
{
  success: boolean;
  error?: string;
}
```

### POST `/api/upload-image`

上傳圖片檔案。

**請求主體：** 包含圖片檔案的 FormData

**回應：**

```typescript
{
  success: boolean;
  imagePath?: string;
  error?: string;
}
```

### POST `/api/sync-blogs`

同步後端和本地檔案之間的部落格資料。

**回應：**

```typescript
{
  success: boolean;
  syncedCount?: number;
  error?: string;
}
```

---

## 環境變數

應用程式使用以下環境變數：

```bash
# 後端配置
PUBLIC_BACKEND_URL=http://localhost:8080
PUBLIC_BACKEND_WS_URL=ws://localhost:8080

# 環境
PUBLIC_APP_ENV=development
```

---

## 錯誤處理

應用程式實作全面的錯誤處理：

1. **網路錯誤**: 後端不可用時自動回退到本地資料
2. **認證錯誤**: 優雅處理過期令牌
3. **驗證錯誤**: 表單驗證的使用者友善錯誤訊息
4. **WebSocket 錯誤**: 具有指數退避的自動重連

---

## 效能最佳化

1. **智慧載入**: API 呼叫前進行健康檢查，並使用本地備用方案
2. **快取**: 後端健康狀態快取（30 秒）
3. **延遲載入**: 按需載入圖片和元件
4. **連線池**: WebSocket 連線重複使用
5. **防抖**: 輸入事件防抖以提升效能

---

## 安全性考量

1. **認證**: 基於 JWT 令牌的認證，整合 Google OAuth
2. **授權**: 管理功能的角色型存取控制
3. **輸入驗證**: 所有使用者輸入的伺服器端驗證
4. **CSRF 保護**: 內建 SvelteKit CSRF 保護
5. **內容安全政策**: CSP 標頭防止 XSS 攻擊

---

## 瀏覽器支援

- **現代瀏覽器**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **使用功能**: WebSocket, Web Audio API, Fetch API, ES2020+
- **備用方案**: 舊版瀏覽器的優雅降級

---

## 貢獻指南

為此程式碼庫貢獻時：

1. 遵循現有的 TypeScript 模式
2. 使用 Svelte 5 runes 進行狀態管理
3. 實作適當的錯誤處理
4. 新增完整的 JSDoc 註解
5. 為新功能編寫單元測試
6. 遵循既定的命名慣例

---

## 授權

本文件是 Tomlord.io 專案的一部分。請參閱專案的授權檔案以了解使用條款。

---

## 語言版本

- [English Version](./API_DOCUMENTATION.md)
- [繁體中文版本](./API_DOCUMENTATION_zh-tw.md)
