export const pairItem = {
  name: 'pairItem',
  title: 'Пункт',
  type: 'object',
  fields: [
    { name: 't_uk', title: 'Заголовок (укр)', type: 'string' },
    { name: 't_en', title: 'Заголовок (eng)', type: 'string' },
    { name: 'd_uk', title: 'Опис (укр)', type: 'string' },
    { name: 'd_en', title: 'Опис (eng)', type: 'string' }
  ]
}

export const sectionBlock = {
  name: 'sectionBlock',
  title: 'Блок секції',
  type: 'object',
  fieldsets: [
    { name: 'content', title: 'Зміст (укр / eng)', options: { columns: 2 } }
  ],
  fields: [
    {
      name: 'variant', title: 'Тип блоку', type: 'string',
      options: {
        list: [
          { title: '🏠 Hero (перший екран)', value: 'hero' },
          { title: '✅ Бейджі довіри (4 пункти)', value: 'trust' },
          { title: '🛍 Каталог принтів', value: 'catalog' },
          { title: '👕 Куди друкуємо', value: 'wear' },
          { title: '🧭 Як це працює (3 кроки)', value: 'how' },
          { title: '📝 Текст (з форматуванням)', value: 'text' },
          { title: '❓ Питання-відповіді', value: 'faq' },
          { title: '📖 Про бренд', value: 'about' },
          { title: '🎯 Кнопка-заклик (CTA)', value: 'cta' }
        ]
      },
      validation: r => r.required()
    },
    {
      name: 'bg', title: 'Фон секції', type: 'string',
      options: {
        list: [
          { title: 'Світлий (кремовий)', value: 'light' },
          { title: 'Темний (вино)', value: 'dark' }
        ]
      },
      initialValue: 'light'
    },
    { name: 'title_uk', title: 'Заголовок (укр)', group: 'content' },
    { name: 'title_en', title: 'Заголовок (eng)', group: 'content' },
    { name: 'sub_uk', title: 'Підзаголовок (укр)', group: 'content' },
    { name: 'sub_en', title: 'Підзаголовок (eng)', group: 'content' },
    {
      name: 'body_uk', title: 'Текст (укр, з форматуванням)', type: 'array',
      of: [{ type: 'block', styles: [{ title: 'Абзац', value: 'normal' }, { title: 'Заголовок 2', value: 'h2' }, { title: 'Заголовок 3', value: 'h3' }], lists: [{ title: 'Список', value: 'bullet' }] }, { type: 'image' }]
    },
    {
      name: 'body_en', title: 'Текст (eng, formatted)', type: 'array',
      of: [{ type: 'block', styles: [{ title: 'Paragraph', value: 'normal' }, { title: 'Heading 2', value: 'h2' }, { title: 'Heading 3', value: 'h3' }], lists: [{ title: 'List', value: 'bullet' }] }, { type: 'image' }]
    },
    {
      name: 'items', title: 'Пункти (для «Бейджі» та «Кроки»)', type: 'array', of: [{ type: 'pairItem' }],
      description: 'Для блоків «Бейджі довіри» і «Як це працює» — список пунктів. Для інших типів не потрібно.'
    },
    {
      name: 'image', title: 'Картинка (hero/текст)', type: 'image', options: { hotspot: true },
      description: 'Для hero — фото товару; для текстового блоку — ілюстрація поруч.'
    },
    { name: 'btn_label_uk', title: 'Кнопка: текст (укр)', group: 'content' },
    { name: 'btn_label_en', title: 'Кнопка: текст (eng)', group: 'content' },
    { name: 'btn_link', title: 'Кнопка: посилання', type: 'url', description: 'Напр. https://6820536600065.blacksea.in.ua/l/eaq' }
  ],
  preview: {
    select: { variant: 'variant', title: 'title_uk' },
    prepare(v) {
      const names = { hero: '🏠 Hero', trust: '✅ Бейджі довіри', catalog: '🛍 Каталог', wear: '👕 Куди друкуємо', how: '🧭 Як це працює', text: '📝 Текст', faq: '❓ FAQ', about: '📖 Про бренд', cta: '🎯 CTA' }
      return { title: `${names[v.variant] || v.variant} — ${v.title || 'без заголовка'}` }
    }
  }
}