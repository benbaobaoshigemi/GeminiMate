import { toBlob } from 'html-to-image';

import { resolvePngRasterExportOptions } from './graphExportQuality';
import { resolveRasterExportPlan } from './svgExportModel';

const SVG_IMAGE_SOURCE_SELECTORS = [
  'image[href]',
  'image[xlink\\:href]',
  'feImage[href]',
  'feImage[xlink\\:href]',
  'img[src]',
].join(', ');

const SVG_SOURCE_ATTRIBUTE_NAMES = ['href', 'xlink:href', 'src'] as const;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const TRANSPARENT_IMAGE_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const OFFSCREEN_LEFT = '-100000px';

const isRemoteResourceUrl = (value: string): boolean => /^https?:\/\//i.test(value);
const isPercentageLike = (value: string | null): boolean => typeof value === 'string' && value.trim().endsWith('%');
const isCanvasSecurityExportError = (error: unknown): boolean =>
  error instanceof Error &&
  /tainted|security|cross-origin|cross origin/i.test(error.message);

const readResourceUrl = (element: Element): string => {
  for (const attributeName of SVG_SOURCE_ATTRIBUTE_NAMES) {
    const value = element.getAttribute(attributeName);
    if (value?.trim()) {
      return value.trim();
    }
  }
  return '';
};

const writeResourceUrl = (element: Element, value: string): void => {
  if (element.hasAttribute('src')) {
    element.setAttribute('src', value);
    return;
  }

  element.setAttribute('href', value);
  if (element.hasAttribute('xlink:href')) {
    element.setAttribute('xlink:href', value);
  }
};

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const response = await new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'gv.fetchImage', url }, (payload: unknown) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!payload || typeof payload !== 'object') {
        reject(new Error('Invalid image fetch response'));
        return;
      }

      resolve(payload as Record<string, unknown>);
    });
  });

  if (response.ok !== true || typeof response.data !== 'string') {
    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to inline SVG image');
  }

  return response.data;
}

async function inlineExternalSvgImages(doc: XMLDocument): Promise<void> {
  const externalResourceNodes = [...doc.querySelectorAll(SVG_IMAGE_SOURCE_SELECTORS)];

  for (const node of externalResourceNodes) {
    const resourceUrl = readResourceUrl(node);
    if (!resourceUrl || !isRemoteResourceUrl(resourceUrl)) {
      continue;
    }

    const inlinedDataUrl = await fetchImageAsDataUrl(resourceUrl);
    writeResourceUrl(node, inlinedDataUrl);
  }
}

export type SvgRasterizationContext = {
  height: number;
  markup: string;
  width: number;
};

const parseViewBox = (svg: Element): [number, number, number, number] | null => {
  const viewBox = svg.getAttribute('viewBox');
  if (!viewBox) {
    return null;
  }

  const values = viewBox
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value));

  if (
    values.length !== 4 ||
    !Number.isFinite(values[0]) ||
    !Number.isFinite(values[1]) ||
    !Number.isFinite(values[2]) ||
    !Number.isFinite(values[3])
  ) {
    return null;
  }

  return [values[0], values[1], values[2], values[3]];
};

const resolveSvgRasterSize = (svg: Element): { height: number; width: number } => {
  const viewBox = parseViewBox(svg);
  const viewBoxWidth = viewBox?.[2] ?? 0;
  const viewBoxHeight = viewBox?.[3] ?? 0;
  const widthAttr = svg.getAttribute('width');
  const heightAttr = svg.getAttribute('height');
  const parsedWidth = isPercentageLike(widthAttr) ? Number.NaN : Number.parseFloat(widthAttr ?? '');
  const parsedHeight = isPercentageLike(heightAttr) ? Number.NaN : Number.parseFloat(heightAttr ?? '');

  const width =
    Number.isFinite(parsedWidth) && parsedWidth > 0
      ? parsedWidth
      : viewBoxWidth > 0
        ? viewBoxWidth
        : 300;
  const height =
    Number.isFinite(parsedHeight) && parsedHeight > 0
      ? parsedHeight
      : viewBoxHeight > 0
        ? viewBoxHeight
        : 150;

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
};

const ensureSvgNamespaces = (svg: Element): void => {
  if (!svg.getAttribute('xmlns')) {
    svg.setAttribute('xmlns', SVG_NAMESPACE);
  }

  const usesXlinkHref =
    svg.querySelector('[xlink\\:href]') !== null ||
    Array.from(svg.attributes).some((attribute) => attribute.name === 'xlink:href');
  if (usesXlinkHref && !svg.getAttribute('xmlns:xlink')) {
    svg.setAttribute('xmlns:xlink', XLINK_NAMESPACE);
  }
};

export const createSvgRasterizationContext = (svgMarkup: string): SvgRasterizationContext => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const svg = doc.documentElement;

  if (svg.tagName.toLowerCase() !== 'svg') {
    throw new Error('SVG root element is missing');
  }

  ensureSvgNamespaces(svg);
  const { width, height } = resolveSvgRasterSize(svg);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));

  return {
    markup: new XMLSerializer().serializeToString(svg),
    width,
    height,
  };
};

export async function normalizeSvgMarkupForRasterization(svgMarkup: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const svg = doc.documentElement;

  if (svg.tagName.toLowerCase() !== 'svg') {
    throw new Error('SVG root element is missing');
  }

  ensureSvgNamespaces(svg);
  const { width, height } = resolveSvgRasterSize(svg);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  await inlineExternalSvgImages(doc);
  return new XMLSerializer().serializeToString(svg);
}

async function loadSvgImage(svgMarkup: string): Promise<HTMLImageElement> {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = 'async';

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to load SVG image'));
      image.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const svgMarkupContainsForeignObject = (svgMarkup: string): boolean => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  return doc.querySelector('foreignObject') !== null;
};

async function svgMarkupToPngBlobViaCanvas(svgMarkup: string): Promise<Blob> {
  const image = await loadSvgImage(svgMarkup);

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (width <= 0 || height <= 0) {
    throw new Error('Unable to resolve SVG size');
  }
  const rasterOptions = await resolvePngRasterExportOptions();
  const rasterPlan = resolveRasterExportPlan(width, height, rasterOptions);

  const canvas = document.createElement('canvas');
  canvas.width = rasterPlan.targetWidth;
  canvas.height = rasterPlan.targetHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas 2d context');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, rasterPlan.targetWidth, rasterPlan.targetHeight);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Failed to convert SVG to PNG'));
      }, 'image/png');
    } catch (error) {
      reject(
        new Error(
          error instanceof Error
            ? `Failed to export PNG: ${error.message}`
            : 'Failed to export PNG',
        ),
      );
    }
  });
}

async function svgMarkupToPngBlobViaDomSnapshot(svgMarkup: string): Promise<Blob> {
  const { markup, width, height } = createSvgRasterizationContext(svgMarkup);
  const rasterOptions = await resolvePngRasterExportOptions();
  const rasterPlan = resolveRasterExportPlan(width, height, rasterOptions);
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = OFFSCREEN_LEFT;
  host.style.top = '0';
  host.style.opacity = '0';
  host.style.pointerEvents = 'none';
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;

  const surface = document.createElement('div');
  surface.style.width = `${width}px`;
  surface.style.height = `${height}px`;
  surface.style.background = '#ffffff';
  surface.style.display = 'block';
  surface.innerHTML = markup;

  const svgElement = surface.querySelector('svg');
  if (!(svgElement instanceof SVGElement)) {
    throw new Error('SVG root element is missing');
  }
  svgElement.style.display = 'block';
  svgElement.style.width = `${width}px`;
  svgElement.style.height = `${height}px`;
  svgElement.style.maxWidth = 'none';

  host.appendChild(surface);
  document.body.appendChild(host);

  try {
    const blob = await toBlob(surface, {
      cacheBust: true,
      pixelRatio: rasterPlan.scale,
      backgroundColor: '#ffffff',
      skipFonts: true,
      imagePlaceholder: TRANSPARENT_IMAGE_PLACEHOLDER,
      onImageErrorHandler: () => undefined,
    });

    if (!blob) {
      throw new Error('Failed to convert SVG to PNG');
    }

    return blob;
  } finally {
    host.remove();
  }
}

export async function svgMarkupToPngBlob(svgMarkup: string): Promise<Blob> {
  const normalizedSvg = await normalizeSvgMarkupForRasterization(svgMarkup);
  const needsDomSnapshot = svgMarkupContainsForeignObject(normalizedSvg);
  if (needsDomSnapshot) {
    return svgMarkupToPngBlobViaDomSnapshot(normalizedSvg);
  }

  try {
    return await svgMarkupToPngBlobViaCanvas(normalizedSvg);
  } catch (error) {
    if (!isCanvasSecurityExportError(error)) {
      throw error;
    }

    try {
      return await svgMarkupToPngBlobViaDomSnapshot(normalizedSvg);
    } catch {
      throw error;
    }
  }
}

export async function downloadSvgMarkupAsPng(svgMarkup: string, filename: string): Promise<void> {
  const blob = await svgMarkupToPngBlob(svgMarkup);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
