import {
  Form,
  Section,
  SelectRow,
  ToggleRow,
  type FormSectionElement,
} from '@paperback/types'
import {
  getAdultGenres,
  getHideAdultContent,
  getIncludeOneshots,
  getSelectedLibraries,
  setAdultGenres,
  setHideAdultContent,
  setIncludeOneshots,
  setSelectedLibraries,
} from '../utils/config.js'
import { getGenres, getLibraries } from '../sdk/index.js'

export class ContentSettingsForm extends Form {
  private hideAdultContent = getHideAdultContent()
  private adultGenres = getAdultGenres()
  // Populated from the server; getSections is sync so the fetch happens in
  // formWillAppear and reloads the form when it lands
  private availableGenres: string[] = []
  private selectedLibraries = getSelectedLibraries()
  private availableLibraries: Array<{ id: string; name: string }> = []
  private includeOneshots = getIncludeOneshots()

  override formWillAppear(): void {
    void this.load()
  }

  private async load(): Promise<void> {
    await Promise.all([this.loadGenres(), this.loadLibraries()])
    this.reloadForm()
  }

  private async loadLibraries(): Promise<void> {
    this.availableLibraries = await getLibraries()
      .then((r) => (r.data ?? []).map((l) => ({ id: l.id, name: l.name })))
      .catch(() => [])
  }

  private async loadGenres(): Promise<void> {
    const genres = await getGenres()
      .then((r) => r.data ?? [])
      .catch(() => [])

    // Keep any configured genre the server no longer reports, otherwise
    // selecting it would silently vanish from the list
    this.availableGenres = [
      ...new Set([...genres.map((g) => g.toLowerCase()), ...this.adultGenres]),
    ].sort()
  }

  override getSections(): FormSectionElement<unknown>[] {
    return [
      Section(
        {
          id: 'adultContent',
          footer:
            'Hides series whose genres match the list below. Komga rarely sets an age rating, so this matches on genres instead.',
        },
        [
          ToggleRow('hideAdultContent', {
            title: 'Hide Adult Content',
            value: this.hideAdultContent,
            onValueChange: Application.Selector(
              this as ContentSettingsForm,
              'hideAdultContentDidChange'
            ),
          }),
          SelectRow('adultGenres', {
            title: 'Genres To Hide',
            // Row ids may only use `._-@()[]%?#+=/&:`, so a genre like
            // `martial arts` has to be encoded. base64 is what the search
            // filters already use and its alphabet is within that set.
            value: this.adultGenres.map(btoa),
            minItemCount: 0,
            maxItemCount: this.availableGenres.length,
            layout: 'list',
            items: this.availableGenres.map((genre) => ({
              id: btoa(genre),
              title: genre,
            })),
            onValueChange: Application.Selector(
              this as ContentSettingsForm,
              'adultGenresDidChange'
            ),
          }),
        ]
      ),

      Section(
        {
          id: 'libraries',
          header: 'Libraries',
          footer:
            'Restrict browsing and search to these libraries. Selecting none includes every library.',
        },
        [
          SelectRow('selectedLibraries', {
            title: 'Libraries',
            value: this.selectedLibraries,
            minItemCount: 0,
            maxItemCount: this.availableLibraries.length,
            layout: 'list',
            items: this.availableLibraries.map((library) => ({
              id: library.id,
              title: library.name,
            })),
            onValueChange: Application.Selector(
              this as ContentSettingsForm,
              'selectedLibrariesDidChange'
            ),
          }),
        ]
      ),

      Section(
        {
          id: 'oneshots',
          footer:
            'One-shots are single-volume works Komga tracks separately from serialised series.',
        },
        [
          ToggleRow('includeOneshots', {
            title: 'Include One-Shots',
            value: this.includeOneshots,
            onValueChange: Application.Selector(
              this as ContentSettingsForm,
              'includeOneshotsDidChange'
            ),
          }),
        ]
      ),
    ]
  }

  async selectedLibrariesDidChange(newValue: string[]): Promise<void> {
    this.selectedLibraries = newValue
    setSelectedLibraries(newValue)
    Application.invalidateDiscoverSections()
    this.reloadForm()
  }

  async includeOneshotsDidChange(newValue: boolean): Promise<void> {
    this.includeOneshots = newValue
    setIncludeOneshots(newValue)
    Application.invalidateDiscoverSections()
    this.reloadForm()
  }

  async hideAdultContentDidChange(newValue: boolean): Promise<void> {
    this.hideAdultContent = newValue
    setHideAdultContent(newValue)
    Application.invalidateDiscoverSections()
    this.reloadForm()
  }

  async adultGenresDidChange(newValue: string[]): Promise<void> {
    const genres = newValue.map(atob)
    this.adultGenres = genres
    setAdultGenres(genres)
    Application.invalidateDiscoverSections()
    this.reloadForm()
  }
}
