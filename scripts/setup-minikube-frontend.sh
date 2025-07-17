#!/bin/bash

# Frontend Minikube Setup Script
# This script helps configure the frontend to connect to the backend running in Minikube

echo "🔧 Frontend Minikube Setup Script"
echo "================================="

# Check if we're in the frontend directory
if [ ! -f "package.json" ] || [ ! -f "svelte.config.js" ]; then
    echo "❌ Error: This script must be run from the frontend directory (tomlord.io/)"
    exit 1
fi

# Get Minikube IP
echo "📍 Getting Minikube IP..."
MINIKUBE_IP=$(minikube ip)
if [ -z "$MINIKUBE_IP" ]; then
    echo "❌ Error: Could not get Minikube IP. Is Minikube running?"
    echo "Try running: minikube start"
    exit 1
fi
echo "✅ Minikube IP: $MINIKUBE_IP"

# Get NodePort
echo "🔌 Getting NodePort..."
NODEPORT=$(kubectl get svc tomlord-io-backend-service -n tomlord-io -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null)
if [ -z "$NODEPORT" ]; then
    echo "❌ Error: Could not get NodePort. Is the backend service deployed?"
    echo "Try running: kubectl get svc -n tomlord-io"
    exit 1
fi
echo "✅ NodePort: $NODEPORT"

# Construct URLs
BACKEND_URL="http://$MINIKUBE_IP:$NODEPORT"
WS_URL="ws://$MINIKUBE_IP:$NODEPORT"

echo ""
echo "🔗 Generated URLs:"
echo "Backend API: $BACKEND_URL"
echo "WebSocket: $WS_URL"

# Test backend connectivity
echo ""
echo "🌐 Testing backend connectivity..."
if curl -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend is accessible"
else
    echo "⚠️  Warning: Backend might not be accessible. Check if the service is running."
fi

# Create .env file for Minikube
echo ""
echo "📝 Creating .env file for Minikube..."
cat > .env << EOF
# Frontend Environment Variables for Minikube Deployment

# Backend API Configuration for Minikube
PUBLIC_BACKEND_URL=$BACKEND_URL
PUBLIC_BACKEND_WS_URL=$WS_URL

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
EOF

echo "✅ Created .env file with Minikube configuration"

# Update package.json scripts for Minikube
echo ""
echo "📦 Updating package.json scripts..."
if [ -f "package.json" ]; then
    # Check if minikube script already exists
    if ! grep -q '"dev:minikube"' package.json; then
        # Add minikube script to package.json
        sed -i.bak 's/"dev": "vite dev"/"dev": "vite dev",\n    "dev:minikube": "vite dev --host 0.0.0.0"/' package.json
        echo "✅ Added dev:minikube script to package.json"
    else
        echo "ℹ️  dev:minikube script already exists in package.json"
    fi
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Start the frontend development server:"
echo "   pnpm dev:minikube"
echo ""
echo "2. Open your browser to: http://localhost:5173"
echo ""
echo "3. Test the connection by:"
echo "   - Opening browser dev tools"
echo "   - Going to Network tab"
echo "   - Checking if API calls go to: $BACKEND_URL"
echo "   - Checking if WebSocket connects to: $WS_URL"
echo ""
echo "4. If you need to update the configuration later, run this script again"
echo ""
echo "🚨 Troubleshooting:"
echo "- If you get CORS errors, make sure the backend CORS is configured for localhost:5173"
echo "- If WebSocket fails, check the backend logs: kubectl logs -n tomlord-io -l app=tomlord-io-backend"
echo "- If the IP changes, run this script again to update the configuration" 