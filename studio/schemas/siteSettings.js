export const siteSettings = {
  name: 'siteSettings',
  title: 'Налаштування сайту',
  type: 'document',
  fields: [
    { name: 'brand', title: 'Назва бренду', type: 'string' },
    { name: 'logo', title: 'Логотип (SVG/PNG)', type: 'image' },
    { name: 'banner_uk', title: 'Промо-смуга (укр)', type: 'string' },
    { name: 'banner_en', title: 'Промо-смуга (eng)', type: 'string' },
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
    { name: 'social_telegram', title: 'Telegram (посилання)', type: 'url' }
  ],
  preview: {
    select: { title: 'brand' }
  }
}