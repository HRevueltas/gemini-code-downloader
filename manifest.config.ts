import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Code Exporter for Gemini: 20+ Languages, Canvas & Research',
  version: pkg.version,
  description: 'Export from Gemini Chat, Canvas & Deep Research to 20+ languages (.py, .ts, .md & more). 1-click download with automatic detection',
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_title: 'Code Exporter for Gemini',
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
    },
  },
  content_scripts: [
    {
      js: ['src/content/main.ts'],
      matches: ['https://gemini.google.com/*'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self';",
  },
})