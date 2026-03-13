const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_ASPECT_RATIO = A4_HEIGHT_MM / A4_WIDTH_MM;

type PdfDownloadResponse =
  | {
      ok: true;
      filePath: string;
    }
  | {
      ok: false;
      error?: string;
    };

export type PdfDeliveryResult =
  | {
      mode: 'download-path';
      filePath: string;
      copiedToClipboard: boolean;
    }
  | {
      mode: 'download-only';
      error: string;
    };

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const decodeImageFile = async (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to read image: ${file.name}`));
    };
    img.src = objectUrl;
  });

const fileToDataUrl = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error(`Failed to read image data: ${file.name}`));
    };
    reader.onerror = () => reject(new Error(`Failed to read image data: ${file.name}`));
    reader.readAsDataURL(file);
  });

const blobToDataUrl = async (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Failed to serialize PDF blob'));
    };
    reader.onerror = () => reject(new Error('Failed to serialize PDF blob'));
    reader.readAsDataURL(blob);
  });

const guessImageFormat = (file: File): 'PNG' | 'JPEG' | 'WEBP' => {
  const type = file.type.toLowerCase();
  if (type.includes('png')) return 'PNG';
  if (type.includes('webp')) return 'WEBP';
  return 'JPEG';
};

const requestPdfDownload = async (pdfBlob: Blob, filename: string): Promise<string> => {
  const dataUrl = await blobToDataUrl(pdfBlob);
  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  const response = await new Promise<PdfDownloadResponse>((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          type: 'gm.pdf.download',
          dataUrl,
          filename: safeFilename,
        },
        (rawResponse: unknown) => {
          resolve((rawResponse as PdfDownloadResponse) ?? { ok: false, error: 'empty_response' });
        },
      );
    } catch (error) {
      resolve({ ok: false, error: getErrorMessage(error) });
    }
  });

  if (!response.ok) {
    throw new Error(response.error || 'Failed to download PDF');
  }

  return response.filePath;
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const convertLongImageToPdfBlob = async (file: File): Promise<Blob> => {
  const { jsPDF } = await import('jspdf');
  const image = await decodeImageFile(file);

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const slicePixelHeight = image.width * A4_ASPECT_RATIO;
  const totalPixelHeight = image.height;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create image processing canvas');
  }
  canvas.width = image.width;

  let currentY = 0;
  let firstPage = true;
  while (currentY < totalPixelHeight) {
    const currentSliceHeight = Math.min(slicePixelHeight, totalPixelHeight - currentY);
    canvas.height = currentSliceHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      image,
      0,
      currentY,
      image.width,
      currentSliceHeight,
      0,
      0,
      canvas.width,
      currentSliceHeight,
    );

    const pageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const pageHeightMm = (currentSliceHeight / slicePixelHeight) * A4_HEIGHT_MM;
    if (!firstPage) {
      pdf.addPage();
    }
    pdf.addImage(pageDataUrl, 'JPEG', 0, 0, A4_WIDTH_MM, pageHeightMm);
    firstPage = false;
    currentY += slicePixelHeight;
  }

  return pdf.output('blob');
};

export const mergeImagesToPdfBlob = async (files: File[]): Promise<Blob> => {
  if (!files.length) {
    throw new Error('No images selected');
  }
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const image = await decodeImageFile(file);
    const dataUrl = await fileToDataUrl(file);
    const format = guessImageFormat(file);

    if (index > 0) {
      pdf.addPage();
    }

    const fitRatio = Math.min(A4_WIDTH_MM / image.width, A4_HEIGHT_MM / image.height);
    const renderWidth = image.width * fitRatio;
    const renderHeight = image.height * fitRatio;
    const x = (A4_WIDTH_MM - renderWidth) / 2;
    const y = (A4_HEIGHT_MM - renderHeight) / 2;

    pdf.addImage(dataUrl, format, x, y, renderWidth, renderHeight);
  }

  return pdf.output('blob');
};

export const deliverPdfBlob = async (
  pdfBlob: Blob,
  filename: string,
): Promise<PdfDeliveryResult> => {
  try {
    const filePath = await requestPdfDownload(pdfBlob, filename);
    const copiedToClipboard = await copyTextToClipboard(filePath);
    return {
      mode: 'download-path',
      filePath,
      copiedToClipboard,
    };
  } catch (error) {
    return {
      mode: 'download-only',
      error: getErrorMessage(error),
    };
  }
};
