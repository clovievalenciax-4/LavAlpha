#!/usr/bin/env python3
"""
NFT Project Scraper v2 — BENERAN FRESH
Focus: NFT projects that just launched, low followers, truly new
"""

import re, time, sqlite3, json, os
from datetime import datetime
from playwright.sync_api import sync_playwright

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
PROFILE_PATH = "/root/.openclaw/workspace/x-cloak-profiles/clovieval"

# NFT KOL accounts — strong signal if they follow
NFT_KOL_ACCOUNTS = [
    # NFT specific
    "Pranksy", "NFTgator", "Zeneca_33", "punk6529", "cozomoMedici",
    "daborocollector", "wilxlee", "VonMises14", "jenaborocollector",
    "kaborocollector", "NFTGod", "DCFilogy", "Loopifyyy",
    "artblocks_io", "fx_hash_", "BoredApeYC", "CryptoPunks",
    "degenhola", "NFT_Eth",
    # OG alpha
    "CryptoHayes", "Cobie", "CryptoKaleo", "inversebrah", "HsakaTrades",
    "Pentosh1", "lightcrypto", "DeFiMaestro", "DegenSpartan",
    # VCs
    "a16zcrypto", "paradigm", "cbventures", "polychain",
    "PanteraCapital", "Delphi_Digital", "hashed_official",
    # Smart money
    "whale_alert", "0xngmi", "ArkhamIntel", "bubblemaps",
]

# Search queries — focused on truly FRESH NFT projects
NFT_SEARCH_QUERIES = [
    "NFT minting now",
    "NFT allowlist open",
    "NFT mint just live",
    "new PFP collection mint",
    "NFT project launching today",
    "generative art mint live",
    "NFT whitelist open now",
    "new NFT collection 2026",
    "NFT mint drop today",
    "free NFT mint",
    "NFT allowlist link",
    "NFT mint announcement",
]


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("""CREATE TABLE IF NOT EXISTS NFTProject (
        id TEXT PRIMARY KEY, username TEXT UNIQUE, name TEXT, bio TEXT,
        followers INTEGER DEFAULT 0, following INTEGER DEFAULT 0, tweetCount INTEGER DEFAULT 0,
        website TEXT, chain TEXT, category TEXT, latestTweet TEXT, contractAddress TEXT,
        mintPrice TEXT, supply TEXT, mintDate TEXT,
        vcs TEXT, stage TEXT, smartFollowers TEXT, smartFollowerCount INTEGER DEFAULT 0,
        score REAL DEFAULT 0, discoveredAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    db.commit()
    db.close()


def scrape_profile(page, username):
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
        print(f'  Profile error: {e}')
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

        for kol in NFT_KOL_ACCOUNTS:
            if kol.lower() in found:
                smart.append(kol)
    except Exception as e:
        print(f'  Followers error: {e}')
    return smart


def search_projects(page, query):
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
        print(f'  Search error: {e}')
    return usernames[:6]


def detect_chain(text):
    t = text.lower()
    if 'solana' in t or '$sol' in t: return 'SOLANA'
    if 'ethereum' in t or '$eth' in t or '0x' in t: return 'ETHEREUM'
    if 'base' in t: return 'BASE'
    if 'bsc' in t or 'bnb' in t: return 'BSC'
    if 'polygon' in t or 'matic' in t: return 'POLYGON'
    if 'bitcoin' in t or 'ordinal' in t: return 'BITCOIN'
    if 'avalanche' in t or 'avax' in t: return 'AVALANCHE'
    return 'MULTI'


def detect_category(text):
    t = text.lower()
    if any(w in t for w in ['pfp', 'profile pic', 'avatar', 'bored ape', 'punk']): return 'PFP'
    if any(w in t for w in ['art', 'generative', 'generative art', 'fxhash', 'art blocks']): return 'Art'
    if any(w in t for w in ['game', 'gaming', 'play to earn', 'metaverse']): return 'Gaming'
    if any(w in t for w in ['music', 'song', 'album']): return 'Music'
    if any(w in t for w in ['photography', 'photo']): return 'Photography'
    if any(w in t for w in ['utility', 'membership', 'access']): return 'Utility'
    if any(w in t for w in ['ordinal', 'bitcoin nft', 'inscri']): return 'Ordinals'
    if any(w in t for w in ['rwa', 'real world', 'tokenized']): return 'RWA'
    return 'PFP'


def detect_stage(text):
    t = text.lower()
    if 'minting' in t or 'mint live' in t or 'mint is live' in t: return 'minting'
    if 'allowlist' in t or 'whitelist' in t: return 'allowlist'
    if 'revealed' in t or 'reveal' in t: return 'revealed'
    if 'upcoming' in t or 'coming soon' in t: return 'upcoming'
    if 'free mint' in t or 'free claim' in t: return 'free_mint'
    return 'unknown'


def extract_mint_info(text):
    info = {}
    price_match = re.search(r'([\d.]+)\s*(?:SOL|ETH|AVAX|MATIC|BNB)', text, re.IGNORECASE)
    if price_match: info['price'] = price_match.group(0)
    supply_match = re.search(r'([\d,]+)\s*(?:supply|total|items|pieces)', text, re.IGNORECASE)
    if supply_match: info['supply'] = supply_match.group(1)
    if 'free mint' in text.lower() or 'free claim' in text.lower(): info['price'] = 'FREE'
    return info


def score_project(info, smart_count):
    score = 50
    f = info['followers']
    # Fresh = low followers = HIGH score
    if f < 50: score += 25
    elif f < 100: score += 20
    elif f < 500: score += 15
    elif f < 1000: score += 10
    elif f < 5000: score += 5
    elif f < 10000: score += 0
    else: score -= 5

    t = info['tweets']
    # Very few tweets = very fresh = HIGH score
    if t < 5: score += 20
    elif t < 10: score += 15
    elif t < 50: score += 10
    elif t < 100: score += 5
    elif t > 500: score -= 5

    # Smart followers = massive boost
    score += smart_count * 10

    # NFT-specific keywords boost
    bio = info['bio'].lower()
    tweet = info.get('latest_tweet', '').lower()
    combined = bio + ' ' + tweet
    if 'minting' in combined or 'mint live' in combined: score += 10
    if 'allowlist' in combined or 'whitelist' in combined: score += 8
    if 'free mint' in combined: score += 5

    return min(100, score)


def is_fresh_nft_project(info):
    """Strict filter: must be NFT-related AND truly fresh"""
    f = info['followers']
    t = info['tweets']

    # Hard filters — must be fresh
    if f > 20000: return False
    if t > 500: return False

    # Must have NFT keywords in bio or tweet
    bio = info['bio'].lower()
    tweet = info.get('latest_tweet', '').lower()
    combined = bio + ' ' + tweet

    nft_keywords = ['nft', 'collection', 'mint', 'art', 'generative', 'pfp', 'avatar',
                    'opensea', 'blur', 'foundation', 'superrare', 'art blocks',
                    'ordinal', 'inscri', 'allowlist', 'whitelist', 'minting',
                    'free mint', 'claim', 'drop', 'reveal']

    has_nft = any(kw in combined for kw in nft_keywords)
    if not has_nft: return False

    # Skip obvious non-project accounts
    skip_names = ['ethereum', 'bitcoin', 'solana', 'base', 'polygon', 'bnb', 'avalanche',
                  'opensea', 'blur', 'foundation', 'superrare', 'rarible', 'magic eden',
                  'metamask', 'phantom', 'coinbase', 'binance', 'kraken']
    if any(sn in info['username'].lower() for sn in skip_names): return False

    return True


def main():
    init_db()
    db = sqlite3.connect(DB_PATH)

    print(f"[{datetime.now().strftime('%H:%M:%S')}] NFT Scraper v2 (FRESH) starting...")

    all_usernames = []

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
        for query in NFT_SEARCH_QUERIES[:6]:
            print(f'  Searching: {query}')
            found = search_projects(page, query)
            all_usernames.extend(found)
            print(f'    Found {len(found)} accounts')
            time.sleep(2)

        all_usernames = list(set(all_usernames))
        print(f'\n  Total unique: {len(all_usernames)}')

        created = 0
        for username in all_usernames[:12]:
            existing = db.execute("SELECT id FROM NFTProject WHERE username = ?", (username,)).fetchone()
            if existing:
                print(f'  @{username} — already in DB, skip')
                continue

            print(f'\n  Analyzing @{username}...')

            info = scrape_profile(page, username)

            if not is_fresh_nft_project(info):
                print(f'    Skip — not fresh NFT (followers={info["followers"]}, tweets={info["tweets"]})')
                continue

            print(f'    Checking smart followers...')
            smart = scrape_smart_followers(page, username)

            score = score_project(info, len(smart))
            chain = detect_chain(info['bio'] + ' ' + info.get('latest_tweet', ''))
            category = detect_category(info['bio'] + ' ' + info.get('latest_tweet', ''))
            stage = detect_stage(info['bio'] + ' ' + info.get('latest_tweet', ''))
            mint_info = extract_mint_info(info['bio'] + ' ' + info.get('latest_tweet', ''))

            print(f'    ✅ FRESH NFT! Score: {score}')
            print(f'       Followers: {info["followers"]} | Tweets: {info["tweets"]}')
            print(f'       Chain: {chain} | Category: {category} | Stage: {stage}')
            if smart:
                print(f'       ⭐ Smart: {", ".join(["@"+s for s in smart])}')

            proj_id = f"nft-{username}-{int(datetime.now().timestamp())}"

            try:
                db.execute("""
                    INSERT OR REPLACE INTO NFTProject
                    (id, username, name, bio, followers, following, tweetCount, website, chain, category,
                     latestTweet, contractAddress, mintPrice, supply, mintDate, vcs, stage,
                     smartFollowers, smartFollowerCount, score, discoveredAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (proj_id, username, info['name'], info['bio'], info['followers'], info['following'],
                      info['tweets'], info.get('website',''), chain, category,
                      info.get('latest_tweet',''), '', mint_info.get('price',''),
                      mint_info.get('supply',''), '', None, stage,
                      ','.join(smart) if smart else None, len(smart), score))
                db.commit()
                created += 1
            except Exception as e:
                print(f'    DB Error: {e}')

            time.sleep(2)

        browser.close()

    print(f'\n  ✅ Discovered {created} FRESH NFT projects')
    db.close()


if __name__ == "__main__":
    main()
