// This source use Komga REST API
// https://komga.org/guides/rest.html
// Manga are represented by `series`
// Chapters are represented by `books`
// The Basic Authentication is handled by the interceptor
// Code and method used by both the source and the tracker are defined in the duplicated `KomgaCommon.ts` file
// Due to the self hosted nature of Komga, this source requires the user to enter its server credentials in the source settings menu
// Some methods are known to throw errors without specific actions from the user. They try to prevent this behavior when server settings are not set.
// This include:
//  - homepage sections
//  - getTags() which is called on the homepage
//  - search method which is called even if the user search in an other source

import {
  SearchFilterForm,
  type SearchFilter,
  type SearchFilterValue,
} from '@paperback/types/lib/compat/0.8/index.js'

import {
  AdvancedSearchForm,
  type Chapter,
  type ChapterDetails,
  type ChapterReadActionQueueProcessingResult,
  type DiscoverSection,
  type DiscoverSectionItem,
  DiscoverSectionType,
  type ExtensionImpl,
  Form,
  type MangaProgress,
  type PagedResults,
  type SearchQuery,
  type SearchResultItem,
  type SortingOption,
  type SourceManga,
  type UpdateManager,
  type TagSection,
  type TrackedMangaChapterReadAction,
} from '@paperback/types'
import {
  getBookPages,
  getBooks as getBooksList,
  getCollections,
  getGenres,
  getLibraries,
  getMihonReadProgressBySeriesId,
  getSeriesById as getOneSeries,
  getSeries as getSeriesList,
  getSeriesTags,
  getSeriesUpdated,
  markBookReadProgress,
} from './sdk/index.js'
import { client } from './sdk/client.gen.js'
import { KomgaImageInterceptor } from './interceptors/image_interceptor.js'
import { Operator } from './utils/operators.js'
import {
  getKomgaBaseURL,
  getKomgaCredentials,
  getSectionStyle,
  type SectionStyle,
} from './utils/config.js'
import { SettingsForm } from './forms/settings_form.js'
import { discoverSectionItems } from './discover.js'
import { capitalize, PAGE_SIZE, parseMangaStatus } from './utils/formatting.js'
import { parseContentRating } from './utils/content_rating.js'
import { hiddenGenreConditions, scopeConditions } from './utils/filters.js'
import { DISCOVER_SECTIONS } from './discover_sections.js'
import { parseChapterTitle } from './utils/titles.js'
import { ProgressManagementForm } from './forms/progress_management_form.js'
import type KomgaConfig from './pbconfig.js'

const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]

// A series' lastModified can trail its books' created time by a few seconds
// when both are written during one library scan, so look slightly further back
// than the app's last check to avoid skipping a series that did gain chapters.
const UPDATE_CHECK_MARGIN_MS = 60 * 60 * 1000

// Guards the paging loop; far more than a sane library needs in one pass
const MAX_UPDATE_PAGES = 50

const STYLE_TO_SECTION_TYPE: Record<
  Exclude<SectionStyle, 'hidden'>,
  DiscoverSectionType
> = {
  simple: DiscoverSectionType.simpleCarousel,
  large: DiscoverSectionType.prominentCarousel,
  hero: DiscoverSectionType.featured,
}

const DEFAULT_SORT = 'metadata.titleSort,asc'

const SORT_OPTIONS: Array<SortingOption & { sort: string }> = [
  { id: 'titleAsc', label: 'Title (A-Z)', sort: DEFAULT_SORT },
  { id: 'titleDesc', label: 'Title (Z-A)', sort: 'metadata.titleSort,desc' },
  { id: 'recentlyAdded', label: 'Recently Added', sort: 'created,desc' },
  {
    id: 'recentlyUpdated',
    label: 'Recently Updated',
    sort: 'lastModified,desc',
  },
  { id: 'recentlyRead', label: 'Recently Read', sort: 'readDate,desc' },
  { id: 'mostChapters', label: 'Most Chapters', sort: 'booksCount,desc' },
]

// Preferred targets for the app's share action, best first. Komga records many
// links per series; anything not listed here is used only as a last resort.
const SHARE_LINK_PREFERENCE = [
  'anilist',
  'mangadex',
  'mangaupdates',
  'myanimelist',
]

const pickShareUrl = (
  links: Array<{ label: string; url: string }>
): string | undefined => {
  for (const preferred of SHARE_LINK_PREFERENCE) {
    const match = links.find(
      (link) => link.label.toLowerCase().replace(/\s+/g, '') === preferred
    )
    if (match) {
      return match.url
    }
  }
  return links[0]?.url
}

export class KomgaExtension implements ExtensionImpl<typeof KomgaConfig> {
  async getAdvancedSearchForm(
    query: SearchQuery<SearchFilterValue[]>
  ): Promise<AdvancedSearchForm> {
    return new SearchFilterForm(query.metadata, this.getSearchFilters())
  }

  async getMangaProgressManagementForm(
    sourceManga: SourceManga
  ): Promise<Form> {
    const [chapters, progress] = await Promise.all([
      this.getChapters(sourceManga),
      getMihonReadProgressBySeriesId({
        path: { seriesId: sourceManga.mangaId },
      }),
    ])

    if (progress.error) {
      throw new Error(JSON.stringify(progress.error, undefined, 2))
    }

    return new ProgressManagementForm(
      sourceManga,
      chapters,
      progress.data?.lastReadContinuousNumberSort ?? 0
    )
  }

  async getMangaProgress(
    sourceManga: SourceManga
  ): Promise<MangaProgress | undefined> {
    const { data } = await getMihonReadProgressBySeriesId({
      path: { seriesId: sourceManga.mangaId },
    })

    if (!data || data.lastReadContinuousNumberSort <= 0) {
      return undefined
    }

    const chapters = await this.getChapters(sourceManga)
    const lastReadChapter = chapters
      .filter(
        (chapter) =>
          (chapter.sortingIndex ?? chapter.chapNum) <=
          data.lastReadContinuousNumberSort
      )
      .sort(
        (a, b) => (b.sortingIndex ?? b.chapNum) - (a.sortingIndex ?? a.chapNum)
      )[0]

    if (!lastReadChapter) {
      return undefined
    }

    return {
      sourceManga,
      lastReadChapter,
    }
  }

  async processChapterReadActionQueue(
    actions: TrackedMangaChapterReadAction[]
  ): Promise<ChapterReadActionQueueProcessingResult> {
    const successfulItems: string[] = []
    const failedItems: string[] = []

    for (const action of actions) {
      const { error } = await markBookReadProgress({
        path: { bookId: action.chapterId },
        body: { completed: true },
      })

      if (error) {
        failedItems.push(action.id)
      } else {
        successfulItems.push(action.id)
      }
    }

    return { successfulItems, failedItems }
  }

  imageInterceptor = new KomgaImageInterceptor('images')
  async initialise(): Promise<void> {
    this.imageInterceptor.registerInterceptor()

    client.setConfig({
      baseUrl: getKomgaBaseURL(),
      auth(auth) {
        const { username, password } = getKomgaCredentials()

        if (auth.type == 'http' && auth.scheme == 'basic') {
          return `${username}:${password}`
        }

        return undefined
      },
    })
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    /*
      In Komga a manga is represented by a `serie`
      */
    const response = await getOneSeries({
      path: { seriesId: mangaId },
    })

    const result = response.data
    if (!result) {
      throw new Error('Series not found')
    }

    const metadata = result.metadata
    const booksMetadata = result.booksMetadata
    const tagSections: [TagSection, TagSection] = [
      { id: '0', title: 'genres', tags: [] },
      { id: '1', title: 'tags', tags: [] },
    ]
    // For each tag, we append a type identifier to its id and capitalize its label
    tagSections[0].tags = metadata.genres.map((elem: string) => ({
      id: 'genre-' + btoa(elem),
      title: capitalize(elem),
    }))

    tagSections[1].tags = metadata.tags.map((elem: string) => ({
      id: 'tag-' + btoa(elem),
      title: capitalize(elem),
    }))

    const authors: string[] = []
    const artists: string[] = []
    // Additional roles: colorist, inker, letterer, cover, editor
    for (const entry of booksMetadata.authors) {
      if (entry.role === 'writer') {
        authors.push(entry.name)
      }
      if (entry.role === 'penciller') {
        artists.push(entry.name)
      }
    }

    const thumbnailUrl = `${client.getConfig().baseUrl}/api/v1/series/${mangaId}/thumbnail`
    return {
      mangaId: mangaId,
      mangaInfo: {
        thumbnailUrl: thumbnailUrl,
        primaryTitle: metadata.title,
        secondaryTitles: metadata.alternateTitles.map((alt) => alt.title),
        contentRating: parseContentRating(metadata),
        status: parseMangaStatus(metadata.status),
        artist: artists.join(', '),
        author: authors.join(', '),
        synopsis: metadata.summary ? metadata.summary : booksMetadata.summary,
        tagGroups: tagSections,
        shareUrl: pickShareUrl(metadata.links),
        additionalInfo: {
          language: metadata.language,
          readingDirection: metadata.readingDirection,
          publisher: metadata.publisher,
          books: String(result.booksCount),
          ...(metadata.totalBookCount === undefined
            ? {}
            : { totalBooks: String(metadata.totalBookCount) }),
          booksRead: String(result.booksReadCount),
          booksUnread: String(result.booksUnreadCount),
          booksInProgress: String(result.booksInProgressCount),
        },
      },
    }
  }

  async getSearchFilters(): Promise<SearchFilter[]> {
    // This function is called on the homepage and should not throw if the server is unavailable
    // We define four types of tags:
    // - `genre`
    // - `tag`
    // - `collection`
    // - `library`
    // To be able to make the difference between theses types, we append `genre-` or `tag-` at the beginning of the tag id

    // Each lookup falls back to an empty list so an unreachable server does not
    // take down the homepage
    const [genresResult, tagsResult, collectionResult, libraryResult] =
      await Promise.all([
        getGenres()
          .then((r) => r.data ?? [])
          .catch(() => []),
        getSeriesTags()
          .then((r) => r.data ?? [])
          .catch(() => []),
        getCollections()
          .then((r) => r.data?.content ?? [])
          .catch(() => []),
        getLibraries()
          .then((r) => r.data ?? [])
          .catch(() => []),
      ])

    const genreSearchFilter: SearchFilter = {
      type: 'multiselect',
      allowEmptySelection: true,
      allowExclusion: true,
      id: 'genre',
      title: 'Genres',
      maximum: undefined,
      options: genresResult.map((elem) => ({
        id: 'genre-' + btoa(elem),
        value: capitalize(elem),
      })),
      value: {},
    }

    const tagsSearchFilter: SearchFilter = {
      type: 'multiselect',
      allowEmptySelection: true,
      allowExclusion: true,
      id: 'tags',
      title: 'Tags',
      maximum: undefined,
      options: tagsResult.map((elem) => ({
        id: 'tag-' + btoa(elem),
        value: capitalize(elem),
      })),
      value: {},
    }

    const collectionsSearchFilter: SearchFilter = {
      type: 'multiselect',
      allowEmptySelection: true,
      allowExclusion: true,
      id: 'collections',
      title: 'Collections',
      maximum: undefined,
      options: collectionResult.map((elem) => ({
        id: 'collection-' + btoa(elem.id),
        value: capitalize(elem.name),
      })),
      value: {},
    }

    const librarySearchFilter: SearchFilter = {
      type: 'multiselect',
      allowEmptySelection: true,
      allowExclusion: true,
      id: 'library',
      title: 'Libraries',
      maximum: undefined,
      options: libraryResult.map((elem) => ({
        id: 'library-' + btoa(elem.id),
        value: capitalize(elem.name),
      })),
      value: {},
    }

    return [
      genreSearchFilter,
      tagsSearchFilter,
      librarySearchFilter,
      collectionsSearchFilter,
    ]
  }

  async getSortingOptions(): Promise<SortingOption[]> {
    return SORT_OPTIONS.map(({ id, label }) => ({ id, label }))
  }

  async getSearchResults(
    searchQuery: SearchQuery<SearchFilterValue[]>,
    metadata: { page: number } | undefined,
    sortingOption: SortingOption | undefined
  ): Promise<PagedResults<SearchResultItem>> {
    // This function is also called when the user search in an other source. It should not throw if the server is unavailable.
    const sort =
      SORT_OPTIONS.find((option) => option.id === sortingOption?.id)?.sort ??
      DEFAULT_SORT

    const page: number = metadata?.page ?? 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any[] = [...hiddenGenreConditions(), ...scopeConditions()]
    for (const filter of searchQuery.metadata ?? []) {
      const value = filter.value

      if (typeof value === 'object') {
        const keys = Object.keys(value)
        for (const key of keys) {
          const filterValue = value[key]
          if (!filterValue) {
            continue
          }

          const operator = filterValue == 'included' ? 'is' : 'isNot'
          // There are two types of tags: `tag` and `genre`
          if (key.substring(0, 4) == 'tag-') {
            const tag = atob(key.substring(4))
            filters.push({ tag: { operator, value: tag } })
          }

          if (key.substring(0, 6) == 'genre-') {
            const genre = atob(key.substring(6))
            filters.push({ genre: { operator, value: genre } })
          }

          if (key.substring(0, 11) == 'collection-') {
            const collectionId = atob(key.substring(11))
            filters.push({ collectionId: { operator, value: collectionId } })
          }

          if (key.substring(0, 8) == 'library-') {
            const libraryId = atob(key.substring(8))
            filters.push({ libraryId: { operator, value: libraryId } })
          }
        }
      }
    }

    const response = await getSeriesList({
      query: {
        page,
        size: PAGE_SIZE,
        sort: [sort],
      },
      body: {
        fullTextSearch: searchQuery.title,
        ...(() => {
          if (filters.length > 0) {
            return { condition: { allOf: filters } }
          } else {
            return undefined
          }
        })(),
      },
    })

    const result = response.data
    if (!result) {
      throw new Error(JSON.stringify(response.error))
    }

    const tiles: SearchResultItem[] = []
    for (const serie of result.content ?? []) {
      const imageUrl = `${client.getConfig().baseUrl}/api/v1/series/${serie.id}/thumbnail`

      tiles.push({
        imageUrl: imageUrl,
        title: serie.metadata.title,
        mangaId: serie.id,
        subtitle: undefined,
        contentRating: parseContentRating(serie.metadata),
      })
    }

    // If no series were returned we are on the last page
    metadata = tiles.length === 0 ? undefined : { page: page + 1 }
    return {
      items: tiles,
      metadata,
    }
  }

  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    /*
     * In Komga a chapter is a `book`
     */

    const { data, error } = await getBooksList({
      query: { unpaged: true },
      body: {
        condition: {
          seriesId: Operator({ operator: 'is', value: sourceManga.mangaId }),
          deleted: Operator({ operator: 'isFalse' }),
          mediaStatus: Operator({ operator: 'is', value: 'READY' }),
        },
      },
    })

    if (!data) {
      throw new Error(JSON.stringify(error, undefined, 2))
    }

    const booksResult = data
    const chapters: Chapter[] = []

    const languageCode =
      sourceManga.mangaInfo.additionalInfo?.['language']?.toUpperCase() ??
      'UNKNOWN'
    for (const book of booksResult.content ?? []) {
      // Komga has no volume field on a book, it is embedded in the title
      const { title, volume } = parseChapterTitle(
        book.metadata.title,
        book.metadata.number
      )

      chapters.push({
        chapterId: book.id,
        chapNum: parseFloat(book.metadata.number),
        langCode: languageCode,
        // An unset volume renders as `Vol. TBA`, 0 hides the segment
        title: title ?? '',
        volume: volume ?? 0,
        publishDate: book.metadata.releaseDate
          ? new Date(book.metadata.releaseDate)
          : new Date(book.fileLastModified),
        // When the book landed in the library, as opposed to when it published
        creationDate: new Date(book.created),
        sortingIndex: book.metadata.numberSort,
        sourceManga: sourceManga,
      })
    }

    return chapters
  }

  // Komga has no "changed since" search condition, but /series/updated is
  // ordered by lastModified descending, so we can page until we pass the
  // cutoff and mark everything untouched as skippable.
  async processTitlesForUpdates(
    updateManager: UpdateManager,
    lastUpdateDate?: Date
  ): Promise<void> {
    const queued = updateManager.getQueuedItems()

    // With no previous run there is nothing to compare against, so leave the
    // app to check everything as it normally would
    if (queued.length === 0 || !lastUpdateDate) {
      return
    }

    const cutoff = new Date(lastUpdateDate.getTime() - UPDATE_CHECK_MARGIN_MS)
    const updated = new Set<string>()

    for (let page = 0; page < MAX_UPDATE_PAGES; page++) {
      const { data } = await getSeriesUpdated({
        query: { page, size: PAGE_SIZE, deleted: false },
      }).catch(() => ({ data: undefined }))

      // A failed request tells us nothing about what changed. Returning here
      // leaves every title at its default priority; marking them skipped would
      // silently swallow real updates.
      if (!data) {
        return
      }

      const content = data.content ?? []
      const stale = content.find(
        (serie) => new Date(serie.lastModified) <= cutoff
      )

      for (const serie of content) {
        if (new Date(serie.lastModified) > cutoff) {
          updated.add(serie.id)
        }
      }

      if (stale || data.last) {
        break
      }
    }

    for (const manga of queued) {
      await updateManager.setUpdatePriority(
        manga.mangaId,
        updated.has(manga.mangaId) ? 'high' : 'skip'
      )
    }
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const { data, error } = await getBookPages({
      path: { bookId: chapter.chapterId }, //
    })

    if (!data) {
      throw new Error(JSON.stringify(error, undefined, 2))
    }

    const chapterId = chapter.chapterId
    const result = data
    const pages: string[] = []

    const komgaAPI = client.getConfig().baseUrl
    for (const page of result) {
      let pageUrl = `${komgaAPI}/api/v1/books/${chapterId}/pages/${page.number}`

      if (!SUPPORTED_IMAGE_TYPES.includes(page.mediaType)) {
        pageUrl += '?convert=png'
      }

      pages.push(pageUrl)
    }
    // Determine the preferred reading direction which is only available in the serie metadata
    // const readingDirection = chapter.sourceManga.mangaInfo.additionalInfo?.['readingDirection']
    // const longStrip = readingDirection ? ['VERTICAL', 'WEBTOON'].includes(readingDirection) : false

    return {
      id: chapterId,
      mangaId: chapter.sourceManga.mangaId,
      pages: pages,
    }
  }

  async getSettingsForm(): Promise<Form> {
    return new SettingsForm()
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    const sections: DiscoverSection[] = []

    for (const definition of DISCOVER_SECTIONS) {
      const style = getSectionStyle(definition.id)
      if (style === 'hidden') {
        continue
      }

      sections.push({
        id: definition.id,
        title: definition.title,
        type: definition.fixedStyle
          ? DiscoverSectionType.genres
          : STYLE_TO_SECTION_TYPE[style],
      })
    }

    return sections
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: { page: number } | undefined
  ): Promise<PagedResults<DiscoverSectionItem>> {
    return discoverSectionItems(section, metadata)
  }
}
