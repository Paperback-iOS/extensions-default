import {
  ContentRating,
  type ExtensionInfo,
  SourceIntents,
} from '@paperback/types'

export default {
  version: '2.3',
  name: 'Komga',
  icon: 'icon.png',
  developers: [
    {
      name: 'Faizan Durrani',
      github: 'FaizanDurrani',
    },
    {
      name: 'Lemon',
      github: 'FramboisePi',
    },
  ],
  description: 'Komga client extension for Paperback',
  contentRating: ContentRating.EVERYONE,
  badges: [
    {
      label: 'Self hosted',
      backgroundColor: '#000000',
      textColor: '#ffffff',
    },
  ],
  capabilities: [
    SourceIntents.SEARCH_RESULTS_PROVIDING,
    SourceIntents.CHAPTER_PROVIDING,
    SourceIntents.SETTINGS_FORM_PROVIDING,
    SourceIntents.DISCOVER_SECIONS_PROVIDING,
    SourceIntents.CLOUDFLARE_BYPASS_PROVIDING
  ],
} satisfies ExtensionInfo
