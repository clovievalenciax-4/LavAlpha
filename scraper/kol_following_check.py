#!/usr/bin/env python3
"""
KOL Following Check — Track who KOLs recently followed
THE strongest signal: if @CryptoHayes follows @NewProject, it's alpha.
"""

import re, time, sqlite3, os
from datetime import datetime
from playwright.sync_api import sync_playwright

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
PROFILE_PATH = "/root/.openclaw/workspace/x-cloak-profiles/clovieval"

# Top KOLs to track their following list
TOP_KOLS = [
    # OG Alpha Callers
    "CryptoHayes", "Cobie", "CryptoKaleo", "Pentosh1", "inversebrah",
    "HsakaTrades", "lightcrypto", "DeFiMaestro", "DegenSpartan",
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


def get_kol_following(page, kol_username):
    """Scrape who a KOL is following — returns list of usernames"""
    following = []
    try:
        page.goto(f'https://x.com/{kol_username}/following', wait_until='domcontentloaded', timeout=30000)
        time.sleep(4)

        # Scroll a few times to get more
        for _ in range(3):
            page.evaluate('window.scrollBy(0, 800)')
            time.sleep(1)

        links = page.query_selector_all('a[role="link"][href^="/"]')
        seen = set()
        skip = ['home','explore','notifications','messages','compose','settings','search',
                'login','signup','i/','hashtag','clovieval', kol_username.lower()]

        for link in links:
            href = link.get_attribute('href')
            if not href or not href.startswith('/'): continue
            u = href.strip('/').split('/')[0]
            if u.lower() in seen or len(u) < 3 or any(s in u.lower() for s in skip): continue
            seen.add(u.lower())
            following.append(u)

    except Exception as e:
        print(f'  Error scraping {kol_username} following: {e}')

    return following[:30]  # top 30


def main():
    db = sqlite3.connect(DB_PATH)

    # Create table for KOL following tracking
    db.execute("""CREATE TABLE IF NOT EXISTS KOLFollowing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kol TEXT NOT NULL,
        target TEXT NOT NULL,
        detectedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(kol, target)
    )""")
    db.commit()

    print(f"[{datetime.now().strftime('%H:%M:%S')}] KOL Following Check starting...")

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

        all_new_follows = []

        for kol in TOP_KOLS[:8]:  # check 8 KOLs per cycle
            print(f'\n  Checking @{kol} following...')
            following = get_kol_following(page, kol)
            print(f'    Found {len(following)} accounts')

            for target in following:
                # Check if this is a NEW follow (not in DB)
                existing = db.execute(
                    "SELECT id FROM KOLFollowing WHERE kol = ? AND target = ?",
                    (kol, target)
                ).fetchone()

                if not existing:
                    try:
                        db.execute(
                            "INSERT OR IGNORE INTO KOLFollowing (kol, target) VALUES (?, ?)",
                            (kol, target)
                        )
                        db.commit()
                        all_new_follows.append((kol, target))
                        print(f'    🆕 NEW: @{kol} → @{target}')
                    except:
                        pass

            time.sleep(2)

        browser.close()

    # Now cross-reference: which new KOL follows are for fresh projects?
    print(f'\n  Cross-referencing with FreshProject...')
    for kol, target in all_new_follows:
        project = db.execute(
            "SELECT id, username, score FROM FreshProject WHERE username = ?",
            (target,)
        ).fetchone()

        if project:
            # Boost score because KOL just followed
            new_score = min(100, (project[2] or 50) + 15)
            db.execute("UPDATE FreshProject SET score = ? WHERE id = ?", (new_score, project[0]))
            db.commit()
            print(f'    ⬆️ @{target} score boosted to {new_score} (followed by @{kol})')

    # Stats
    total = db.execute("SELECT COUNT(*) FROM KOLFollowing").fetchone()[0]
    print(f'\n  ✅ Total KOL following records: {total}')
    print(f'  🆕 New follows this cycle: {len(all_new_follows)}')

    db.close()


if __name__ == "__main__":
    main()
