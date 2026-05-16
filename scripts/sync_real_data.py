#!/usr/bin/env python3
"""
Sync real data from DEXScreener to Alpha Tracker database.
Run: python3 sync_real_data.py
Auto-run: cron every 5 minutes
"""

import sqlite3
import json
import httpx
import asyncio
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
DEXSCREENER_BASE = "https://api.dexscreener.com"

def get_db():
    return sqlite3.connect(DB_PATH)

def init_db():
    """Ensure tables exist"""
    db = get_db()
    db.execute("""CREATE TABLE IF NOT EXISTS Caller (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        name TEXT,
        platform TEXT DEFAULT 'x',
        avatarUrl TEXT,
        bio TEXT,
        score REAL DEFAULT 0,
        totalCalls INTEGER DEFAULT 0,
        correctCalls INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS AlphaCall (
        id TEXT PRIMARY KEY,
        tweetId TEXT,
        callerId TEXT,
        content TEXT,
        tokenName TEXT,
        chain TEXT,
        contractAddress TEXT,
        priceAtMention REAL,
        priceNow REAL,
        priceChange REAL,
        tweetUrl TEXT,
        mentionedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        scrapedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        tags TEXT,
        sentiment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.commit()
    db.close()

async def fetch_trending_tokens():
    """Fetch real trending tokens from DEXScreener"""
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            # Get latest token profiles
            resp = await client.get(f"{DEXSCREENER_BASE}/token-profiles/latest/v1")
            if resp.status_code != 200:
                return []
            data = resp.json()
            
            tokens = []
            items = (data if isinstance(data, list) else [])[:25]
            
            for item in items:
                chain = item.get("chainId", "")
                address = item.get("tokenAddress", "")
                if not address or not chain:
                    continue
                
                try:
                    # Get detailed pair data
                    price_resp = await client.get(f"{DEXSCREENER_BASE}/tokens/v1/{chain}/{address}")
                    if price_resp.status_code != 200:
                        continue
                    pairs = price_resp.json()
                    if not pairs or not isinstance(pairs, list) or len(pairs) == 0:
                        continue
                    
                    pair = pairs[0]
                    base = pair.get("baseToken", {})
                    created = pair.get("pairCreatedAt")
                    
                    age_hours = None
                    if created:
                        try:
                            if isinstance(created, (int, float)):
                                ct = datetime.fromtimestamp(created / 1000, tz=timezone.utc)
                                age_hours = (datetime.now(timezone.utc) - ct).total_seconds() / 3600
                        except:
                            pass
                    
                    tokens.append({
                        "name": base.get("name", ""),
                        "symbol": base.get("symbol", ""),
                        "chain": chain,
                        "address": address,
                        "price_usd": float(pair.get("priceUsd", 0)) if pair.get("priceUsd") else None,
                        "market_cap": pair.get("marketCap") or pair.get("fdv"),
                        "liquidity": pair.get("liquidity", {}).get("usd") if pair.get("liquidity") else None,
                        "volume_24h": pair.get("volume", {}).get("h24") if pair.get("volume") else None,
                        "price_change_24h": pair.get("priceChange", {}).get("h24") if pair.get("priceChange") else None,
                        "age_hours": age_hours,
                        "dex": pair.get("dexId"),
                        "url": pair.get("url") or item.get("url"),
                        "image": pair.get("info", {}).get("imageUrl") or item.get("icon"),
                    })
                except Exception as e:
                    continue
            
            return tokens
        except Exception as e:
            print(f"Error: {e}")
            return []

async def sync():
    """Main sync function"""
    init_db()
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Fetching real data from DEXScreener...")
    tokens = await fetch_trending_tokens()
    print(f"  Found {len(tokens)} tokens")
    
    if not tokens:
        print("  No tokens found, skipping")
        return
    
    db = get_db()
    
    # Ensure DEXScreener caller exists
    db.execute("""
        INSERT OR IGNORE INTO Caller (id, username, name, platform, score, totalCalls, correctCalls, createdAt, updatedAt)
        VALUES ('caller-dexscreener', 'DEXScreener', 'DEXScreener Auto-Feed', 'api', 90, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """)
    db.execute("UPDATE Caller SET totalCalls = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 'caller-dexscreener'", (len(tokens),))
    db.commit()
    
    created = 0
    for t in tokens:
        # Check if already exists
        existing = db.execute(
            "SELECT id FROM AlphaCall WHERE contractAddress = ? AND chain = ?",
            (t["address"], t["chain"].upper())
        ).fetchone()
        if existing:
            continue
        
        # Build content
        content = f"${t['symbol']} ({t['chain']})"
        if t.get("market_cap"):
            mc = t["market_cap"]
            content += f" | MCap: ${mc:,.0f}" if mc >= 1000 else f" | MCap: ${mc:.2f}"
        if t.get("liquidity"):
            liq = t["liquidity"]
            content += f" | Liq: ${liq:,.0f}" if liq >= 1000 else f" | Liq: ${liq:.2f}"
        if t.get("volume_24h"):
            vol = t["volume_24h"]
            content += f" | Vol24h: ${vol:,.0f}" if vol >= 1000 else f" | Vol24h: ${vol:.2f}"
        if t.get("price_change_24h") is not None:
            pc = t["price_change_24h"]
            content += f" | {'+' if pc >= 0 else ''}{pc:.1f}%"
        
        sentiment = "neutral"
        if t.get("price_change_24h"):
            if t["price_change_24h"] > 20: sentiment = "bullish"
            elif t["price_change_24h"] < -20: sentiment = "bearish"
        
        tags = ["auto-feed", "trending"]
        if t.get("age_hours") and t["age_hours"] < 24:
            tags.append("new")
        if t.get("market_cap") and t["market_cap"] < 100000:
            tags.append("micro-cap")
        
        call_id = f"call-{t['chain']}-{t['address'][:16]}-{int(datetime.now().timestamp())}"
        
        try:
            db.execute("""
                INSERT INTO AlphaCall (id, callerId, content, tokenName, chain, contractAddress, sentiment, tags, tweetUrl, mentionedAt, createdAt, updatedAt)
                VALUES (?, 'caller-dexscreener', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (call_id, content, t["symbol"], t["chain"].upper(), t["address"], sentiment, ",".join(tags), t.get("url")))
            created += 1
        except Exception as e:
            pass
    
    db.commit()
    db.close()
    print(f"  Created {created} new alpha calls")

if __name__ == "__main__":
    asyncio.run(sync())
