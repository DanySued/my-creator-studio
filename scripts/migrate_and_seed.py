"""
migrate_and_seed.py
Run inside the API container:
  docker exec my-creator-studio-api-1 python /app/migrate_and_seed.py

1. Adds missing OAuth columns to instagramaccounts table (safe — skips existing ones)
2. Fetches profile info from the IGAF token
3. Upserts the account into the DB
"""

import os, sys, json, uuid, sqlite3, urllib.request, urllib.error
from datetime import datetime, timedelta

# ── Config ────────────────────────────────────────────────────────────────────
ACCESS_TOKEN = "IGAF5yRWzOr9BBZAGF4QjJlc0dRMjc0ZAFVBQXZAPVjlMYU9PZAHU2SXd6RmVCamhSbkNkMzhtWjY0elFtN1g3WDl5MHdRajhGaTVoM2NJY1RYRjZAkZAEt0cmZAhdUVwLTBwUWNNQWxqbm51UFg1dHpUTjczWXV4NFZA5ZAnJTbW9qQlNWUQZDZD"
GRAPH_BASE   = "https://graph.instagram.com"
DB_PATH      = os.path.join(os.getenv("DATA_DIR", "/data"), "studio.db")

def get(url):
    with urllib.request.urlopen(url, timeout=15) as r:
        return json.loads(r.read())

print("=" * 55)
print("  Creator Studio — Migrate + Seed")
print("=" * 55)

# ── 1. Add missing columns (ALTER TABLE IF NOT EXISTS equivalent) ──────────────
print("\n[1/4] Running schema migration…")
conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

cur.execute("PRAGMA table_info(instagram_accounts)")
existing_cols = {row[1] for row in cur.fetchall()}
print(f"      Existing columns: {', '.join(sorted(existing_cols))}")

NEW_COLS = [
    ("instagram_user_id",  "TEXT"),
    ("access_token",       "TEXT"),
    ("token_expires_at",   "DATETIME"),
    ("auth_method",        "TEXT DEFAULT 'password'"),
    ("avatar_url",         "TEXT"),
    ("full_name",          "TEXT"),
    ("follower_count",     "INTEGER DEFAULT 0"),
    ("following_count",    "INTEGER DEFAULT 0"),
    ("last_active",        "DATETIME"),
]

added = []
for col_name, col_type in NEW_COLS:
    if col_name not in existing_cols:
        cur.execute(f"ALTER TABLE instagram_accounts ADD COLUMN {col_name} {col_type}")
        added.append(col_name)

conn.commit()
if added:
    print(f"      ✅ Added columns: {', '.join(added)}")
else:
    print("      ✅ Schema already up to date — no changes needed")

# ── 2. Upgrade token to long-lived ────────────────────────────────────────────
print("\n[2/4] Upgrading to long-lived token (~60 days)…")
app_secret = os.getenv("INSTAGRAM_APP_SECRET", "")
long_token = ACCESS_TOKEN
expires_at = None

if app_secret:
    try:
        data = get(
            f"{GRAPH_BASE}/access_token"
            f"?grant_type=ig_exchange_token"
            f"&client_secret={app_secret}"
            f"&access_token={ACCESS_TOKEN}"
        )
        long_token = data.get("access_token", ACCESS_TOKEN)
        expires_in = data.get("expires_in", 0)
        if expires_in:
            expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
            print(f"      ✅ Long-lived token obtained (expires in {expires_in // 86400} days)")
        else:
            print("      ⚠️  Token upgraded but no expiry returned")
    except Exception as e:
        print(f"      ⚠️  Upgrade failed ({e}) — using original token")
else:
    print("      ⚠️  INSTAGRAM_APP_SECRET not set — using short-lived token as-is")

# ── 3. Fetch Instagram profile ────────────────────────────────────────────────
print("\n[3/4] Fetching Instagram profile…")
try:
    fields = "id,username,name,profile_picture_url,followers_count,account_type"
    info = get(f"{GRAPH_BASE}/me?fields={fields}&access_token={long_token}")
    username   = info.get("username", "")
    ig_user_id = info.get("id", "")
    full_name  = info.get("name", username)
    avatar_url = info.get("profile_picture_url", "")
    followers  = info.get("followers_count", 0)
    following  = 0  # not available in instagram_business_basic scope
    print(f"      ✅ @{username}  (id={ig_user_id}, {followers} followers)")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"\n[ERROR] Instagram API returned HTTP {e.code}:\n{body[:500]}")
    print("\nThe token may be expired or missing the 'instagram_business_basic' scope.")
    sys.exit(1)

# ── 4. Upsert account ─────────────────────────────────────────────────────────
print(f"\n[4/4] Saving @{username} to database…")
now = datetime.utcnow().isoformat()

cur.execute("SELECT id FROM instagram_accounts WHERE username = ?", (username,))
row = cur.fetchone()
account_id = row[0] if row else str(uuid.uuid4())

if row:
    cur.execute("""
        UPDATE instagram_accounts SET
            instagram_user_id = ?, access_token = ?, token_expires_at = ?,
            auth_method = 'oauth', status = 'connected',
            avatar_url = ?, full_name = ?,
            follower_count = ?, following_count = ?, last_active = ?
        WHERE username = ?
    """, (ig_user_id, long_token, expires_at, avatar_url, full_name,
          followers, following, now, username))
    print(f"      ✅ Updated existing account (id={account_id})")
else:
    cur.execute("""
        INSERT INTO instagram_accounts
            (id, username, instagram_user_id, access_token, token_expires_at,
             auth_method, status, avatar_url, full_name,
             follower_count, following_count, last_active, created_at)
        VALUES (?, ?, ?, ?, ?, 'oauth', 'connected', ?, ?, ?, ?, ?, ?)
    """, (account_id, username, ig_user_id, long_token, expires_at,
          avatar_url, full_name, followers, following, now, now))
    print(f"      ✅ Inserted new account (id={account_id})")

# Log
try:
    cur.execute("""
        INSERT INTO activity_log (id, account_username, action_type, message, created_at)
        VALUES (?, ?, 'oauth_connect', ?, ?)
    """, (str(uuid.uuid4()), username, f"@{username} seeded via manual token", now))
except Exception:
    pass  # log table might not exist yet

conn.commit()
conn.close()

print("\n" + "=" * 55)
print("  ✅  ALL DONE!")
print(f"  Account @{username} is live in the DB.")
print("  Refresh the Accounts page — it should appear now.")
print("=" * 55)
