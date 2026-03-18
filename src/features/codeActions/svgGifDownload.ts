import {
  resolveGifRasterExportOptions,
} from './graphExportQuality';
import {
  resolveGifCapturePlan,
  resolveRasterExportPlan,
} from './svgExportModel';
import { encodeGifAnimation, quantizeRgbaToGif332Indices } from './gifEncoder';
import {
  createSvgRasterizationContext,
  normalizeSvgMarkupForRasterization,
} from './svgDownload';

type LoadedSvgImageHandle = {
  image: HTMLImageElement;
  dispose: () => void;
};

const wait = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

async function createLoadedSvgImageHandle(svgMarkup: string): Promise<LoadedSvgImageHandle> {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load animated SVG image'));
    image.src = objectUrl;
  });

  return {
    image,
    dispose: () => URL.revokeObjectURL(objectUrl),
  };
}

export async function svgMarkupToGifBlob(svgMarkup: string): Promise<Blob> {
  const normalizedSvg = await normalizeSvgMarkupForRasterization(svgMarkup);
  const { width, height } = createSvgRasterizationContext(normalizedSvg);
  const rasterOptions = await resolveGifRasterExportOptions();
  const rasterPlan = resolveRasterExportPlan(width, height, rasterOptions);
  const capturePlan = resolveGifCapturePlan(normalizedSvg);
  const canvas = document.createElement('canvas');
  canvas.width = rasterPlan.targetWidth;
  canvas.height = rasterPlan.targetHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('Failed to get canvas 2d context for GIF export');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const { image, dispose } = await createLoadedSvgImageHandle(normalizedSvg);

  try {
    const frames: { delayMs: number; indexed: Uint8Array }[] = [];

    for (let frameIndex = 0; frameIndex < capturePlan.frameCount; frameIndex += 1) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      frames.push({
        delayMs: capturePlan.frameDelayMs,
        indexed: quantizeRgbaToGif332Indices(imageData.data),
      });

      if (frameIndex < capturePlan.frameCount - 1) {
        await wait(capturePlan.frameDelayMs);
      }
    }

    const bytes = encodeGifAnimation({
      width: canvas.width,
      height: canvas.height,
      frames,
      loopCount: 0,
    });

    return new Blob([bytes], { type: 'image/gif' });
  } finally {
    dispose();
  }
}

export async function downloadSvgMarkupAsGif(svgMarkup: string, filename: string): Promise<void> {
  const blob = await svgMarkupToGifBlob(svgMarkup);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename.toLowerCase().endsWith('.gif') ? filename : `${filename}.gif`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
