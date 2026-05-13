"""
Deploy Privacy Policy to Netlify — My Creator Studio
Run this script once; it creates the site and deploys the HTML.
"""

import json
import os
import hashlib
import base64
import urllib.request
import urllib.error

API_KEY   = "nfp_zuGKjtZqVXnHoS1uJe8hVxsu214Kg7Mwa627"
BASE_URL  = "https://api.netlify.com/api/v1"
SITE_NAME = "my-creator-studio-privacy"
HEADERS   = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

HTML_PATH = os.path.join(os.path.dirname(__file__), "web", "public", "privacy-policy.html")

def netlify(method, path, body=None, extra_headers=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    h = {**HEADERS, **(extra_headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  HTTP {e.code}: {err[:300]}")
        raise

def sha1(content: bytes) -> str:
    return hashlib.sha1(content).hexdigest()

def main():
    print("=" * 55)
    print("  My Creator Studio — Privacy Policy Deployer")
    print("=" * 55)

    # ── 1. Read HTML ──────────────────────────────────────────
    if not os.path.exists(HTML_PATH):
        # fallback: look in the same dir as this script
        alt = os.path.join(os.path.dirname(__file__), "privacy-policy.html")
        if os.path.exists(alt):
            html_source = alt
        else:
            print(f"\n[ERROR] HTML file not found at:\n  {HTML_PATH}\n  {alt}")
            input("\nPress Enter to exit…")
            return
    else:
        html_source = HTML_PATH

    with open(html_source, "rb") as f:
        html_bytes = f.read()

    file_sha = sha1(html_bytes)
    print(f"\n[1/4] HTML file read OK  ({len(html_bytes):,} bytes, sha1={file_sha[:12]}…)")

    # ── 2. Create or reuse site ───────────────────────────────
    print(f"\n[2/4] Creating Netlify site '{SITE_NAME}'…")
    try:
        site = netlify("POST", "/sites", {"name": SITE_NAME})
        site_id = site["id"]
        print(f"      Site created → {site.get('ssl_url') or site.get('url')}")
    except Exception:
        # Site name may already exist — list sites and find it
        print("      Name taken — searching existing sites…")
        sites = netlify("GET", "/sites")
        match = next((s for s in sites if s.get("name") == SITE_NAME), None)
        if match:
            site_id = match["id"]
            print(f"      Reusing site → {match.get('ssl_url') or match.get('url')}")
        else:
            # Create with a unique slug
            import time
            unique = f"{SITE_NAME}-{int(time.time())}"
            site = netlify("POST", "/sites", {"name": unique})
            site_id = site["id"]
            print(f"      Site created (slug: {unique}) → {site.get('ssl_url') or site.get('url')}")

    # ── 3. Start deploy with file digest ─────────────────────
    print(f"\n[3/4] Initiating deploy…")
    deploy_body = {
        "files": {"/index.html": file_sha},
        "async": False,
    }
    deploy = netlify("POST", f"/sites/{site_id}/deploys", deploy_body)
    deploy_id = deploy["id"]
    required = deploy.get("required", [])
    print(f"      Deploy id: {deploy_id}")
    print(f"      Files to upload: {required}")

    # ── 4. Upload file if required ────────────────────────────
    print(f"\n[4/4] Uploading HTML…")
    if file_sha in required:
        upload_headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/octet-stream",
        }
        req = urllib.request.Request(
            f"{BASE_URL}/deploys/{deploy_id}/files/index.html",
            data=html_bytes,
            headers=upload_headers,
            method="PUT",
        )
        with urllib.request.urlopen(req) as r:
            result = json.loads(r.read())
        print(f"      Upload OK → state: {result.get('state')}")
    else:
        print("      File already on Netlify CDN (sha1 match) — skipping upload.")

    # ── Done ──────────────────────────────────────────────────
    live_url = f"https://{SITE_NAME}.netlify.app"
    print("\n" + "=" * 55)
    print("  ✅  DEPLOY COMPLETE!")
    print(f"  🌐  URL: {live_url}")
    print("=" * 55)
    print("\n  Copy this URL for your Instagram App settings:")
    print(f"  {live_url}\n")

    input("Press Enter to close…")

if __name__ == "__main__":
    main()
