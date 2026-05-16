#!/usr/bin/env python3
"""
Alpha Tracker Daemon — CORE ENGINE
1. Continuous X scraping (fresh projects + KOL tweets)
2. On-chain verification (contract age, holders, liquidity)
3. Smart follower detection
4. Telegram alerts for high-score projects
"""

import re, time, sqlite3, json, os, asyncio, httpx, traceback
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

# === CONFIG ===
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
PROFILE_PATH = "/root/.openclaw/workspace/x-cloak-profiles/clovieval"
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "-1003656624225")
TELEGRAM_THREAD_ID = os.environ.get("TELEGRAM_THREAD_ID", "24")  # Dev topic

# Scrape interval
SCRAPE_INTERVAL = 1800  # 30 min between full cycles
SEARCH_COOLDOWN = 300   # 5 min between search queries

# KOL list — the "smart money"
KOL_ACCOUNTS = [
    # === OG Alpha Callers ===
    "CryptoKaleo", "inversebrah", "HsakaTrades", "CryptoHayes", "Pentosh1",
    "Cobie", "lightcrypto", "CryptoGucci", "DegenSpartan", "DeFiMaestro",
    "DonAlt", "CryptoCred", "Tradermayne", "AltcoinPsycho", "CryptoGodJohn",
    "BigCheds", "Nebraskangooner", "IncomeSharks", "RookieXBT", "TheFlowHorse",
    "CL207", "ColdBloodShill", "Tree_of_Alpha", "CryptoWizardd", "crypto_bitlord7",
    "EmperorBTC", "SalsaTekila", "CoinMamba", "Ninjascalp", "gainzy222",
    "0xSisyphus", "hentaiavenger66", "ledgerstatus", "udiWertheimer", "ByzGeneral",
    "tradingstable", "jimtalbot", "paurooteri", "GarrettBullish", "Trader_XO",
    
    # === NFT/Art Alpha ===
    "Pranksy", "NFTgator", "Zeneca_33", "punk6529", "cozomoMedici",
    "wilborocollector", "VonMises14", "jenaborocollector", "daborocollector",
    "degenhola", "NFT_Eth", "BoredApeYC", "CryptoPunks",
    "kaborocollector", "NFTGod", "DCFilogy", "Loopifyyy",
    "artblocks_io", "fx_hash_",
    
    # === DeFi Researchers ===
    "DefiIgnas", "Route2FI", "TheDeFiEdge", "DeFi_Made_Here",
    "0xminion", "DeFi_Dad", "sassal0x", "CamiRusso", "DefiLlama",
    "TheBlockResearch", "tokenterminal", "mhonkasalo", "feindura",
    
    # === VCs & Funds ===
    "a16zcrypto", "paradigm", "cbventures", "binance",
    "jumpcrypto", "multicoincap", "polychain", "dragonfly_xyz",
    "PanteraCapital", "Delphi_Digital", "hashed_official",
    "ElectricCapital", "robotventures", "standardcrypto",
    "nascentxyz", "variantfund", "a_capital", "PlaceholderVC",
    "BinanceLabs",
    
    # === Data/Analytics ===
    "MessariCrypto", "CryptoQuant_com", "GemHunterETH",
    "Nansen_ai", "DuneAnalytics", "whale_hunter",
    "lookonchain", "TheBlockCrypto", "coingecko",
    
    # === L1/L2 Foundations ===
    "arbitrum", "OptimismFND", "base", "solana",
    "Avax", "0xPolygon", "SuiNetwork", "Aptos",
    "Starknet", "zksync", "Scroll_ZKP", "LineaBuild",
    
    # === Smart Money / Whale Trackers ===
    "whale_alert", "0xngmi", "CryptoWhaleBot", "EtherVista",
    "DeSpread_io", "ArkhamIntel", "bubblemaps",
    
    # === Indonesian Crypto KOLs ===
    "crypto_news_id", "AirdropIndo", "CryptocurrencyID",
    "cryptoworld_ind", "IDCryptoNews", "indodax",
    "tokocrypto", "pintu_id", "rekeningku",
    "DiditMulyadi", "handoko_tan", "CryptoBlines",
    
    # === AI/Crypto ===
    "aixbt_agent", "AITradingBot", "AIphaTrader", "AI_Crypto_",
    
    # === Meme/Community Alpha ===
    "MuradMahsud", "Unipcs", "SolanaLegend",
    "Bonk_Inu", "JupiterExchange", "RaydiumProtocol",
]

# Search queries — rotate through these
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
    "new L2 launching",
    "crypto startup stealth",
    "building in crypto",
    "new NFT project mint",
    "new DAO launching",
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

# Known VCs
KNOWN_VCS = [
    "a16z", "paradigm", "sequoia", "coinbase ventures", "binance labs",
    "jump crypto", "multicoin", "polychain", "dragonfly", "pantera",
    "galaxy digital", "framework ventures", "delphi digital",
    "animoca brands", "hashed", "electric capital",
]


def init_db():
    """Initialize database tables"""
    db = sqlite3.connect(DB_PATH)
    db.execute("""CREATE TABLE IF NOT EXISTS FreshProject (
        id TEXT PRIMARY KEY, username TEXT UNIQUE, name TEXT, bio TEXT,
        followers INTEGER DEFAULT 0, following INTEGER DEFAULT 0, tweetCount INTEGER DEFAULT 0,
        website TEXT, chain TEXT, category TEXT, latestTweet TEXT, contractAddress TEXT,
        vcs TEXT, stage TEXT, smartFollowers TEXT, smartFollowerCount INTEGER DEFAULT 0,
        score REAL DEFAULT 0, discoveredAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS AlphaProject (
        id TEXT PRIMARY KEY, name TEXT, description TEXT, chain TEXT, category TEXT,
        website TEXT, twitter TEXT, discord TEXT, contractAddress TEXT,
        vcs TEXT, backers TEXT, fundingStage TEXT, fundingAmount TEXT,
        launchDate TEXT, stage TEXT, score REAL DEFAULT 0,
        tweetUrl TEXT, mentionedBy TEXT, mentionedAt DATETIME, tags TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS OnChainData (
        id INTEGER PRIMARY KEY AUTOINCREMENT, projectUsername TEXT, chain TEXT,
        contractAddress TEXT, holderCount INTEGER, liquidity REAL,
        volume24h REAL, priceUsd REAL, marketCap REAL,
        pairAge REAL, dex TEXT, pairUrl TEXT,
        checkedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS DaemonLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT, details TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    # Add missing columns
    for col in ['smartFollowers TEXT', 'smartFollowerCount INTEGER DEFAULT 0']:
        try: db.execute(f"ALTER TABLE FreshProject ADD COLUMN {col}")
        except: pass
    db.commit()
    db.close()


def log_event(event, details=""):
    """Log daemon events"""
    try:
        db = sqlite3.connect(DB_PATH, timeout=10)
        db.execute("INSERT INTO DaemonLog (event, details) VALUES (?, ?)", (event, details[:500]))
        db.commit()
        db.close()
    except:
        pass
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {event}: {details[:100]}")


def send_telegram_alert(project):
    """Send Telegram notification for high-score projects"""
    if not TELEGRAM_BOT_TOKEN:
        log_event("SKIP_ALERT", "No TELEGRAM_BOT_TOKEN")
        return
    
    smart = project.get('smart_followers', [])
    smart_text = "\n".join([f"  ⭐ @{s}" for s in smart[:5]]) if smart else "  None detected"
    
    msg = f"""🚨 **NEW ALPHA PROJECT DETECTED**

📛 **{project['name']}** @{project['username']}
📊 Score: **{project['score']}/100**

👥 Followers: {project['followers']:,}
⭐ Smart Followers: {len(smart)}
📝 {project.get('bio', '')[:200]}

🔗 Chain: {project.get('chain', 'Unknown')}
📂 Category: {project.get('category', 'Unknown')}
📅 Stage: {project.get('stage', 'Unknown')}

⭐ **Smart Followers:**
{smart_text}

🔗 https://x.com/{project['username']}"""

    try:
        import urllib.request
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = json.dumps({
            "chat_id": TELEGRAM_CHAT_ID,
            "text": msg,
            "message_thread_id": int(TELEGRAM_THREAD_ID),
            "parse_mode": "Markdown",
        }).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
        log_event("ALERT_SENT", f"@{project['username']} score={project['score']}")
    except Exception as e:
        log_event("ALERT_FAILED", str(e))


def scrape_profile(page, username):
    """Scrape X profile"""
    info = {'username': username, 'followers': 0, 'following': 0, 'tweets': 0, 
            'bio': '', 'name': username, 'website': '', 'latest_tweet': ''}
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
        if tweets: info['latest_tweet'] = tweets[0].inner_text()[:500]
        
    except Exception as e:
        log_event("PROFILE_ERROR", f"@{username}: {e}")
    return info


def scrape_smart_followers(page, username):
    """Scrape followers page and find KOLs"""
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
        
        for kol in KOL_ACCOUNTS:
            if kol.lower() in found:
                smart.append(kol)
    except Exception as e:
        log_event("FOLLOWERS_ERROR", f"@{username}: {e}")
    return smart


def search_projects(page, query):
    """Search X for fresh project accounts"""
    usernames = []
    try:
        page.goto(f'https://x.com/search?q={query.replace(" ", "+")}&src=typed_query&f=live', 
                  wait_until='domcontentloaded', timeout=30000)
        time.sleep(5)
        
        links = page.query_selector_all('a[role="link"][href^="/"]')
        seen = set()
        skip = ['home','explore','notifications','messages','compose','settings','search',
                'login','signup','i/','hashtag','clovieval']
        
        for link in links:
            href = link.get_attribute('href')
            if not href or not href.startswith('/'): continue
            u = href.strip('/').split('/')[0]
            if u in seen or len(u) < 3 or any(s in u.lower() for s in skip): continue
            seen.add(u)
            usernames.append(u)
    except Exception as e:
        log_event("SEARCH_ERROR", f"{query}: {e}")
    return usernames[:6]


def check_onchain(chain, address):
    """Check on-chain data for a contract"""
    if not address:
        return None
    
    try:
        if chain.lower() in ['solana', 'sol']:
            # RugCheck for Solana
            resp = httpx.get(f"https://api.rugcheck.xyz/v1/tokens/{address}/report", timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    'chain': 'SOLANA',
                    'holderCount': data.get('totalHolders', 0),
                    'liquidity': data.get('liquidity', 0),
                    'risks': [r.get('name','') for r in data.get('risks', [])],
                    'score': data.get('score', 0),
                }
        else:
            # DEXScreener for EVM
            chain_map = {'ethereum': 'ethereum', 'eth': 'ethereum', 'bsc': 'bsc', 
                        'base': 'base', 'arbitrum': 'arbitrum', 'polygon': 'polygon'}
            c = chain_map.get(chain.lower(), chain.lower())
            resp = httpx.get(f"https://api.dexscreener.com/tokens/v1/{c}/{address}", timeout=15)
            if resp.status_code == 200:
                pairs = resp.json()
                if pairs and isinstance(pairs, list) and len(pairs) > 0:
                    pair = pairs[0]
                    return {
                        'chain': chain.upper(),
                        'holderCount': 0,
                        'liquidity': pair.get('liquidity', {}).get('usd', 0),
                        'volume24h': pair.get('volume', {}).get('h24', 0),
                        'priceUsd': float(pair.get('priceUsd', 0)) if pair.get('priceUsd') else 0,
                        'marketCap': pair.get('marketCap', 0),
                        'pairAge': pair.get('pairCreatedAt', 0),
                        'dex': pair.get('dexId', ''),
                        'pairUrl': pair.get('url', ''),
                    }
    except Exception as e:
        log_event("ONCHAIN_ERROR", f"{chain}/{address}: {e}")
    return None


def extract_contract(text):
    """Extract contract address from text"""
    eth = re.findall(r'0x[a-fA-F0-9]{40}', text)
    pump = [s for s in re.findall(r'[1-9A-HJ-NP-Za-km-z]{32,44}', text) if s.endswith('pump')]
    if pump: return pump[0], 'SOLANA'
    if eth: return eth[0], 'ETHEREUM'
    return None, None


def detect_chain(text):
    t = text.lower()
    if 'solana' in t or '$sol' in t: return 'SOLANA'
    if 'ethereum' in t or '$eth' in t: return 'ETHEREUM'
    if 'base' in t: return 'BASE'
    if 'bsc' in t or 'bnb' in t: return 'BSC'
    if 'soneium' in t: return 'SONEIUM'
    if 'arbitrum' in t: return 'ARBITRUM'
    return 'MULTI'

def detect_category(text):
    t = text.lower()
    if any(w in t for w in ['ai','artificial intelligence','llm','machine learning']): return 'AI'
    if any(w in t for w in ['defi','yield','lending','dex','amm']): return 'DeFi'
    if any(w in t for w in ['nft','collection','mint','opensea']): return 'NFT'
    if any(w in t for w in ['game','gaming','metaverse','play']): return 'Gaming'
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

def score_project(info, smart_count, onchain=None):
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
    
    if onchain:
        if onchain.get('liquidity', 0) > 10000: score += 5
        if onchain.get('holderCount', 0) > 100: score += 5
    
    if info.get('website'): score += 3
    return min(100, score)


def is_fresh(info):
    if info['followers'] > 50000: return False
    if info['tweets'] > 500: return False
    bio = info['bio'].lower()
    crypto = ['crypto','defi','web3','blockchain','token','protocol','chain','nft','dao','build','launch','project','ai']
    return any(kw in bio for kw in crypto)


def process_new_project(page, username, db):
    """Full pipeline: scrape profile → smart followers → on-chain → score → save → alert"""
    
    # Check if already exists
    existing = db.execute("SELECT id, score FROM FreshProject WHERE username = ?", (username,)).fetchone()
    if existing:
        return None
    
    log_event("ANALYZING", f"@{username}")
    
    # 1. Scrape profile
    info = scrape_profile(page, username)
    
    # 2. Filter
    if not is_fresh(info):
        log_event("SKIP", f"@{username} — not fresh (followers={info['followers']}, tweets={info['tweets']})")
        return None
    
    # 3. Smart followers
    smart = scrape_smart_followers(page, username)
    
    # 4. On-chain check (if contract found)
    ca, ca_chain = extract_contract(info.get('latest_tweet', '') + ' ' + info['bio'])
    onchain = None
    if ca:
        onchain = check_onchain(ca_chain, ca)
    
    # 5. Score
    score = score_project(info, len(smart), onchain)
    
    # 6. Save to DB
    proj_id = f"fresh-{username}-{int(datetime.now().timestamp())}"
    chain = detect_chain(info['bio'] + ' ' + info.get('latest_tweet', ''))
    category = detect_category(info['bio'] + ' ' + info.get('latest_tweet', ''))
    stage = detect_stage(info['bio'] + ' ' + info.get('latest_tweet', ''))
    
    try:
        db.execute("""
            INSERT OR REPLACE INTO FreshProject 
            (id, username, name, bio, followers, following, tweetCount, website, chain, category,
             latestTweet, contractAddress, vcs, stage, smartFollowers, smartFollowerCount, score, discoveredAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (proj_id, username, info['name'], info['bio'], info['followers'], info['following'],
              info['tweets'], info.get('website',''), chain, category, info.get('latest_tweet',''),
              ca or '', None, stage, ','.join(smart) if smart else None, len(smart), score))
        
        if onchain:
            db.execute("""
                INSERT INTO OnChainData (projectUsername, chain, contractAddress, holderCount, liquidity, volume24h, priceUsd, marketCap, pairAge, dex, pairUrl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (username, onchain.get('chain',''), ca or '', onchain.get('holderCount',0),
                  onchain.get('liquidity',0), onchain.get('volume24h',0), onchain.get('priceUsd',0),
                  onchain.get('marketCap',0), onchain.get('pairAge',0), onchain.get('dex',''), onchain.get('pairUrl','')))
        
        db.commit()
        
        project_data = {
            'username': username, 'name': info['name'], 'followers': info['followers'],
            'bio': info['bio'], 'chain': chain, 'category': category, 'stage': stage,
            'smart_followers': smart, 'score': score,
        }
        
        log_event("NEW_PROJECT", f"@{username} score={score} followers={info['followers']} smart={len(smart)}")
        
        # 7. Alert if score high enough
        if score >= 70:
            send_telegram_alert(project_data)
        
        return project_data
        
    except Exception as e:
        log_event("DB_ERROR", f"@{username}: {e}")
        return None


def scrape_kol_tweets(page, username):
    """Scrape recent tweets from a KOL"""
    tweets = []
    try:
        page.goto(f'https://x.com/{username}', wait_until='domcontentloaded', timeout=30000)
        time.sleep(5)
        
        text_els = page.query_selector_all('[data-testid="tweetText"]')
        time_els = page.query_selector_all('article[data-testid="tweet"] time')
        
        for i in range(min(len(text_els), 8)):
            text = text_els[i].inner_text()
            tweet_url = None
            timestamp = None
            
            if i < len(time_els):
                timestamp = time_els[i].get_attribute('datetime')
                href = time_els[i].evaluate('el => el.closest("a")?.href || null')
                if href: tweet_url = href
            
            if text:
                tweets.append({'text': text, 'url': tweet_url, 'timestamp': timestamp, 'author': username})
    except Exception as e:
        log_event("KOL_ERROR", f"@{username}: {e}")
    return tweets


def process_kol_tweets(page, db):
    """Process KOL tweets to find project mentions"""
    log_event("KOL_SCAN", "Scanning KOL tweets...")
    
    caller = db.execute("SELECT id FROM Caller WHERE username = 'KOL-Scanner'").fetchone()
    if not caller:
        db.execute("INSERT OR IGNORE INTO Caller (id, username, name, platform, score, totalCalls, correctCalls, createdAt, updatedAt) VALUES ('kol-scanner', 'KOL-Scanner', 'KOL Tweet Scanner', 'x', 90, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
        db.commit()
    
    created = 0
    for kol in KOL_ACCOUNTS[:10]:  # Limit per cycle
        tweets = scrape_kol_tweets(page, kol)
        
        for tw in tweets:
            text = tw['text']
            text_lower = text.lower()
            
            # Check for project mentions
            is_project = any(kw in text_lower for kw in [
                'launching', 'launched', 'announcing', 'new project', 'new protocol',
                'testnet', 'mainnet', 'deployed', 'minting', 'presale', 'ido',
                'airdrop', 'token launch', 'seed round', 'raised', 'funding',
            ])
            
            if not is_project:
                continue
            
            # Extract tickers
            tickers = re.findall(r'\$([A-Z]{2,10})', text)
            ca, chain = extract_contract(text)
            
            if not tickers and not ca:
                continue
            
            # Check if already exists
            name = tickers[0] if tickers else ca[:16]
            existing = db.execute("SELECT id FROM AlphaProject WHERE name = ? AND mentionedBy = ?", (name, kol)).fetchone()
            if existing:
                continue
            
            proj_id = f"proj-{name.lower()}-{kol}-{int(datetime.now().timestamp())}"
            
            try:
                db.execute("""
                    INSERT INTO AlphaProject (id, name, description, chain, category, contractAddress, 
                    score, tweetUrl, mentionedBy, mentionedAt, tags, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (proj_id, name, text[:500], chain or detect_chain(text),
                      detect_category(text), ca, 70, tw.get('url'), kol,
                      tw.get('timestamp'), ','.join(tickers)))
                db.commit()
                created += 1
                log_event("KOL_MENTION", f"@{kol} mentioned ${name}")
            except:
                pass
        
        time.sleep(2)
    
    log_event("KOL_DONE", f"Found {created} new KOL mentions")
    return created


def main_cycle(page, db):
    """One full scrape cycle"""
    log_event("CYCLE_START", "Starting new scrape cycle")
    
    # Phase 1: Search for fresh projects
    all_usernames = []
    query_idx = int(time.time() / SEARCH_COOLDOWN) % len(SEARCH_QUERIES)
    
    for i in range(3):  # 3 queries per cycle
        q = SEARCH_QUERIES[(query_idx + i) % len(SEARCH_QUERIES)]
        log_event("SEARCHING", q)
        found = search_projects(page, q)
        all_usernames.extend(found)
        time.sleep(2)
    
    all_usernames = list(set(all_usernames))
    log_event("FOUND", f"{len(all_usernames)} unique accounts from search")
    
    new_projects = 0
    for username in all_usernames[:8]:  # Limit per cycle
        result = process_new_project(page, username, db)
        if result:
            new_projects += 1
        time.sleep(2)
    
    # Phase 2: KOL tweet scan
    kol_mentions = process_kol_tweets(page, db)
    
    # Phase 3: NFT project scan
    try:
        import subprocess
        result = subprocess.run(['python3', 'scraper/nft_scraper.py'], 
            cwd='/root/.openclaw/workspace/alpha-tracker', 
            capture_output=True, text=True, timeout=300)
        log_event("NFT_SCAN", "NFT scraper completed")
    except Exception as e:
        log_event("NFT_ERROR", str(e)[:200])
    
    # Phase 4: KOL following check
    try:
        result = subprocess.run(['python3', 'scraper/kol_following_check.py'], 
            cwd='/root/.openclaw/workspace/alpha-tracker', 
            capture_output=True, text=True, timeout=300)
        log_event("KOL_FOLLOW", "KOL following check completed")
    except Exception as e:
        log_event("KOL_FOLLOW_ERROR", str(e)[:200])
    
    log_event("CYCLE_DONE", f"New projects: {new_projects}, KOL mentions: {kol_mentions}")
    return new_projects, kol_mentions


def main():
    """Main daemon loop"""
    init_db()
    
    log_event("DAEMON_START", "Alpha Tracker Daemon starting...")
    
    # Check Telegram config
    if not TELEGRAM_BOT_TOKEN:
        log_event("WARNING", "TELEGRAM_BOT_TOKEN not set — alerts disabled")
    
    while True:
        try:
            db = sqlite3.connect(DB_PATH)
            
            with sync_playwright() as p:
                browser = p.chromium.launch_persistent_context(
                    PROFILE_PATH, headless=True,
                    args=['--no-sandbox', '--disable-blink-features=AutomationControlled'],
                    viewport={"width": 1280, "height": 800},
                    user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                )
                page = browser.pages[0]
                
                # Verify login
                page.goto('https://x.com/home', wait_until='domcontentloaded', timeout=30000)
                time.sleep(2)
                is_logged_in = 'login' not in page.url.lower()
                
                if not is_logged_in:
                    log_event("ERROR", "Not logged in to X! Waiting 5 min...")
                    browser.close()
                    db.close()
                    time.sleep(300)
                    continue
                
                log_event("LOGGED_IN", "X session active")
                
                # Run one cycle
                new_projects, kol_mentions = main_cycle(page, db)
                
                browser.close()
            
            db.close()
            
            log_event("SLEEPING", f"Next cycle in {SCRAPE_INTERVAL//60} min")
            time.sleep(SCRAPE_INTERVAL)
            
        except KeyboardInterrupt:
            log_event("DAEMON_STOP", "Interrupted by user")
            break
        except Exception as e:
            log_event("DAEMON_ERROR", f"{traceback.format_exc()[:300]}")
            time.sleep(60)  # Wait 1 min on error


if __name__ == "__main__":
    main()
