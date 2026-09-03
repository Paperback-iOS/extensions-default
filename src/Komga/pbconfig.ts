import {
  ContentRating,
  type ExtensionInfo,
  SourceIntents,
} from '@paperback/types'

export default {
  version: '3.9.4',
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
    {
      name: 'Exikle',
      github: 'Exikle',
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
    SourceIntents.CHAPTER_PROVIDING,
    SourceIntents.SEARCH_RESULT_PROVIDING,
    SourceIntents.SETTINGS_FORM_PROVIDING,
    SourceIntents.DISCOVER_SECTION_PROVIDING,
    SourceIntents.PROGRESS_PROVIDING,
  ],
} satisfies ExtensionInfo
