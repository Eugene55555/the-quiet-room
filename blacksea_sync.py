#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BlackSea Profile Sync (automatic, no manual work)
==================================================
Scrapes the public profile page njp.blacksea.in.ua (React JSON with products),
generates The Quiet Room showcase HTML with ALL products and covers,
and publishes it to the profile custom_html. New products are picked up automatically.

Authentication (in order):
  1. User token from ~/.hermes/secrets/blacksea_user_token
     (created in the BlackSea dashboard, long-lived; refresh the file when it expires)
  2. OAuth client_credentials (client_id/secret below) — BlackSea currently rejects
     CC tokens on user endpoints (404); checked automatically on every run.

Manual run:   python3 blacksea_sync.py
Hermes cron:  every 2 hours (cronjob_manage), output to a log, alert only on error
"""
import json
import os
import re
import sys
from datetime import datetime

import requests

CLIENT_ID = "w0VGnokpse-UG3HpVnMZqrmc1asM6aZX4aJ8o_TLfYY"
CLIENT_SECRET = "t6vkK8EQjeLllpk-VWeCMJYrOUna8-BE2SBM-HkSxc4"
SUBDOMAIN = "njp.blacksea.in.ua"
BASE = "https://api.blacksea.in.ua"
TOKEN_FILE = os.path.expanduser("~/.hermes/secrets/blacksea_user_token")
LOCAL_HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), "profile.html")
AVATAR = "https://res-4.cloudinary.com/dubkmnuvi/image/upload/6eyaylwq4lztoyesau8bi8gvcdd1.png"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
CURRENCIES = {"uah": "₴", "usd": "$", "eur": "€"}
# Product names that come from the external BlackSea store are mapped to English.
NAME_MAP = {
    "Півмісяць": "Crescent",
    "Арка": "Arch",
    "Нічник": "Nightlight",
    "Місяць": "Moon",
    "Зоряна ніч": "Starry Night",
    "Сова": "Owl",
    "Кіт на підвіконні": "Cat on the Windowsill",
    "Свічка": "Candle",
    "Вікно": "Window",
    "Чайник": "Teapot",
    "Хвилі": "Waves",
    "Гори": "Mountains",
    "Дерево": "Tree",
    "Птах": "Bird",
    "Ключ від дому": "House Key",
    "Книга": "Book",
    "Прінти": "Prints",
}
# Social domains: links to them are NOT treated as the "site" for the logo
SOCIAL_DOMAINS = ("instagram.com", "facebook.com", "fb.com", "twitter.com", "x.com",
                  "tiktok.com", "youtube.com", "t.me", "telegram.me", "linkedin.com",
                  "pinterest.com", "vk.com")
# Fallback site when no non-social URL is configured in the dashboard
DEFAULT_SITE_URL = "https://eugene55555.github.io/the-quiet-room/"


def english_name(name: str) -> str:
    """Return the English display name for known store products."""
    return NAME_MAP.get((name or "").strip(), (name or "").strip())


# ---------------------------------------------------------------- scrape
def _brace_json(s: str, start: int):
    """s[start] must be '{'. Returns (object|None, index after '}')."""
    obj, end = _brace_value(s, start)
    return obj, end


def _brace_json_array(s: str, start: int):
    """s[start] must be '['. Returns (array|None, index after ']')."""
    depth, i, in_str, esc = 0, start, False, False
    while i < len(s):
        c = s[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        elif c == '"':
            in_str = True
        elif c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(s[start:i + 1]), i + 1
                except Exception:
                    return None, i + 1
        i += 1
    return None, i


def _brace_value(s: str, start: int):
    """Generic: '{' → object, '[' → array. Returns (value|None, index after)."""
    depth, i, in_str, esc = 0, start, False, False
    open_c, close_c = s[start], None
    if open_c == "{":
        close_c = "}"
    elif open_c == "[":
        close_c = "]"
    else:
        return None, start
    while i < len(s):
        c = s[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        elif c == '"':
            in_str = True
        elif c == open_c:
            depth += 1
        elif c == close_c:
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(s[start:i + 1]), i + 1
                except Exception:
                    return None, i + 1
        i += 1
    return None, i


def scrape_products():
    """Public profile page → products (name, url, price, cover). JSON parsing,
    no unicode_escape — non-Latin names stay intact."""
    r = requests.get(f"https://{SUBDOMAIN}/", headers=UA, timeout=30)
    r.raise_for_status()
    html = r.text

    products, seen = [], set()
    for m in re.finditer(r'"search_results"\s*:\s*\{', html):
        obj, _ = _brace_json(html, m.end() - 1)
        if not obj:
            continue
        for p in obj.get("products") or []:
            if not isinstance(p, dict):
                continue
            permalink = p.get("permalink") or ""
            if not permalink or permalink in seen:
                continue
            seen.add(permalink)
            cents = int(p.get("price_cents") or 0)
            cur = CURRENCIES.get((p.get("currency_code") or "uah").lower(), "")
            if cents % 100 == 0:
                price = f"{cents // 100:,} {cur}"
            else:
                price = f"{cents / 100:,.2f} {cur}"
            products.append({
                "permalink": permalink,
                "name": english_name(p.get("name") or ""),
                "url": f"https://{SUBDOMAIN}/l/{permalink}",
                "thumbnail": p.get("thumbnail_url") or "",
                "price": price,
            })
    return products


def scrape_site_url():
    """Logo site: creator_profile.social_links — the first URL that is NOT a social network.
    Change it in the BlackSea dashboard (profile → social links) and the sync picks it up."""
    r = requests.get(f"https://{SUBDOMAIN}/", headers=UA, timeout=30)
    r.raise_for_status()
    m = re.search(r'"social_links"\s*:\s*\[', r.text)
    if m:
        arr, _ = _brace_json_array(r.text, m.end() - 1)
        for item in arr or []:
            url = (item or {}).get("url") or ""
            host = url.split("//")[-1].split("/")[0].lower().removeprefix("www.")
            if url.startswith("http") and not any(host == d or host.endswith("." + d) for d in SOCIAL_DOMAINS):
                return url
    return DEFAULT_SITE_URL


# ---------------------------------------------------------------- auth
def _token_ok(token: str) -> bool:
    try:
        r = requests.get(f"{BASE}/v2/user",
                         headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                         timeout=20)
        return r.status_code == 200
    except Exception:
        return False


def get_token():
    """Chain: user token from file → client_credentials. Returns (token|None, source)."""
    try:
        with open(TOKEN_FILE, encoding="utf-8") as f:
            tok = f.read().strip()
        if tok and _token_ok(tok):
            return tok, "user-token (file)"
        if tok:
            print("  user token from file is invalid (expired?)")
    except FileNotFoundError:
        pass

    try:
        r = requests.post(f"{BASE}/oauth/token", json={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials",
            "scope": "edit_products edit_profile",
        }, timeout=30)
        if r.ok:
            cc = r.json().get("access_token")
            if cc and _token_ok(cc):
                return cc, "client_credentials"
    except Exception as e:
        print("  oauth/token error:", e)
    return None, "no valid token"


# ---------------------------------------------------------------- html
def build_html(products, site_url):
    catalog = json.dumps(
        [{"name": p["name"], "url": p["url"], "price": p["price"], "thumb": p["thumbnail"]}
         for p in products],
        ensure_ascii=False).replace("</", "<\\/")

    return '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>njp — The Quiet Room</title>
  <meta name="description" content="Digital products from njp, delivered instantly after purchase.">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="The Quiet Room">
  <meta property="og:title" content="njp — The Quiet Room">
  <meta property="og:description" content="Digital products from njp, delivered instantly after purchase.">
  <meta property="og:url" content="''' + DEFAULT_SITE_URL + '''profile.html">
  <meta property="og:image" content="''' + DEFAULT_SITE_URL + '''assets/img/logo-qr.png">
  <meta property="og:locale" content="en_US">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%238E2137'/%3E%3Cpath d='M30 62 a18 18 0 0 1 0-24' stroke='%23F6EFE0' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3Cpath d='M55 38 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z' fill='%23C9A24A'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Arvo:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;500;600;700&display=swap">
  <style>
    :root { --wine:#8E2137; --wine-deep:#400D18; --cream:#F6EFE0; --ink:#1A1A1A; --ink-soft:#4A4A4A; --bg:#FFFFFF; --bg-alt:#FAF8F5; --border:#E8E0D8; --shadow:rgba(142,33,55,.12); --shadow-strong:rgba(40,5,12,.28); --radius:12px; --tr:.25s ease; --f-head:'Arvo',Georgia,serif; --f-body:'Manrope',-apple-system,BlinkMacSystemFont,sans-serif; }
    @media (prefers-color-scheme: dark) { :root { --wine:#C45A6E; --wine-deep:#8E2137; --cream:#2D2426; --ink:#F5F0ED; --ink-soft:#C8B8B0; --bg:#1A1214; --bg-alt:#22181A; --border:#3D2D30; --shadow:rgba(0,0,0,.35); --shadow-strong:rgba(0,0,0,.5); } }
    @media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; } }
    * { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; }
    body { font-family:var(--f-body); font-size:16px; line-height:1.65; color:var(--ink); background:var(--bg); -webkit-font-smoothing:antialiased; }
    a { color:inherit; text-decoration:none; }
    img { max-width:100%; display:block; }
    .hero { text-align:center; padding:clamp(44px,9vw,72px) 20px clamp(28px,5vw,40px); background:linear-gradient(180deg,var(--bg) 0%,var(--bg-alt) 100%); border-bottom:1px solid var(--border); }
    .avatar { width:clamp(92px,20vw,128px); height:clamp(92px,20vw,128px); border-radius:50%; object-fit:cover; border:3px solid var(--wine); box-shadow:0 8px 28px var(--shadow-strong); margin:0 auto 18px; }
    .name { font-family:var(--f-head); font-weight:700; font-size:clamp(28px,6vw,40px); color:var(--ink); }
    .bio { max-width:560px; margin:10px auto 0; color:var(--ink-soft); font-size:clamp(15px,3vw,17px); }
    .divider { width:64px; height:3px; background:var(--wine); border-radius:2px; margin:22px auto 0; }
    .section { max-width:960px; margin:0 auto; padding:clamp(36px,7vw,56px) clamp(16px,4vw,40px); }
    .section-title { font-family:var(--f-head); font-weight:700; font-size:clamp(22px,4vw,28px); color:var(--ink); margin-bottom:22px; display:flex; align-items:center; gap:12px; }
    .section-title::before { content:""; width:8px; height:8px; background:var(--wine); border-radius:50%; flex:none; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:clamp(16px,3vw,22px); }
    .card { background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; display:flex; flex-direction:column; transition:transform var(--tr),box-shadow var(--tr),border-color var(--tr); }
    .card:hover { transform:translateY(-4px); box-shadow:0 14px 36px var(--shadow); border-color:var(--wine); }
    .card:focus-visible { outline:2px solid var(--wine); outline-offset:2px; }
    .card-media { aspect-ratio:4/5; background:var(--bg-alt); overflow:hidden; }
    .card-media img { width:100%; height:100%; object-fit:cover; }
    .card-media.ph { background:linear-gradient(135deg,var(--wine) 0%,var(--wine-deep) 100%); }
    .card-body { padding:14px 14px 16px; display:flex; flex-direction:column; gap:6px; flex:1; }
    .card-name { font-family:var(--f-head); font-weight:700; font-size:16px; color:var(--ink); line-height:1.3; }
    .card-price { font-weight:700; font-size:15.5px; color:var(--cream); background:var(--wine); align-self:flex-start; border-radius:6px; padding:3px 10px; margin-top:auto; }
    .card-arrow { display:inline-flex; align-items:center; gap:5px; font-size:13.5px; font-weight:600; color:var(--ink-soft); }
    .card:hover .card-arrow { color:var(--wine); }
    .empty { text-align:center; color:var(--ink-soft); padding:40px 20px; }
    .footer { margin-top:auto; padding:26px 20px; text-align:center; border-top:1px solid var(--border); background:var(--bg-alt); font-size:13px; color:var(--ink-soft); }
    .footer a { color:var(--wine); text-decoration:underline; }
  </style>
</head>
<body>
  <div style="min-height:100vh; display:flex; flex-direction:column;">
    <header class="hero" role="banner">
      <a href="''' + site_url + '''" target="_blank" rel="noopener noreferrer" aria-label="The Quiet Room site" style="display:inline-block; border-radius:50%;">
        <img class="avatar" src="''' + AVATAR + '''" alt="njp profile avatar" loading="lazy">
      </a>
      <h1 class="name" data-blacksea-field="name">njp</h1>
      <p class="bio" data-blacksea-field="bio">Digital products — instant delivery after purchase.</p>
      <div class="divider" aria-hidden="true"></div>
    </header>
    <main role="main">
      <section class="section" aria-labelledby="cat-title">
        <h2 class="section-title" id="cat-title">My products</h2>
        <div class="grid" id="grid" role="list"></div>
        <p class="empty" id="empty" hidden>No products yet — check back soon!</p>
      </section>
    </main>
    <footer class="footer" role="contentinfo">
      <p>© <span id="year">''' + str(datetime.now().year) + '''</span> <span data-blacksea-field="name">njp</span> · <a href="https://blacksea.in.ua" target="_blank" rel="noopener noreferrer">Made on BlackSea</a></p>
    </footer>
  </div>

  <script id="blacksea-data" type="application/json">{"products":[],"posts":[],"pages":[]}</script>
  <script id="catalog-data" type="application/json">''' + catalog + '''</script>
  <script>
  (function(){
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
    try {
      var list = JSON.parse(document.getElementById('catalog-data').textContent);
      var grid = document.getElementById('grid');
      var empty = document.getElementById('empty');
      if (!list.length) { empty.hidden = false; return; }
      empty.hidden = true;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var a = document.createElement(p.url ? 'a' : 'div');
        if (p.url) {
          a.href = p.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        a.className = 'card';
        a.setAttribute('role','listitem');
        var media = document.createElement('div');
        if (p.thumb) {
          media.className = 'card-media';
          var img = document.createElement('img');
          img.src = p.thumb;
          img.alt = p.name || 'Product preview';
          img.loading = 'lazy';
          media.appendChild(img);
        } else {
          media.className = 'card-media ph';
        }
        a.appendChild(media);
        var body = document.createElement('div');
        body.className = 'card-body';
        var name = document.createElement('h3');
        name.className = 'card-name';
        name.textContent = p.name || '';
        body.appendChild(name);
        var price = document.createElement('span');
        price.className = 'card-price';
        price.textContent = p.price || '';
        body.appendChild(price);
        var arrow = document.createElement('span');
        arrow.className = 'card-arrow';
        arrow.textContent = p.url ? 'View product' : 'Details coming soon';
        body.appendChild(arrow);
        a.appendChild(body);
        grid.appendChild(a);
      }
    } catch (e) {
      var em = document.getElementById('empty');
      if (em) { em.hidden = false; em.textContent = 'Products will load in a moment — please refresh the page.'; }
    }
  })();
  </script>
</body>
</html>'''


# ---------------------------------------------------------------- publish
def _norm(h: str) -> str:
    """Normalize for comparison: BlackSea stores HTML in its own way
    (strips <!DOCTYPE>/<html>/<head>/<body>, escapes & in attributes,
    trims blank lines) — so we compare the "entity", not the bytes."""
    h = re.sub(r"(?is)<!DOCTYPE[^>]*>", "", h)
    h = re.sub(r"(?is)</?(html|head|body)\b[^>]*>", "", h)
    h = h.replace(chr(38) + "amp;", chr(38))  # BlackSea escapes & in attributes — undo that
    return "\n".join(line.strip() for line in h.splitlines() if line.strip())


def publish(token, html):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Idempotency: skip publishing when the normalized HTML already matches
    try:
        cur = requests.get(f"{BASE}/v2/user/custom_html", headers=headers, timeout=20)
        if cur.ok and _norm(cur.json().get("custom_html", "")) == _norm(html):
            print("  no changes — publish skipped")
            return 0
    except Exception:
        pass

    r = requests.post(f"{BASE}/v2/user/preview_custom_html", headers=headers,
                      json={"custom_html": html}, timeout=30)
    try:
        rep = r.json().get("sanitization_report", {})
        removed = rep.get("total_removed", "?")
    except Exception:
        removed = f"(non-JSON response: {r.status_code})"
    print(f"  preview: {r.status_code}, removed by sanitizer: {removed}")
    if r.status_code != 200:
        print("  ✗ preview rejected:", r.text[:200])
        return 1

    r2 = requests.put(f"{BASE}/v2/user/custom_html", headers=headers,
                      json={"custom_html": html}, timeout=30)
    try:
        ok = r2.json().get("success")
    except Exception:
        ok = False
    print(f"  publish: {r2.status_code}, success: {ok}")
    return 0 if ok else 1


def main():
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Sync start")

    products = scrape_products()
    print(f"  products found: {len(products)}")
    for p in products:
        print(f"   - {p['name']} | {p['price']} | {p['permalink']} | img: {'yes' if p['thumbnail'] else 'no'}")

    html = build_html(products, scrape_site_url())
    with open(LOCAL_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    token, src = get_token()
    if not token:
        print(f"  ✗ {src}: a user token is required for publishing.")
        print(f"    Generate a new one in the BlackSea dashboard and save it to {TOKEN_FILE}")
        return 1
    print(f"  token: {src}")

    return publish(token, html)


if __name__ == "__main__":
    sys.exit(main())
