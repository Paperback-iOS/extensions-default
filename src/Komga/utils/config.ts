import { ADULT_GENRES, MATURE_GENRES } from './content_rating.js'

const KEY_KOMGA_BASE_URL = 'serverURL'
const KEY_KOMGA_USERNAME = 'serverUsername'
const KEY_KOMGA_PASSWORD = 'serverPassword'
const KEY_HIDE_ADULT_CONTENT = 'hideAdultContent'
const KEY_ADULT_GENRES = 'adultGenres'

const DEFAULT_KOMGA_BASE_URL = 'https://demo.komga.org'
const DEFAULT_KOMGA_USERNAME = 'demo@komga.org'
const DEFAULT_KOMGA_PASSWORD = 'komga-demo'
const DEFAULT_HIDE_ADULT_CONTENT = false
// Matched case-insensitively against a series' genres
const DEFAULT_ADULT_GENRES = [...ADULT_GENRES, ...MATURE_GENRES]

function getStateOrDefault<T>(key: string, def: T): T {
  return (Application.getState(key) as T) ?? def
}

export function getKomgaBaseURL() {
  return getStateOrDefault(KEY_KOMGA_BASE_URL, DEFAULT_KOMGA_BASE_URL)
}

export function setKomgaBaseURL(url: string) {
  return Application.setState(url, KEY_KOMGA_BASE_URL)
}

export function getKomgaCredentials() {
  return {
    username:
      (Application.getSecureState(KEY_KOMGA_USERNAME) as string) ??
      DEFAULT_KOMGA_USERNAME,
    password:
      (Application.getSecureState(KEY_KOMGA_PASSWORD) as string) ??
      DEFAULT_KOMGA_PASSWORD,
  }
}

export function setKomgaCredentials(username: string, password: string) {
  Application.setSecureState(username, KEY_KOMGA_USERNAME)
  Application.setSecureState(password, KEY_KOMGA_PASSWORD)
}

export function getHideAdultContent() {
  return getStateOrDefault(KEY_HIDE_ADULT_CONTENT, DEFAULT_HIDE_ADULT_CONTENT)
}

export function setHideAdultContent(newValue: boolean) {
  Application.setState(newValue, KEY_HIDE_ADULT_CONTENT)
}

// Lower-cased so callers can compare directly against a series' genres
export function getAdultGenres(): string[] {
  const stored = Application.getState(KEY_ADULT_GENRES)
  const genres = Array.isArray(stored)
    ? (stored as string[])
    : DEFAULT_ADULT_GENRES
  return genres.map((genre) => genre.toLowerCase())
}

export function setAdultGenres(newValue: string[]) {
  Application.setState(newValue, KEY_ADULT_GENRES)
}

// How a discover section is presented. `hidden` drops it entirely.
export type SectionStyle = 'hidden' | 'simple' | 'large' | 'hero'

export const SECTION_STYLES: Array<{ id: SectionStyle; title: string }> = [
  { id: 'hidden', title: 'Hidden' },
  { id: 'simple', title: 'Regular' },
  { id: 'large', title: 'Large' },
  { id: 'hero', title: 'Hero' },
]

const styleKey = (sectionId: string) => `sectionStyle.${sectionId}`

// Earlier versions stored a boolean per section plus two extra sections that
// only differed in presentation. Fold those into the style setting so nobody's
// configuration resets on upgrade.
const LEGACY_VISIBILITY: Record<string, string> = {
  onDeck: 'showOnDeck',
  keepReading: 'showContinueReading',
  recentlyAdded: 'showRecentlyAdded',
  recentlyUpdated: 'showRecentlyUpdated',
  genres: 'showGenres',
}

const LEGACY_STYLE_SECTION: Record<string, SectionStyle> = {
  showFeatured: 'hero',
  showProminent: 'large',
}

const LEGACY_STYLE_OWNER: Record<string, string> = {
  showFeatured: 'recentlyAdded',
  showProminent: 'keepReading',
}

export function getSectionStyle(sectionId: string): SectionStyle {
  const stored = Application.getState(styleKey(sectionId))
  if (typeof stored === 'string') {
    return stored as SectionStyle
  }

  // A duplicate section that was switched on becomes its owner's style
  for (const [legacyKey, style] of Object.entries(LEGACY_STYLE_SECTION)) {
    if (
      LEGACY_STYLE_OWNER[legacyKey] === sectionId &&
      Application.getState(legacyKey) === true
    ) {
      return style
    }
  }

  const legacyVisibility = LEGACY_VISIBILITY[sectionId]
  if (legacyVisibility !== undefined) {
    return Application.getState(legacyVisibility) === false
      ? 'hidden'
      : 'simple'
  }

  return 'simple'
}

export function setSectionStyle(sectionId: string, style: SectionStyle) {
  Application.setState(style, styleKey(sectionId))
}

const KEY_SELECTED_LIBRARIES = 'selectedLibraries'
const KEY_INCLUDE_ONESHOTS = 'includeOneshots'

/** Library ids to restrict browsing to. Empty means every library. */
export function getSelectedLibraries(): string[] {
  const stored = Application.getState(KEY_SELECTED_LIBRARIES)
  return Array.isArray(stored) ? (stored as string[]) : []
}

export function setSelectedLibraries(newValue: string[]) {
  Application.setState(newValue, KEY_SELECTED_LIBRARIES)
}

/**
 * Endpoints take `oneshot` as an optional tri-state, where leaving it unset
 * returns both. Only pass `false` when one-shots are being excluded.
 */
export function getIncludeOneshots(): boolean {
  return (Application.getState(KEY_INCLUDE_ONESHOTS) as boolean) ?? true
}

export function setIncludeOneshots(newValue: boolean) {
  Application.setState(newValue, KEY_INCLUDE_ONESHOTS)
}
