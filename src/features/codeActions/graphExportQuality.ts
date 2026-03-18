import { StorageKeys } from '@/core/types/common';

export type GraphExportQuality = 1 | 2 | 3 | 4 | 5;

type GraphRasterExportOptions = {
  maxEdge: number;
  minEdge: number;
  preferredScale: number;
};

const QUALITY_LEVELS = [1, 2, 3, 4, 5] as const satisfies readonly GraphExportQuality[];

export const DEFAULT_GRAPH_EXPORT_QUALITY: GraphExportQuality = 3;

const PNG_RASTER_PRESETS: Record<GraphExportQuality, GraphRasterExportOptions> = {
  1: {
    preferredScale: 2,
    minEdge: 1400,
    maxEdge: 2600,
  },
  2: {
    preferredScale: 2.5,
    minEdge: 1900,
    maxEdge: 3400,
  },
  3: {
    preferredScale: 3,
    minEdge: 2400,
    maxEdge: 4080,
  },
  4: {
    preferredScale: 4,
    minEdge: 3200,
    maxEdge: 5200,
  },
  5: {
    preferredScale: 5,
    minEdge: 4200,
    maxEdge: 6144,
  },
};

const GIF_RASTER_PRESETS: Record<GraphExportQuality, GraphRasterExportOptions> = {
  1: {
    preferredScale: 2,
    minEdge: 480,
    maxEdge: 480,
  },
  2: {
    preferredScale: 2,
    minEdge: 640,
    maxEdge: 640,
  },
  3: {
    preferredScale: 3,
    minEdge: 720,
    maxEdge: 720,
  },
  4: {
    preferredScale: 3.5,
    minEdge: 960,
    maxEdge: 960,
  },
  5: {
    preferredScale: 4,
    minEdge: 1200,
    maxEdge: 1200,
  },
};

export const resolveGraphExportQuality = (value: unknown): GraphExportQuality => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_GRAPH_EXPORT_QUALITY;
  }

  const rounded = Math.round(numeric) as GraphExportQuality;
  return QUALITY_LEVELS.includes(rounded) ? rounded : DEFAULT_GRAPH_EXPORT_QUALITY;
};

export const getPngRasterExportOptions = (
  quality: GraphExportQuality,
): GraphRasterExportOptions => PNG_RASTER_PRESETS[quality];

export const getGifRasterExportOptions = (
  quality: GraphExportQuality,
): GraphRasterExportOptions => GIF_RASTER_PRESETS[quality];

export async function getGraphExportQuality(): Promise<GraphExportQuality> {
  const result = await chrome.storage.local.get({
    [StorageKeys.GRAPH_EXPORT_QUALITY]: DEFAULT_GRAPH_EXPORT_QUALITY,
  });

  return resolveGraphExportQuality(result[StorageKeys.GRAPH_EXPORT_QUALITY]);
}

export async function resolvePngRasterExportOptions(): Promise<GraphRasterExportOptions> {
  const quality = await getGraphExportQuality();
  return getPngRasterExportOptions(quality);
}

export async function resolveGifRasterExportOptions(): Promise<GraphRasterExportOptions> {
  const quality = await getGraphExportQuality();
  return getGifRasterExportOptions(quality);
}
