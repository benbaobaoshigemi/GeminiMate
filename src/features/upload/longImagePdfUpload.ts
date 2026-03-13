import { debugService } from '@/core/services/DebugService';

const MENU_ITEM_CLASS = 'gm-upload-long-image-pdf-btn';
const MENU_ITEM_ATTR = 'data-gm-upload-long-image-pdf';
const MENU_SCAN_SELECTOR =
  '.mat-mdc-menu-panel .mat-mdc-menu-content, .cdk-overlay-pane .mat-mdc-menu-content, mat-action-list[role="menu"], #upload-file-menu';
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_ASPECT_RATIO = A4_HEIGHT_MM / A4_WIDTH_MM;
const DIAG_NAMESPACE = '[GM-LongImageUpload]';
const LONG_IMAGE_LABEL = '上传长图转PDF';

let started = false;
let observer: MutationObserver | null = null;

const recordDiag = (stage: string, detail: Record<string, unknown> = {}): void => {
  const payload = {
    stage,
    detail,
    ts: new Date().toISOString(),
  };
  try {
    console.info(DIAG_NAMESPACE, payload);
    (window as Window & { __gmLongImageUploadDiag?: typeof payload }).__gmLongImageUploadDiag = payload;
    debugService.log('long-image-upload', stage, detail);
  } catch {
    // ignore diagnostic failures
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

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
      reject(new Error('图片读取失败'));
    };
    img.src = objectUrl;
  });

const convertLongImageToPdf = async (file: File): Promise<File> => {
  const { jsPDF } = await import('jspdf');
  const image = await decodeImageFile(file);

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const slicePixelHeight = image.width * A4_ASPECT_RATIO;
  const totalPixelHeight = image.height;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建图像处理画布');
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

  const pdfBlob = pdf.output('blob');
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'long-image';
  return new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
};

const pickLongImageFile = async (): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/jpg';
    input.style.display = 'none';
    input.onchange = () => {
      const selected = input.files?.[0] ?? null;
      input.remove();
      resolve(selected);
    };
    document.body.appendChild(input);
    input.click();
  });

const collectFileInputsDeep = (root: ParentNode): HTMLInputElement[] => {
  const found: HTMLInputElement[] = [];
  const collectFromNode = (node: ParentNode): void => {
    node.querySelectorAll?.('input[type="file"]').forEach((input) => {
      if (input instanceof HTMLInputElement && !input.disabled) {
        found.push(input);
      }
    });
    const elements = node.querySelectorAll?.('*') ?? [];
    elements.forEach((element) => {
      const host = element as HTMLElement & { shadowRoot?: ShadowRoot | null };
      if (host.shadowRoot) {
        collectFromNode(host.shadowRoot);
      }
    });
  };
  collectFromNode(root);
  return found;
};

const scoreFileInput = (input: HTMLInputElement): number => {
  const accept = (input.accept || '').toLowerCase();
  let score = 0;
  if (accept.includes('pdf')) score += 12;
  if (accept.includes('application/pdf')) score += 12;
  if (accept.includes('image')) score -= 4;
  if (!accept) score += 2;
  if (input.closest('chat-window, input-container, rich-input, #upload-file-menu')) score += 6;
  if (input.offsetParent !== null) score += 2;
  return score;
};

const findNativeUploadInputs = (): HTMLInputElement[] => {
  const candidates = collectFileInputsDeep(document);
  const sorted = candidates
    .map((input) => ({ input, score: scoreFileInput(input) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.input);

  recordDiag('scan-file-inputs', {
    count: candidates.length,
    ranked: sorted.slice(0, 4).map((input) => ({
      accept: input.accept || '',
      score: scoreFileInput(input),
      connected: input.isConnected,
    })),
  });
  return sorted;
};

const dispatchFileToInput = (targetInput: HTMLInputElement, file: File): void => {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  targetInput.files = dataTransfer.files;
  targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  targetInput.dispatchEvent(new Event('change', { bubbles: true }));
};

const hasAttachmentEvidence = (fileName: string): boolean => {
  const selectors = [
    '[data-test-id*="file-chip"]',
    '[data-test-id*="attachment"]',
    'uploaded-file-chip',
    '.uploaded-file-chip',
    '.attachment-chip',
  ];
  if (selectors.some((selector) => document.querySelector(selector))) {
    return true;
  }
  const normalizedName = fileName.toLowerCase();
  return (document.body.textContent || '').toLowerCase().includes(normalizedName);
};

const dispatchDropSequence = (target: HTMLElement, dataTransfer: DataTransfer): void => {
  const dragEnter = new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer });
  const dragOver = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer });
  const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
  target.dispatchEvent(dragEnter);
  target.dispatchEvent(dragOver);
  target.dispatchEvent(drop);
};

const pushPdfToUploader = async (pdfFile: File): Promise<boolean> => {
  const inputs = findNativeUploadInputs();
  for (const input of inputs.slice(0, 4)) {
    try {
      dispatchFileToInput(input, pdfFile);
      recordDiag('upload-via-input', {
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        accept: input.accept || null,
      });
      await sleep(900);
      if (hasAttachmentEvidence(pdfFile.name)) {
        recordDiag('upload-confirmed', { via: 'input', fileName: pdfFile.name });
        return true;
      }
    } catch (error) {
      recordDiag('upload-via-input-error', { error: String(error) });
    }
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(pdfFile);
  const dropTargets = [
    'rich-input',
    'input-container',
    'input-area-v2',
    'chat-window',
    'main',
  ];

  for (const selector of dropTargets) {
    const target = document.querySelector(selector);
    if (!(target instanceof HTMLElement)) continue;
    try {
      dispatchDropSequence(target, dataTransfer);
      recordDiag('upload-via-drop', { selector, fileName: pdfFile.name, fileSize: pdfFile.size });
      await sleep(900);
      if (hasAttachmentEvidence(pdfFile.name)) {
        recordDiag('upload-confirmed', { via: 'drop', selector, fileName: pdfFile.name });
        return true;
      }
    } catch (error) {
      recordDiag('upload-via-drop-error', { selector, error: String(error) });
    }
  }

  recordDiag('upload-not-confirmed', { fileName: pdfFile.name, fileSize: pdfFile.size });
  return false;
};

const showToast = (message: string): void => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.right = '20px';
  toast.style.bottom = '20px';
  toast.style.zIndex = '2147483646';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '10px';
  toast.style.background = 'rgba(15,23,42,0.92)';
  toast.style.color = '#f8fafc';
  toast.style.fontSize = '12px';
  toast.style.boxShadow = '0 8px 24px rgba(2,6,23,0.3)';
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2400);
};

const isUploadMenu = (menuContent: HTMLElement): boolean => {
  const hasLocalUpload = !!menuContent.querySelector('[data-test-id="local-images-files-uploader-button"]');
  const hasDrive = !!menuContent.querySelector('[data-test-id="uploader-drive-button"]');
  const hasCodeImport = !!menuContent.querySelector('[data-test-id="code-import-button"]');
  return hasLocalUpload && (hasDrive || hasCodeImport);
};

const clearTemplateAttributes = (element: HTMLElement): void => {
  [
    'id',
    'jslog',
    'jscontroller',
    'jsaction',
    'jsname',
    'aria-describedby',
    'aria-labelledby',
  ].forEach((attr) => element.removeAttribute(attr));
};

const updateMenuItemLabel = (item: HTMLElement, label: string): void => {
  const primaryText = item.querySelector('.mdc-list-item__primary-text') as HTMLElement | null;
  if (primaryText) {
    primaryText.textContent = label;
    return;
  }
  const content = item.querySelector('.mdc-list-item__content') as HTMLElement | null;
  if (content) {
    content.textContent = label;
    return;
  }
  item.textContent = label;
};

const updateMenuItemIcon = (item: HTMLElement, iconName: string): void => {
  const icon = item.querySelector('mat-icon') as HTMLElement | null;
  if (!icon) return;
  icon.setAttribute('fonticon', iconName);
  icon.textContent = iconName;
  icon.setAttribute('aria-hidden', 'true');
  if (icon.hasAttribute('data-mat-icon-name')) {
    icon.setAttribute('data-mat-icon-name', iconName);
  }
};

const bindLongImageUpload = (menuItem: HTMLElement): void => {
  if (menuItem.getAttribute('data-gm-upload-long-image-bound') === '1') return;
  menuItem.setAttribute('data-gm-upload-long-image-bound', '1');

  const trigger = async (event: Event): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    const selectedImage = await pickLongImageFile();
    if (!selectedImage) return;

    try {
      showToast('正在将长图转换为 PDF...');
      recordDiag('convert-start', { imageName: selectedImage.name, imageSize: selectedImage.size });
      const pdfFile = await convertLongImageToPdf(selectedImage);
      recordDiag('convert-done', { pdfName: pdfFile.name, pdfSize: pdfFile.size });

      const uploaded = await pushPdfToUploader(pdfFile);
      if (!uploaded) {
        showToast('已生成 PDF，但未检测到上传成功');
        return;
      }

      showToast('长图已转换为 PDF 并提交上传');
    } catch (error) {
      showToast(`长图转换失败：${String(error)}`);
      recordDiag('convert-failed', { error: String(error) });
    }
  };

  menuItem.addEventListener('click', (event) => {
    void trigger(event);
  });
  menuItem.addEventListener('keydown', (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
    void trigger(event);
  });
};

const getNativeUploadMenuItem = (menuContent: HTMLElement): HTMLElement | null =>
  menuContent.querySelector<HTMLElement>('[data-test-id="local-images-files-uploader-button"]');

const createLongImageMenuItem = (menuContent: HTMLElement): HTMLElement | null => {
  const template = getNativeUploadMenuItem(menuContent);
  if (!template) return null;

  const item = template.cloneNode(true) as HTMLElement;
  clearTemplateAttributes(item);
  item.classList.add(MENU_ITEM_CLASS);
  item.setAttribute(MENU_ITEM_ATTR, '1');
  item.setAttribute('data-test-id', 'gm-upload-long-image-pdf-button');
  item.setAttribute('role', 'menuitem');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-disabled', 'false');
  item.setAttribute('aria-label', LONG_IMAGE_LABEL);

  if (item instanceof HTMLButtonElement) {
    item.disabled = false;
    item.type = 'button';
  } else {
    const nestedButton = item.querySelector('button') as HTMLButtonElement | null;
    if (nestedButton) {
      nestedButton.disabled = false;
      nestedButton.type = 'button';
      nestedButton.setAttribute('aria-label', LONG_IMAGE_LABEL);
    }
  }

  updateMenuItemIcon(item, 'description');
  updateMenuItemLabel(item, LONG_IMAGE_LABEL);
  bindLongImageUpload(item);
  return item;
};

const injectLongImageMenuItem = (menuContent: HTMLElement): void => {
  if (!isUploadMenu(menuContent)) return;

  const existing = menuContent.querySelector<HTMLElement>(`[${MENU_ITEM_ATTR}="1"]`);
  if (existing) {
    updateMenuItemLabel(existing, LONG_IMAGE_LABEL);
    bindLongImageUpload(existing);
    return;
  }

  const menuItem = createLongImageMenuItem(menuContent);
  if (!menuItem) return;

  const nativeUpload = getNativeUploadMenuItem(menuContent);
  if (nativeUpload?.parentElement) {
    nativeUpload.insertAdjacentElement('afterend', menuItem);
    recordDiag('menu-item-inserted', { position: 'after-native-upload' });
    return;
  }

  menuContent.appendChild(menuItem);
  recordDiag('menu-item-inserted', { position: 'append' });
};

const scanMenus = (): void => {
  const roots = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>(MENU_SCAN_SELECTOR).forEach((candidate) => {
    const explicitRoot =
      candidate.matches('mat-action-list[role="menu"], #upload-file-menu')
        ? candidate
        : (candidate.querySelector<HTMLElement>('mat-action-list[role="menu"], #upload-file-menu') ??
          candidate);
    roots.add(explicitRoot);
  });

  roots.forEach((menuRoot) => {
    injectLongImageMenuItem(menuRoot);
  });
};

export function startLongImagePdfUploadMenu(): void {
  if (started) return;
  started = true;
  scanMenus();
  observer = new MutationObserver(() => scanMenus());
  observer.observe(document.body, { childList: true, subtree: true });
}

export function stopLongImagePdfUploadMenu(): void {
  if (!started) return;
  observer?.disconnect();
  observer = null;
  started = false;
}
