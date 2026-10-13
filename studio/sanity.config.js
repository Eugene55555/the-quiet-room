import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { product } from './schemas/product'
import { siteSettings } from './schemas/siteSettings'

export default defineConfig({
  name: 'quiet-room',
  title: 'The Quiet Room — принти',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'ВАШ_PROJECT_ID',
  dataset: 'production',
  basePath: '/studio',
  plugins: [structureTool(), visionTool()],
  schema: {
    types: [siteSettings, product]
  }
})