export const category = {
  name: 'category',
  title: 'Категорія',
  type: 'document',
  fields: [
    { name: 'name_uk', title: 'Назва (укр)', type: 'string', validation: r => r.required() },
    { name: 'name_en', title: 'Назва (eng)', type: 'string', validation: r => r.required() },
    { name: 'order', title: 'Порядок (1 — перша)', type: 'number', initialValue: 10 }
  ],
  preview: {
    select: { title: 'name_uk', subtitle: 'name_en' }
  },
  orderings: [
    { title: 'Порядок', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }
  ]
}