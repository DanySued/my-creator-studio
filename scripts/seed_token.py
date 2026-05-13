"""
seed_token.py — Manually add an Instagram account to the Creator Studio DB
using a token you already have (skips the OAuth redirect flow).

Usage: python seed_token.py
"""

import json
import uuid
import urllib.request
import urllib.error
from datetime import datetime, timedelta

# ── Paste your IGAF... token here ─────────────────────────────────────────────
ACCESS_TOKEN = "IGAF5yRWzOr9BBZAGF4QjJlc0dRMjc0ZAFVBQXZAPVjlMYU9PZAHU2SXd6RmVCamhSbkNkMzhtWjY0elFtN1g3WDl5MHdRajhGaTVoM2NJY1RYRjZAkZAEt0cmZAhdUVwLTBwUWNNQWxqbm51UFg1dHpUTjczWXV4NFZA5ZAnJTbW9qQlNWUQZDZD"

GRAPH_BASE   = "https://graph.instagram.com"
DB_PATH      = "api/data/studio.db"   # relative to this script

# ── Step 1: Upgrade to long-lived token (~60 days) ────────────────────────────
import os
import sys

# Read app secret from .env
env = {}
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()

app_secret = env.get("INSTAGRAM_APP_SECRET", "")

def get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

print("=" * 55)
print("  Creator Studio — Manual Token Seeder")
print("=" * 55)

# Try to upgrade to long-lived token
long_lived_token = ACCESS_TOKEN
expires_at = None

if app_secret:
    print("\n[1/3] Upgrading to long-lived token (60 days)…")
    try:
        url = (
            f"{GRAPH_BASE}/access_token"
            f"?grant_type=ig_exchange_token"
            f"&client_secret={app_secret}"
            f"&access_token={ACCESS_TOKEN}"
        )
        data = get(url)
        long_lived_token = data.get("access_token", ACCESS_TOKEN)
        expires_in = data.get("expires_in", 0)
        expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat() if expires_in else None
        print(f"      ✅ Long-lived token obtained (expires in {expires_in // 86400} days)")
    except Exception as e:
        print(f"      ⚠️  Could not upgrade token: {e}. Using short-lived token.")
else:
    print("\n[1/3] Skipping token upgrade (INSTAGRAM_APP_SECRET not found in .env)")

# ── Step 2: Fetch account info ────────────────────────────────────────────────
print("\n[2/3] Fetching Instagram account info…")
try:
    fields = "id,username,name,profile_picture_url,followers_count,following_count,account_type"
    data = get(f"{GRAPH_BASE}/me?fields={fields}&access_token={long_lived_token}")
    username    = data.get("username", "")
    ig_user_id  = data.get("id", "")
    full_name   = data.get("name", username)
    avatar_url  = data.get("profile_picture_url", "")
    followers   = data.get("followers_count", 0)
    following   = data.get("following_count", 0)
    print(f"      ✅ Got account: @{username} (id={ig_user_id})")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"\n[ERROR] Could not fetch account info:\n  HTTP {e.code}: {body[:400]}")
    print("\nThe token may be expired or lack required permissions.")
    print("Required scopes: instagram_business_basic")
    input("\nPress Enter to exit…")
    sys.exit(1)
except Exception as e:
    print(f"\n[ERROR] {e}")
    input("\nPress Enter to exit…")
    sys.exit(1)

# ── Step 3: Upsert into SQLite DB ─────────────────────────────────────────────
print(f"\n[3/3] Saving @{username} to database…")

import sqlite3

db_abs = os.path.join(os.path.dirname(__file__), DB_PATH)
if not os.path.exists(db_abs):
    # Try to find it
    for root, dirs, files in os.walk(os.path.dirname(__file__)):
        for f in files:
            if f == "studio.db":
                db_abs = os.path.join(root, f)
                break

if not os.path.exists(db_abs):
    print(f"\n[ERROR] Database not found at {db_abs}")
    print("Make sure Docker is running and the app has been started at least once.")
    input("\nPress Enter to exit…")
    sys.exit(1)

conn = sqlite3.connect(db_abs)
cur  = conn.cursor()

# Check if account already exists
cur.execute("SELECT id FROM instagramaccount WHERE username = ?", (username,))
row = cur.fetchone()
account_id = row[0] if row else str(uuid.uuid4())

now = datetime.utcnow().isoformat()

cur.execute("""
    INSERT INTO instagramaccount
        (id, username, instagram_user_id, access_token, token_expires_at,
         auth_method, status, avatar_url, full_name,
         follower_count, following_count, last_active, created_at)
    VALUES (?, ?, ?, ?, ?, 'oauth', 'connected', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
        instagram_user_id  = excluded.instagram_user_id,
        access_token       = excluded.access_token,
        token_expires_at   = excluded.token_expires_at,
        auth_method        = 'oauth',
        status             = 'connected',
        avatar_url         = excluded.avatar_url,
        full_name          = excluded.full_name,
        follower_count     = excluded.follower_count,
        following_count    = excluded.following_count,
        last_active        = excluded.last_active
""", (
    account_id, username, ig_user_id, long_lived_token, expires_at,
    avatar_url, full_name, followers, following, now, now
))

# Log it
cur.execute("""
    INSERT OR IGNORE INTO activitylog (id, account_username, action_type, message, created_at)
    VALUES (?, ?, 'oauth_connect', ?, ?)
""", (str(uuid.uuid4()), username, f"@{username} manually seeded via token", now))

conn.commit()
conn.close()

print(f"      ✅ @{username} saved (id={account_id})")

print("\n" + "=" * 55)
print("  ✅  DONE!")
print(f"  Account @{username} is now in the database.")
print("  Refresh the Accounts page in Creator Studio.")
print("=" * 55)

input("\nPress Enter to close…")
