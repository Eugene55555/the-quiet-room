/* The Quiet Room — інтеракції v7: конфіг-адмінка (config.json), паралакс, reveal, tilt, пошук, мови */
(function () {
  'use strict';

  /* ================= КОНФІГ З АДМІНКИ (config.json) =================
     Note: innerHTML нижче будує картки з config.json — це довірений файл
     власника сайту (редагується через адмінку), не користувацький ввід. */
  var CFG = {
    "site": { "brand": "The Quiet Room", "logo": "", "banner_uk": "Перші принти вже в продажу на BlackSea", "banner_en": "First prints are now live on BlackSea" },
    "sanity": { "id": "ns9lwdrh" },
    "colors": { "wine": "#8E2137", "wine_deep": "#400D18", "cream": "#F6EFE0", "gold": "#C9A24A" },
    "fonts": { "pair": "bebas" },
    "social": { "instagram": "", "tiktok": "", "facebook": "", "telegram": "" },
    "products": [
      { "id": "crescent", "cat": "clothes", "img": "assets/img/tee-cream.svg", "price": "55", "link": "https://6820536600065.blacksea.in.ua/l/eaq", "name_uk": "Півмісяць", "name_en": "Crescent", "tag_uk": "Футболка · Бавовна", "tag_en": "T-Shirt · Cotton", "desc_uk": "Місяць і зірка на грудях — для тих, хто любить тишу. Файл для друку.", "desc_en": "Moon and star on the chest — for those who love stillness. Print file.", "hide": false },
      { "id": "arch", "cat": "clothes", "img": "assets/img/tee-white.svg", "price": "55", "link": "https://6820536600065.blacksea.in.ua/l/eaq", "name_uk": "Арка", "name_en": "Arch", "tag_uk": "Футболка · Бавовна", "tag_en": "T-Shirt · Cotton", "desc_uk": "Дверний отвір зі світлом на порозі — запрошення всередину. Файл для друку.", "desc_en": "A doorway with light on the threshold — an invitation inside. Print file.", "hide": false },
      { "id": "night", "cat": "clothes", "img": "assets/img/hoodie-dark.svg", "price": "55", "link": "https://6820536600065.blacksea.in.ua/l/eaq", "name_uk": "Нічник", "name_en": "Nightlight", "tag_uk": "Худі · Фліс", "tag_en": "Hoodie · Fleece", "desc_uk": "Повний знак тихої кімнати — арка, півмісяць, зірка і світло. Файл для друку.", "desc_en": "The full quiet-room sign — arch, crescent, star and light. Print file.", "hide": false },
      { "id": "moon", "cat": "home", "img": "assets/img/mug.svg", "price": "55", "link": "https://6820536600065.blacksea.in.ua/l/eaq", "name_uk": "Місяць", "name_en": "Moon", "tag_uk": "Кухоль · Кераміка", "tag_en": "Mug · Ceramic", "desc_uk": "Ранок починається з тиші: півмісяць і зірка. Файл для друку.", "desc_en": "Mornings start with stillness: a crescent and a star. Print file.", "hide": false }
    ]
  };

  var FONT_PAIRS = {
    bebas: { display: "'Bebas Neue'", displayCyr: "'Oswald'", body: "'Space Grotesk'", bodyCyr: "'Manrope'", script: "'Great Vibes'", link: "family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Great+Vibes" },
    oswald: { display: "'Oswald'", displayCyr: "'Oswald'", body: "'Manrope'", bodyCyr: "'Manrope'", script: "'Great Vibes'", link: "family=Oswald:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Great+Vibes" },
    russo: { display: "'Russo One'", displayCyr: "'Russo One'", body: "'Inter'", bodyCyr: "'Inter'", script: "'Great Vibes'", link: "family=Russo+One&family=Inter:wght@400;500;600;700&family=Great+Vibes" }
  };

  /* ---- Завантаження: спершу Sanity (хмара принтів), потім config.json, далі статика ---- */
  function loadSanity() {
    var pid = (CFG.sanity && CFG.sanity.id) || 'ns9lwdrh';
    if (!pid) return Promise.resolve(null);
    var base = 'https://' + pid + '.apicdn.sanity.io/v2023-01-01/data/query/production?query=';
    var enc = function (q) { return encodeURIComponent(q); };
    var prodQ = '*[_type=="product" && visible != false]|order(order asc){_id,name_uk,name_en,tag_uk,tag_en,desc_uk,desc_en,price,img_url,"img":image.asset->url,category,blacksea_link,order}';
    var setQ = '*[_type=="siteSettings"][0]{brand,banner_uk,banner_en,discount_note,color_wine,color_wine_deep,color_cream,color_gold,font_pair,social_instagram,social_tiktok,social_facebook,social_telegram,wear[]{title_uk,title_en,desc_uk,desc_en},faqs[]{q_uk,q_en,a_uk,a_en},sections[]{variant,bg,title_uk,title_en,sub_uk,sub_en,body_uk,body_en,items[]{t_uk,t_en,d_uk,d_en},image,btn_label_uk,btn_label_en,btn_link}}';
    return Promise.all([
      fetch(base + enc(prodQ)).then(function (r) { return r.ok ? r.json() : null; }),
      fetch(base + enc(setQ)).then(function (r) { return r.ok ? r.json() : null; })
    ]).then(function (rs) {
      var prods = rs[0] && rs[0].result;
      var set = rs[1] && rs[1].result;
      if (!Array.isArray(prods) || !prods.length) return null;
      var cfg = {
        products: prods.map(function (p, i) {
          return {
            id: p._id || 'p' + i,
            cat: p.category || 'clothes',
            img: p.img_url || p.img || 'assets/img/tee-cream.svg',
            price: String(p.price || 55),
            link: p.blacksea_link || 'https://6820536600065.blacksea.in.ua/l/eaq',
            name_uk: p.name_uk || '', name_en: p.name_en || '',
            tag_uk: p.tag_uk || '', tag_en: p.tag_en || '',
            desc_uk: p.desc_uk || '', desc_en: p.desc_en || '',
            hide: false
          };
        })
      };
      if (set) {
        cfg.site = { brand: set.brand || 'The Quiet Room', logo: '', banner_uk: set.banner_uk || '', banner_en: set.banner_en || '' };
        cfg.colors = { wine: set.color_wine || '#8E2137', wine_deep: set.color_wine_deep || '#400D18', cream: set.color_cream || '#F6EFE0', gold: set.color_gold || '#C9A24A' };
        cfg.fonts = { pair: set.font_pair || 'bebas' };
        cfg.social = { instagram: set.social_instagram || '', tiktok: set.social_tiktok || '', facebook: set.social_facebook || '', telegram: set.social_telegram || '' };
        cfg.wear = set.wear || null;
        cfg.faqs = set.faqs || null;
        cfg.sections = set.sections || null;
      }
      return cfg;
    }).catch(function () { return null; });
  }
  loadSanity().then(function (sanityCfg) {
    return sanityCfg || fetch('config.json?v=' + Date.now()).then(function (r) { return r.ok ? r.json() : null; });
  }).then(function (cfg) {
    if (cfg && cfg.products) { CFG = cfg; applyConfig(); }
    /* якщо конфиг не прийшов — залишаємо статичні картки в HTML */
  }).catch(function () { /* статика в HTML залишається */ });

  function lang() {
    return window.TQR_I18N ? TQR_I18N.detect() : 'uk';
  }

  /* ---- Блочний конструктор головної (Sanity sections) ---- */
  var TEST_SECTIONS = [
    { _key: 'x1', variant: 'hero', bg: 'light', title_uk: 'Тестова кімната,\nде висять роботи', title_en: 'Test room,\nwhere works hang', sub_uk: 'Тестовий підзаголовок для перевірки блоків.', sub_en: 'Test subtitle for the blocks check.' },
    { _key: 'x2', variant: 'catalog', bg: 'light', title_uk: 'Тест каталогу', title_en: 'Catalog test' },
    { _key: 'x3', variant: 'cta', bg: 'dark', title_uk: 'Тестова кнопка', title_en: 'Test button', btn_label_uk: 'Купити', btn_label_en: 'Buy', btn_link: 'https://6820536600065.blacksea.in.ua/l/eaq' }
  ];
  var TRUST_ICONS = [
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>',
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></svg>',
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10.5 12h6M10.5 16h4"/></svg>',
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><path d="M6 18H4v-6h16v6h-2"/><path d="M6 14h12v7H6z"/></svg>'
  ];
  function ptToHtml(blocks, L) {
    if (!Array.isArray(blocks)) return '';
    var pid = (CFG.sanity && CFG.sanity.id) || 'ns9lwdrh';
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    var out = '', list = null;
    blocks.forEach(function (b) {
      if (b._type === 'image') {
        var m = (b.asset && b.asset._ref || '').match(/^image-(.+)-(\d+)x(\d+)-([a-z]+)$/);
        if (m) out += '<img loading="lazy" src="https://cdn.sanity.io/images/' + pid + '/production/' + m[1] + '-' + m[2] + 'x' + m[3] + '.' + m[4] + '" alt="" style="max-width:420px;height:auto;border-radius:14px;margin:10px 0">';
        return;
      }
      var style = b.style || 'normal';
      var text = (b.children || []).map(function (c) {
        var t = esc(c.text || '');
        if (c.marks) {
          if (c.marks.indexOf('strong') !== -1) t = '<b>' + t + '</b>';
          if (c.marks.indexOf('em') !== -1) t = '<i>' + t + '</i>';
          c.marks.forEach(function (mk) {
            if (mk && mk.indexOf('link') === 0 && b.markDefs) {
              var def = b.markDefs.filter(function (d) { return d._key === mk; })[0];
              if (def && def.href) t = '<a href="' + esc(def.href) + '" target="_blank" rel="noopener">' + t + '</a>';
            }
          });
        }
        return t;
      }).join('');
      if (b.listItem === 'bullet') {
        if (list === null) { list = '<ul>'; }
        list += '<li>' + text + '</li>';
        return;
      }
      if (list !== null) { out += list + '</ul>'; list = null; }
      if (style === 'h2') out += '<h2>' + text + '</h2>';
      else if (style === 'h3') out += '<h3>' + text + '</h3>';
      else if (style === 'blockquote') out += '<blockquote>' + text + '</blockquote>';
      else out += '<p>' + text + '</p>';
    });
    if (list !== null) out += list + '</ul>';
    return out;
  }
  function secBtn(s, L, cls) {
    if (!s.btn_label_uk && !s.btn_label_en && !s.btn_link) return '';
    var label = (L === 'uk' ? s.btn_label_uk : s.btn_label_en) || t('buy_on');
    return '<a class="btn ' + (cls || 'btn-wine') + '" href="' + (s.btn_link || 'https://6820536600065.blacksea.in.ua/l/eaq') + '" target="_blank" rel="noopener">' + label + '</a>';
  }
  function buildSection(s, i, L) {
    var dark = s.bg === 'dark' ? ' section-dark grain' : '';
    var esc = function (x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    var T = function (uk, en) { return esc(L === 'uk' ? uk : en); };
    var title = T(s.title_uk, s.title_en);
    var sub = T(s.sub_uk, s.sub_en);
    var v = s.variant;
    if (v === 'hero') {
      var h1 = (L === 'uk' ? s.title_uk : s.title_en) || t('hero_h1');
      return '<section class="hero grain" id="top"><div class="hero-bg"><div class="hero-glow-gold"></div><div class="hero-glow-rose"></div><div class="hero-outline">QUIET ROOM</div></div><div class="hero-moon" aria-hidden="true"></div>'
        + '<div class="container hero-inner"><div class="reveal in"><p class="hero-eyebrow">' + esc('Prints · Apparel · Home') + '</p>'
        + '<h1>' + esc(String(h1).replace(/<br\s*\/?>/g, ' ')) + '</h1>'
        + '<p class="hero-sub">' + sub + '</p>'
        + '<div class="hero-actions"><a class="btn btn-gold btn-shine" href="https://6820536600065.blacksea.in.ua/l/eaq" target="_blank" rel="noopener">' + esc(t('buy_on')) + '</a>'
        + '<a class="btn btn-ghost" href="collection.html">' + esc(t('cta_shop')) + '</a></div></div>'
        + '<div class="hero-visual reveal in" data-delay="2"><img src="assets/img/tee-cream.svg" alt="The Quiet Room print" width="400" height="500"><span class="hero-files">' + esc(t('file_note')) + '</span></div></div></section>';
    }
    if (v === 'trust') {
      var items = s.items && s.items.length ? s.items : [1, 2, 3, 4].map(function (n) { return { t_uk: t('trust_' + n + '_t'), t_en: t('trust_' + n + '_t'), d_uk: t('trust_' + n + '_d'), d_en: t('trust_' + n + '_d') }; });
      var html = '<section class="section section-dark grain" style="padding:52px 0"><div class="container" style="position:relative;z-index:1"><div class="trust-bar">';
      items.forEach(function (it, k) {
        html += '<div class="trust-item reveal"' + (k > 0 ? ' data-delay="' + k + '"' : '') + '><span class="trust-icon">' + (TRUST_ICONS[k] || TRUST_ICONS[0]) + '</span><div><b>' + T(it.t_uk, it.t_en) + '</b><span>' + T(it.d_uk, it.d_en) + '</span></div></div>';
      });
      return html + '</div></div></section>';
    }
    if (v === 'catalog') {
      return '<section class="section" id="collection"><div class="container"><div class="sec-head"><h2 class="section-title">' + (title || esc(t('best_title'))) + '</h2><a class="sec-link" href="collection.html">' + esc(t('cat_all')) + ' →</a></div>'
        + (sub ? '<p class="section-lead">' + sub + '</p>' : '<p class="section-lead">' + esc(t('best_sub')) + '</p>')
        + '<div class="grid" id="catalog"></div></div></section>';
    }
    if (v === 'wear') {
      return '<section class="section" id="wear" style="padding-top:10px"><div class="container">'
        + '<h2 class="section-title reveal">' + (title || esc(t('wear_title'))) + '</h2>'
        + '<p class="section-lead reveal" style="margin-bottom:30px">' + (sub || esc(t('wear_sub'))) + '</p>'
        + '<div class="wear-grid"></div></div></section>';
    }
    if (v === 'how') {
      var steps = s.items && s.items.length ? s.items : [1, 2, 3].map(function (n) { return { t_uk: t('step' + n), t_en: t('step' + n), d_uk: t('step' + n + '_d'), d_en: t('step' + n + '_d') }; });
      var h = '<section class="section section-dark grain" id="how"><div class="glow" style="width:520px;height:520px;left:-140px;top:-140px;background:radial-gradient(circle,rgba(201,162,74,.2),transparent 65%)"></div><div class="glow" style="width:460px;height:460px;right:-120px;bottom:-120px;background:radial-gradient(circle,rgba(200,122,136,.16),transparent 65%)"></div><div class="container" style="position:relative;z-index:1">'
        + '<p class="section-lead reveal">' + (title || esc(t('how_title'))) + '</p>'
        + '<h2 class="section-title reveal" style="margin-top:-30px"><span class="gold">' + (sub || esc(t('how_title_sub'))) + '</span></h2><div class="steps">';
      steps.forEach(function (st, k) {
        var num = String(k + 1); if (num.length < 2) num = '0' + num;
        h += '<div class="step reveal"' + (k > 0 ? ' data-delay="' + k + '"' : '') + '><span class="step-num">' + num + '</span><h3>' + T(st.t_uk, st.t_en) + '</h3><p>' + T(st.d_uk, st.d_en) + '</p></div>';
      });
      return h + '</div></div></section>';
    }
    if (v === 'text') {
      var body = ptToHtml(L === 'uk' ? s.body_uk : s.body_en, L);
      return '<section class="section' + dark + '"><div class="container">'
        + (title ? '<h2 class="section-title reveal">' + title + '</h2>' : '')
        + (sub ? '<p class="section-lead reveal">' + sub + '</p>' : '')
        + '<div class="about-text reveal">' + body + '</div>'
        + (s.btn_label_uk || s.btn_label_en ? '<p style="margin-top:18px">' + secBtn(s, L, 'btn-wine') + '</p>' : '')
        + '</div></section>';
    }
    if (v === 'faq') {
      return '<section class="section' + dark + '" style="padding-top:0"><div class="container">'
        + '<h2 class="section-title reveal" style="margin-bottom:24px">' + (title || esc(t('faq_title'))) + '</h2>'
        + '<div class="mini-faq"></div>'
        + (s.btn_label_uk || s.btn_label_en ? '<a class="btn btn-wine reveal" style="margin-top:26px" href="' + (s.btn_link || 'contact.html') + '">' + esc(L === 'uk' ? s.btn_label_uk : s.btn_label_en) + '</a>' : '')
        + '</div></section>';
    }
    if (v === 'about') {
      return '<section class="section" id="about"><div class="container about-grid"><div class="about-mark reveal">'
        + '<svg viewBox="0 0 300 270" aria-hidden="true"><path class="arch" d="M 40 190 A 110 110 0 0 1 260 190"/><path class="drop" d="M 40 190 C 29 206 49 224 63 209 C 74 198 62 187 40 190 Z"/><path class="moon" d="M 122 116 A 26 26 0 1 0 122 162 A 19 19 0 1 1 122 116 Z"/><path class="star" d="M 160 112 L 162.6 119.4 L 170 122 L 162.6 124.6 L 160 132 L 157.4 124.6 L 150 122 L 157.4 119.4 Z"/><circle class="star" cx="150" cy="190" r="6.5"/></svg></div>'
        + '<div class="reveal" data-delay="1"><p class="about-lead"><span class="script">' + esc(CFG.site && CFG.site.brand || 'The Quiet Room') + '</span> — ' + sub + '</p>'
        + '<div class="about-text">' + ptToHtml(L === 'uk' ? s.body_uk : s.body_en, L) + '</div>'
        + (s.btn_label_uk || s.btn_label_en ? '<p style="margin-top:8px">' + secBtn(s, L, 'btn-wine') + '</p>' : '')
        + '</div></div></section>';
    }
    if (v === 'cta') {
      return '<section class="section section-dark grain"><div class="container" style="text-align:center;position:relative;z-index:1">'
        + (title ? '<h2 class="section-title reveal">' + title + '</h2>' : '')
        + (sub ? '<p class="section-lead reveal">' + sub + '</p>' : '')
        + '<p style="margin-top:14px">' + secBtn(s, L, 'btn-gold btn-shine') + '</p>'
        + '</div></section>';
    }
    return '';
  }
  function renderSections() {
    var main = document.getElementById('page-root');
    if (!main) return;
    if (!CFG.sections || !CFG.sections.length) {
      if (/sq_blocks/.test(location.search)) CFG.sections = TEST_SECTIONS;
      else return;
    }
    var L = lang();
    var html = '';
    CFG.sections.forEach(function (s) {
      if (s && s.variant) html += buildSection(s, L);
    });
    if (!html) return;
    main.innerHTML = html;
    main.dataset.src = 'sanity';
    var extra = document.getElementById('static-extra');
    if (extra) extra.style.display = 'none';
    main.querySelectorAll('.reveal').forEach(function (el) { if (window.__io) window.__io.observe(el); else el.classList.add('in'); });
  }
  function applyConfig() {
    var root = document.documentElement.style;
    renderSections();
    if (CFG.colors) {
      if (CFG.colors.wine) root.setProperty('--wine', CFG.colors.wine);
      if (CFG.colors.wine_deep) root.setProperty('--wine-deep', CFG.colors.wine_deep);
      if (CFG.colors.cream) root.setProperty('--cream', CFG.colors.cream);
      if (CFG.colors.gold) root.setProperty('--gold', CFG.colors.gold);
    }
    if (CFG.fonts && FONT_PAIRS[CFG.fonts.pair]) {
      var f = FONT_PAIRS[CFG.fonts.pair];
      root.setProperty('--font-display', f.display + ', ' + f.displayCyr + ', "Arial Narrow", sans-serif');
      root.setProperty('--font-body', f.body + ', ' + f.bodyCyr + ', "Segoe UI", sans-serif');
      root.setProperty('--font-script', f.script + ', cursive');
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?' + f.link + '&display=swap';
      document.head.appendChild(link);
    }
    applyBrand();
    renderCatalog();
    renderSocial();
    renderWear();
    renderFaq();
    applyBanner();
  }

  /* ---- Логотип і назва бренду ---- */
  function applyBrand() {
    if (!CFG.site) return;
    if (CFG.site.brand) {
      document.querySelectorAll('.brand-script').forEach(function (el) { el.textContent = CFG.site.brand; });
      document.querySelectorAll('.footer-brand').forEach(function (el) { el.textContent = CFG.site.brand; });
      if (document.title.indexOf('The Quiet Room') !== -1) document.title = CFG.site.brand;
    }
    if (CFG.site.logo) {
      document.querySelectorAll('.brand-mark').forEach(function (svg) {
        var img = document.createElement('img');
        img.className = 'brand-logo';
        img.src = CFG.site.logo;
        img.alt = CFG.site.brand || 'The Quiet Room';
        svg.parentNode.replaceChild(img, svg);
      });
    }
  }

  /* ---- Каталог з конфігу ---- */
  function renderCatalog() {
    var grid = document.getElementById('catalog');
    if (!grid || !CFG.products) return;
    var L = lang();
    var out = '';
    CFG.products.forEach(function (p, i) {
      if (p.hide) return;
      var n = String(i + 1); if (n.length < 2) n = '0' + n;
      var dark = p.img.indexOf('hoodie') !== -1 ? ' dark' : '';
      var catName = L === 'uk' ? p.cat_uk || 'Одяг та дім' : p.cat_en || 'Clothes & home';
      var name = L === 'uk' ? p.name_uk : p.name_en;
      var tag = L === 'uk' ? p.tag_uk : p.tag_en;
      var desc = L === 'uk' ? p.desc_uk : p.desc_en;
      var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
      out += '<a class="card reveal" data-delay="' + (i % 4) + '" href="' + esc(p.link) + '" target="_blank" rel="noopener" data-name="' + esc(p.name_uk + ' ' + p.name_en) + '" data-desc="' + esc(p.desc_uk + ' ' + p.desc_en) + '" data-cat="' + esc(p.cat || '') + '">'
        + '<div class="card-media' + dark + '">'
        + '<span class="card-num">' + n + '</span>'
        + '<img loading="lazy" src="' + esc(p.img) + '" alt="' + esc(name + ' — принт The Quiet Room') + '" width="400" height="500">'
        + '<span class="card-badge"></span>'
        + '<span class="card-files">' + esc(p.price) + ' ₴</span>'
        + '</div><div class="card-body">'
        + '<p class="card-tag">' + esc(tag) + '</p>'
        + '<h3 class="card-title">' + esc(name) + '</h3>'
        + '<p class="card-desc">' + esc(desc) + '</p>'
        + '<div class="card-foot">'
        + '<span class="card-price"><span class="cur">₴</span>' + esc(p.price) + '</span>'
        + '<span class="btn-buy"></span>'
        + '</div></div></a>';
    });
    grid.innerHTML = out;
    /* Підписи, що залежать від мови */
    document.querySelectorAll('#catalog .card-badge').forEach(function (b) { b.textContent = t('on_sale'); });
    document.querySelectorAll('#catalog .btn-buy').forEach(function (b) { b.textContent = t('buy_on'); });
    document.querySelectorAll('#catalog .reveal').forEach(function (el) { if (window.__io) window.__io.observe(el); else el.classList.add('in'); });
    bindTilt();
    // пере-фільтри пошуку, якщо був запит
    var qp = new URLSearchParams(location.search).get('q');
    if (qp) applySearch(qp);
  }

  function t(key) {
    return window.TQR_I18N ? TQR_I18N.t(lang(), key) : key;
  }

  /* ---- Соцмережі ---- */
  var SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 3c.3 2 1.6 3.5 3.5 3.8v2.7c-1.3 0-2.5-.4-3.5-1.1v6.1c0 3-2.2 5-4.9 5C7.2 19.5 5 17.7 5 14.8c0-2.9 2.4-4.9 5.2-4.6v2.8c-1.3-.3-2.4.5-2.4 1.7 0 1.2.9 2 2.1 2 1.3 0 2.3-1 2.3-2.6V3h2.3z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.2c0-.8.3-1.4 1.5-1.4h1.4V5.2c-.3 0-1.2-.1-2.1-.1-2 0-3.3 1.2-3.3 3.4v2.6H8.4V14h2.6v7h2.5z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 4.3L2.8 11.4c-.9.4-.8 1.7.1 2l4.3 1.5 1.6 5.1c.3.9 1.4 1.1 2.1.5l2.4-2.1 4.3 3.2c.7.5 1.7.2 1.9-.7l2.9-15.2c.2-1.1-.8-2-1.9-1.4zM8.9 14.4l9.4-6.9c.2-.1.4.2.2.3l-7.7 7.4-.3 3-1.6-3.8z"/></svg>'
  };
  function renderSocial() {
    var boxes = document.querySelectorAll('.social-links');
    if (!boxes.length || !CFG.social) return;
    var out = '';
    ['instagram', 'tiktok', 'facebook', 'telegram'].forEach(function (k) {
      var url = CFG.social[k];
      if (!url) return;
      out += '<a class="social-link" href="' + url + '" target="_blank" rel="noopener" aria-label="' + k + '">' + (SOCIAL_ICONS[k] || '') + '</a>';
    });
    boxes.forEach(function (b) { b.innerHTML = out; b.classList.toggle('empty', !out); });
  }

  /* ---- «Куди друкуємо» з Sanity ---- */
  var WEAR_ICONS = [
    '<svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3.5L4 7l2.2 4.2c.5-1 1.6-1.3 2.6-.9V21h6.4v-10.7c1-.4 2.1-.1 2.6.9L20 7l-4.5-3.5c-1.2 1.4-3 1.4-4.2 0-1.2 1.4-3 1.4-4.2 0z"/></svg>',
    '<svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3.5L4 7l2.2 4.2c.5-1 1.6-1.3 2.6-.9V21h6.4v-10.7c1-.4 2.1-.1 2.6.9L20 7l-4.5-3.5c-1.2 1.4-3 1.4-4.2 0-1.2 1.4-3 1.4-4.2 0z"/><path d="M12 3.2V21"/></svg>',
    '<svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11h11v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4z"/><path d="M16 12h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M3 14v-1.5"/></svg>',
    '<svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 16l4.5-4 3.5 3 4-4 5 5"/></svg>'
  ];
  function renderWear() {
    var grid = document.querySelector('.wear-grid');
    if (!grid || !CFG.wear || !CFG.wear.length) return;
    var L = lang();
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    var out = '';
    CFG.wear.forEach(function (w, i) {
      out += '<a class="wear-card reveal" data-delay="' + (i % 4) + '" href="collection.html">'
        + '<span class="wear-ico">' + (WEAR_ICONS[i] || WEAR_ICONS[0]) + '</span>'
        + '<b>' + esc(L === 'uk' ? w.title_uk : w.title_en) + '</b>'
        + '<span>' + esc(L === 'uk' ? w.desc_uk : w.desc_en) + '</span></a>';
    });
    grid.dataset.src = 'sanity';
    grid.innerHTML = out;
    grid.querySelectorAll('.reveal').forEach(function (el) { if (window.__io) window.__io.observe(el); else el.classList.add('in'); });
  }

  /* ---- FAQ з Sanity ---- */
  function renderFaq() {
    var box = document.querySelector('.mini-faq');
    if (!box || !CFG.faqs || !CFG.faqs.length) return;
    var L = lang();
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    var out = '';
    CFG.faqs.forEach(function (f, i) {
      out += '<div class="faq-item reveal"' + (i > 0 ? ' data-delay="' + i + '"' : '') + '><h3>' + esc(L === 'uk' ? f.q_uk : f.q_en) + '</h3><p>' + esc(L === 'uk' ? f.a_uk : f.a_en) + '</p></div>';
    });
    box.dataset.src = 'sanity';
    box.innerHTML = out;
    box.querySelectorAll('.reveal').forEach(function (el) { if (window.__io) window.__io.observe(el); else el.classList.add('in'); });
  }

  /* ---- Промо-смуга з конфігу ---- */
  function applyBanner() {
    if (!CFG.site) return;
    var txt = lang() === 'uk' ? CFG.site.banner_uk : CFG.site.banner_en;
    var promo = document.querySelector('.promo a');
    if (promo && txt) promo.textContent = txt;
  }

  document.addEventListener('tqr:lang', function () {
    if (document.querySelector('#catalog .card')) renderCatalog();
    if (document.querySelector('.wear-grid')) renderWear();
    if (document.querySelector('.mini-faq')) renderFaq();
    applyBanner();
  });

  /* ================= СПАДКОВІ ІНТЕРАКЦІЇ ================= */

  /* --- Мова --- */
  if (window.TQR_I18N) TQR_I18N.init();

  /* --- Мобільне меню --- */
  var burger = document.getElementById('burger');
  var mobileNav = document.getElementById('site-nav-mobile');
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        burger.classList.remove('open');
      }
    });
  }

  /* --- Пошук --- */
  var searchForm = document.getElementById('search-form');
  function applySearch(q) {
    var cards = document.querySelectorAll('#catalog .card');
    var ql = (q || '').toLowerCase();
    var any = false;
    cards.forEach(function (card) {
      var hay = (card.getAttribute('data-name') || '').toLowerCase() + ' ' + (card.getAttribute('data-desc') || '').toLowerCase();
      var hit = !ql || hay.indexOf(ql) !== -1;
      card.style.display = hit ? '' : 'none';
      if (hit) any = true;
    });
    var empty = document.getElementById('search-empty');
    if (empty) empty.style.display = any ? 'none' : 'block';
  }
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (searchForm.querySelector('input').value || '').trim();
      if (/collection\.html/.test(location.pathname)) applySearch(q);
      else location.href = 'collection.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }
  var qParam = new URLSearchParams(location.search).get('q');
  if (qParam && searchForm) {
    searchForm.querySelector('input').value = qParam;
    applySearch(qParam);
  }

  /* --- Фільтри колекції --- */
  var chips = document.querySelectorAll('.chip');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var f = chip.getAttribute('data-filter') || 'all';
      document.querySelectorAll('#catalog .card').forEach(function (card) {
        var cat = card.getAttribute('data-cat') || '';
        card.style.display = (f === 'all' || cat === f) ? '' : 'none';
      });
    });
  });

  /* --- Форма (заглушка) --- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = document.getElementById('form-status');
      if (s) s.classList.add('show');
    });
  }

  /* --- Reveal on scroll --- */
  var revealEls = document.querySelectorAll('.reveal');
  var __ioHas = false;
  if ('IntersectionObserver' in window) {
    __ioHas = true;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    window.__io = io;
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* --- Паралакс hero (тільки на пристроях з мишею) --- */
  var fine = window.matchMedia('(pointer: fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !reduced) {
    var heroBg = document.querySelector('.hero-bg');
    var heroMoon = document.querySelector('.hero-moon');
    var heroVisual = document.querySelector('.hero-visual');
    if (heroBg || heroMoon) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY;
          var h = window.innerHeight;
          if (y < h * 1.15) {
            if (heroBg) heroBg.style.transform = 'translateY(' + y * 0.28 + 'px)';
            if (heroMoon) heroMoon.style.transform = 'translateY(' + y * 0.42 + 'px)';
          }
          if (heroVisual) heroVisual.style.transform = 'translateY(' + -y * 0.1 + 'px)';
          ticking = false;
        });
      }, { passive: true });
    }
  }

  /* --- Tilt карток (десктоп) --- */
  function bindTilt() {
    if (!(fine && !reduced)) return;
    document.querySelectorAll('#catalog .card').forEach(function (card) {
      if (card.__tilt) return;
      card.__tilt = true;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 7) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }
  bindTilt();

  /* --- Прогрес-бар прокрутки --- */
  var progress = document.getElementById('scroll-progress');
  if (progress) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Сжатие шапки --- */
  var header = document.querySelector('.site-header');
  if (header) {
    var hdrToggle = function () { header.classList.toggle('scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', hdrToggle, { passive: true });
    hdrToggle();
  }

  /* --- Мобільна CTA --- */
  var mCta = document.getElementById('mobile-cta');
  if (mCta) {
    var ctaToggle = function () {
      var show = window.scrollY > 420;
      mCta.classList.toggle('hidden', !show);
      document.body.classList.toggle('cta-visible', show);
    };
    window.addEventListener('scroll', ctaToggle, { passive: true });
    ctaToggle();
  }

  /* --- Кастомний курсор (desktop, exact pointer) --- */
  if (fine && !reduced && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('has-cursor');

    var mx = -100, my = -100, rx = -100, ry = -100;
    var raf = null;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
      if (!raf) {
        raf = requestAnimationFrame(function loop() {
          rx += (mx - rx) * 0.16;
          ry += (my - ry) * 0.16;
          ring.style.left = rx + 'px';
          ring.style.top = ry + 'px';
          raf = requestAnimationFrame(loop);
        });
      }
      var t = e.target;
      var hover = !!(t && (t.closest('a') || t.closest('button') || t.closest('.chip')));
      ring.classList.toggle('hover', hover);
      dot.classList.toggle('hover', hover);
    });
  }
})();