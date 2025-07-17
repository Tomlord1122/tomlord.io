# 前端部署檢查清單 (Vercel)

## ✅ 部署前準備

### 1. 環境變數配置

- [ ] 複製 `.env.example` 為 `.env`
- [ ] 在 Vercel Dashboard 設置環境變數:
  - [ ] `PUBLIC_BACKEND_URL` - 後端 API URL
  - [ ] `PUBLIC_BACKEND_WS_URL` - WebSocket URL
  - [ ] `PUBLIC_APP_ENV=production`
  - [ ] `PUBLIC_OAUTH_REDIRECT_URL` - 前端回調 URL
  - [ ] `PUBLIC_ENABLE_EDIT_MODE=false` (生產環境)
  - [ ] `PUBLIC_ENABLE_COMMENTS=true`
  - [ ] `PUBLIC_ENABLE_WEBSOCKET=true`

### 2. 代碼更新

- [ ] 更新所有硬編碼的 `localhost:8080` 為 `config.API`
- [ ] 檢查 `src/lib/stores/auth.svelte.ts`
- [ ] 檢查 `src/lib/stores/websocket.svelte.ts`
- [ ] 檢查 `src/lib/components/CommentForm.svelte`
- [ ] 檢查 `src/routes/blog/+layout.server.ts`

### 3. Vercel 配置

- [ ] 創建 `vercel.json` 配置文件
- [ ] 設置正確的 build 命令: `pnpm build`
- [ ] 設置 Node.js 版本: 18.x 或更高

### 4. OAuth 配置

- [ ] 在 Google Cloud Console 更新回調 URL
- [ ] 添加 Vercel 域名到授權域名列表

## 🚀 部署步驟

1. **連接 Git Repository**

   ```bash
   # 確保代碼已推送到 main branch
   git add .
   git commit -m "feat: prepare for production deployment"
   git push origin main
   ```

2. **Vercel Dashboard 配置**

   - 連接 GitHub repository
   - 設置 Framework Preset: SvelteKit
   - 配置環境變數
   - 設置 Build Command: `pnpm build`
   - 設置 Output Directory: `.svelte-kit/output`

3. **部署後驗證**
   - [ ] 檢查首頁加載正常
   - [ ] 測試 OAuth 登入功能
   - [ ] 測試評論系統
   - [ ] 測試 WebSocket 連接
   - [ ] 檢查所有圖片和資源加載

## 🔧 本地新增文章同步到生產環境

### 解決方案 1: API 同步 (推薦)

```typescript
// 在本地開發時，新文章會通過以下流程同步:
// 1. 本地新增文章 → 前端 NewPostModal
// 2. 調用 /api/add-post → 後端 POST /api/blogs
// 3. 後端將文章保存到生產數據庫
// 4. 前端從後端 API 讀取文章列表
```

### 解決方案 2: Git + Webhook (備選)

- [ ] 設置 GitHub webhook 觸發重新部署
- [ ] 確保 markdown 文件變更觸發構建

### 當前狀況檢查

- [ ] 確認 `src/routes/blog/+layout.server.ts` 優先從後端 API 載入
- [ ] 確認新文章會同時保存到本地和後端數據庫
- [ ] 測試本地新增文章是否出現在生產環境

## 🚨 常見問題排解

### CORS 錯誤

- 檢查後端 CORS 設置是否包含 Vercel 域名
- 確保環境變數 `ALLOWED_ORIGINS` 正確設置

### OAuth 失敗

- 檢查 Google OAuth 回調 URL 配置
- 確認 `PUBLIC_OAUTH_REDIRECT_URL` 正確

### API 連接失敗

- 檢查 `PUBLIC_BACKEND_URL` 環境變數
- 確認後端服務正常運行
- 檢查網絡連接和 DNS 解析

### WebSocket 連接失敗

- 檢查 `PUBLIC_BACKEND_WS_URL` 環境變數
- 確認使用 `wss://` 而非 `ws://` (HTTPS 環境)
- 檢查防火牆和代理設置
