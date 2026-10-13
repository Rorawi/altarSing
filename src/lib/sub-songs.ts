export interface SubSongItem {
  title: string;
  lyrics?: string;
}

/**
 * Parses a raw string or object into a structured SubSongItem.
 * Handles:
 * - JSON stringified: '{"title":"Song 1","lyrics":"..."}'
 * - Plain string title: 'Song 1'
 * - Already parsed object: { title: 'Song 1', lyrics: '...' }
 */
export function parseSubSongItem(raw: unknown): SubSongItem {
  if (!raw) return { title: '', lyrics: '' };
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return {
      title: String(obj.title || obj.name || '').trim(),
      lyrics: typeof obj.lyrics === 'string' ? obj.lyrics.trim() : '',
    };
  }
  const str = String(raw).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        return {
          title: String(parsed.title || parsed.name || '').trim(),
          lyrics: typeof parsed.lyrics === 'string' ? parsed.lyrics.trim() : '',
        };
      }
    } catch {}
  }
  return { title: str, lyrics: '' };
}

/**
 * Serializes a SubSongItem into a JSON string suitable for TEXT[] database column.
 */
export function serializeSubSongItem(item: SubSongItem): string {
  const title = (item.title || '').trim();
  const lyrics = (item.lyrics || '').trim();
  return JSON.stringify({ title, lyrics });
}

/**
 * Formats an array of sub-songs into formatted markdown lyrics.
 * Produces:
 * ## 1. Song Title
 * [Lyrics for song 1]
 *
 * ## 2. Next Song Title
 * [Lyrics for song 2]
 */
export function formatSubSongsLyrics(items: SubSongItem[]): string {
  return items
    .filter((s) => s.title.trim())
    .map((s, idx) => {
      const header = `## ${idx + 1}. ${s.title.trim()}`;
      const lyrics = (s.lyrics || '').trim();
      return lyrics ? `${header}\n${lyrics}` : header;
    })
    .join('\n\n');
}
