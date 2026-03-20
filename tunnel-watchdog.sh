#!/bin/bash
# Auto-restart ngrok tunnel for OpenClaw
# Run on boot to keep the tunnel active

NGROK_PATH="$HOME/bin/ngrok"
OPENCLAW_PORT=18789
LOG_FILE="$HOME/ngrok-tunnel.log"

echo "$(date): Starting OpenClaw tunnel..." >> "$LOG_FILE"

while true; do
    # Kill existing ngrok processes
    pkill -f "ngrok http" 2>/dev/null
    
    # Start ngrok tunnel
    $NGROK_PATH http $OPENCLAW_PORT >> "$LOG_FILE" 2>&1 &
    
    # Wait for tunnel to establish
    sleep 10
    
    # Get tunnel URL
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok-free\.app' | head -1)
    
    if [ -n "$TUNNEL_URL" ]; then
        echo "$(date): Tunnel active at $TUNNEL_URL" >> "$LOG_FILE"
        
        # Update website env with new URL
        sed -i "s|OPENCLAW_PUBLIC_URL=.*|OPENCLAW_PUBLIC_URL=$TUNNEL_URL|" "$HOME/ai-stack-website/.env.local" 2>/dev/null
        
        echo "$(date): Website updated with new tunnel URL" >> "$LOG_FILE"
    else
        echo "$(date): Failed to get tunnel URL, retrying..." >> "$LOG_FILE"
    fi
    
    # Wait before checking again (1 hour)
    sleep 3600
done
