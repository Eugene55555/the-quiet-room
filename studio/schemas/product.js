export const product = {
  name: 'product',
  title: 'Принт',
  type: 'document',
  fields: [
    { name: 'name_uk', title: 'Назва (укр)', type: 'string', validation: r => r.required() },
    { name: 'name_en', title: 'Назва (eng)', type: 'string', validation: r => r.required() },
    { name: 'tag_uk', title: 'Куди друкуємо (укр)', type: 'string', initialValue: 'Футболка · Бавовна' },
    { name: 'tag_en', title: 'Куди друкуємо (eng)', type: 'string', initialValue: 'T-Shirt · Cotton' },
    { name: 'desc_uk', title: 'Опис (укр)', type: 'text', rows: 3 },
    { name: 'desc_en', title: 'Опис (eng)', type: 'text', rows: 3 },
    { name: 'price', title: 'Ціна, грн', type: 'number', validation: r => r.required().min(0) },
    { name: 'image', title: "Картинка (прев'ю)", type: 'image', options: { hotspot: true } },
    { name: 'img_url', title: 'Або шлях до макета (assets/img/...svg)', type: 'string' },
    { name: 'blacksea_link', title: 'Посилання покупки (BlackSea)', type: 'url', validation: r => r.uri({ scheme: ['https'] }) },
    {
      name: 'category', title: 'Категорія', type: 'string',
      options: {
        list: [
          { title: '👕 Одяг', value: 'clothes' },
          { title: '🏠 Дім', value: 'home' },
          { title: '✨ Інше', value: 'other' }
        ],
        layout: 'radio'
      },
      initialValue: 'clothes'
    },
    { name: 'order', title: 'Порядок (1 — перший)', type: 'number', initialValue: 10 },
    { name: 'visible', title: 'Показувати на витрині', type: 'boolean', initialValue: true }
  ],
  preview: {
    select: { title: 'name_uk', subtitle: 'price', media: 'image' }
  },
  orderings: [
    { title: 'Порядок витрини', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }
  ]
}