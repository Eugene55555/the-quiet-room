export const wearCard = {
  name: 'wearCard',
  title: 'Картка «Куди друкуємо»',
  type: 'object',
  fields: [
    { name: 'title_uk', title: 'Заголовок (укр)', type: 'string', initialValue: 'Футболка' },
    { name: 'title_en', title: 'Заголовок (eng)', type: 'string', initialValue: 'T-Shirt' },
    { name: 'desc_uk', title: 'Підпис (укр)', type: 'string', initialValue: 'DTG-друк · щільна бавовна' },
    { name: 'desc_en', title: 'Підпис (eng)', type: 'string', initialValue: 'DTG print · dense cotton' }
  ]
}

export const faqItem = {
  name: 'faqItem',
  title: 'Питання-відповідь',
  type: 'object',
  fields: [
    { name: 'q_uk', title: 'Питання (укр)', type: 'string' },
    { name: 'q_en', title: 'Питання (eng)', type: 'string' },
    { name: 'a_uk', title: 'Відповідь (укр)', type: 'text', rows: 3 },
    { name: 'a_en', title: 'Відповідь (eng)', type: 'text', rows: 3 }
  ]
}

export const siteSettings = {
  name: 'siteSettings',
  title: 'Налаштування сайту',
  type: 'document',
  groups: [
    { name: 'brand', title: '🏛 Бренд і налаштування' },
    { name: 'main', title: '🧩 Блоки головної сторінки' },
    { name: 'collection', title: '🛍 Блоки колекції' },
    { name: 'about', title: '📖 Блоки «Про нас»' },
    { name: 'contacts', title: '✉️ Блоки контактів' }
  ],
  fields: [
    { name: 'brand', title: 'Назва бренду', type: 'string', initialValue: 'The Quiet Room', group: 'brand' },
    { name: 'logo', title: 'Логотип (SVG/PNG)', type: 'image', group: 'brand' },
    { name: 'banner_uk', title: 'Промо-смуга (укр)', type: 'string', group: 'brand' },
    { name: 'banner_en', title: 'Промо-смуга (eng)', type: 'string', group: 'brand' },
    { name: 'discount_note', title: 'Примітка про знижку/акцію', type: 'string', group: 'brand' },
    { name: 'color_wine', title: 'Колір «вино»', type: 'string', group: 'brand' },
    { name: 'color_wine_deep', title: 'Колір «глибоке вино»', type: 'string', group: 'brand' },
    { name: 'color_cream', title: 'Колір «крем» (фон)', type: 'string', group: 'brand' },
    { name: 'color_gold', title: 'Колір «золото»', type: 'string', group: 'brand' },
    {
      name: 'font_pair', title: 'Пара шрифтів', type: 'string', group: 'brand',
      options: {
        list: [
          { title: 'Bebas Neue + Space Grotesk (зараз)', value: 'bebas' },
          { title: 'Oswald + Manrope', value: 'oswald' },
          { title: 'Russo One + Inter', value: 'russo' }
        ]
      }
    },
    { name: 'social_instagram', title: 'Instagram (посилання)', type: 'url', group: 'brand' },
    { name: 'social_tiktok', title: 'TikTok (посилання)', type: 'url', group: 'brand' },
    { name: 'social_facebook', title: 'Facebook (посилання)', type: 'url', group: 'brand' },
    { name: 'social_telegram', title: 'Telegram (посилання)', type: 'url', group: 'brand' },
    {
      name: 'sections', title: 'Блоки головної сторінки',
      type: 'array', of: [{ type: 'sectionBlock' }], group: 'main',
      description: 'Конструктор головної: додавай готові блоки, переставляй, змінюй типи. Зберегти → Publish — і сторінка перебудується.'
    },
    {
      name: 'wear', title: 'Картки «Куди друкуємо» (4 шт)', type: 'array', of: [{ type: 'wearCard' }], group: 'main',
      description: 'Тексти для блоку «Куди друкуємо» на головній. Іконки задані кодом.'
    },
    {
      name: 'faqs', title: 'Питання-відповіді (FAQ)', type: 'array', of: [{ type: 'faqItem' }], group: 'main',
      description: 'Блок FAQ: використовується на головній і на сторінці контактів.'
    },
    {
      name: 'sections_collection', title: 'Блоки сторінки «Колекція»',
      type: 'array', of: [{ type: 'sectionBlock' }], group: 'collection',
      description: 'Збирай сторінку колекції з готових блоків: заголовок сторінки, каталог з фільтром за категоріями, кнопка-заклик та інше.'
    },
    {
      name: 'sections_about', title: 'Блоки сторінки «Про нас»',
      type: 'array', of: [{ type: 'sectionBlock' }], group: 'about',
      description: 'Сторінка про бренд: заголовок, блок «Про бренд» з каліграфією, текст з форматуванням, кнопка.'
    },
    {
      name: 'sections_contacts', title: 'Блоки сторінки «Контакти»',
      type: 'array', of: [{ type: 'sectionBlock' }], group: 'contacts',
      description: 'Сторінка контактів: заголовок, форма зворотного зв\'язку, FAQ, кнопка.'
    }
  ],
  preview: {
    select: { title: 'brand' }
  }
}