import browser from 'webextension-polyfill';

import { StorageKeys } from '@/core/types/common';
import { GV_RTL_CLASS, detectRTL } from '@/core/utils/rtl';

import { getTranslationSync } from '@/utils/i18n';
import type { PreviewMarkerData } from './types';
import { computePreviewPanelLeft, resolvePreviewPanelGap } from './previewLayout';
import {
  matchesPreviewMarkerQuery,
  type PreviewSearchState,
} from './previewSearch';

const SEARCH_DEBOUNCE_MS = 200;

const SEARCH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

export class TimelinePreviewPanel {
  private panelEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private includeRepliesButton: HTMLButtonElement | null = null;
  private toggleBtn: HTMLElement | null = null;
  private _isOpen = false;
  private markers: ReadonlyArray<PreviewMarkerData> = [];
  private filteredMarkers: ReadonlyArray<PreviewMarkerData> = [];
  private activeTurnId: string | null = null;
  private searchQuery = '';
  private includeReplies = false;
  private searchDebounceTimer: number | null = null;
  private onNavigate: ((turnId: string, index: number) => void) | null = null;
  private onSearchChange: ((state: PreviewSearchState) => void) | null = null;
  private onDocumentPointerDown: ((e: PointerEvent) => void) | null = null;
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private onWindowResize: (() => void) | null = null;
  private onStorageChanged:
    | ((changes: Record<string, browser.Storage.StorageChange>, areaName: string) => void)
    | null = null;
  private hostVisible = true;

  constructor(private readonly anchorElement: HTMLElement) { }

  get isOpen(): boolean {
    return this._isOpen;
  }

  init(
    onNavigate: (turnId: string, index: number) => void,
    onSearchChange?: (state: PreviewSearchState) => void,
  ): void {
    this.onNavigate = onNavigate;
    this.onSearchChange = onSearchChange ?? null;
    this.createDOM();
    this.applyDirection();
    this.positionToggle();
    this.setupEventListeners();
    void this.loadPersistedState();
  }

  updateMarkers(markers: ReadonlyArray<PreviewMarkerData>): void {
    if (this.markersEqual(markers)) return;
    this.markers = markers;
    this.applyFilter();
  }

  updateActiveTurn(turnId: string | null): void {
    if (this.activeTurnId === turnId) return;
    this.activeTurnId = turnId;
    if (!this._isOpen || !this.listEl) return;
    this.updateActiveHighlight();
    this.scrollActiveIntoView();
  }

  /** Reposition toggle and panel after layout changes (e.g. RTL switch, resize). */
  reposition(): void {
    this.applyDirection();
    this.positionToggle();
    if (this._isOpen) this.positionPanel();
  }

  toggle(): void {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this._isOpen || !this.panelEl) return;
    this._isOpen = true;
    this.renderList();
    this.positionPanel();
    this.panelEl.classList.add('visible');
    this.toggleBtn?.classList.add('active');
    if (this.toggleBtn) {
      this.toggleBtn.style.display = 'none';
    }
    this.scrollActiveIntoView();
  }

  close(): void {
    if (!this._isOpen || !this.panelEl) return;
    this._isOpen = false;
    this.panelEl.classList.remove('visible');
    this.toggleBtn?.classList.remove('active');
    if (this.toggleBtn) {
      this.toggleBtn.style.display = this.hostVisible ? '' : 'none';
    }
    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.filteredMarkers = this.markers;
    }
    this.emitSearchState();
  }

  destroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    if (this.onDocumentPointerDown) {
      document.removeEventListener('pointerdown', this.onDocumentPointerDown);
      this.onDocumentPointerDown = null;
    }
    if (this.onKeyDown) {
      document.removeEventListener('keydown', this.onKeyDown);
      this.onKeyDown = null;
    }
    if (this.onWindowResize) {
      window.removeEventListener('resize', this.onWindowResize);
      this.onWindowResize = null;
    }
    if (this.onStorageChanged) {
      browser.storage.onChanged.removeListener(this.onStorageChanged);
      this.onStorageChanged = null;
    }
    this.toggleBtn?.remove();
    this.panelEl?.remove();
    this.toggleBtn = null;
    this.panelEl = null;
    this.listEl = null;
    this.searchInput = null;
    this.includeRepliesButton = null;
    this.emitSearchState();
    this.onNavigate = null;
    this.onSearchChange = null;
    this.markers = [];
    this.filteredMarkers = [];
  }

  setHostVisibility(visible: boolean): void {
    this.hostVisible = visible;
    if (!visible) {
      this.close();
    }
    if (this.toggleBtn) {
      this.toggleBtn.style.display = visible && !this._isOpen ? '' : 'none';
    }
    if (this.panelEl) {
      this.panelEl.style.display = visible ? '' : 'none';
    }
  }
  setAutoHide(autoHide: boolean): void {
    if (this.toggleBtn) {
      this.toggleBtn.classList.toggle('timeline-auto-hide', autoHide);
    }
  }
  private createDOM(): void {
    // Toggle button — fixed position to the left of the timeline bar
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'timeline-preview-toggle';
    this.toggleBtn.setAttribute('aria-label', '打开大纲搜索');
    this.toggleBtn.setAttribute('title', '打开大纲搜索');
    this.toggleBtn.innerHTML = SEARCH_ICON_SVG;
    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.anchorElement.appendChild(this.toggleBtn);

    // Panel
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'timeline-preview-panel';

    // Search section
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'timeline-preview-search';
    const searchRow = document.createElement('div');
    searchRow.className = 'timeline-preview-search-row';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.setAttribute('dir', 'auto');
    this.searchInput.placeholder = getTranslationSync('timelinePreviewSearch');
    this.searchInput.addEventListener('input', () => {
      this.handleSearchInput();
    });
    searchRow.appendChild(this.searchInput);
    this.includeRepliesButton = document.createElement('button');
    this.includeRepliesButton.type = 'button';
    this.includeRepliesButton.className = 'timeline-preview-filter-button';
    this.includeRepliesButton.textContent = '包含回复';
    this.includeRepliesButton.setAttribute('aria-pressed', 'false');
    this.includeRepliesButton.addEventListener('click', () => {
      this.setIncludeReplies(!this.includeReplies, true);
    });
    searchRow.appendChild(this.includeRepliesButton);
    searchWrapper.appendChild(searchRow);
    this.panelEl.appendChild(searchWrapper);

    // List
    this.listEl = document.createElement('div');
    this.listEl.className = 'timeline-preview-list';
    this.setupScrollIsolation();
    this.panelEl.appendChild(this.listEl);

    document.body.appendChild(this.panelEl);
  }

  private setupEventListeners(): void {
    // Click outside to close
    this.onDocumentPointerDown = (e: PointerEvent) => {
      if (!this._isOpen) return;
      const target = e.target as Node;
      if (this.panelEl?.contains(target) || this.toggleBtn?.contains(target)) return;
      this.close();
    };
    document.addEventListener('pointerdown', this.onDocumentPointerDown);

    // Escape to close
    this.onKeyDown = (e: KeyboardEvent) => {
      if (!this._isOpen) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    };
    document.addEventListener('keydown', this.onKeyDown);

    // Reposition on resize
    this.onWindowResize = () => {
      this.positionToggle();
      if (this._isOpen) this.positionPanel();
    };
    window.addEventListener('resize', this.onWindowResize);

    // Re-render translated text on language change
    this.onStorageChanged = (changes, areaName) => {
      if (areaName !== 'sync' && areaName !== 'local') {
        return;
      }
      if (changes[StorageKeys.LANGUAGE]) {
        this.updateTranslatedText();
      }
      if (areaName === 'local' && changes[StorageKeys.TIMELINE_SEARCH_INCLUDE_REPLIES]) {
        this.setIncludeReplies(
          changes[StorageKeys.TIMELINE_SEARCH_INCLUDE_REPLIES].newValue === true,
          false,
        );
      }
    };
    browser.storage.onChanged.addListener(this.onStorageChanged);
  }

  private async loadPersistedState(): Promise<void> {
    try {
      const result = await browser.storage.local.get({
        [StorageKeys.TIMELINE_SEARCH_INCLUDE_REPLIES]: false,
      });
      this.setIncludeReplies(result[StorageKeys.TIMELINE_SEARCH_INCLUDE_REPLIES] === true, false);
    } catch {
      this.setIncludeReplies(false, false);
    }
  }

  private updateTranslatedText(): void {
    this.applyDirection();
    if (this.searchInput) {
      this.searchInput.placeholder = getTranslationSync('timelinePreviewSearch');
    }
    if (this._isOpen) {
      this.renderList();
    }
  }

  private isRTLContext(): boolean {
    return document.body.classList.contains(GV_RTL_CLASS) || detectRTL();
  }

  private applyDirection(): void {
    const dir = this.isRTLContext() ? 'rtl' : 'ltr';
    this.panelEl?.setAttribute('dir', dir);
    this.listEl?.setAttribute('dir', dir);
    this.toggleBtn?.setAttribute('dir', dir);
  }

  private setupScrollIsolation(): void {
    if (!this.listEl) return;

    this.listEl.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.stopPropagation();
        const { scrollTop, scrollHeight, clientHeight } = this.listEl!;
        const atTop = scrollTop <= 0 && e.deltaY < 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
        if (atTop || atBottom) {
          e.preventDefault();
        }
      },
      { passive: false },
    );
  }

  /** Position the toggle button as a vertical pill to the LEFT of the timeline bar. */
  private positionToggle(): void {
    if (!this.toggleBtn) return;
    const computed = window.getComputedStyle(this.anchorElement);
    const barOpacity = Number.parseFloat(computed.opacity || '1');
    this.toggleBtn.style.pointerEvents = this._isOpen || barOpacity > 0.35 ? 'auto' : 'none';

    // The toggle button is now positioned via CSS inside .gemini-timeline-bar
    // Opacity is also inherited naturally from the parent bar, so we don't set it explicitly.
  }

  private getVisibleRect(element: HTMLElement | null): DOMRect | null {
    if (!element) return null;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return null;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) {
      return null;
    }
    return rect;
  }

  private getCollapsedToggleGap(): number {
    if (!this.toggleBtn) {
      return 52;
    }
    const toggleStyle = window.getComputedStyle(this.toggleBtn);
    const insetRaw = this.isRTLContext() ? toggleStyle.right : toggleStyle.left;
    const inset = Number.parseFloat(insetRaw);
    return resolvePreviewPanelGap({
      toggleInset: Number.isFinite(inset) ? inset : null,
      fallbackGap: 52,
    });
  }

  private positionPanel(): void {
    if (!this.panelEl) return;
    const anchorRect = this.getVisibleRect(this.anchorElement) ?? this.anchorElement.getBoundingClientRect();
    const gap = this.getCollapsedToggleGap();
    const minPanelWidth = 224;
    const maxPanelWidth = 288;
    const isRTL = this.isRTLContext();
    const availableWidth = isRTL
      ? Math.max(120, window.innerWidth - anchorRect.right - gap - 8)
      : Math.max(120, anchorRect.left - gap - 8);
    const panelWidth = Math.max(minPanelWidth, Math.min(maxPanelWidth, availableWidth));
    const maxHeight = Math.min(500, window.innerHeight * 0.7);
    const barCenterY = anchorRect.top + (anchorRect.bottom - anchorRect.top) / 2;

    const left = computePreviewPanelLeft({
      viewportWidth: window.innerWidth,
      occupiedLeft: anchorRect.left,
      occupiedRight: anchorRect.right,
      panelWidth,
      gap,
      isRTL,
    });

    this.panelEl.style.maxHeight = `${Math.round(maxHeight)}px`;
    this.panelEl.style.width = `${Math.round(panelWidth)}px`;
    this.panelEl.style.left = `${Math.round(left)}px`;

    const panelHeight = this.panelEl.offsetHeight || maxHeight;
    let top = barCenterY - panelHeight / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - panelHeight - 8));

    this.panelEl.style.top = `${Math.round(top)}px`;
  }

  private applyFilter(): void {
    if (!this.searchQuery) {
      this.filteredMarkers = this.markers;
    } else {
      this.filteredMarkers = this.markers.filter((marker) =>
        matchesPreviewMarkerQuery(marker, this.searchQuery, this.includeReplies),
      );
    }
    if (this._isOpen) {
      this.renderList();
    }
    this.emitSearchState();
  }

  private handleSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = window.setTimeout(() => {
      this.searchDebounceTimer = null;
      this.searchQuery = this.searchInput?.value.trim() ?? '';
      this.applyFilter();
    }, SEARCH_DEBOUNCE_MS);
  }

  private setIncludeReplies(nextValue: boolean, persist: boolean): void {
    if (this.includeReplies === nextValue && !persist) {
      this.syncIncludeRepliesButton();
      return;
    }
    this.includeReplies = nextValue;
    this.syncIncludeRepliesButton();
    if (persist) {
      void browser.storage.local.set({
        [StorageKeys.TIMELINE_SEARCH_INCLUDE_REPLIES]: nextValue,
      });
    }
    this.applyFilter();
  }

  private syncIncludeRepliesButton(): void {
    if (!this.includeRepliesButton) return;
    this.includeRepliesButton.classList.toggle('active', this.includeReplies);
    this.includeRepliesButton.setAttribute('aria-pressed', this.includeReplies ? 'true' : 'false');
  }

  private emitSearchState(): void {
    this.onSearchChange?.({
      query: this.searchQuery,
      includeReplies: this.includeReplies,
    });
  }

  private renderList(): void {
    if (!this.listEl) return;
    this.listEl.textContent = '';

    if (this.filteredMarkers.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-preview-empty';
      empty.textContent = this.searchQuery
        ? getTranslationSync('timelinePreviewNoResults')
        : getTranslationSync('timelinePreviewNoMessages');
      this.listEl.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const marker of this.filteredMarkers) {
      fragment.appendChild(this.createItem(marker));
    }
    this.listEl.appendChild(fragment);
  }

  private createItem(marker: PreviewMarkerData): HTMLElement {
    const item = document.createElement('div');
    item.className = 'timeline-preview-item';
    item.dataset.turnId = marker.id;

    if (marker.starred) {
      item.classList.add('starred');
    }
    if (marker.id === this.activeTurnId) {
      item.classList.add('active');
    }

    const indexLabel = document.createElement('span');
    indexLabel.className = 'timeline-preview-index';
    indexLabel.textContent = `${marker.index + 1}`;
    item.appendChild(indexLabel);

    const text = document.createElement('span');
    text.className = 'timeline-preview-text';
    text.setAttribute('dir', 'auto');
    const displayText = this.truncateText(marker.summary, 80);
    if (this.searchQuery) {
      this.appendHighlighted(text, displayText, this.searchQuery);
    } else {
      text.textContent = displayText;
    }
    item.appendChild(text);

    item.addEventListener('click', () => {
      this.onNavigate?.(marker.id, marker.index);
    });

    return item;
  }

  /** Split text around case-insensitive query matches and wrap each match in <mark>. */
  private appendHighlighted(container: HTMLElement, text: string, query: string): void {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let cursor = 0;
    let idx = lowerText.indexOf(lowerQuery, cursor);
    while (idx !== -1) {
      if (idx > cursor) {
        container.appendChild(document.createTextNode(text.slice(cursor, idx)));
      }
      const mark = document.createElement('mark');
      mark.className = 'timeline-preview-highlight';
      mark.textContent = text.slice(idx, idx + query.length);
      container.appendChild(mark);
      cursor = idx + query.length;
      idx = lowerText.indexOf(lowerQuery, cursor);
    }
    if (cursor < text.length) {
      container.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  private truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '\u2026';
  }

  private updateActiveHighlight(): void {
    if (!this.listEl) return;
    const items = this.listEl.querySelectorAll('.timeline-preview-item');
    items.forEach((item) => {
      const el = item as HTMLElement;
      el.classList.toggle('active', el.dataset.turnId === this.activeTurnId);
    });
  }

  private scrollActiveIntoView(): void {
    if (!this.listEl || !this.activeTurnId) return;
    const activeItem = this.listEl.querySelector(
      '.timeline-preview-item.active',
    ) as HTMLElement | null;
    activeItem?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }

  private markersEqual(newMarkers: ReadonlyArray<PreviewMarkerData>): boolean {
    if (newMarkers.length !== this.markers.length) return false;
    for (let i = 0; i < newMarkers.length; i++) {
      const a = this.markers[i];
      const b = newMarkers[i];
      if (
        a.id !== b.id ||
        a.summary !== b.summary ||
        a.replyText !== b.replyText ||
        a.starred !== b.starred
      ) {
        return false;
      }
    }
    return true;
  }
}
