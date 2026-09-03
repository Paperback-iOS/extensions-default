import {
  type DiscoverSection,
  type DiscoverSectionItem,
  type PagedResults,
} from '@paperback/types'
import {
  getBooksOnDeck,
  getGenres,
  getSeries as getSeriesList,
  getSeriesNew,
  getSeriesUpdated,
} from './sdk/index.js'
import { client } from './sdk/client.gen.js'
import { isEqualTo, isFalse } from './utils/operators.js'
import {
  getAdultGenres,
  getHideAdultContent,
  getSectionStyle,
  type SectionStyle,
} from './utils/config.js'
import { parseContentRating } from './utils/content_rating.js'
import {
  hiddenGenreConditions,
  hiddenSeriesIds,
  isHiddenSeries,
  scopeConditions,
  scopeQuery,
} from './utils/filters.js'
import { capitalize, PAGE_SIZE, parseMangaStatus } from './utils/formatting.js'

// One builder per source shape, so a section's style only changes how its
// covers are presented rather than duplicating the query
const seriesItem = (
  serie: {
    id: string
    name: string
    booksCount: number
    booksReadCount: number
    metadata: {
      title: string
      status: string
      publisher: string
      summary: string
      genres?: Array<string>
      ageRating?: number
    }
  },
  style: SectionStyle
): DiscoverSectionItem => {
  const base = {
    mangaId: serie.id,
    title: serie.metadata.title || serie.name,
    imageUrl: `${client.getConfig().baseUrl}/api/v1/series/${serie.id}/thumbnail`,
    contentRating: parseContentRating(serie.metadata),
  }

  if (style === 'hero') {
    return {
      type: 'featuredCarouselItem',
      ...base,
      supertitle: [
        parseMangaStatus(serie.metadata.status).toUpperCase(),
        serie.metadata.publisher,
      ]
        .filter(Boolean)
        .join(' \u00b7 '),
      summary: serie.metadata.summary,
      infoItems: [
        { symbol: 'book.fill', text: `${serie.booksCount}` },
        {
          symbol: 'checkmark.circle.fill',
          text: `${serie.booksReadCount} read`,
        },
      ],
    }
  }

  const subtitle =
    serie.booksCount > 0
      ? `${serie.booksReadCount} of ${serie.booksCount} read`
      : undefined

  return style === 'large'
    ? { type: 'prominentCarouselItem', ...base, subtitle }
    : { type: 'simpleCarouselItem', ...base, subtitle: undefined }
}

export async function discoverSectionItems(
  section: DiscoverSection,
  metadata: { page: number } | undefined
): Promise<PagedResults<DiscoverSectionItem>> {
  const style = getSectionStyle(section.id)
  const page = metadata?.page

  switch (section.id) {
    case 'onDeck': {
      const { data, error } = await getBooksOnDeck({
        query: { page, ...scopeQuery() },
      })
      if (!data) {
        throw new Error(JSON.stringify(error, undefined, 2))
      }

      const hidden = await hiddenSeriesIds()
      const items: DiscoverSectionItem[] = []

      for (const book of data.content ?? []) {
        if (hidden.has(book.seriesId)) {
          continue
        }

        items.push({
          type:
            style === 'large' ? 'prominentCarouselItem' : 'simpleCarouselItem',
          mangaId: book.seriesId,
          title: book.seriesTitle,
          subtitle: book.metadata.title,
          imageUrl: `${client.getConfig().baseUrl}/api/v1/books/${book.id}/thumbnail`,
        })
      }

      return {
        items,
        metadata: data.last ? undefined : { page: (page ?? 0) + 1 },
      }
    }
    case 'keepReading': {
      const { data, error } = await getSeriesList({
        query: { sort: ['readProgress.readDate,desc'], page },
        body: {
          condition: {
            allOf: [
              { deleted: isFalse() },
              { readStatus: isEqualTo('IN_PROGRESS') },
              ...hiddenGenreConditions(),
              ...scopeConditions(),
            ],
          },
        },
      })
      if (!data) {
        throw new Error(JSON.stringify(error, undefined, 2))
      }

      return {
        items: (data.content ?? []).map((serie) => seriesItem(serie, style)),
        metadata: data.last ? undefined : { page: (page ?? 0) + 1 },
      }
    }
    case 'nearlyFinished': {
      // Komga ignores booksUnreadCount as a sort field, so order it here.
      // The set is bounded by what the user is actually reading, which keeps
      // the unpaged fetch cheap.
      const { data, error } = await getSeriesList({
        query: { unpaged: true },
        body: {
          condition: {
            allOf: [
              { deleted: isFalse() },
              { readStatus: isEqualTo('IN_PROGRESS') },
              ...hiddenGenreConditions(),
              ...scopeConditions(),
            ],
          },
        },
      })
      if (!data) {
        throw new Error(JSON.stringify(error, undefined, 2))
      }

      const items = (data.content ?? [])
        .filter((serie) => serie.booksUnreadCount > 0)
        .sort((a, b) => a.booksUnreadCount - b.booksUnreadCount)
        .slice(0, PAGE_SIZE)
        .map((serie) => seriesItem(serie, style))

      return { items, metadata: undefined }
    }
    case 'recentlyAdded':
    case 'recentlyUpdated': {
      const fetch =
        section.id === 'recentlyAdded' ? getSeriesNew : getSeriesUpdated
      const { data, error } = await fetch({
        query: { page, deleted: false, ...scopeQuery() },
      })
      if (!data) {
        throw new Error(JSON.stringify(error, undefined, 2))
      }

      const items = (data.content ?? [])
        .filter((serie) => !isHiddenSeries(serie.metadata))
        .map((serie) => seriesItem(serie, style))

      return {
        items,
        metadata: data.last ? undefined : { page: (page ?? 0) + 1 },
      }
    }
    case 'genres': {
      const genres = await getGenres()
        .then((r) => r.data ?? [])
        .catch(() => [])

      const hidden = getHideAdultContent() ? getAdultGenres() : []

      const items: DiscoverSectionItem[] = genres
        .filter((genre) => !hidden.includes(genre.toLowerCase()))
        .map((genre) => ({
          type: 'genresCarouselItem' as const,
          name: capitalize(genre),
          searchQuery: {
            title: '',
            metadata: [
              {
                id: 'genre',
                value: { ['genre-' + btoa(genre)]: 'included' as const },
              },
            ],
          },
        }))

      return { items, metadata: undefined }
    }
    default: {
      throw new Error(`Unknown section ${section.id}`)
    }
  }
}
