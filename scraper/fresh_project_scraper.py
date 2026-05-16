#!/usr/bin/env python3
"""
Fresh Alpha Project Scraper v3 - REAL data, real smart followers
"""
import re, time, sqlite3, json, os
from datetime import datetime
from playwright.sync_api import sync_playwright

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
PROFILE_PATH = "/root/.openclaw/workspace/x-cloak-profiles/clovieval"

KOL_LIST = [
    # === OG Alpha Callers ===
    'CryptoKaleo', 'inversebrah', 'HsakaTrades', 'CryptoHayes', 'Pentosh1',
    'Cobie', 'lightcrypto', 'CryptoGucci', 'DegenSpartan', 'DeFiMaestro',
    'DonAlt', 'CryptoCred', 'Tradermayne', 'AltcoinPsycho', 'CryptoGodJohn',
    'BigCheds', 'Nebraskangooner', 'IncomeSharks', 'RookieXBT', 'TheFlowHorse',
    'CL207', 'ColdBloodShill', 'Tree_of_Alpha', 'CryptoWizardd', 'crypto_bitlord7',
    'EmperorBTC', 'SalsaTekila', 'CoinMamba', 'Ninjascalp', 'gainzy222',
    '0xSisyphus', 'hentaiavenger66', 'ledgerstatus', 'udiWertheimer', 'ByzGeneral',
    'tradingstable', 'jimtalbot', 'paurooteri', 'GarrettBullish', 'Trader_XO',
    
    # === NFT/Art Alpha ===
    'Pranksy', 'NFTgator', 'Zeneca_33', 'punk6529', 'cozomoMedici',
    'wilborocollector', 'VonMises14', 'jenaborocollector', 'daborocollector',
    'degenhola', 'NFT_Eth', 'BoredApeYC', 'CryptoPunks',
    'kaborocollector', 'NFTGod', 'DCFilogy', 'Loopifyyy',
    'artblocks_io', 'jenaborocollector', 'fx_hash_',
    
    # === DeFi Researchers ===
    'DefiIgnas', 'Route2FI', 'TheDeFiEdge', 'DeFi_Made_Here',
    '0xminion', 'DeFi_Dad', 'sassal0x', 'CamiRusso', 'DefiLlama',
    'TheBlockResearch', 'Daborocollectooor', 'tokenterminal',
    'mhonkasalo', 'baborocollector', 'feindura',
    
    # === VCs & Funds ===
    'a16zcrypto', 'paradigm', 'cbventures', 'binance',
    'jumpcrypto', 'multicoincap', 'polychain', 'dragonfly_xyz',
    'PanteraCapital', 'Delphi_Digital', 'hashed_official',
    'ElectricCapital', 'robotventures', 'standardcrypto',
    'nascentxyz', 'variantfund', 'a_capital', 'PlaceholderVC',
    'galaborocollector', 'spaborocollector', 'miaborocollector',
    'Sequoia_Capital', 'BinanceLabs', 'a]6zcrypto',
    
    # === Data/Analytics ===
    'MessariCrypto', 'CryptoQuant_com', 'Daborocollector',
    'Nansen_ai', 'DuneAnalytics', 'whale_hunter', 'GemHunterETH',
    'lookonchain', 'TheBlockCrypto', 'coingecko',
    
    # === L1/L2 Foundations ===
    'arbitrum', 'OptimismFND', 'base', 'solana',
    'Avax', '0xPolygon', 'SuiNetwork', 'Aptos',
    'Starknet', 'zksync', 'Scroll_ZKP', 'LineaBuild',
    
    # === Smart Money / Whale Trackers ===
    'whale_alert', '0xngmi', 'defaborocollectoory',
    'CryptoWhaleBot', 'EtherVista', 'OnChainData',
    'DeSpread_io', 'ArkhamIntel', 'bubblemaps',
    
    # === Indonesian Crypto KOLs ===
    'crypto_news_id', 'AirdropIndo', 'CryptocurrencyID',
    'cryptoworld_ind', 'IDCryptoNews', 'indodax',
    'tokocrypto', 'pintu_id', 'rekeningku',
    'DiditMulyadi', 'handoko_tan', 'CryptoBlines',
    'didit_hidayat', 'biaborocollector',
    
    # === AI/Crypto ===
    'aixbt_agent', 'aaborocollector', 'AIaborocollectoor',
    'AITradingBot', 'AIphaTrader', 'AI_Crypto_',
    
    # === Meme/Community Alpha ===
    'MuradMahsud', 'Unipcs', 'SolanaLegend',
    'Bonk_Inu', 'JupiterExchange', 'RaydiumProtocol',
]

SEARCH_QUERIES = [
    # English queries
    "crypto project launch",
    "new protocol launching 2026",
    "new defi protocol",
    "new AI crypto",
    "testnet live",
    "mainnet launch",
    "new blockchain",
    "presale live now",
    "IDO launch",
    "airdrop season",
    "just deployed",
    "new token launched",
    "alpha call",
    "early gem",
    "hidden gem crypto",
    "new DeFi launch",
    "crypto startup launch",
    "new L2 launch",
    "new chain launch",
    "token generation event",
    # Indonesian queries
    "token baru",
    "project baru crypto",
    "crypto Indonesia launch",
    "airdrop baru",
    "presale crypto",
]

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("""CREATE TABLE IF NOT EXISTS FreshProject (
        id TEXT PRIMARY KEY, username TEXT UNIQUE, name TEXT, bio TEXT,
        followers INTEGER DEFAULT 0, following INTEGER DEFAULT 0, tweetCount INTEGER DEFAULT 0,
        website TEXT, chain TEXT, category TEXT, latestTweet TEXT, contractAddress TEXT,
        vcs TEXT, stage TEXT, smartFollowers TEXT, smartFollowerCount INTEGER DEFAULT 0,
        score REAL DEFAULT 0, discoveredAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    for col in ['smartFollowers TEXT', 'smartFollowerCount INTEGER DEFAULT 0']:
        try: db.execute(f"ALTER TABLE FreshProject ADD COLUMN {col}")
        except: pass
    db.commit()
    db.close()

def scrape_profile(page, username):
    info = {'username': username, 'followers': 0, 'following': 0, 'tweets': 0, 'bio': '', 'name': username, 'website': ''}
    try:
        page.goto(f'https://x.com/{username}', wait_until='domcontentloaded', timeout=30000)
        time.sleep(5)
        body = page.evaluate('() => document.body.innerText')
        
        fm = re.search(r'([\d,.]+[KMB]?)\s*Followers', body)
        if fm:
            val = fm.group(1).replace(',', '')
            if 'K' in val: info['followers'] = int(float(val.replace('K', '')) * 1000)
            elif 'M' in val: info['followers'] = int(float(val.replace('M', '')) * 1000000)
            else: info['followers'] = int(float(val))
        
        fom = re.search(r'([\d,.]+[KMB]?)\s*Following', body)
        if fom:
            val = fom.group(1).replace(',', '')
            if 'K' in val: info['following'] = int(float(val.replace('K', '')) * 1000)
            else: info['following'] = int(float(val))
        
        pm = re.search(r'([\d,.]+[KMB]?)\s*posts', body, re.IGNORECASE)
        if pm:
            val = pm.group(1).replace(',', '')
            if 'K' in val: info['tweets'] = int(float(val.replace('K', '')) * 1000)
            else: info['tweets'] = int(float(val))
        
        bio_el = page.query_selector('[data-testid="UserDescription"]')
        if bio_el: info['bio'] = bio_el.inner_text()
        
        name_el = page.query_selector('[data-testid="UserName"]')
        if name_el: info['name'] = name_el.inner_text().split('\n')[0]
        
        for link in page.query_selector_all('a[role="link"][target="_blank"]'):
            href = link.get_attribute('href')
            if href and 'x.com' not in href and 'twitter.com' not in href:
                info['website'] = href
                break
        
        tweets = page.query_selector_all('[data-testid="tweetText"]')
        info['latest_tweet'] = tweets[0].inner_text()[:500] if tweets else ''
        
    except Exception as e:
        print(f'    Profile error: {e}')
    return info

def scrape_smart_followers(page, username):
    smart = []
    try:
        page.goto(f'https://x.com/{username}/followers', wait_until='domcontentloaded', timeout=30000)
        time.sleep(5)
        
        links = page.query_selector_all('a[href^="/"]')
        found = set()
        for link in links:
            href = link.get_attribute('href')
            if href and href.startswith('/') and '/' not in href[1:]:
                u = href.strip('/')
                if len(u) > 2 and u not in ['home','explore','notifications','messages','i','login','signup','search',username,'clovieval']:
                    found.add(u.lower())
        
        for kol in KOL_LIST:
            if kol.lower() in found:
                smart.append(kol)
    except Exception as e:
        print(f'    Followers error: {e}')
    return smart

def search_projects(page, query):
    usernames = []
    try:
        page.goto(f'https://x.com/search?q={query.replace(" ", "+")}&src=typed_query&f=live', wait_until='domcontentloaded', timeout=30000)
        time.sleep(5)
        
        links = page.query_selector_all('a[role="link"][href^="/"]')
        seen = set()
        skip = ['home','explore','notifications','messages','compose','settings','search','login','signup','i/','hashtag','clovieval']
        
        for link in links:
            href = link.get_attribute('href')
            if not href or not href.startswith('/'): continue
            u = href.strip('/').split('/')[0]
            if u in seen or len(u) < 3 or any(s in u.lower() for s in skip): continue
            seen.add(u)
            usernames.append(u)
    except Exception as e:
        print(f'  Search error: {e}')
    return usernames[:6]

def detect_chain(text):
    t = text.lower()
    if 'solana' in t or '$sol' in t: return 'SOLANA'
    if 'ethereum' in t or '$eth' in t: return 'ETHEREUM'
    if 'base' in t: return 'BASE'
    if 'bsc' in t or 'bnb' in t: return 'BSC'
    if 'soneium' in t: return 'SONEIUM'
    return 'MULTI'

def detect_category(text):
    t = text.lower()
    if any(w in t for w in ['ai','artificial intelligence','llm']): return 'AI'
    if any(w in t for w in ['defi','yield','lending','dex']): return 'DeFi'
    if any(w in t for w in ['nft','collection','mint']): return 'NFT'
    if any(w in t for w in ['game','gaming','metaverse']): return 'Gaming'
    if any(w in t for w in ['l2','layer 2','rollup','chain']): return 'Infrastructure'
    return 'Other'

def detect_stage(text):
    t = text.lower()
    if 'mainnet' in t: return 'mainnet'
    if 'testnet' in t: return 'testnet'
    if 'ido' in t: return 'ido'
    if 'launch' in t: return 'launch'
    if 'stealth' in t: return 'stealth'
    if 'building' in t: return 'building'
    return 'unknown'

def extract_contract_address(text):
    """Extract contract address from text"""
    # EVM address (0x...)
    evm_match = re.search(r'0x[a-fA-F0-9]{40}', text)
    if evm_match: return ('EVM', evm_match.group(0))
    
    # Solana address (base58, 32-44 chars)
    sol_match = re.search(r'[1-9A-HJ-NP-Za-km-z]{32,44}', text)
    if sol_match: return ('SOLANA', sol_match.group(0))
    
    return (None, None)

def check_onchain(chain, address):
    """Check on-chain data via DEXScreener API"""
    try:
        import httpx
        resp = httpx.get(f'https://api.dexscreener.com/latest/dex/tokens/{address}', timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            pairs = data.get('pairs', [])
            if pairs:
                pair = pairs[0]
                return {
                    'price': pair.get('priceUsd', '0'),
                    'liquidity': pair.get('liquidity', {}).get('usd', 0),
                    'volume': pair.get('volume', {}).get('h24', 0),
                    'pair_age': pair.get('pairCreatedAt', 0),
                    'dex': pair.get('dexId', ''),
                }
    except Exception as e:
        print(f'    On-chain error: {e}')
    return None

def score_project(info, smart_count):
    score = 50
    f = info['followers']
    if f < 100: score += 20
    elif f < 500: score += 15
    elif f < 1000: score += 10
    elif f < 5000: score += 5
    
    t = info['tweets']
    if t < 10: score += 15
    elif t < 50: score += 10
    elif t < 100: score += 5
    
    score += smart_count * 8
    return min(100, score)

def main():
    init_db()
    db = sqlite3.connect(DB_PATH)
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Fresh Alpha Scraper v3 — REAL smart followers!")
    
    # User examples
    all_usernames = ["nekocat_world", "ZxyProtocol", "EvolsAI", "AireadyLabs"]
    
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
        
        # Search
        for query in SEARCH_QUERIES[:5]:
            print(f'  Searching: {query}')
            found = search_projects(page, query)
            all_usernames.extend(found)
            print(f'    Found {len(found)} accounts')
            time.sleep(2)
        
        all_usernames = list(set(all_usernames))
        print(f'\n  Total unique: {len(all_usernames)}')
        
        created = 0
        for username in all_usernames[:12]:
            existing = db.execute("SELECT id FROM FreshProject WHERE username = ?", (username,)).fetchone()
            if existing:
                print(f'  @{username} — already in DB, skip')
                continue
            
            print(f'\n  Analyzing @{username}...')
            
            # Profile
            info = scrape_profile(page, username)
            
            # Filter
            if info['followers'] > 50000:
                print(f'    Skip — too many followers ({info["followers"]})')
                continue
            if info['tweets'] > 500:
                print(f'    Skip — too many tweets ({info["tweets"]})')
                continue
            
            bio_lower = info['bio'].lower()
            crypto = ['crypto','defi','web3','blockchain','token','protocol','chain','nft','dao','build','launch','project','ai']
            if not any(kw in bio_lower for kw in crypto):
                print(f'    Skip — not crypto related')
                continue
            
            # Smart followers
            print(f'    Checking smart followers...')
            smart = scrape_smart_followers(page, username)
            
            score = score_project(info, len(smart))
            
            # Check for contract address in bio/tweet
            ca_chain, ca_address = extract_contract_address(info['bio'] + ' ' + info.get('latest_tweet', ''))
            onchain_data = None
            if ca_address:
                print(f'    Found CA: {ca_address} ({ca_chain})')
                onchain_data = check_onchain(ca_chain, ca_address)
                if onchain_data:
                    print(f'    On-chain: Price ${onchain_data["price"]}, Liq ${onchain_data["liquidity"]:.0f}')
                    score += 10  # bonus for having CA
            
            print(f'    ✅ FRESH! Score: {score}')
            print(f'       Followers: {info["followers"]} | Tweets: {info["tweets"]}')
            if smart:
                print(f'       ⭐ Smart: {", ".join(["@"+s for s in smart])}')
            
            proj_id = f"fresh-{username}-{int(datetime.now().timestamp())}"
            
            # Save on-chain data if found
            if onchain_data and ca_address:
                try:
                    db.execute("""
                        INSERT OR REPLACE INTO OnChainData (id, projectId, chain, address, price, liquidity, volume, pairAge, dex, checkedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """, (
                        f"oc-{username}-{int(datetime.now().timestamp())}",
                        proj_id, ca_chain, ca_address,
                        str(onchain_data.get('price', '0')),
                        onchain_data.get('liquidity', 0),
                        onchain_data.get('volume', 0),
                        onchain_data.get('pair_age', 0),
                        onchain_data.get('dex', ''),
                    ))
                except Exception as e:
                    print(f'    OnChain DB Error: {e}')
            
            try:
                db.execute("""
                    INSERT OR REPLACE INTO FreshProject (id, username, name, bio, followers, following, tweetCount,
                    website, chain, category, latestTweet, contractAddress, vcs, stage, 
                    smartFollowers, smartFollowerCount, score, discoveredAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (
                    proj_id, username, info['name'], info['bio'],
                    info['followers'], info['following'], info['tweets'],
                    info.get('website',''), detect_chain(info['bio'] + ' ' + info.get('latest_tweet','')),
                    detect_category(info['bio'] + ' ' + info.get('latest_tweet','')),
                    info.get('latest_tweet',''), ca_address or '', None,
                    detect_stage(info['bio'] + ' ' + info.get('latest_tweet','')),
                    ','.join(smart) if smart else None, len(smart), score,
                ))
                db.commit()
                created += 1
            except Exception as e:
                print(f'    DB Error: {e}')
            
            time.sleep(2)
        
        browser.close()
    
    print(f'\n  ✅ Done! Created {created} fresh projects with REAL smart follower data')
    db.close()

if __name__ == "__main__":
    main()
