const DEFAULT_RASTER_SCALE = 3;
const DEFAULT_RASTER_MAX_EDGE = 4080;
const DEFAULT_RASTER_MIN_EDGE = 2400;
const DEFAULT_GIF_FPS = 12;
const DEFAULT_GIF_MIN_DURATION_MS = 1200;
const DEFAULT_GIF_MAX_DURATION_MS = 4000;

const SVG_ANIMATION_TAG_PATTERN =
  /<(?:animate|animateMotion|animateTransform|animateColor|set)\b/i;
const SVG_CSS_ANIMATION_PATTERN = /@keyframes|animation\s*:|animation-name\s*:/i;
const SVG_SVG_ANIMATION_PATTERN = /\bdur\s*=\s*['"][^'"]+['"]/i;

export type RasterExportPlan = {
  scale: number;
  targetWidth: number;
  targetHeight: number;
};

export type GifCapturePlan = {
  durationMs: number;
  frameCount: number;
  frameDelayMs: number;
  fps: number;
};

type RasterExportOptions = {
  minEdge?: number;
  preferredScale?: number;
  maxEdge?: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundScale = (value: number): number => Number(value.toFixed(2));

const parseTimeTokenToMs = (value: string): number => {
  const match = value.trim().match(/^([0-9]*\.?[0-9]+)(ms|s)$/i);
  if (!match) {
    return 0;
  }

  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return match[2].toLowerCase() === 's' ? numeric * 1000 : numeric;
};

const extractAnimationDurationsFromDeclaration = (value: string): number[] =>
  value
    .split(',')
    .map((part) => {
      const timeTokens = part.match(/[0-9]*\.?[0-9]+m?s/gi) ?? [];
      return parseTimeTokenToMs(timeTokens[0] ?? '');
    })
    .filter((duration) => duration > 0);

export const extractSvgAnimationDurations = (svgMarkup: string): number[] => {
  const durations: number[] = [];

  const shorthandMatches = svgMarkup.matchAll(/animation\s*:\s*([^;}{]+)[;}]?/gi);
  for (const match of shorthandMatches) {
    durations.push(...extractAnimationDurationsFromDeclaration(match[1] ?? ''));
  }

  const durationMatches = svgMarkup.matchAll(/animation-duration\s*:\s*([^;}{]+)[;}]?/gi);
  for (const match of durationMatches) {
    durations.push(...extractAnimationDurationsFromDeclaration(match[1] ?? ''));
  }

  const smilMatches = svgMarkup.matchAll(/\bdur\s*=\s*['"]([^'"]+)['"]/gi);
  for (const match of smilMatches) {
    const duration = parseTimeTokenToMs(match[1] ?? '');
    if (duration > 0) {
      durations.push(duration);
    }
  }

  return durations;
};

export const detectAnimatedSvgMarkup = (svgMarkup: string): boolean => {
  if (!svgMarkup.trim()) {
    return false;
  }

  if (SVG_ANIMATION_TAG_PATTERN.test(svgMarkup)) {
    return true;
  }

  if (SVG_CSS_ANIMATION_PATTERN.test(svgMarkup)) {
    return true;
  }

  if (SVG_SVG_ANIMATION_PATTERN.test(svgMarkup)) {
    return true;
  }

  return extractSvgAnimationDurations(svgMarkup).length > 0;
};

export const resolveRasterExportPlan = (
  width: number,
  height: number,
  options: RasterExportOptions = {},
): RasterExportPlan => {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const longestEdge = Math.max(safeWidth, safeHeight);
  const preferredScale = options.preferredScale ?? DEFAULT_RASTER_SCALE;
  const minEdge = options.minEdge ?? DEFAULT_RASTER_MIN_EDGE;
  const maxEdge = options.maxEdge ?? DEFAULT_RASTER_MAX_EDGE;
  const minimumScale = longestEdge > 0 ? minEdge / longestEdge : 1;
  const desiredScale = Math.max(preferredScale, minimumScale);
  const rawScale = longestEdge > 0 ? Math.min(desiredScale, maxEdge / longestEdge) : 1;
  const scale = roundScale(Math.max(1, rawScale));

  return {
    scale,
    targetWidth: Math.max(1, Math.round(safeWidth * scale)),
    targetHeight: Math.max(1, Math.round(safeHeight * scale)),
  };
};

export const resolveGifCapturePlan = (svgMarkup: string): GifCapturePlan => {
  const durations = extractSvgAnimationDurations(svgMarkup);
  const shortestDuration = durations.length > 0 ? Math.min(...durations) : DEFAULT_GIF_MAX_DURATION_MS;
  const durationMs = clamp(
    Math.round(shortestDuration),
    DEFAULT_GIF_MIN_DURATION_MS,
    DEFAULT_GIF_MAX_DURATION_MS,
  );
  const fps = DEFAULT_GIF_FPS;
  const frameDelayMs = Math.round(1000 / fps);
  const frameCount = Math.max(2, Math.round(durationMs / frameDelayMs));

  return {
    durationMs,
    frameCount,
    frameDelayMs,
    fps,
  };
};
