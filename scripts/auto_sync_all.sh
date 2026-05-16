#!/bin/bash
# Auto-sync: DEXScreener + Fresh Projects with smart followers
cd /root/.openclaw/workspace/alpha-tracker

while true; do
    echo "[$(date)] Syncing DEXScreener..."
    python3 scripts/sync_real_data.py 2>&1 >> /tmp/alpha-sync.log
    
    echo "[$(date)] Discovering fresh projects..."
    python3 scraper/fresh_project_scraper.py 2>&1 >> /tmp/alpha-fresh.log
    
    echo "[$(date)] Sync complete. Sleeping 30min..."
    sleep 1800
done
