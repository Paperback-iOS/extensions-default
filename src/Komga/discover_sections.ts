// Labels follow Komga's own dashboard vocabulary (komga-webui en.json) so the
// sections read the same way they do in the Komga web UI.
export interface DiscoverSectionDefinition {
  id: string
  title: string
  description: string
  // Sections whose card layout is dictated by their content, so only on/off
  fixedStyle?: boolean
}

export const DISCOVER_SECTIONS: DiscoverSectionDefinition[] = [
  {
    id: 'onDeck',
    title: 'On Deck',
    description: 'The next unread book in series you have started',
  },
  {
    id: 'keepReading',
    title: 'Keep Reading',
    description: 'Series you are part way through',
  },
  {
    id: 'nearlyFinished',
    title: 'Nearly Finished',
    description: 'Series you have the fewest unread books left in',
  },
  {
    id: 'recentlyAdded',
    title: 'Recently Added Series',
    description: 'Series most recently added to the library',
  },
  {
    id: 'recentlyUpdated',
    title: 'Recently Updated Series',
    description: 'Series changed most recently, including metadata edits',
  },
  {
    id: 'genres',
    title: 'Genres',
    description: 'Browse the genres in your library',
    fixedStyle: true,
  },
]
