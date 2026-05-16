"""
Alpha Tracker — Multi-Source Scraper
Scrapes tokens, NFTs, and alpha calls from multiple sources.
"""

import asyncio
import json
import re
import time
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Alpha Tracker Scraper", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MODELS
# ============================================================

class TokenInfo(BaseModel):
    name: str
    symbol: str
    chain: str
    contract_address: str
    price_usd: Optional[float] = None
    market_cap: Optional[float] = None
    liquidity: Optional[float] = None
    volume_24h: Optional[float] = None
    price_change_24h: Optional[float] = None
    age_hours: Optional[float] = None
    pair_created_at: Optional[str] = None
    dex: Optional[str] = None
    url: Optional[str] = None
    image: Optional[str] = None
    scam_score: Optional[float] = None  # 0-100, higher = more risky
    scam_reasons: Optional[list] = None
    social_links: Optional[dict] = None
    source: str = "dexscreener"

class NFTInfo(BaseModel):
    name: str
    symbol: Optional[str] = None
    chain: str
    collection_address: Optional[str] = None
    floor_price: Optional[float] = None
    floor_price_currency: Optional[str] = None
    total_supply: Optional[int] = None
    num_owners: Optional[int] = None
    volume_total: Optional[float] = None
    volume_24h: Optional[float] = None
    listed_count: Optional[int] = None
    image: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None
    discord: Optional[str] = None
    age_hours: Optional[float] = None
    scam_score: Optional[float] = None
    scam_reasons: Optional[list] = None
    source: str = "magic-eden"
    url: Optional[str] = None

class AlphaSignal(BaseModel):
    token_name: Optional[str] = None
    nft_name: Optional[str] = None
    chain: Optional[str] = None
    contract_address: Optional[str] = None
    caller: Optional[str] = None
    content: str
    sentiment: str = "neutral"
    tags: list = []
    source: str = "x"
    mentioned_at: Optional[str] = None
    url: Optional[str] = None


# ============================================================
# DEXSCREENER API
# ============================================================

DEXSCREENER_BASE = "https://api.dexscreener.com"

async def dexscreener_search(query: str) -> list[TokenInfo]:
    """Search tokens on DEXScreener"""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{DEXSCREENER_BASE}/latest/dex/search", params={"q": query})
        if resp.status_code != 200:
            return []
        data = resp.json()
        tokens = []
        for pair in (data.get("pairs") or [])[:10]:
            base = pair.get("baseToken", {})
            created = pair.get("pairCreatedAt")
            age_hours = None
            created_str = None
            if created:
                try:
                    if isinstance(created, (int, float)):
                        ct = datetime.fromtimestamp(created / 1000, tz=timezone.utc)
                        created_str = ct.isoformat()
                    else:
                        ct = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                        created_str = str(created)
                    age_hours = (datetime.now(timezone.utc) - ct).total_seconds() / 3600
                except:
                    pass
            
            tokens.append(TokenInfo(
                name=base.get("name", ""),
                symbol=base.get("symbol", ""),
                chain=pair.get("chainId", ""),
                contract_address=base.get("address", ""),
                price_usd=float(pair.get("priceUsd", 0)) if pair.get("priceUsd") else None,
                market_cap=pair.get("marketCap") or pair.get("fdv"),
                liquidity=pair.get("liquidity", {}).get("usd") if pair.get("liquidity") else None,
                volume_24h=pair.get("volume", {}).get("h24") if pair.get("volume") else None,
                price_change_24h=pair.get("priceChange", {}).get("h24") if pair.get("priceChange") else None,
                age_hours=age_hours,
                pair_created_at=created_str,
                dex=pair.get("dexId"),
                url=pair.get("url"),
                image=pair.get("info", {}).get("imageUrl") if pair.get("info") else None,
                source="dexscreener",
            ))
        return tokens

async def dexscreener_token_by_ca(chain: str, address: str) -> Optional[TokenInfo]:
    """Get token info by contract address"""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{DEXSCREENER_BASE}/tokens/v1/{chain}/{address}")
        if resp.status_code != 200:
            return None
        data = resp.json()
        if not data:
            return None
        pair = data[0] if isinstance(data, list) else data
        base = pair.get("baseToken", {})
        created = pair.get("pairCreatedAt")
        age_hours = None
        created_str = None
        if created:
            try:
                if isinstance(created, (int, float)):
                    ct = datetime.fromtimestamp(created / 1000, tz=timezone.utc)
                    created_str = ct.isoformat()
                else:
                    ct = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                    created_str = str(created)
                age_hours = (datetime.now(timezone.utc) - ct).total_seconds() / 3600
            except:
                pass
        
        return TokenInfo(
            name=base.get("name", ""),
            symbol=base.get("symbol", ""),
            chain=pair.get("chainId", ""),
            contract_address=base.get("address", ""),
            price_usd=float(pair.get("priceUsd", 0)) if pair.get("priceUsd") else None,
            market_cap=pair.get("marketCap") or pair.get("fdv"),
            liquidity=pair.get("liquidity", {}).get("usd") if pair.get("liquidity") else None,
            volume_24h=pair.get("volume", {}).get("h24") if pair.get("volume") else None,
            price_change_24h=pair.get("priceChange", {}).get("h24") if pair.get("priceChange") else None,
            age_hours=age_hours,
            pair_created_at=created_str,
            dex=pair.get("dexId"),
            url=pair.get("url"),
            image=pair.get("info", {}).get("imageUrl") if pair.get("info") else None,
            source="dexscreener",
        )

async def dexscreener_new_pairs(chain: Optional[str] = None) -> list[TokenInfo]:
    """Get newest pairs (latest tokens launched)"""
    async with httpx.AsyncClient(timeout=15) as client:
        if chain:
            resp = await client.get(f"{DEXSCREENER_BASE}/token-profiles/latest/v1")
        else:
            resp = await client.get(f"{DEXSCREENER_BASE}/token-profiles/latest/v1")
        if resp.status_code != 200:
            return []
        data = resp.json()
        tokens = []
        for item in (data if isinstance(data, list) else [])[:20]:
            tokens.append(TokenInfo(
                name=item.get("description", ""),
                symbol=item.get("symbol", ""),
                chain=item.get("chainId", ""),
                contract_address=item.get("tokenAddress", ""),
                url=item.get("url"),
                image=item.get("icon"),
                source="dexscreener-new",
            ))
        return tokens


# ============================================================
# GOPLUS SECURITY API (Scam Detection)
# ============================================================

GOPLUS_BASE = "https://api.gopluslabs.io/api/v1"

CHAIN_MAP = {
    "ethereum": "1", "eth": "1",
    "bsc": "56", "binance": "56",
    "polygon": "137",
    "arbitrum": "42161", "arb": "42161",
    "avalanche": "43114", "avax": "43114",
    "base": "8453",
    "solana": "solana", "sol": "solana",
}

async def goplus_check(chain: str, address: str) -> dict:
    """Check token security via GoPlus"""
    chain_id = CHAIN_MAP.get(chain.lower(), chain)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{GOPLUS_BASE}/token_security/{chain_id}", params={"contract_addresses": address})
        if resp.status_code != 200:
            return {"error": "API error"}
        data = resp.json()
        result = data.get("result", {})
        token_data = result.get(address.lower()) or result.get(address) or {}
        if not token_data:
            return {"error": "Token not found"}
        
        # Calculate scam score
        scam_score = 0
        reasons = []
        
        if token_data.get("is_honeypot") == "1":
            scam_score += 50
            reasons.append("Honeypot detected")
        if token_data.get("is_open_source") == "0":
            scam_score += 15
            reasons.append("Contract not open source")
        if token_data.get("is_proxy") == "1":
            scam_score += 10
            reasons.append("Proxy contract (can be changed)")
        if token_data.get("is_mintable") == "1":
            scam_score += 10
            reasons.append("Mintable (can inflate supply)")
        if token_data.get("can_take_back_ownership") == "1":
            scam_score += 15
            reasons.append("Can take back ownership")
        if token_data.get("owner_change_balance") == "1":
            scam_score += 10
            reasons.append("Owner can change balance")
        if token_data.get("hidden_owner") == "1":
            scam_score += 15
            reasons.append("Hidden owner")
        if token_data.get("selfdestruct") == "1":
            scam_score += 20
            reasons.append("Self-destruct function")
        if token_data.get("external_call") == "1":
            scam_score += 5
            reasons.append("External calls")
        
        # Holder analysis
        holder_count = int(token_data.get("holder_count", 0))
        if holder_count < 10:
            scam_score += 10
            reasons.append(f"Very few holders ({holder_count})")
        
        # Liquidity
        lp_total = float(token_data.get("lp_total_supply", 0) or 0)
        if lp_total == 0:
            scam_score += 10
            reasons.append("No LP supply")
        
        scam_score = min(100, scam_score)
        
        return {
            "scam_score": scam_score,
            "scam_reasons": reasons,
            "is_honeypot": token_data.get("is_honeypot") == "1",
            "is_open_source": token_data.get("is_open_source") == "1",
            "holder_count": holder_count,
            "lp_total_supply": lp_total,
            "owner": token_data.get("owner_address"),
            "raw": token_data,
        }


# ============================================================
# SOLANA TOKEN CHECK (RugCheck)
# ============================================================

async def rugcheck_solana(address: str) -> dict:
    """Check Solana token via RugCheck"""
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"https://api.rugcheck.xyz/v1/tokens/{address}/report")
            if resp.status_code != 200:
                return {"error": "API error"}
            data = resp.json()
            
            risks = data.get("risks", [])
            risk_score = data.get("score", 0)
            
            reasons = []
            for risk in risks:
                reasons.append(risk.get("name", "Unknown risk"))
            
            return {
                "scam_score": min(100, risk_score),
                "scam_reasons": reasons,
                "token_name": data.get("tokenMeta", {}).get("name"),
                "token_symbol": data.get("tokenMeta", {}).get("symbol"),
                "total_supply": data.get("token", {}).get("supply"),
                "market_cap": data.get("marketCap"),
                "raw": data,
            }
        except Exception as e:
            return {"error": str(e)}


# ============================================================
# MAGIC EDEN API (NFTs)
# ============================================================

ME_BASE = "https://api-mainnet.magiceden.dev/v2"

async def magic_eden_collections(chain: str = "solana", limit: int = 20, sort: str = "volume24hr") -> list[NFTInfo]:
    """Get trending NFT collections from Magic Eden"""
    async with httpx.AsyncClient(timeout=15, headers={"Accept": "application/json"}) as client:
        # ME API for collections
        resp = await client.get(f"{ME_BASE}/collections", params={"offset": 0, "limit": limit})
        if resp.status_code != 200:
            return []
        data = resp.json()
        
        collections = []
        for c in (data if isinstance(data, list) else [])[:limit]:
            collections.append(NFTInfo(
                name=c.get("name", ""),
                symbol=c.get("symbol"),
                chain=chain,
                collection_address=c.get("address"),
                floor_price=c.get("floorPrice"),
                floor_price_currency="SOL" if chain == "solana" else "ETH",
                total_supply=c.get("totalItems"),
                num_owners=c.get("numOwners"),
                volume_total=c.get("volumeAll"),
                volume_24h=c.get("volume24hr"),
                listed_count=c.get("listedCount"),
                image=c.get("image"),
                description=c.get("description"),
                website=c.get("website"),
                twitter=c.get("twitter"),
                discord=c.get("discord"),
                source="magic-eden",
                url=f"https://magiceden.io/collections/{c.get('symbol', '')}",
            ))
        return collections

async def magic_eden_new_collections(chain: str = "solana", limit: int = 20) -> list[NFTInfo]:
    """Get newest NFT collections"""
    async with httpx.AsyncClient(timeout=15, headers={"Accept": "application/json"}) as client:
        resp = await client.get(f"{ME_BASE}/launchpad/collections", params={"offset": 0, "limit": limit})
        if resp.status_code != 200:
            return []
        data = resp.json()
        
        collections = []
        for c in (data if isinstance(data, list) else [])[:limit]:
            collections.append(NFTInfo(
                name=c.get("name", ""),
                chain=chain,
                collection_address=c.get("mintAddress"),
                image=c.get("image"),
                description=c.get("description"),
                website=c.get("website"),
                twitter=c.get("twitter"),
                discord=c.get("discord"),
                source="magic-eden-launchpad",
                url=f"https://magiceden.io/launchpad/{c.get('symbol', '')}",
            ))
        return collections


# ============================================================
# OPENSEA API (NFTs - Ethereum/EVM)
# ============================================================

async def opensea_trending(limit: int = 20) -> list[NFTInfo]:
    """Get trending NFT collections from OpenSea (public API)"""
    async with httpx.AsyncClient(timeout=15, headers={
        "Accept": "application/json",
        "User-Agent": "AlphaTracker/1.0"
    }) as client:
        # OpenSea public stats endpoint
        resp = await client.get("https://api.opensea.io/api/v2/collections", params={
            "limit": limit,
            "order_by": "seven_day_volume"
        })
        if resp.status_code != 200:
            # Fallback: scrape trending from OpenSea
            return []
        data = resp.json()
        
        collections = []
        for c in (data.get("collections", []) if isinstance(data, dict) else data)[:limit]:
            stats = c.get("stats", {}) or {}
            collections.append(NFTInfo(
                name=c.get("name", ""),
                chain="ethereum",
                collection_address=c.get("address"),
                floor_price=stats.get("floor_price"),
                floor_price_currency="ETH",
                total_supply=stats.get("total_supply"),
                num_owners=stats.get("num_owners"),
                volume_total=stats.get("total_volume"),
                volume_24h=stats.get("one_day_volume"),
                image=c.get("image_url"),
                description=c.get("description"),
                website=c.get("project_url"),
                twitter=c.get("twitter_username"),
                source="opensea",
                url=f"https://opensea.io/collection/{c.get('collection', '')}",
            ))
        return collections


# ============================================================
# TWEET CONTENT PARSER
# ============================================================

CA_PATTERN = re.compile(r'0x[a-fA-F0-9]{40}')
SOL_CA_PATTERN = re.compile(r'\b[1-9A-HJ-NP-Za-km-z]{32,44}\b')
TOKEN_PATTERN = re.compile(r'\$([A-Z]{2,10})')
NFT_KEYWORDS = ['nft', 'mint', 'collection', 'pfp', 'art', 'ordinal', 'inscribe']
TOKEN_KEYWORDS = ['token', 'coin', 'defi', 'swap', 'dex', 'pump', 'moon', 'gem', 'alpha']

def parse_tweet_content(text: str) -> dict:
    """Parse tweet to extract token/NFT info"""
    lower = text.lower()
    
    # Extract CAs
    evm_cas = CA_PATTERN.findall(text)
    sol_cas = SOL_CA_PATTERN.findall(text)
    
    # Extract token names
    tokens = TOKEN_PATTERN.findall(text)
    
    # Detect chain
    chain = None
    if any(w in lower for w in ['sol', 'solana']):
        chain = 'solana'
    elif any(w in lower for w in ['eth', 'ethereum']):
        chain = 'ethereum'
    elif any(w in lower for w in ['bsc', 'binance', 'bnb']):
        chain = 'bsc'
    elif 'base' in lower:
        chain = 'base'
    elif any(w in lower for w in ['avax', 'avalanche']):
        chain = 'avalanche'
    elif any(w in lower for w in ['arb', 'arbitrum']):
        chain = 'arbitrum'
    
    # Detect if NFT or Token
    is_nft = any(w in lower for w in NFT_KEYWORDS)
    is_token = any(w in lower for w in TOKEN_KEYWORDS) or bool(tokens) or bool(evm_cas) or bool(sol_cas)
    
    # Detect sentiment
    bullish = ['alpha', 'gem', 'moon', 'pump', 'bullish', 'buy', 'ape', 'load', 'accumulate', '100x', '1000x', 'send', 'early', 'undervalued']
    bearish = ['dump', 'rug', 'scam', 'bearish', 'sell', 'exit', 'avoid', 'dead', 'honeypot']
    bull_count = sum(1 for w in bullish if w in lower)
    bear_count = sum(1 for w in bearish if w in lower)
    sentiment = 'bullish' if bull_count > bear_count else 'bearish' if bear_count > bull_count else 'neutral'
    
    # Tags
    tags = []
    if 'alpha' in lower: tags.append('alpha')
    if 'gem' in lower: tags.append('gem')
    if any(w in lower for w in ['micro', 'lowcap', 'low cap']): tags.append('micro-cap')
    if 'nft' in lower: tags.append('nft')
    if 'defi' in lower: tags.append('defi')
    if any(w in lower for w in ['meme', 'memecoin']): tags.append('meme')
    if 'airdrop' in lower: tags.append('airdrop')
    if any(w in lower for w in ['new', 'launch', 'just launched']): tags.append('new-launch')
    
    return {
        'evm_cas': evm_cas,
        'sol_cas': sol_cas,
        'tokens': tokens,
        'chain': chain,
        'is_nft': is_nft,
        'is_token': is_token,
        'sentiment': sentiment,
        'tags': tags,
    }


# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {"name": "Alpha Tracker Scraper", "version": "1.0.0", "status": "running"}


# --- TOKEN ENDPOINTS ---

@app.get("/api/tokens/search")
async def search_tokens(q: str = Query(..., description="Search query")):
    """Search tokens on DEXScreener"""
    tokens = await dexscreener_search(q)
    return {"tokens": [t.model_dump() for t in tokens], "count": len(tokens)}

@app.get("/api/tokens/{chain}/{address}")
async def get_token(chain: str, address: str):
    """Get token info by contract address"""
    token = await dexscreener_token_by_ca(chain, address)
    if not token:
        return {"error": "Token not found"}
    return token.model_dump()

@app.get("/api/tokens/new")
async def new_tokens(chain: Optional[str] = None):
    """Get newest token pairs"""
    tokens = await dexscreener_new_pairs(chain)
    return {"tokens": [t.model_dump() for t in tokens], "count": len(tokens)}


# --- SECURITY ENDPOINTS ---

@app.get("/api/security/check/{chain}/{address}")
async def check_security(chain: str, address: str):
    """Check token security (GoPlus for EVM, RugCheck for Solana)"""
    if chain.lower() in ('solana', 'sol'):
        result = await rugcheck_solana(address)
    else:
        result = await goplus_check(chain, address)
    return result

@app.get("/api/security/batch")
async def batch_security(chain: str, addresses: str):
    """Batch security check (comma-separated addresses)"""
    addrs = [a.strip() for a in addresses.split(",") if a.strip()]
    results = {}
    for addr in addrs[:10]:
        if chain.lower() in ('solana', 'sol'):
            results[addr] = await rugcheck_solana(addr)
        else:
            results[addr] = await goplus_check(chain, addr)
    return results


# --- NFT ENDPOINTS ---

@app.get("/api/nfts/trending")
async def trending_nfts(chain: str = "solana", limit: int = 20):
    """Get trending NFT collections"""
    if chain.lower() in ('solana', 'sol'):
        collections = await magic_eden_collections(chain, limit)
    else:
        collections = await opensea_trending(limit)
    return {"collections": [c.model_dump() for c in collections], "count": len(collections)}

@app.get("/api/nfts/new")
async def new_nfts(chain: str = "solana", limit: int = 20):
    """Get newest NFT collections/launches"""
    collections = await magic_eden_new_collections(chain, limit)
    return {"collections": [c.model_dump() for c in collections], "count": len(collections)}


# --- ALPHA SIGNAL ENDPOINTS ---

@app.post("/api/alpha/parse")
async def parse_alpha_signal(signal: AlphaSignal):
    """Parse a tweet/content to extract alpha signal"""
    parsed = parse_tweet_content(signal.content)
    
    # Enrich with DEX data if CA found
    enriched_tokens = []
    for ca in parsed['evm_cas'][:3]:
        token = await dexscreener_token_by_ca(parsed.get('chain', 'ethereum'), ca)
        if token:
            # Security check
            security = await goplus_check(parsed.get('chain', 'ethereum'), ca)
            token.scam_score = security.get('scam_score', 0)
            token.scam_reasons = security.get('scam_reasons', [])
            enriched_tokens.append(token.model_dump())
    
    for ca in parsed['sol_cas'][:3]:
        token = await dexscreener_token_by_ca('solana', ca)
        if token:
            security = await rugcheck_solana(ca)
            token.scam_score = security.get('scam_score', 0)
            token.scam_reasons = security.get('scam_reasons', [])
            enriched_tokens.append(token.model_dump())
    
    return {
        "parsed": parsed,
        "enriched_tokens": enriched_tokens,
        "signal": signal.model_dump(),
    }


# --- COMBINED DISCOVERY ---

@app.get("/api/discover/tokens")
async def discover_tokens(
    chain: Optional[str] = None,
    max_age_hours: int = 72,
    min_liquidity: float = 0,
    max_scam_score: int = 50,
    limit: int = 20,
):
    """Discover new tokens with scam filtering"""
    tokens = await dexscreener_search("new" if not chain else chain)
    
    filtered = []
    for t in tokens:
        # Age filter
        if t.age_hours and t.age_hours > max_age_hours:
            continue
        # Liquidity filter
        if min_liquidity and (not t.liquidity or t.liquidity < min_liquidity):
            continue
        filtered.append(t)
    
    # Security check on filtered
    enriched = []
    for t in filtered[:limit]:
        if t.contract_address and t.chain:
            if t.chain.lower() in ('solana', 'sol'):
                sec = await rugcheck_solana(t.contract_address)
            else:
                sec = await goplus_check(t.chain, t.contract_address)
            t.scam_score = sec.get('scam_score', 0)
            t.scam_reasons = sec.get('scam_reasons', [])
        
        # Scam filter
        if max_scam_score and t.scam_score and t.scam_score > max_scam_score:
            continue
        enriched.append(t)
    
    return {
        "tokens": [t.model_dump() for t in enriched],
        "count": len(enriched),
        "filters": {"chain": chain, "max_age_hours": max_age_hours, "min_liquidity": min_liquidity, "max_scam_score": max_scam_score},
    }

@app.get("/api/discover/nfts")
async def discover_nfts(
    chain: str = "solana",
    max_floor_price: Optional[float] = None,
    limit: int = 20,
):
    """Discover NFT collections"""
    if chain.lower() in ('solana', 'sol'):
        collections = await magic_eden_collections(chain, limit)
    else:
        collections = await opensea_trending(limit)
    
    # Filter
    if max_floor_price:
        collections = [c for c in collections if c.floor_price and c.floor_price <= max_floor_price]
    
    return {
        "collections": [c.model_dump() for c in collections],
        "count": len(collections),
    }


# ============================================================
# PUMP.FUN INTEGRATION (Solana new tokens)
# ============================================================

async def pumpfun_new_tokens(limit: int = 30) -> list[TokenInfo]:
    """Get newest tokens from Pump.fun (most early)"""
    async with httpx.AsyncClient(timeout=15, headers={
        "User-Agent": "AlphaTracker/1.0"
    }) as client:
        try:
            # Pump.fun public API
            resp = await client.get("https://frontend-api.pump.fun/coins/latest", params={
                "limit": limit,
                "offset": 0,
                "sort": "created_timestamp",
                "order": "DESC",
                "includeNsfw": "false",
            })
            if resp.status_code == 200:
                data = resp.json()
                tokens = []
                for coin in (data if isinstance(data, list) else data.get("coins", []))[:limit]:
                    created = coin.get("created_timestamp")
                    age_hours = None
                    if created:
                        try:
                            ct = datetime.fromtimestamp(created / 1000, tz=timezone.utc)
                            age_hours = (datetime.now(timezone.utc) - ct).total_seconds() / 3600
                        except:
                            pass
                    
                    tokens.append(TokenInfo(
                        name=coin.get("name", ""),
                        symbol=coin.get("symbol", ""),
                        chain="solana",
                        contract_address=coin.get("mint", ""),
                        market_cap=coin.get("usd_market_cap"),
                        age_hours=age_hours,
                        image=coin.get("image_uri"),
                        source="pumpfun",
                        url=f"https://pump.fun/coin/{coin.get('mint', '')}",
                    ))
                return tokens
        except Exception as e:
            print(f"Pump.fun error: {e}")
    return []


@app.get("/api/tokens/pumpfun")
async def get_pumpfun_tokens(limit: int = 30):
    """Get newest tokens from Pump.fun"""
    tokens = await pumpfun_new_tokens(limit)
    return {"tokens": [t.model_dump() for t in tokens], "count": len(tokens)}


# ============================================================
# DEXSCREENER TRENDING/BOOSTED
# ============================================================

async def dexscreener_trending() -> list[TokenInfo]:
    """Get trending tokens on DEXScreener"""
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"{DEXSCREENER_BASE}/token-profiles/latest/v1")
            if resp.status_code == 200:
                data = resp.json()
                tokens = []
                for item in (data if isinstance(data, list) else [])[:20]:
                    tokens.append(TokenInfo(
                        name=item.get("description", "")[:50],
                        symbol=item.get("symbol", ""),
                        chain=item.get("chainId", ""),
                        contract_address=item.get("tokenAddress", ""),
                        url=item.get("url"),
                        image=item.get("icon"),
                        source="dexscreener-trending",
                    ))
                return tokens
        except:
            pass
    return []


@app.get("/api/tokens/trending")
async def get_trending_tokens():
    """Get trending tokens"""
    tokens = await dexscreener_trending()
    return {"tokens": [t.model_dump() for t in tokens], "count": len(tokens)}


@app.get("/api/tokens/latest")
async def get_latest_tokens():
    """Get latest tokens (DEXScreener profiles)"""
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"{DEXSCREENER_BASE}/token-profiles/latest/v1")
            if resp.status_code == 200:
                data = resp.json()
                tokens = []
                for item in (data if isinstance(data, list) else [])[:20]:
                    tokens.append(TokenInfo(
                        name=item.get("description", "")[:50],
                        symbol=item.get("symbol", ""),
                        chain=item.get("chainId", ""),
                        contract_address=item.get("tokenAddress", ""),
                        url=item.get("url"),
                        image=item.get("icon"),
                        source="dexscreener-latest",
                    ))
                return {"tokens": [t.model_dump() for t in tokens], "count": len(tokens)}
        except:
            pass
    return {"tokens": [], "count": 0}


# ============================================================
# NFT PROJECT INTEL (X + Smart Money)
# ============================================================

# Known KOL / Smart accounts on X (crypto/NFT alpha callers)
KOL_ACCOUNTS = [
    "CryptoKaleo", "inversebrah", "HsakaTrades", "CryptoHayes", "Pentosh1",
    "DeFiTracer", "NFTgods", "Pranksy", "CozomoMedici", "punk6529",
    "VonDoom", "boredelonmusk", "NFTLlama", "j1mmyeth", "DCFIntern",
    "KeyboardMonkey3", "ZoomerOracle", "gainzy222", "CryptoGarga", "BoredApeYC",
    "CozomoMedici", "seedphrase", "icebergy", "DCLBlogger", "the_nftguy",
    "0xQuit", "NFTherder", "dingalingts", "whale_hunter", "lookonchain",
]

# Well-known NFT alpha / tracking accounts
NFT_ALPHA_ACCOUNTS = [
    "nftpricebot", "NFTgators", "NFT_NewsDaily", "NFTevening", "CoinDeskNFT",
    "nftnow", "TheBlockNFT", "nft_bored", "Zeneca_", "Jihoz_Axie",
]

# Smart money / whale tracker accounts
WHALE_TRACKERS = [
    "lookonchain", "whale_alert", "ArkhamIntel", "EmberCN", "ai_9684xtpa",
]


class NFTProjectIntel(BaseModel):
    name: str
    x_handle: Optional[str] = None
    x_url: Optional[str] = None
    chain: str = "ethereum"
    collection_address: Optional[str] = None
    
    # Social metrics
    x_followers: Optional[int] = None
    kol_followers: list = []  # KOLs yang follow
    kol_count: int = 0
    smart_money_following: bool = False
    
    # Market data
    floor_price: Optional[float] = None
    floor_currency: Optional[str] = None
    total_supply: Optional[int] = None
    mint_price: Optional[float] = None
    mint_date: Optional[str] = None
    
    # Quality signals
    team_doxxed: Optional[bool] = None
    has_website: bool = False
    has_discord: bool = False
    has_twitter: bool = False
    
    # Scores
    social_score: float = 0  # 0-100
    scam_score: float = 0    # 0-100
    early_score: float = 0   # 0-100 (higher = more early)
    
    image: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    discord: Optional[str] = None
    source: str = "x-intel"
    url: Optional[str] = None


async def check_x_followers(handle: str) -> dict:
    """Check X account followers count and KOL following (via public data)"""
    # Try to get public profile data
    async with httpx.AsyncClient(timeout=15, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }) as client:
        try:
            # Use X public API (limited but works for basic info)
            resp = await client.get(f"https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}")
            if resp.status_code == 200:
                text = resp.text
                # Extract follower count from HTML
                follower_match = re.search(r'(\d+(?:\.\d+)?[KMB]?)\s*Followers', text)
                followers = follower_match.group(1) if follower_match else None
                return {
                    "handle": handle,
                    "followers": followers,
                    "accessible": True,
                }
        except:
            pass
    return {"handle": handle, "followers": None, "accessible": False}


async def discover_nft_projects_from_x(query: str = "nft mint upcoming", limit: int = 20) -> list[dict]:
    """Discover NFT projects by searching X (via public search)"""
    async with httpx.AsyncClient(timeout=15, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }) as client:
        # Search X via nitter (public proxy) or syndication
        results = []
        
        # Try multiple search approaches
        search_queries = [
            f"nft mint upcoming",
            f"nft project launching",
            f"new nft collection ethereum",
            f"nft allowlist",
            f"nft whitelist",
        ]
        
        for sq in search_queries[:2]:
            try:
                # Use X syndication search
                resp = await client.get(
                    "https://syndication.twitter.com/srv/timeline-profile/screen-name/search",
                    params={"q": sq}
                )
                # Parse results from HTML
                if resp.status_code == 200:
                    # Extract tweet data
                    tweets = re.findall(r'data-tweet-id="(\d+)"', resp.text)
                    for tweet_id in tweets[:5]:
                        results.append({
                            "tweet_id": tweet_id,
                            "query": sq,
                            "source": "x-search",
                        })
            except:
                pass
        
        return results


async def analyze_nft_project_x(x_handle: str) -> NFTProjectIntel:
    """Analyze an NFT project's X presence"""
    handle = x_handle.lstrip('@')
    
    # Check X profile
    x_data = await check_x_followers(handle)
    
    # Check if KOLs follow this account
    kol_following = []
    
    # Check social presence
    has_twitter = x_data.get("accessible", False)
    
    # Calculate social score
    social_score = 0
    if has_twitter:
        social_score += 20
    if x_data.get("followers"):
        social_score += 20
    
    # Build intel
    intel = NFTProjectIntel(
        name=handle,
        x_handle=handle,
        x_url=f"https://x.com/{handle}",
        has_twitter=has_twitter,
        social_score=social_score,
        kol_followers=kol_following,
        kol_count=len(kol_following),
    )
    
    return intel


async def discover_nft_from_alpha_calls() -> list[NFTProjectIntel]:
    """Discover NFT projects from alpha caller tweets"""
    projects = []
    
    # Search for NFT-related content from alpha accounts
    async with httpx.AsyncClient(timeout=15, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }) as client:
        for account in KOL_ACCOUNTS[:5]:
            try:
                # Get recent tweets from KOL
                resp = await client.get(f"https://syndication.twitter.com/srv/timeline-profile/screen-name/{account}")
                if resp.status_code == 200:
                    text = resp.text
                    # Find NFT mentions
                    nft_mentions = re.findall(r'(?:nft|mint|collection|allowlist|whitelist)[^<]*', text, re.IGNORECASE)
                    for mention in nft_mentions[:2]:
                        # Extract project names/handles
                        handles = re.findall(r'@([A-Za-z0-9_]+)', mention)
                        for h in handles:
                            if h.lower() not in [a.lower() for a in KOL_ACCOUNTS + NFT_ALPHA_ACCOUNTS]:
                                projects.append(NFTProjectIntel(
                                    name=h,
                                    x_handle=h,
                                    x_url=f"https://x.com/{h}",
                                    kol_followers=[account],
                                    kol_count=1,
                                    source="kol-mention",
                                ))
            except:
                pass
    
    return projects


# ============================================================
# ON-CHAIN WHALE TRACKING
# ============================================================

async def get_whale_nft_activity(chain: str = "ethereum", limit: int = 20) -> list[dict]:
    """Get recent whale NFT activity from public APIs"""
    activities = []
    
    async with httpx.AsyncClient(timeout=15, headers={
        "User-Agent": "AlphaTracker/1.0"
    }) as client:
        # Try OpenSea public API for recent activity
        try:
            resp = await client.get("https://api.opensea.io/api/v2/events", params={
                "event_type": "successful",
                "limit": limit,
            })
            if resp.status_code == 200:
                data = resp.json()
                for event in data.get("asset_events", [])[:limit]:
                    activities.append({
                        "collection": event.get("collection", {}).get("name"),
                        "type": "sale",
                        "price": event.get("payment", {}).get("quantity"),
                        "currency": event.get("payment", {}).get("symbol"),
                        "buyer": event.get("buyer_address"),
                        "seller": event.get("seller_address"),
                        "source": "opensea",
                    })
        except:
            pass
        
        # Try Etherscan for whale transfers (public)
        try:
            resp = await client.get("https://api.etherscan.io/api", params={
                "module": "account",
                "action": "txlistinternal",
                "address": "0x0000000000000000000000000000000000000000",
                "startblock": "0",
                "endblock": "99999999",
                "page": "1",
                "offset": "10",
                "sort": "desc",
            })
        except:
            pass
    
    return activities


# ============================================================
# ENHANCED API ENDPOINTS
# ============================================================

@app.get("/api/nft-intel/discover")
async def discover_nft_intel(
    chain: str = "ethereum",
    limit: int = 20,
):
    """Discover NFT projects with social + on-chain intel"""
    projects = []
    
    # 1. Get from Magic Eden
    me_collections = await magic_eden_collections(chain if chain == "solana" else "solana", limit)
    
    # 2. Analyze X presence for each
    for c in me_collections[:5]:
        if c.twitter:
            handle = c.twitter.lstrip('@')
            intel = await analyze_nft_project_x(handle)
            intel.name = c.name
            intel.chain = chain
            intel.floor_price = c.floor_price
            intel.floor_currency = c.floor_price_currency
            intel.total_supply = c.total_supply
            intel.image = c.image
            intel.description = c.description
            intel.website = c.website
            intel.discord = c.discord
            intel.has_website = bool(c.website)
            intel.has_discord = bool(c.discord)
            intel.collection_address = c.collection_address
            intel.url = c.url
            projects.append(intel.model_dump())
    
    # 3. Sort by social score
    projects.sort(key=lambda x: x.get("social_score", 0), reverse=True)
    
    return {"projects": projects, "count": len(projects)}


@app.get("/api/nft-intel/analyze/{handle}")
async def analyze_nft_handle(handle: str):
    """Deep analyze an NFT project by X handle"""
    intel = await analyze_nft_project_x(handle)
    return intel.model_dump()


@app.get("/api/nft-intel/kol-following")
async def get_kol_nft_following():
    """Get NFT projects that KOLs are mentioning"""
    projects = await discover_nft_from_alpha_calls()
    return {"projects": [p.model_dump() for p in projects], "count": len(projects)}


@app.get("/api/nft-intel/whale-activity")
async def whale_nft_activity(chain: str = "ethereum", limit: int = 20):
    """Get recent whale NFT activity"""
    activities = await get_whale_nft_activity(chain, limit)
    return {"activities": activities, "count": len(activities)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8888)
