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
  fields: [
    { name: 'brand', title: 'Назва бренду', type: 'string', initialValue: 'The Quiet Room' },
    { name: 'logo', title: 'Логотип (SVG/PNG)', type: 'image' },
    { name: 'banner_uk', title: 'Промо-смуга (укр)', type: 'string' },
    { name: 'banner_en', title: 'Промо-смуга (eng)', type: 'string' },
    { name: 'discount_note', title: 'Примітка про знижку/акцію', type: 'string' },
    { name: 'color_wine', title: 'Колір «вино»', type: 'string' },
    { name: 'color_wine_deep', title: 'Колір «глибоке вино»', type: 'string' },
    { name: 'color_cream', title: 'Колір «крем» (фон)', type: 'string' },
    { name: 'color_gold', title: 'Колір «золото»', type: 'string' },
    {
      name: 'font_pair', title: 'Пара шрифтів', type: 'string',
      options: {
        list: [
          { title: 'Bebas Neue + Space Grotesk (зараз)', value: 'bebas' },
          { title: 'Oswald + Manrope', value: 'oswald' },
          { title: 'Russo One + Inter', value: 'russo' }
        ]
      }
    },
    { name: 'social_instagram', title: 'Instagram (посилання)', type: 'url' },
    { name: 'social_tiktok', title: 'TikTok (посилання)', type: 'url' },
    { name: 'social_facebook', title: 'Facebook (посилання)', type: 'url' },
    { name: 'social_telegram', title: 'Telegram (посилання)', type: 'url' },
    {
      name: 'wear', title: 'Куди друкуємо (4 картки)', type: 'array', of: [{ type: 'wearCard' }],
      description: 'Картки секції «Куди друкуємо» на головній. Іконки задані кодом — тут тільки тексти.'
    },
    {
      name: 'faqs', title: 'Питання-відповіді (FAQ)', type: 'array', of: [{ type: 'faqItem' }],
      description: 'Блок FAQ на головній сторінці.'
    }
  ],
  preview: {
    select: { title: 'brand' }
  }
}