import { ContentRating } from '@paperback/types'

// Komga libraries rarely set ageRating, so genres are the usable signal. These
// are matched case-insensitively against SeriesMetadataDto.genres, and are the
// single source for both the rating below and the default hide list in config.
export const ADULT_GENRES = [
  'adult',
  'hentai',
  'smut',
  'erotica',
  'pornographic',
]
export const MATURE_GENRES = ['mature', 'ecchi']

// ageRating is a minimum age when set; otherwise fall back to genres
export const parseContentRating = (metadata: {
  ageRating?: number
  genres?: Array<string>
}): ContentRating => {
  // Komga sends `ageRating: null` on the wire even though the generated type
  // declares it optional, so check the runtime type rather than for undefined
  const { ageRating } = metadata
  if (typeof ageRating === 'number') {
    if (ageRating >= 18) {
      return ContentRating.ADULT
    }
    if (ageRating >= 16) {
      return ContentRating.MATURE
    }
    return ContentRating.EVERYONE
  }

  const genres = (metadata.genres ?? []).map((genre) => genre.toLowerCase())
  if (genres.some((genre) => ADULT_GENRES.includes(genre))) {
    return ContentRating.ADULT
  }
  if (genres.some((genre) => MATURE_GENRES.includes(genre))) {
    return ContentRating.MATURE
  }
  return ContentRating.EVERYONE
}

// Komga silently ignores an unrecognised sort field rather than erroring, so
// every entry here was checked against a live server by confirming asc and desc
// actually differ. `titleSort`, `releaseDate` and `folderName` are all ignored;
// the working title field is `metadata.titleSort`.
