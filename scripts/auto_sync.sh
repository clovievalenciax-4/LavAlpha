#!/bin/bash
# Auto-sync real data every 5 minutes
cd /root/.openclaw/workspace/alpha-tracker
while true; do
    python3 scripts/sync_real_data.py 2>&1 >> /tmp/alpha-sync.log
    sleep 300
done
