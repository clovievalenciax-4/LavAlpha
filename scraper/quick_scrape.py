#!/usr/bin/env python3
"""Quick scrape - one cycle, used by web UI"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from daemon import init_db, main_cycle, log_event
import sqlite3
from playwright.sync_api import sync_playwright

def main():
    init_db()
    log_event("QUICK_SCRAPE", "Starting quick scrape from web UI")
    
    db = sqlite3.connect(os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db"), timeout=10)
    
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            '/root/.openclaw/workspace/x-cloak-profiles/clovieval',
            headless=True,
            args=['--no-sandbox', '--disable-blink-features=AutomationControlled'],
            viewport={"width": 1280, "height": 800},
            user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        )
        page = browser.pages[0]
        page.goto('https://x.com/home', wait_until='domcontentloaded', timeout=30000)
        import time; time.sleep(2)
        
        new_projects, kol_mentions = main_cycle(page, db)
        browser.close()
    
    log_event("QUICK_DONE", f"Done: {new_projects} projects, {kol_mentions} KOL mentions")
    db.close()
    print(f"Done: {new_projects} new projects, {kol_mentions} KOL mentions")

if __name__ == "__main__":
    main()
