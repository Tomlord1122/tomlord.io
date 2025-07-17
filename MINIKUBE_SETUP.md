# Minikube 前端設置指南

這個指南會幫助你設置前端連接到在 Minikube 中運行的後端。

## 🚀 快速開始

### 1. 確保後端在 Minikube 中運行

首先確保你的後端已經在 Minikube 中部署並運行：

```bash
# 檢查後端服務狀態
kubectl get pods -n tomlord-io
kubectl get svc -n tomlord-io

# 如果沒有運行，部署後端
cd ../tomlord.io-backend
./scripts/deploy-minikube.sh
```

### 2. 設置前端環境

在前端目錄中運行設置腳本：

```bash
cd tomlord.io
chmod +x scripts/setup-minikube-frontend.sh
./scripts/setup-minikube-frontend.sh
```

這個腳本會：
- 自動獲取 Minikube IP 和 NodePort
- 創建 `.env` 文件，配置正確的後端 URL
- 更新 `package.json` 添加 `dev:minikube` 腳本
- 測試後端連接性

### 3. 啟動前端開發服務器

```bash
pnpm dev:minikube
```

### 4. 訪問應用

打開瀏覽器訪問：http://localhost:5173

## 🔧 手動配置

如果你想要手動配置，可以按照以下步驟：

### 1. 獲取 Minikube 信息

```bash
# 獲取 Minikube IP
minikube ip

# 獲取 NodePort
kubectl get svc tomlord-io-backend-service -n tomlord-io -o jsonpath='{.spec.ports[0].nodePort}'
```

### 2. 創建 .env 文件

在 `tomlord.io/` 目錄中創建 `.env` 文件：

```env
# Frontend Environment Variables for Minikube Deployment

# Backend API Configuration for Minikube
PUBLIC_BACKEND_URL=http://<MINIKUBE_IP>:<NODEPORT>
PUBLIC_BACKEND_WS_URL=ws://<MINIKUBE_IP>:<NODEPORT>

# Environment
PUBLIC_APP_ENV=minikube

# Analytics (optional)
PUBLIC_VERCEL_ANALYTICS_ID=

# OAuth Redirect URL (for frontend callback handling)
PUBLIC_OAUTH_REDIRECT_URL=http://localhost:5173

# Feature Flags
PUBLIC_ENABLE_EDIT_MODE=true
PUBLIC_ENABLE_COMMENTS=true
PUBLIC_ENABLE_WEBSOCKET=true
```

### 3. 更新 package.json

在 `package.json` 的 `scripts` 部分添加：

```json
{
  "scripts": {
    "dev": "vite dev",
    "dev:minikube": "vite dev --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 🧪 測試連接

### 1. 檢查 API 連接

在瀏覽器開發者工具中：
1. 打開 Network 標籤
2. 刷新頁面
3. 檢查 API 請求是否指向正確的 Minikube URL

### 2. 檢查 WebSocket 連接

1. 打開瀏覽器開發者工具
2. 進入 Console 標籤
3. 查看 WebSocket 連接日誌
4. 應該看到類似這樣的日誌：
   ```
   Connecting to WebSocket...
   WebSocket connected successfully
   ```

### 3. 測試功能

- 嘗試登入（OAuth）
- 嘗試發表評論
- 檢查實時更新是否正常工作

## 🚨 故障排除

### CORS 錯誤

如果遇到 CORS 錯誤：

1. 檢查後端 CORS 配置是否包含 `localhost:5173`
2. 確認後端環境變量 `APP_ENV=minikube`
3. 檢查 `ALLOWED_ORIGINS` 是否包含正確的域名

### WebSocket 連接失敗

1. 檢查後端日誌：
   ```bash
   kubectl logs -n tomlord-io -l app=tomlord-io-backend
   ```

2. 確認 WebSocket URL 正確：
   ```bash
   echo "ws://$(minikube ip):$(kubectl get svc tomlord-io-backend-service -n tomlord-io -o jsonpath='{.spec.ports[0].nodePort}')/ws"
   ```

3. 測試 WebSocket 連接：
   ```bash
   # 安裝 wscat
   npm install -g wscat
   
   # 測試連接
   wscat -c "ws://$(minikube ip):$(kubectl get svc tomlord-io-backend-service -n tomlord-io -o jsonpath='{.spec.ports[0].nodePort}')/ws"
   ```

### IP 地址變更

如果 Minikube IP 變更了：

1. 重新運行設置腳本：
   ```bash
   ./scripts/setup-minikube-frontend.sh
   ```

2. 或者手動更新 `.env` 文件中的 URL

### 端口變更

如果 NodePort 變更了：

1. 檢查新的 NodePort：
   ```bash
   kubectl get svc tomlord-io-backend-service -n tomlord-io
   ```

2. 更新 `.env` 文件中的端口號

## 📝 環境變量說明

| 變量 | 說明 | 範例 |
|------|------|------|
| `PUBLIC_BACKEND_URL` | 後端 API 基礎 URL | `http://192.168.49.2:30457` |
| `PUBLIC_BACKEND_WS_URL` | WebSocket 基礎 URL | `ws://192.168.49.2:30457` |
| `PUBLIC_APP_ENV` | 應用環境 | `minikube` |
| `PUBLIC_OAUTH_REDIRECT_URL` | OAuth 回調 URL | `http://localhost:5173` |

## 🔄 更新配置

當你需要更新配置時：

1. 重新運行設置腳本：
   ```bash
   ./scripts/setup-minikube-frontend.sh
   ```

2. 或者手動編輯 `.env` 文件

3. 重新啟動前端開發服務器：
   ```bash
   pnpm dev:minikube
   ```

## 🎯 下一步

設置完成後，你可以：

1. 開發新功能
2. 測試現有功能
3. 調試問題
4. 準備生產部署

記住，這個設置只適用於開發和測試。生產環境需要不同的配置。 