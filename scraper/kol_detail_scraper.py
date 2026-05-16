#!/usr/bin/env python3
"""
Smart Follower Detail Scraper — Get REAL data for each KOL
Scrapes KOL profile: followers count, following count, recent activity
"""

import re, time, sqlite3, os
from datetime import datetime
from playwright.sync_api import sync_playwright

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
PROFILE_PATH = "/root/.openclaw/workspace/x-cloak-profiles/clovieval"

# KOL list with expected real data
KOL_ACCOUNTS = [
    # OG Alpha Callers
    "CryptoHayes", "Cobie", "CryptoKaleo", "Pentosh1", "inversebrah",
    "HsakaTrades", "lightcrypto", "CryptoGucci", "DegenSpartan", "DeFiMaestro",
    "DonAlt", "CryptoCred", "Tradermayne", "AltcoinPsycho", "CryptoGodJohn",
    "BigCheds", "Nebraskangooner", "IncomeSharks", "RookieXBT", "TheFlowHorse",
    "CL207", "ColdBloodShill", "Tree_of_Alpha", "CryptoWizardd", "crypto_bitlord7",
    "EmperorBTC", "SalsaTekila", "CoinMamba", "Ninjascalp", "gainzy222",
    "0xSisyphus", "hentaiavenger66", "ledgerstatus", "udiWertheimer", "ByzGeneral",
    "tradingstable", "jimtalbot", "paurooteri", "GarrettBullish", "Trader_XO",
    
    # NFT/Art Alpha
    "Pranksy", "NFTgator", "Zeneca_33", "punk6529", "cozomoMedici",
    "wilborocollector", "VonMises14", "jenaborocollector", "daborocollector",
    "degenhola", "NFT_Eth", "BoredApeYC", "CryptoPunks",
    "kaborocollector", "NFTGod", "DCFilogy", "Loopifyyy",
    "artblocks_io", "fx_hash_",
    
    # DeFi Researchers
    "DefiIgnas", "Route2FI", "TheDeFiEdge", "DeFi_Made_Here",
    "0xminion", "DeFi_Dad", "sassal0x", "CamiRusso", "DefiLlama",
    "TheBlockResearch", "tokenterminal", "mhonkasalo", "feindura",
    
    # VCs & Funds
    "a16zcrypto", "paradigm", "cbventures", "binance",
    "jumpcrypto", "multicoincap", "polychain", "dragonfly_xyz",
    "PanteraCapital", "Delphi_Digital", "hashed_official",
    "ElectricCapital", "robotventures", "standardcrypto",
    "nascentxyz", "variantfund", "a_capital", "PlaceholderVC",
    "BinanceLabs",
    
    # Data/Analytics
    "MessariCrypto", "CryptoQuant_com", "GemHunterETH",
    "Nansen_ai", "DuneAnalytics", "whale_hunter",
    "lookonchain", "TheBlockCrypto", "coingecko",
    
    # L1/L2 Foundations
    "arbitrum", "OptimismFND", "base", "solana",
    "Avax", "0xPolygon", "SuiNetwork", "Aptos",
    "Starknet", "zksync", "Scroll_ZKP", "LineaBuild",
    
    # Smart Money / Whale Trackers
    "whale_alert", "0xngmi", "CryptoWhaleBot", "EtherVista",
    "DeSpread_io", "ArkhamIntel", "bubblemaps",
    
    # Indonesian Crypto KOLs
    "crypto_news_id", "AirdropIndo", "CryptocurrencyID",
    "cryptoworld_ind", "IDCryptoNews", "indodax",
    "tokocrypto", "pintu_id", "rekeningku",
    "DiditMulyadi", "handoko_tan", "CryptoBlines",
    
    # AI/Crypto
    "aixbt_agent", "AITradingBot", "AIphaTrader", "AI_Crypto_",
    
    # Meme/Community Alpha
    "MuradMahsud", "Unipcs", "SolanaLegend",
    "Bonk_Inu", "JupiterExchange", "RaydiumProtocol",
]


def scrape_kol_profile(page, username):
    info = {'username': username, 'followers': 0, 'following': 0, 'tweets': 0, 'verified': False}
    try:
        page.goto(f'https://x.com/{username}', wait_until='domcontentloaded', timeout=30000)
        time.sleep(5)
        body = page.evaluate('() => document.body.innerText')

        # Parse followers: "791.4K Followers" or "1,234,567 Followers"
        fm = re.search(r'([\d,.]+[KMB]?)\s*Followers', body)
        if fm:
            val = fm.group(1).replace(',', '')
            if 'K' in val: info['followers'] = int(float(val.replace('K', '')) * 1000)
            elif 'M' in val: info['followers'] = int(float(val.replace('M', '')) * 1000000)
            elif 'B' in val: info['followers'] = int(float(val.replace('B', '')) * 1000000000)
            else: info['followers'] = int(float(val))

        # Parse following: "29 Following"
        fom = re.search(r'([\d,.]+[KMB]?)\s*Following', body)
        if fom:
            val = fom.group(1).replace(',', '')
            if 'K' in val: info['following'] = int(float(val.replace('K', '')) * 1000)
            else: info['following'] = int(float(val))

        # Parse posts: "2,578 posts"
        pm = re.search(r'([\d,.]+[KMB]?)\s*posts', body, re.IGNORECASE)
        if pm:
            val = pm.group(1).replace(',', '')
            if 'K' in val: info['tweets'] = int(float(val.replace('K', '')) * 1000)
            elif 'M' in val: info['tweets'] = int(float(val.replace('M', '')) * 1000000)
            else: info['tweets'] = int(float(val))

        # Check for verified badge
        if 'Verified' in body or '✓' in body:
            info['verified'] = True

    except Exception as e:
        print(f'  Error scraping {username}: {e}')
    return info


def main():
    db = sqlite3.connect(DB_PATH)

    # Create KOL detail table
    db.execute("""CREATE TABLE IF NOT EXISTS KOLDetail (
        username TEXT PRIMARY KEY,
        name TEXT,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        tweetCount INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT FALSE,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.commit()

    print(f"[{datetime.now().strftime('%H:%M:%S')}] KOL Detail Scraper starting...")

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            PROFILE_PATH, headless=True,
            args=['--no-sandbox', '--disable-blink-features=AutomationControlled'],
            viewport={"width": 1280, "height": 800},
            user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        )
        page = browser.pages[0]
        page.goto('https://x.com/home', wait_until='domcontentloaded', timeout=30000)
        time.sleep(2)

        for kol in KOL_ACCOUNTS:
            print(f'  Scraping @{kol}...')
            info = scrape_kol_profile(page, kol)

            db.execute("""
                INSERT OR REPLACE INTO KOLDetail (username, name, followers, following, tweetCount, verified, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (kol, kol, info['followers'], info['following'], info['tweets'], info['verified']))
            db.commit()

            print(f'    Followers: {info["followers"]:,} | Following: {info["following"]:,} | Posts: {info["tweets"]:,}')
            time.sleep(2)

        browser.close()

    # Show results
    print(f'\n  === KOL Details ===')
    for row in db.execute("SELECT username, followers, following, tweetCount FROM KOLDetail ORDER BY followers DESC"):
        print(f'  @{row[0]} | {row[1]:,} followers | {row[2]:,} following | {row[3]:,} posts')

    db.close()


if __name__ == "__main__":
    main()
