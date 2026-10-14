import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { product } from './schemas/product'
import { category } from './schemas/category'
import { siteSettings, wearCard, faqItem } from './schemas/siteSettings'
import { sectionBlock, pairItem } from './schemas/sectionBlock'

export default defineConfig({
  name: 'quiet-room',
  title: 'The Quiet Room — принти',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'ns9lwdrh',
  dataset: 'production',
  basePath: '/studio',
  studioHost: 'quiet-room',
  plugins: [structureTool(), visionTool()],
  schema: {
    types: [siteSettings, product, category, wearCard, faqItem, sectionBlock, pairItem]
  }
})