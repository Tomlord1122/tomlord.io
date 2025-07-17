# tomlord.io Technical Documentation

## 專案概述 (Project Overview)

`tomlord.io` 是一個基於 SvelteKit 的個人部落格網站，展示了現代前端開發技術的實踐應用。這是作者第二次構建個人網站，專注於學習 SvelteKit 的核心概念和現代前端開發模式。

## 技術架構 (Technical Architecture)

### 前端 Frontend

- **框架**: SvelteKit (Svelte 5)
- **CSS 框架**: Tailwind CSS 4.0
- **Markdown 處理**: MDSvex (Svelte + Markdown)
- **語言**: TypeScript
- **部署**: Vercel
- **分析**: Vercel Analytics

### 後端 Backend

- **語言**: Go 1.24.4
- **框架**: Gin
- **資料庫**: PostgreSQL (使用 pgx 驅動)
- **容器化**: Docker & Docker Compose
- **測試**: Go 內建測試框架 + Testcontainers

### 開發工具 (Development Tools)

- **包管理器**: pnpm (前端) / Go Modules (後端)
- **程式碼品質**: ESLint, Prettier, TypeScript
- **熱重載**: Vite (前端) / Air (後端)
- **測試**: Vitest (前端) / Go test (後端)

## 專案結構詳解 (Project Structure)

### 前端結構 (`tomlord.io/`)

```
tomlord.io/
├── src/
│   ├── routes/                 # SvelteKit 路由系統
│   │   ├── +layout.svelte     # 全域布局
│   │   ├── +page.svelte       # 首頁
│   │   ├── blog/              # 部落格相關頁面
│   │   │   ├── [slug]/        # 動態路由 (文章頁)
│   │   │   └── +page.svelte   # 部落格列表頁
│   │   ├── project/           # 專案展示頁
│   │   ├── photography/       # 攝影作品頁
│   │   └── api/               # API 端點
│   │       ├── add-post/      # 新增文章
│   │       ├── edit-post/     # 編輯文章
│   │       ├── edit-page/     # 編輯頁面
│   │       └── upload-image/  # 圖片上傳
│   ├── lib/
│   │   ├── components/        # 可重用組件
│   │   ├── types/            # TypeScript 型別定義
│   │   └── util/             # 工具函數
│   ├── markdown/posts/        # Markdown 部落格文章
│   ├── content/              # 頁面內容文件
│   └── static/               # 靜態資源
└── svelte.config.js          # Svelte 配置
```

### 後端結構 (`tomlord.io-backend/`)

```
tomlord.io-backend/
├── cmd/api/
│   └── main.go               # 應用程式入口點
├── internal/
│   ├── server/               # HTTP 服務器邏輯
│   │   ├── server.go        # 服務器初始化
│   │   └── routes.go        # 路由定義
│   └── database/            # 資料庫服務
│       ├── database.go      # 資料庫連接與服務
│       └── database_test.go # 資料庫測試
├── docker-compose.yml        # Docker 編排
├── Dockerfile               # Docker 容器配置
├── Makefile                 # 構建自動化
└── go.mod                   # Go 模組依賴
```

## 核心功能實現 (Core Features)

### 1. 部落格系統 (Blog System)

#### 文章管理

- **動態路由**: 使用 SvelteKit 的 `[slug]` 動態路由載入個別文章
- **Markdown 支援**: 透過 MDSvex 處理 Markdown 格式文章
- **前端 Matter**: 支援 YAML 前端 Matter，包含標題、日期、標籤等元數據

```typescript
// 文章型別定義
export interface PostMetadata {
	title: string;
	date: string;
	slug: string;
	description: string;
	tags: string[];
	lang: string;
}
```

#### 內容管理 (開發模式)

- **即時編輯**: 在開發環境中可直接編輯文章和頁面內容
- **檔案自動儲存**: 透過 API 端點直接寫入檔案系統
- **圖片上傳**: 支援圖片上傳並自動轉換為 WebP 格式

### 2. 導航系統 (Navigation System)

採用現代 SvelteKit 5 語法實現：

```typescript
// 使用 Svelte 5 的 $state 和 $props
const navItems = $state([
	{ href: '/', label: 'Home' },
	{ href: '/blog', label: 'Blog' },
	{ href: '/project', label: 'Project' },
	{ href: '/photography', label: 'Photography' }
]);
```

### 3. 互動式背景 (Interactive Background)

實現了基於滑鼠位置的星空動畫效果：

- **Canvas 渲染**: 使用 HTML5 Canvas 繪製動畫
- **滑鼠互動**: 根據滑鼠位置動態調整星點位置和亮度
- **響應式設計**: 在行動裝置上自動禁用以優化效能

### 4. 多語言支援 (Multilingual Support)

- **語言過濾**: 支援中文和英文內容分別顯示
- **國際化路由**: 根據語言標籤動態篩選內容

## API 設計 (API Design)

### 前端 API 端點

#### 1. 文章管理 API

```typescript
// POST /api/add-post - 新增文章
// POST /api/edit-post - 編輯文章
// GET /api/edit-post?slug=<slug> - 獲取文章內容
```

#### 2. 頁面管理 API

```typescript
// POST /api/edit-page - 編輯頁面
// GET /api/edit-page?page=<page> - 獲取頁面內容
```

#### 3. 圖片上傳 API

```typescript
// POST /api/upload-image - 上傳圖片
// 自動轉換為 WebP 格式並優化
```

### 後端 API (Go)

目前提供基礎的健康檢查和 CORS 配置：

```go
// GET / - Hello World 端點
// GET /health - 健康檢查
```

## 資料流程 (Data Flow)

### 1. 靜態內容載入

```
Markdown 檔案 → MDSvex 處理 → SvelteKit 路由 → 頁面渲染
```

### 2. 動態內容編輯 (開發模式)

```
前端編輯器 → API 請求 → 檔案系統寫入 → 頁面重新整理
```

### 3. 圖片處理流程

```
上傳檔案 → Sharp 處理 → WebP 轉換 → 靜態資源儲存
```

## 開發流程 (Development Workflow)

### 前端開發

```bash
# 安裝依賴
pnpm install

# 開發模式
pnpm dev

# 構建
pnpm build

# 預覽
pnpm preview

# 測試
pnpm test

# 程式碼檢查
pnpm lint
pnpm format
```

### 後端開發

```bash
# 構建應用程式
make build

# 運行應用程式
make run

# 開發模式 (熱重載)
make watch

# 運行測試
make test

# Docker 環境
make docker-run
make docker-down

# 整合測試
make itest
```

## 環境配置 (Environment Configuration)

### 前端環境變數

- **開發模式檢測**: 透過 `window.location.hostname === 'localhost'` 判斷
- **Vercel Analytics**: 自動根據環境切換開發/生產模式

### 後端環境變數

```bash
# 資料庫配置
BLUEPRINT_DB_DATABASE=your_database
BLUEPRINT_DB_PASSWORD=your_password
BLUEPRINT_DB_USERNAME=your_username
BLUEPRINT_DB_PORT=5432
BLUEPRINT_DB_HOST=localhost
BLUEPRINT_DB_SCHEMA=public

# 服務器配置
PORT=8080
```

## 部署策略 (Deployment Strategy)

### 前端部署 (Vercel)

- **自動部署**: 連接 Git 儲存庫，推送後自動部署
- **CDN 加速**: Vercel 全球 CDN 分發
- **Analytics**: 整合 Vercel Analytics 追蹤使用者行為

### 後端部署 (容器化)

```dockerfile
# 多階段構建
FROM golang:1.23-alpine AS build
FROM alpine:3.20.1 AS prod
```

## 效能優化 (Performance Optimization)

### 前端優化

1. **圖片優化**: 自動轉換為 WebP 格式
2. **程式碼分割**: SvelteKit 自動程式碼分割
3. **預載入**: 導航連結支援資料預載入
4. **響應式設計**: 行動裝置優化

### 後端優化

1. **連接池**: 資料庫連接重用
2. **優雅關機**: 支援優雅關機處理
3. **CORS 優化**: 精確的 CORS 配置

## 測試策略 (Testing Strategy)

### 前端測試

- **單元測試**: Vitest + Testing Library
- **型別檢查**: TypeScript 靜態型別檢查
- **E2E 測試**: 計劃使用 Playwright

### 後端測試

- **單元測試**: Go 內建測試框架
- **整合測試**: Testcontainers 進行資料庫測試
- **健康檢查**: 內建健康檢查端點

## 安全性考量 (Security Considerations)

1. **輸入驗證**: 檔案名稱和路徑驗證，防止目錄遍歷攻擊
2. **開發模式限制**: 編輯功能僅在開發環境啟用
3. **CORS 配置**: 精確的跨來源資源共享設定
4. **檔案類型檢查**: 上傳檔案類型驗證

## 未來規劃 (Future Enhancements)

1. **使用者認證**: 整合身份驗證系統
2. **評論系統**: 新增文章評論功能

## 疑難排解 (Troubleshooting)

### 常見問題

1. **開發模式編輯功能無法使用**

   - 確認是在 `localhost` 環境運行
   - 檢查 API 端點是否正確回應

2. **圖片上傳失敗**

   - 確認 `sharp` 套件正確安裝
   - 檢查檔案權限設定

3. **後端資料庫連接問題**
   - 檢查環境變數設定
   - 確認 PostgreSQL 服務正在運行

## 貢獻指南 (Contributing)

1. Fork 專案
2. 建立功能分支
3. 遵循程式碼風格 (ESLint/Go fmt)
4. 撰寫測試
5. 提交 Pull Request

## 授權 (License)

本專案為個人學習專案，歡迎參考學習。

---
