#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BlackSea Profile Sync (динамический, без ручной работы)
=======================================================
Скрейпит публичную страницу профиля njp.blacksea.in.ua (react-JSON с товарами),
генерирует HTML витрины The Quiet Room со ВСЕМИ товарами и обложками
и публикует его в custom_html профиля. Новые товары подхватываются сами.

Аутентификация (по порядку):
  1. User-токен из файла ~/.hermes/secrets/blacksea_user_token
     (создаётся в кабинете BlackSea, долгоживущий; обновить файл, когда истечёт)
  2. OAuth client_credentials (client_id/secret ниже) — сейчас BlackSea НЕ пускает
     CC-токены на user-эндпоинты (404), проверяется на каждый запуск автоматически.

Запуск вручную:   python3 blacksea_sync.py
Hermes-крон:      каждые 2 ч (cronjob_manage), вывод в лог, алерт только при ошибке
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


# ---------------------------------------------------------------- scrape
def _brace_json(s: str, start: int):
    """s[start] должен быть '{'. Возвращает (объект|None, индекс после '}')."""
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
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(s[start:i + 1]), i + 1
                except Exception:
                    return None, i + 1
        i += 1
    return None, i


def scrape_products():
    """Публичная страница профиля → товары (имя, url, цена, обложка). JSON-парсинг,
    никаких unicode_escape — кириллица не ломается."""
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
                "name": p.get("name") or "",
                "url": f"https://{SUBDOMAIN}/l/{permalink}",
                "thumbnail": p.get("thumbnail_url") or "",
                "price": price,
            })
    return products


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
    """Цепочка: user-токен из файла → client_credentials. Возвращает (токен|None, источник)."""
    try:
        with open(TOKEN_FILE, encoding="utf-8") as f:
            tok = f.read().strip()
        if tok and _token_ok(tok):
            return tok, "user-token (файл)"
        if tok:
            print("  user-токен из файла недействителен (истёк?)")
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
        print("  oauth/token ошибка:", e)
    return None, "нет валидного токена"


# ---------------------------------------------------------------- html
def build_html(products):
    catalog = json.dumps(
        [{"name": p["name"], "url": p["url"], "price": p["price"], "thumb": p["thumbnail"]}
         for p in products],
        ensure_ascii=False).replace("</", "<\\/")

    return '''<!DOCTYPE html>
<html lang="uk">
<head>
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
      <img class="avatar" src="''' + AVATAR + '''" alt="" loading="lazy">
      <h1 class="name" data-blacksea-field="name">njp</h1>
      <p class="bio" data-blacksea-field="bio">Цифрові товари — миттєва доставка після оплати.</p>
      <div class="divider" aria-hidden="true"></div>
    </header>
    <main role="main">
      <section class="section" aria-labelledby="cat-title">
        <h2 class="section-title" id="cat-title">Мої товари</h2>
        <div class="grid" id="grid" role="list"></div>
        <p class="empty" id="empty" hidden>Поки що товарів немає — поверніться скоро!</p>
      </section>
    </main>
    <footer class="footer" role="contentinfo">
      <p>© ''' + str(datetime.now().year) + ''' <span data-blacksea-field="name">njp</span> · <a href="https://blacksea.in.ua" target="_blank" rel="noopener noreferrer">Створено на BlackSea</a></p>
    </footer>
  </div>

  <script id="blacksea-data" type="application/json">{"products":[],"posts":[],"pages":[]}</script>
  <script id="catalog-data" type="application/json">''' + catalog + '''</script>
  <script>
  (function(){
    try {
      var list = JSON.parse(document.getElementById('catalog-data').textContent);
      var grid = document.getElementById('grid');
      var empty = document.getElementById('empty');
      if (!list.length) { empty.hidden = false; return; }
      empty.hidden = true;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var a = document.createElement('a');
        a.href = p.url || '#';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'card';
        a.setAttribute('role','listitem');
        var media = document.createElement('div');
        if (p.thumb) {
          media.className = 'card-media';
          var img = document.createElement('img');
          img.src = p.thumb;
          img.alt = '';
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
        arrow.textContent = 'Переглянути';
        body.appendChild(arrow);
        a.appendChild(body);
        grid.appendChild(a);
      }
    } catch (e) {
      var em = document.getElementById('empty');
      if (em) { em.hidden = false; em.textContent = 'Товари завантажаться за мить — оновіть сторінку.'; }
    }
  })();
  </script>
</body>
</html>'''


# ---------------------------------------------------------------- publish
def _norm(h: str) -> str:
    """Нормализация для сравнения: BlackSea хранит HTML по-своему
    (вырезает <!DOCTYPE>/<html>/<head>/<body>, экранирует & в атрибутах,
    триммет пустые строки) — сравниваем «сущность», а не байты."""
    h = re.sub(r"(?is)<!DOCTYPE[^>]*>", "", h)
    h = re.sub(r"(?is)</?(html|head|body)\b[^>]*>", "", h)
    h = h.replace(chr(38) + "amp;", chr(38))  # BlackSea экранирует & в атрибутах — раскрываем обратно
    return "\n".join(line.strip() for line in h.splitlines() if line.strip())


def publish(token, html):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Идемпотентность: не публиковать, если нормализованный HTML совпадает
    try:
        cur = requests.get(f"{BASE}/v2/user/custom_html", headers=headers, timeout=20)
        if cur.ok and _norm(cur.json().get("custom_html", "")) == _norm(html):
            print("  без изменений — публикация пропущена")
            return 0
    except Exception:
        pass

    r = requests.post(f"{BASE}/v2/user/preview_custom_html", headers=headers,
                      json={"custom_html": html}, timeout=30)
    try:
        rep = r.json().get("sanitization_report", {})
        removed = rep.get("total_removed", "?")
    except Exception:
        removed = f"(не-JSON ответ: {r.status_code})"
    print(f"  превью: {r.status_code}, удалено санитайзером: {removed}")
    if r.status_code != 200:
        print("  ✗ превью не принято:", r.text[:200])
        return 1

    r2 = requests.put(f"{BASE}/v2/user/custom_html", headers=headers,
                      json={"custom_html": html}, timeout=30)
    try:
        ok = r2.json().get("success")
    except Exception:
        ok = False
    print(f"  публикация: {r2.status_code}, success: {ok}")
    return 0 if ok else 1


def main():
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Sync start")

    products = scrape_products()
    print(f"  товаров найдено: {len(products)}")
    for p in products:
        print(f"   - {p['name']} | {p['price']} | {p['permalink']} | img: {'да' if p['thumbnail'] else 'нет'}")

    html = build_html(products)
    with open(LOCAL_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    token, src = get_token()
    if not token:
        print(f"  ✗ {src}: пользовательский токен нужен для публикации.")
        print(f"    Сгенерируй новый в кабинете BlackSea и положи в {TOKEN_FILE}")
        return 1
    print(f"  токен: {src}")

    return publish(token, html)


if __name__ == "__main__":
    sys.exit(main())
