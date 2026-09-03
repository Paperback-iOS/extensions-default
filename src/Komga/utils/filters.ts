import { getSeries as getSeriesList } from '../sdk/index.js'
import type { AllOfSeries } from '../sdk/types.gen.js'
import { isEqualTo, isFalse, isNotEqualTo } from './operators.js'
import {
  getAdultGenres,
  getHideAdultContent,
  getIncludeOneshots,
  getSelectedLibraries,
} from './config.js'

// `/series/list` takes a search condition, so hidden genres are excluded by the
// server. `/series/new` and `/series/updated` take no condition, so those get
// filtered here instead.
export const hiddenGenreConditions = () => {
  if (!getHideAdultContent()) {
    return []
  }
  return getAdultGenres().map((genre) => ({ genre: isNotEqualTo(genre) }))
}

// On Deck returns books, and Komga puts genres only on series. Rather than a
// lookup per book, fetch the hidden series once and filter by membership.
export const hiddenSeriesIds = async (): Promise<Set<string>> => {
  if (!getHideAdultContent()) {
    return new Set()
  }

  const { data } = await getSeriesList({
    query: { unpaged: true },
    body: {
      condition: {
        anyOf: getAdultGenres().map((genre) => ({ genre: isEqualTo(genre) })),
      },
    },
  }).catch(() => ({ data: undefined }))

  return new Set((data?.content ?? []).map((serie) => serie.id))
}

// Library scope and one-shot inclusion apply to every browse query. The
// discover endpoints take them as query params; /series/list takes conditions.
export const scopeQuery = () => {
  const libraries = getSelectedLibraries()
  return {
    ...(libraries.length > 0 ? { library_id: libraries } : {}),
    ...(getIncludeOneshots() ? {} : { oneshot: false }),
  }
}

export const scopeConditions = () => {
  const libraries = getSelectedLibraries()
  const conditions: AllOfSeries['allOf'] = []

  if (libraries.length > 0) {
    conditions.push({
      anyOf: libraries.map((id) => ({ libraryId: isEqualTo(id) })),
    })
  }

  if (!getIncludeOneshots()) {
    conditions.push({ oneShot: isFalse() })
  }

  return conditions
}

export const isHiddenSeries = (metadata: {
  genres?: Array<string>
}): boolean => {
  if (!getHideAdultContent()) {
    return false
  }
  const hidden = getAdultGenres()
  return (metadata.genres ?? []).some((genre) =>
    hidden.includes(genre.toLowerCase())
  )
}
