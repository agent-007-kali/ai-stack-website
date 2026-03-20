#!/bin/bash
# OpenClaw Tunnel Setup Script
# Run this to expose OpenClaw for the website

echo "==================================="
echo "OpenClaw Tunnel Setup"
echo "==================================="

# Check if ngrok is installed
if ! command -v ~/bin/ngrok &> /dev/null; then
    echo "Installing ngrok..."
    mkdir -p ~/bin
    curl -fsSL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz | tar -xz -C ~/bin
fi

# Check for authtoken
NGROK_CONFIG="$HOME/.config/ngrok/ngrok.yml"
if [ ! -f "$NGROK_CONFIG" ]; then
    echo ""
    echo "⚠️  Ngrok authtoken required!"
    echo "1. Go to https://dashboard.ngrok.com"
    echo "2. Copy your authtoken"
    echo "3. Run: ~/bin/ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    read -p "Enter your ngrok authtoken (or press Enter to use built-in AI): " token
    
    if [ -n "$token" ]; then
        mkdir -p ~/.config/ngrok
        ~/bin/ngrok config add-authtoken "$token"
    fi
fi

echo ""
echo "Starting ngrok tunnel to OpenClaw..."
echo ""

# Start ngrok tunnel
~/bin/ngrok http 18789 --log=stdout > ~/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 5

# Get the tunnel URL
TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null)

if [ -z "$TUNNEL_URL" ] || [ "$TUNNEL_URL" = "null" ]; then
    echo "Failed to get tunnel URL. Check ~/ngrok.log for errors."
    echo ""
    echo "The website will use built-in AI responses as fallback."
    echo "To manually connect later, run:"
    echo "  ~/bin/ngrok http 18789"
    echo "Then update OPENCLAW_API_URL in .env.local with the https:// URL"
else
    echo ""
    echo "✅ Tunnel established!"
    echo "   URL: $TUNNEL_URL"
    echo ""
    echo "To use this with the website, update:"
    echo "   OPENCLAW_API_URL=$TUNNEL_URL"
    echo ""
    echo "Or run this command to update automatically:"
    echo "   sed -i 's|OPENCLAW_API_URL=.*|OPENCLAW_API_URL=$TUNNEL_URL|' ~/ai-stack-website/.env.local"
fi

echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

# Wait for user interrupt
wait $NGROK_PID
