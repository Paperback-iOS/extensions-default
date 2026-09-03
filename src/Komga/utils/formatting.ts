// Number of items requested for paged requests
export const PAGE_SIZE = 40

export const parseMangaStatus = (komgaStatus: string): string =>
  komgaStatus.toLowerCase()

export const capitalize = (tag: string): string =>
  tag.replace(/^\w/, (c) => c.toUpperCase())
