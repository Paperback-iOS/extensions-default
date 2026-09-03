// Komga has no volume field on a book: `BookMetadataDto` carries only `number`,
// `numberSort` and a free-form `title`. Scanners encode the volume, the chapter,
// or both into that title, in shapes like:
//
//   'Chapter 254'   'Ch.234'   'Ch. 1181'   'Ch.040.5'   'Chapter -1'
//   'Vol.13 Ch.067'   'Vol.TBD Ch.234'   'Vol.02 Ch.016 - The Aria'
//
// Paperback already renders the chapter number, so a leading volume or chapter
// token in the title shows up twice on screen.

// `Vol.13`, `Vol. 4`, `Volume 2`, and placeholders like `Vol.TBD` / `Vol.???`.
// `Vol` is matched case-insensitively through character classes so the
// placeholder branch can stay upper-case only - an /i flag there would let it
// swallow the first word of a real title such as `Vol. the Beginning`.
const VOLUME_PREFIX =
  /^\s*[Vv][Oo][Ll](?:[Uu][Mm][Ee])?\.?\s*(\d+(?:\.\d+)*|[A-Z?]{2,5}(?![A-Za-z]))\s*/

// `Chapter 254`, `Ch.234`, `Ch. 1181`, `Ch.040.5`, `Chapter -1`
const CHAPTER_PREFIX = /^\s*ch(?:apter)?\.?\s*(-?\d+(?:\.\d+)*)\s*/i

const SEPARATOR = /^\s*[-–—:|]+\s*/

const NUMERIC_ONLY = /^-?\d+(?:\.\d+)*$/

export interface ParsedChapterTitle {
  title?: string
  // Only set when the source encoded a numeric volume. Callers should map
  // undefined onto `volume: 0`, which is what hides Paperback's volume segment.
  volume?: number
}

export function parseChapterTitle(
  rawTitle: string | undefined,
  chapterNumber?: string
): ParsedChapterTitle {
  let rest = (rawTitle ?? '').trim()
  let volume: number | undefined

  // Loop so doubled prefixes (`Chapter 10 - Chapter 10`) and combined ones
  // (`Vol.13 Ch.067`) are both handled
  for (;;) {
    const volumeMatch = VOLUME_PREFIX.exec(rest)
    if (volumeMatch) {
      // TBD/TBA/? are placeholders, strip them without recording a volume
      const parsed = Number.parseFloat(volumeMatch[1] ?? '')
      if (volume === undefined && Number.isFinite(parsed)) {
        volume = parsed
      }
      rest = rest.slice(volumeMatch[0].length)
      continue
    }

    const chapterMatch = CHAPTER_PREFIX.exec(rest)
    if (chapterMatch) {
      rest = rest.slice(chapterMatch[0].length)
      continue
    }

    const separatorMatch = SEPARATOR.exec(rest)
    if (separatorMatch) {
      rest = rest.slice(separatorMatch[0].length)
      continue
    }

    break
  }

  rest = rest.trim()

  // A bare restatement of the chapter number adds nothing. The remainder has to
  // be entirely numeric: parseFloat alone reads "1F.Headon's Floor" as 1 and
  // would drop a real title.
  if (
    chapterNumber !== undefined &&
    NUMERIC_ONLY.test(rest) &&
    Number.parseFloat(rest) === Number.parseFloat(chapterNumber)
  ) {
    rest = ''
  }

  return { title: rest === '' ? undefined : rest, volume }
}
