'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  getCollectionSongLyrics,
  getSongLyrics,
  getRehearsalSongLyrics,
  updateCollectionSongLyrics,
  updateSongLyrics,
  updateRehearsalSongLyrics,
} from '@/lib/actions';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
  /** Library song ID used to fetch / save canonical lyrics. */
  songId?: string | null;
  /** Rehearsal song row ID used to fetch / save lyrics for unlinked session songs. */
  rehearsalSongId?: string | null;
  /** Collection song row ID used to fetch / save lyrics for unlinked collection songs. */
  collectionSongId?: string | null;
  /** Pre-loaded lyrics (skips fetch). Pass `null` explicitly to mean "no lyrics". Omit to trigger fetch. */
  initialLyrics?: string | null;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(text: string) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function RenderFormattedLyrics({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  const listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc pl-5 my-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
        {listBuffer.map((item, i) => (
          <li key={`${i}-${item.slice(0, 12)}`} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
        ))}
      </ul>,
    );
    listBuffer.length = 0;
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ')) {
      listBuffer.push(trimmed.slice(2));
      return;
    }

    flushList();

    if (!trimmed) {
      blocks.push(<div key={`space-${blocks.length}`} className="h-3" />);
      return;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className="text-base font-semibold text-slate-900 dark:text-slate-100 my-2"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(3)) }}
        />,
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className="text-lg font-bold text-slate-900 dark:text-slate-100 my-2"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(2)) }}
        />,
      );
      return;
    }

    blocks.push(
      <p
        key={`p-${blocks.length}`}
        className="text-sm text-slate-700 dark:text-slate-200 leading-7"
        dangerouslySetInnerHTML={{ __html: formatInline(line) }}
      />,
    );
  });

  flushList();

  return <div>{blocks}</div>;
}

export default function LyricsModal({
  isOpen,
  onClose,
  songTitle,
  songId,
  rehearsalSongId,
  collectionSongId,
  initialLyrics,
}: LyricsModalProps) {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(prefix: string, suffix = prefix, placeholder = 'text') {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = editText.slice(start, end);
    const insert = `${prefix}${selected || placeholder}${suffix}`;
    const next = `${editText.slice(0, start)}${insert}${editText.slice(end)}`;

    setEditText(next);

    // Restore focus and place cursor after inserted content.
    requestAnimationFrame(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      } else {
        const cursor = start + insert.length;
        textarea.setSelectionRange(cursor, cursor);
      }
    });
  }

  function prefixCurrentLine(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = editText.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const next = `${editText.slice(0, lineStart)}${prefix}${editText.slice(lineStart)}`;
    setEditText(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + prefix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function clearSelectionFormatting() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      const cleaned = editText
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^\s*#{1,6}\s+/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '');
      setEditText(cleaned);
      return;
    }

    const selected = editText.slice(start, end);
    const cleanedSelected = selected
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\s*#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '');

    const next = `${editText.slice(0, start)}${cleanedSelected}${editText.slice(end)}`;
    setEditText(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + cleanedSelected.length);
    });
  }

  useEffect(() => {
    if (!isOpen) {
      setEditing(false);
      setCopied(false);
      setErrorMessage(null);
      setShowPreview(false);
      return;
    }

    // If pre-loaded lyrics were provided (even null), use them directly
    if (initialLyrics !== undefined) {
      setLyrics(initialLyrics);
      return;
    }

    // Otherwise fetch from library via song_id
    if (songId) {
      setLoading(true);
      setErrorMessage(null);
      getSongLyrics(songId)
        .then((l) => {
          setLyrics(l);
        })
        .catch((e: unknown) => {
          setErrorMessage(e instanceof Error ? e.message : 'Failed to load lyrics.');
          setLyrics(null);
        })
        .finally(() => setLoading(false));
      return;
    }

    // Fallback: fetch rehearsal-specific lyrics for unlinked songs
    if (rehearsalSongId) {
      setLoading(true);
      setErrorMessage(null);
      getRehearsalSongLyrics(rehearsalSongId)
        .then((l) => {
          setLyrics(l);
        })
        .catch((e: unknown) => {
          setErrorMessage(e instanceof Error ? e.message : 'Failed to load lyrics.');
          setLyrics(null);
        })
        .finally(() => setLoading(false));
      return;
    }

    // Fallback: fetch collection-specific lyrics for unlinked songs
    if (!collectionSongId) {
      setLyrics(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    getCollectionSongLyrics(collectionSongId)
      .then((l) => {
        setLyrics(l);
      })
      .catch((e: unknown) => {
        setErrorMessage(e instanceof Error ? e.message : 'Failed to load lyrics.');
        setLyrics(null);
      })
      .finally(() => setLoading(false));
  }, [isOpen, songId, rehearsalSongId, collectionSongId, initialLyrics]);

  async function handleCopy() {
    if (!lyrics) return;
    try {
      await navigator.clipboard.writeText(lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard not available
    }
  }

  async function handleSave() {
    if (!songId && !rehearsalSongId && !collectionSongId) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      if (songId) {
        await updateSongLyrics(songId, editText);
      } else if (rehearsalSongId) {
        await updateRehearsalSongLyrics(rehearsalSongId, editText);
      } else if (collectionSongId) {
        await updateCollectionSongLyrics(collectionSongId, editText);
      }
      setLyrics(editText.trim() || null);
      setEditing(false);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to save lyrics.');
    }
    setSaving(false);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex items-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-107.5 mx-auto max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
              Lyrics
            </p>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
              {songTitle}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            {lyrics && !editing && (
              <button
                onClick={handleCopy}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  copied
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                }`}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="text-center py-14 text-slate-400 dark:text-slate-500 text-sm">
              Loading…
            </div>
          ) : editing ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => wrapSelection('**')}
                  title="Bold"
                  aria-label="Bold"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 5h6a4 4 0 010 8H7V5zm0 8h7a4 4 0 110 8H7v-8z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection('*')}
                  title="Italic"
                  aria-label="Italic"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4h4M6 20h4M10 4l-4 16M18 4l-4 16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => prefixCurrentLine('## ')}
                  title="Heading"
                  aria-label="Heading"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6v12M10 6v12M4 12h6M14 8h6M14 16h6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => prefixCurrentLine('- ')}
                  title="Bullet list"
                  aria-label="Bullet list"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="7" r="1.25" fill="currentColor" />
                    <circle cx="5" cy="12" r="1.25" fill="currentColor" />
                    <circle cx="5" cy="17" r="1.25" fill="currentColor" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h10M9 12h10M9 17h10" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => prefixCurrentLine('**Chorus:** ')}
                  title="Chorus label"
                  aria-label="Chorus label"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-300"
                >
                  <span className="text-xs leading-none">C</span>
                </button>
                <button
                  type="button"
                  onClick={() => prefixCurrentLine('**Verse:** ')}
                  title="Verse label"
                  aria-label="Verse label"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-300"
                >
                  <span className="text-xs leading-none">V</span>
                </button>
                <button
                  type="button"
                  onClick={clearSelectionFormatting}
                  title="Clear formatting"
                  aria-label="Clear formatting"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-red-400 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5h6v2m-8 0l1 12h6l1-12M4 4l16 16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  title={showPreview ? 'Hide preview' : 'Show preview'}
                  aria-label={showPreview ? 'Hide preview' : 'Show preview'}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    showPreview
                      ? 'border-violet-400 text-violet-600 dark:border-violet-500 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                rows={16}
                placeholder="Type or paste lyrics here...\n\n**Verse 1**\n...\n\n**Chorus**\n..."
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono leading-relaxed"
              />

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Formatting supports markdown: **bold**, *italic*, headings, bullets, and line breaks.
              </p>

              {showPreview && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">Preview</p>
                  {editText.trim() ? (
                    <RenderFormattedLyrics text={editText} />
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">Start typing to preview formatted lyrics.</p>
                  )}
                </div>
              )}
            </div>
          ) : lyrics ? (
            <RenderFormattedLyrics text={lyrics} />
          ) : (
            <div className="text-center py-14">
              <p className="text-4xl mb-3">🎵</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                No lyrics added yet
              </p>
              {!songId && !rehearsalSongId && !collectionSongId && (
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  Edit this song in the Library to add lyrics
                </p>
              )}
            </div>
          )}

          {/* Edit / Add lyrics action */}
          {(songId || rehearsalSongId || collectionSongId) && !loading && (
            <div className="mt-5">
              {editing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Lyrics'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditText(lyrics ?? ''); setEditing(true); }}
                  className="w-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 rounded-xl py-2.5 text-sm hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-400 transition-colors"
                >
                  {lyrics ? '✏️ Edit Lyrics' : '+ Add Lyrics'}
                </button>
              )}
            </div>
          )}

          {!songId && !rehearsalSongId && !collectionSongId && !loading && !editing && !lyrics && (
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-5 text-center">
              This song is not linked to Library or Rehearsal storage yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
