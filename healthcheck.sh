#!/bin/bash

# Health check script - runs every 30 seconds via cron
# Restarts backend if it's not responding

BACKEND_URL="http://127.0.0.1:3000/health"
TIMEOUT=5
LOG_FILE="/var/log/flashcharge-healthcheck.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Test backend health
if ! curl -s -m $TIMEOUT "$BACKEND_URL" > /dev/null 2>&1; then
    log "❌ Backend not responding - restarting..."
    pm2 restart flashcharge-backend
    sleep 3
    
    # Verify restart worked
    if curl -s -m $TIMEOUT "$BACKEND_URL" > /dev/null 2>&1; then
        log "✅ Backend restarted successfully"
    else
        log "⚠️ Backend restart failed - manual intervention needed"
    fi
else
    log "✅ Backend healthy"
fi
