import {
  ButtonRow,
  Form,
  LabelRow,
  Section,
  SelectRow,
  type Chapter,
  type FormSectionElement,
  type SourceManga,
} from '@paperback/types'
import {
  markSeriesAsRead,
  markSeriesAsUnread,
  updateMihonReadProgressBySeriesId,
} from '../sdk/index.js'

export class ProgressManagementForm extends Form {
  override readonly requiresExplicitSubmission = true

  private selectedChapterId: string

  constructor(
    private readonly sourceManga: SourceManga,
    private readonly chapters: Chapter[],
    initialLastReadChapterNumber: number
  ) {
    super()
    this.selectedChapterId =
      this.findChapterByNumber(initialLastReadChapterNumber)?.chapterId ??
      'unread'
  }

  private get sortedChapters(): Chapter[] {
    return [...this.chapters].sort(
      (a, b) => (a.sortingIndex ?? a.chapNum) - (b.sortingIndex ?? b.chapNum)
    )
  }

  private findChapterByNumber(chapterNumber: number): Chapter | undefined {
    return this.chapters
      .filter(
        (chapter) => (chapter.sortingIndex ?? chapter.chapNum) <= chapterNumber
      )
      .sort(
        (a, b) => (b.sortingIndex ?? b.chapNum) - (a.sortingIndex ?? a.chapNum)
      )[0]
  }

  private get selectedChapter(): Chapter | undefined {
    return this.chapters.find(
      (chapter) => chapter.chapterId === this.selectedChapterId
    )
  }

  private get currentChapterTitle(): string {
    return this.selectedChapter?.title || 'No chapters read'
  }

  override getSections(): FormSectionElement<unknown>[] {
    return [
      Section(
        {
          id: 'progress',
          footer:
            'Submit to sync this value to Komga. Setting this to 0 marks the series unread.',
        },
        [
          LabelRow('currentProgress', {
            title: 'Current Progress',
            value: this.currentChapterTitle,
          }),
          SelectRow('lastReadChapter', {
            title: 'Last Read Chapter',
            subtitle: this.currentChapterTitle,
            value: [this.selectedChapterId],
            minItemCount: 1,
            maxItemCount: 1,
            layout: 'list',
            items: [
              { id: 'unread', title: 'No chapters read' },
              ...this.sortedChapters.map((chapter) => ({
                id: chapter.chapterId,
                title: chapter.title || `Chapter ${chapter.chapNum}`,
              })),
            ],
            onValueChange: Application.Selector(
              this as ProgressManagementForm,
              'lastReadChapterDidChange'
            ),
          }),
        ]
      ),
      Section('quickActions', [
        ButtonRow('markUnread', {
          title: 'Mark Unread',
          onSelect: Application.Selector(
            this as ProgressManagementForm,
            'markUnread'
          ),
        }),
        ButtonRow('markRead', {
          title: 'Mark Read',
          onSelect: Application.Selector(
            this as ProgressManagementForm,
            'markRead'
          ),
        }),
      ]),
    ]
  }

  async lastReadChapterDidChange(newValue: string[]): Promise<void> {
    this.selectedChapterId = newValue[0] ?? 'unread'
    this.reloadForm()
  }

  override async formDidSubmit(): Promise<void> {
    if (this.selectedChapterId === 'unread') {
      await this.markUnread()
      return
    }

    const chapter = this.selectedChapter
    if (!chapter) {
      throw new Error('Selected chapter was not found')
    }

    const { error } = await updateMihonReadProgressBySeriesId({
      path: { seriesId: this.sourceManga.mangaId },
      body: { lastBookNumberSortRead: chapter.sortingIndex ?? chapter.chapNum },
    })

    if (error) {
      throw new Error(JSON.stringify(error, undefined, 2))
    }
  }

  async markUnread(): Promise<void> {
    const { error } = await markSeriesAsUnread({
      path: { seriesId: this.sourceManga.mangaId },
    })

    if (error) {
      throw new Error(JSON.stringify(error, undefined, 2))
    }

    this.selectedChapterId = 'unread'
    this.reloadForm()
  }

  async markRead(): Promise<void> {
    const { error } = await markSeriesAsRead({
      path: { seriesId: this.sourceManga.mangaId },
    })

    if (error) {
      throw new Error(JSON.stringify(error, undefined, 2))
    }

    this.selectedChapterId =
      this.sortedChapters[this.sortedChapters.length - 1]?.chapterId ?? 'unread'
    this.reloadForm()
  }
}
