import type { PreviewMarkerData } from './types';

export interface PreviewSearchState {
  readonly query: string;
  readonly includeReplies: boolean;
}

const PREVIEW_SNIPPET_MAX_LEN = 72;

const normalizePreviewSearchText = (value: string): string =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const truncatePreviewSnippet = (value: string): string => {
  if (value.length <= PREVIEW_SNIPPET_MAX_LEN) return value;
  return `${value.slice(0, PREVIEW_SNIPPET_MAX_LEN - 1).trimEnd()}\u2026`;
};

const buildQueryContextSnippet = (text: string, query: string): string => {
  const normalizedQuery = normalizePreviewSearchText(query);
  if (!normalizedQuery) {
    return truncatePreviewSnippet(text);
  }

  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(normalizedQuery);
  if (matchIndex === -1) {
    return truncatePreviewSnippet(text);
  }

  const contextRadius = Math.max(18, Math.floor((PREVIEW_SNIPPET_MAX_LEN - normalizedQuery.length) / 2));
  const start = Math.max(0, matchIndex - contextRadius);
  const end = Math.min(text.length, matchIndex + normalizedQuery.length + contextRadius);
  const prefix = start > 0 ? '\u2026' : '';
  const suffix = end < text.length ? '\u2026' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
};

export const buildPreviewSearchText = (
  summary: string,
  replyText: string,
  includeReplies: boolean,
): string => {
  const sections = includeReplies ? [summary, replyText] : [summary];
  return sections
    .map((section) => section.trim())
    .filter((section) => section.length > 0)
    .join('\n');
};

export const matchesPreviewMarkerQuery = (
  marker: PreviewMarkerData,
  query: string,
  includeReplies: boolean,
): boolean => {
  const normalizedQuery = normalizePreviewSearchText(query);
  if (!normalizedQuery) return true;

  const corpus = buildPreviewSearchText(marker.summary, marker.replyText, includeReplies);
  return normalizePreviewSearchText(corpus).includes(normalizedQuery);
};

export const buildPreviewSnippet = (
  marker: PreviewMarkerData,
  query: string,
  includeReplies: boolean,
): string => {
  const preferredReply =
    marker.replyText.trim().length > 0 &&
    (!query || (includeReplies && normalizePreviewSearchText(marker.replyText).includes(normalizePreviewSearchText(query))));
  const sourceText = preferredReply ? marker.replyText : marker.summary;
  const normalizedSource = sourceText.replace(/\s+/g, ' ').trim();
  if (!normalizedSource) {
    return '';
  }
  return buildQueryContextSnippet(normalizedSource, query);
};
