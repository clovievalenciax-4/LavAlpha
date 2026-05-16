#!/usr/bin/env python3
"""
Alpha Project Scraper - Scrape early crypto projects from X KOLs
Uses CloakBrowser persistent profile with X login
"""

import json
import re
import time
import sqlite3
import os
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
PROFILE_PATH = "/root/.openclaw/workspace/x-cloak-profiles/clovieval"

# KOL accounts to monitor - actual alpha callers, not randoms
KOL_ACCOUNTS = [
    # Tier 1 - High signal
    {"username": "CryptoKaleo", "tier": 1, "focus": "narratives"},
    {"username": "inversebrah", "tier": 1, "focus": "macro"},
    {"username": "HsakaTrades", "tier": 1, "focus": "trading"},
    {"username": "CryptoHayes", "tier": 1, "focus": "defi"},
    {"username": "Pentosh1", "tier": 1, "focus": "defi"},
    {"username": "daborocollector", "tier": 1, "focus": "nft"},
    {"username": "nftdegentral", "tier": 1, "focus": "nft"},
    {"username": "Pranksy", "tier": 1, "focus": "nft"},
    {"username": "DeFiMaestro", "tier": 1, "focus": "defi"},
    {"username": "TheBlockCrypto", "tier": 1, "focus": "news"},
    {"username": "Cobie", "tier": 1, "focus": "alpha"},
    {"username": "lightcrypto", "tier": 1, "focus": "defi"},
    {"username": "CryptoGucci", "tier": 1, "focus": "narratives"},
    {"username": "DegenSpartan", "tier": 1, "focus": "degens"},
    # Tier 2 - Good signal
    {"username": "CryptoQuant_com", "tier": 2, "focus": "data"},
    {"username": "whale_hunter", "tier": 2, "focus": "whales"},
    {"username": "GemHunterETH", "tier": 2, "focus": "gems"},
    {"username": "solana_daily", "tier": 2, "focus": "solana"},
    {"username": "base_daily", "tier": 2, "focus": "base"},
    {"username": "arbitrum", "tier": 2, "focus": "l2"},
    {"username": "BNBCHAIN", "tier": 2, "focus": "bsc"},
    {"username": "MessariCrypto", "tier": 2, "focus": "research"},
    {"username": "DefiIgnas", "tier": 2, "focus": "defi"},
    {"username": "Route2FI", "tier": 2, "focus": "defi"},
]

# NFT focused
NFT_ACCOUNTS = [
    {"username": "daborocollector", "tier": 1},
    {"username": "nftdegentral", "tier": 1},
    {"username": "Pranksy", "tier": 1},
    {"username": "NFTgator", "tier": 2},
    {"username": "Zeneca", "tier": 2},
    {"username": "punk6529", "tier": 2},
    {"username": "cozomoMedici", "tier": 2},
]

# Early project keywords
PROJECT_KEYWORDS = [
    "launching", "launched", "just launched", "going live", "live on",
    "announcing", "announcement", "new project", "new protocol",
    "seed round", "series a", "series b", "raised", "funding",
    "backed by", "backing", "investors", "invested",
    "testnet", "mainnet", "deployed", "minting", "mint live",
    "whitelist", "allowlist", "presale", "ido", "ido launch",
    "airdrop", "token launch", "genesis", "season 1",
    "partnership", "partnered with", "integration",
    "new chain", "new L2", "new L1",
    "first look", "sneak peek", "alpha thread",
    "👀", "🚀", "🔥", "BREAKING",
]

# VC / Investor names to detect
KNOWN_VCS = [
    "a16z", "andreessen horowitz", "paradigm", "sequoia", "coinbase ventures",
    "binance labs", "jump crypto", "multicoin", "polychain", "dragonfly",
    "pantera", "galaxy digital", "framework ventures", "delphi digital",
    "three arrows", "wintermute", "alameda", "ftx ventures",
    "animoca brands", "yugalabs", "the sandbox",
    "hashed", "samsung ventures", "tiger global",
    "circle", "electric capital", "placeholder",
    "variant fund", "1confirmation", "standard crypto",
    "robot ventures", "parafi capital", "lemniscap",
    "cms holdings", "amber group", "okx ventures",
    "kucoin ventures", "gate ventures", "bybit ventures",
    "arbitrum foundation", "optimism foundation", "base ecosystem fund",
    "solana ventures", "solana foundation",
    "hack vc", "crypto.com capital", "bitkraft",
]

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("""CREATE TABLE IF NOT EXISTS AlphaProject (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        chain TEXT,
        category TEXT,
        website TEXT,
        twitter TEXT,
        discord TEXT,
        contractAddress TEXT,
        vcs TEXT,
        backers TEXT,
        fundingStage TEXT,
        fundingAmount TEXT,
        launchDate TEXT,
        stage TEXT,
        score REAL DEFAULT 0,
        tweetUrl TEXT,
        mentionedBy TEXT,
        mentionedAt DATETIME,
        tags TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS ScrapeLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        status TEXT,
        itemsFound INTEGER DEFAULT 0,
        error TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.commit()
    db.close()

def extract_projects_from_tweet(text: str) -> list:
    """Extract project mentions from tweet text"""
    projects = []
    text_lower = text.lower()
    
    # Check if it's about an early project
    is_project = any(kw in text_lower for kw in PROJECT_KEYWORDS)
    
    # Extract contract addresses (ETH/SOL/BNB)
    eth_addrs = re.findall(r'0x[a-fA-F0-9]{40}', text)
    sol_addrs = re.findall(r'[1-9A-HJ-NP-Za-km-z]{32,44}(?:pump)', text)
    
    # Extract URLs
    urls = re.findall(r'https?://[^\s]+', text)
    
    # Extract $tickers
    tickers = re.findall(r'\$([A-Z]{2,10})', text)
    
    # Extract project names (capitalized words near keywords)
    project_names = []
    for kw in ["launching", "launched", "announcing", "new project", "new protocol"]:
        idx = text_lower.find(kw)
        if idx >= 0:
            # Get words after keyword
            after = text[idx+len(kw):].strip()[:100]
            # Look for capitalized words
            caps = re.findall(r'\b([A-Z][a-zA-Z0-9]+)\b', after)
            project_names.extend(caps[:3])
    
    # Detect VCs mentioned
    vcs = []
    for vc in KNOWN_VCS:
        if vc.lower() in text_lower:
            vcs.append(vc)
    
    # Detect stage
    stage = "unknown"
    for s in ["testnet", "mainnet", "seed", "presale", "ido", "launch", "beta", "alpha"]:
        if s in text_lower:
            stage = s
            break
    
    return {
        "is_project": is_project or bool(eth_addrs or sol_addrs),
        "project_names": project_names,
        "tickers": tickers,
        "contracts": eth_addrs + sol_addrs,
        "urls": urls,
        "vcs": vcs,
        "stage": stage,
        "full_text": text,
    }

def scrape_kol_tweets(page, username: str, max_tweets: int = 10) -> list:
    """Scrape recent tweets from a KOL"""
    tweets = []
    try:
        url = f"https://x.com/{username}"
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)
        
        # Get all tweet texts at page level (more reliable than nested)
        text_els = page.query_selector_all('[data-testid="tweetText"]')
        time_els = page.query_selector_all('article[data-testid="tweet"] time')
        
        for i in range(min(len(text_els), max_tweets)):
            try:
                text = text_els[i].inner_text()
                tweet_url = None
                timestamp = None
                
                if i < len(time_els):
                    timestamp = time_els[i].get_attribute('datetime')
                    href = time_els[i].evaluate('el => el.closest("a")?.href || null')
                    if href:
                        tweet_url = href
                
                if text:
                    tweets.append({
                        "text": text,
                        "url": tweet_url,
                        "timestamp": timestamp,
                        "author": username,
                    })
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"  Error scraping @{username}: {e}")
    
    return tweets

def scrape_kol_profile(page, username: str) -> dict:
    """Get KOL profile info"""
    try:
        url = f"https://x.com/{username}"
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        time.sleep(2)
        
        bio = ""
        followers = 0
        bio_el = page.query_selector('[data-testid="UserDescription"]')
        if bio_el:
            bio = bio_el.inner_text()
        
        # Get follower count
        follower_links = page.query_selector_all('a[href*="/followers"]')
        for fl in follower_links:
            txt = fl.inner_text()
            nums = re.findall(r'[\d,.]+[KMB]?', txt)
            if nums:
                follower_str = nums[0].replace(',', '')
                if 'K' in follower_str:
                    followers = int(float(follower_str.replace('K', '')) * 1000)
                elif 'M' in follower_str:
                    followers = int(float(follower_str.replace('M', '')) * 1000000)
                elif 'B' in follower_str:
                    followers = int(float(follower_str.replace('B', '')) * 1000000000)
                else:
                    followers = int(float(follower_str))
                break
        
        return {"bio": bio, "followers": followers}
    except Exception as e:
        return {"bio": "", "followers": 0}

def main():
    init_db()
    db = sqlite3.connect(DB_PATH)
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting Alpha Project Scraper...")
    print(f"  Profile: {PROFILE_PATH}")
    print(f"  KOLs: {len(KOL_ACCOUNTS)}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            PROFILE_PATH,
            headless=True,
            args=['--no-sandbox', '--disable-blink-features=AutomationControlled'],
            viewport={"width": 1280, "height": 800},
            user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        )
        
        page = browser.pages[0] if browser.pages else browser.new_page()
        
        # Check if logged in
        page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=15000)
        time.sleep(2)
        
        is_logged_in = "login" not in page.url.lower() and "log in" not in page.url.lower()
        print(f"  Logged in: {is_logged_in}")
        
        if not is_logged_in:
            print("  NOT LOGGED IN - using fallback methods")
            browser.close()
            # Use fallback
            fallback_scrape(db)
            db.close()
            return
        
        # Scrape each KOL
        all_projects = []
        
        for kol in KOL_ACCOUNTS[:15]:  # Limit to 15 to avoid rate limit
            username = kol["username"]
            tier = kol["tier"]
            focus = kol.get("focus", "general")
            
            print(f"\n  Scraping @{username} (T{tier}, {focus})...")
            
            try:
                tweets = scrape_kol_tweets(page, username, max_tweets=8)
                print(f"    Found {len(tweets)} tweets")
                
                for tw in tweets:
                    project_info = extract_projects_from_tweet(tw["text"])
                    
                    if project_info["is_project"] or project_info["tickers"] or project_info["contracts"]:
                        all_projects.append({
                            **project_info,
                            "tweet_url": tw["url"],
                            "tweet_timestamp": tw["timestamp"],
                            "mentioned_by": username,
                            "kol_tier": tier,
                            "kol_focus": focus,
                        })
                        
                        print(f"    🎯 Project found: {project_info['project_names'] or project_info['tickers'] or project_info['contracts']}")
                
                time.sleep(2)  # Rate limit
                
            except Exception as e:
                print(f"    Error: {e}")
                continue
        
        browser.close()
    
    # Save to database
    print(f"\n  Saving {len(all_projects)} projects to database...")
    
    created = 0
    for proj in all_projects:
        # Check if already exists
        name = proj["project_names"][0] if proj["project_names"] else (proj["tickers"][0] if proj["tickers"] else "")
        if not name:
            continue
        
        existing = db.execute(
            "SELECT id FROM AlphaProject WHERE name = ? OR (tweetUrl = ? AND tweetUrl IS NOT NULL)",
            (name, proj.get("tweet_url"))
        ).fetchone()
        
        if existing:
            continue
        
        proj_id = f"proj-{name.lower()}-{int(datetime.now().timestamp())}"
        
        try:
            db.execute("""
                INSERT INTO AlphaProject (id, name, description, chain, category, vcs, backers, fundingStage, stage, score, tweetUrl, mentionedBy, mentionedAt, tags, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                proj_id,
                name,
                proj["full_text"][:500],
                detect_chain(proj["full_text"]),
                proj["kol_focus"],
                ",".join(proj["vcs"]) if proj["vcs"] else None,
                proj["mentioned_by"],
                proj["stage"] if proj["stage"] != "unknown" else None,
                proj["stage"],
                tier_to_score(proj["kol_tier"]),
                proj.get("tweet_url"),
                proj["mentioned_by"],
                proj.get("tweet_timestamp"),
                ",".join(proj["tickers"] + proj["contracts"][:1]),
            ))
            created += 1
        except Exception as e:
            print(f"    DB Error: {e}")
    
    db.commit()
    
    # Log
    db.execute("INSERT INTO ScrapeLog (source, status, itemsFound) VALUES (?, ?, ?)",
               ("x-kol-scraper", "success", created))
    db.commit()
    
    print(f"\n  ✅ Created {created} new alpha projects")
    db.close()

def detect_chain(text: str) -> str:
    text_lower = text.lower()
    if "solana" in text_lower or "$sol" in text_lower or ".sol" in text_lower:
        return "SOLANA"
    if "ethereum" in text_lower or "$eth" in text_lower or "0x" in text_lower:
        return "ETHEREUM"
    if "base" in text_lower:
        return "BASE"
    if "bsc" in text_lower or "bnb" in text_lower or "binance" in text_lower:
        return "BSC"
    if "arbitrum" in text_lower or "arb" in text_lower:
        return "ARBITRUM"
    if "avalanche" in text_lower or "avax" in text_lower:
        return "AVALANCHE"
    return "MULTI"

def tier_to_score(tier: int) -> float:
    if tier == 1: return 90
    if tier == 2: return 70
    return 50

def fallback_scrape(db):
    """Fallback: scrape without X login using public data"""
    print("  Using fallback: public data sources...")
    # TODO: implement public API fallback
    pass

if __name__ == "__main__":
    main()
