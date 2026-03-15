import { StorageKeys } from '@/core/types/common';

import {
  createNetworkQualitySnapshot,
  createNetworkQualityThresholds,
  normalizeNetworkQualitySnapshot,
  normalizeNetworkQualityThresholds,
  pruneStaleNetworkQualitySnapshot,
  resolveThresholdTone,
  resolveNetworkQualityEnabled,
} from './model';
import {
  NETWORK_QUALITY_DARK_TONE_COLORS,
  NETWORK_QUALITY_LIGHT_TONE_COLORS,
} from './toneColors';
import type { NetworkQualitySnapshot, NetworkQualityThresholds } from './types';

const PANEL_WIDTH_PX = 42;
const CAPSULE_HEIGHT_PX = 98;
const CAPSULE_GAP_PX = 14;
const PANEL_MIN_LEFT_GAP_PX = 18;
const PANEL_FALLBACK_LEFT_PX = 16;

const PANEL_STYLE = `
  :host {
    all: initial;
    --gm-network-panel-bg: rgba(255, 255, 255, 0.98);
    --gm-network-panel-ring-bg: rgba(255, 255, 255, 0.98);
    --gm-network-panel-shadow-primary: 0 2px 6px rgba(15, 23, 42, 0.06);
    --gm-network-panel-shadow-secondary: 0 12px 24px rgba(15, 23, 42, 0.08);
    --gm-network-panel-label-color: rgba(71, 85, 105, 0.92);
    --gm-network-panel-neutral: ${NETWORK_QUALITY_LIGHT_TONE_COLORS.neutral};
    --gm-network-panel-neutral-icon: ${NETWORK_QUALITY_LIGHT_TONE_COLORS.neutral};
    --gm-network-panel-good: ${NETWORK_QUALITY_LIGHT_TONE_COLORS.good};
    --gm-network-panel-bad: ${NETWORK_QUALITY_LIGHT_TONE_COLORS.bad};
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --gm-network-panel-bg: rgba(17, 24, 39, 0.94);
      --gm-network-panel-ring-bg: rgba(17, 24, 39, 0.96);
      --gm-network-panel-shadow-primary: 0 2px 6px rgba(2, 6, 23, 0.22);
      --gm-network-panel-shadow-secondary: 0 12px 24px rgba(2, 6, 23, 0.28);
      --gm-network-panel-label-color: rgba(226, 232, 240, 0.86);
      --gm-network-panel-neutral: ${NETWORK_QUALITY_DARK_TONE_COLORS.neutral};
      --gm-network-panel-neutral-icon: ${NETWORK_QUALITY_DARK_TONE_COLORS.iconNeutral};
      --gm-network-panel-good: ${NETWORK_QUALITY_DARK_TONE_COLORS.good};
      --gm-network-panel-bad: ${NETWORK_QUALITY_DARK_TONE_COLORS.bad};
    }
  }

  :host-context(.theme-host.dark-theme),
  :host-context(html.dark),
  :host-context(body.dark),
  :host-context(html[data-theme="dark"]),
  :host-context(body[data-theme="dark"]),
  :host-context(html[data-color-scheme="dark"]),
  :host-context(body[data-color-scheme="dark"]) {
    --gm-network-panel-bg: rgba(17, 24, 39, 0.94);
    --gm-network-panel-ring-bg: rgba(17, 24, 39, 0.96);
    --gm-network-panel-shadow-primary: 0 2px 6px rgba(2, 6, 23, 0.22);
    --gm-network-panel-shadow-secondary: 0 12px 24px rgba(2, 6, 23, 0.28);
    --gm-network-panel-label-color: rgba(226, 232, 240, 0.86);
    --gm-network-panel-neutral: ${NETWORK_QUALITY_DARK_TONE_COLORS.neutral};
    --gm-network-panel-neutral-icon: ${NETWORK_QUALITY_DARK_TONE_COLORS.iconNeutral};
    --gm-network-panel-good: ${NETWORK_QUALITY_DARK_TONE_COLORS.good};
    --gm-network-panel-bad: ${NETWORK_QUALITY_DARK_TONE_COLORS.bad};
  }

  .gm-network-capsule {
    position: fixed;
    left: 16px;
    width: 42px;
    z-index: 2147483645;
    pointer-events: none;
    height: 98px;
    border: none;
    border-radius: 999px;
    background: var(--gm-network-panel-bg);
    box-shadow:
      var(--gm-network-panel-shadow-primary),
      var(--gm-network-panel-shadow-secondary);
    box-sizing: border-box;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    --metric-color: var(--gm-network-panel-neutral);
    --metric-icon-color: var(--gm-network-panel-neutral-icon);
  }

  .gm-network-capsule[data-tone="good"] {
    --metric-color: var(--gm-network-panel-good);
  }

  .gm-network-capsule[data-tone="bad"] {
    --metric-color: var(--gm-network-panel-bad);
  }

  .gm-network-capsule[data-tone="off"] {
    --metric-color: ${NETWORK_QUALITY_LIGHT_TONE_COLORS.off};
    --metric-icon-color: ${NETWORK_QUALITY_LIGHT_TONE_COLORS.off};
  }

  .gm-network-inner {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .gm-network-ring {
    position: absolute;
    top: 4px;
    left: 50%;
    width: 34px;
    height: 34px;
    transform: translateX(-50%);
    border-radius: 999px;
    border: 3px solid var(--metric-color);
    background: var(--gm-network-panel-ring-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .gm-network-value {
    font-family: "Google Sans", "Segoe UI", sans-serif;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    color: var(--metric-color);
    letter-spacing: -0.03em;
  }

  .gm-network-label {
    position: absolute;
    top: 50px;
    left: 50%;
    transform: translateX(-50%);
    font-family: "Google Sans", "Segoe UI", sans-serif;
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
    color: var(--gm-network-panel-label-color);
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  .gm-network-icon {
    position: absolute;
    left: 50%;
    bottom: 10px;
    width: 18px;
    height: 18px;
    transform: translateX(-50%);
    color: var(--metric-icon-color);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gm-network-icon svg {
    width: 18px;
    height: 18px;
    display: block;
  }
`;

type CapsuleTone = 'good' | 'bad' | 'neutral' | 'off';

type CapsuleMetric = {
  title: string;
  value: string;
  icon: 'latency' | 'jitter' | 'loss';
  tone: CapsuleTone;
};

const renderMetricIcon = (icon: CapsuleMetric['icon']): string => {
  switch (icon) {
    case 'latency':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3.5 2"></path>
        </svg>
      `;
    case 'jitter':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 15c2.2 0 2.2-6 4.4-6s2.2 6 4.4 6 2.2-6 4.4-6 2.2 6 4.4 6"></path>
        </svg>
      `;
    case 'loss':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5"></circle>
          <path d="M8.5 15.5 15.5 8.5"></path>
        </svg>
      `;
  }
};

const formatMetricValue = (value: number | null): string => {
  if (value === null) return '--';
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
};

class NetworkQualityPagePanel {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private snapshot: NetworkQualitySnapshot = createNetworkQualitySnapshot();
  private thresholds: NetworkQualityThresholds = createNetworkQualityThresholds();
  private started = false;
  private storageListener:
    | ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void)
    | null = null;
  private observer: MutationObserver | null = null;
  private resizeHandler: (() => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private positionRafId: number | null = null;

  public init(): void {
    if (this.started) return;
    this.started = true;
    this.createDom();
    this.attachListeners();
    void this.loadState();
  }

  public destroy(): void {
    if (this.storageListener) {
      chrome.storage.onChanged.removeListener(this.storageListener);
      this.storageListener = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      this.scrollHandler = null;
    }
    if (this.positionRafId !== null) {
      cancelAnimationFrame(this.positionRafId);
      this.positionRafId = null;
    }
    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.started = false;
  }

  private createDom(): void {
    this.host = document.createElement('div');
    this.shadow = this.host.attachShadow({ mode: 'open' });
    document.body.appendChild(this.host);
  }

  private attachListeners(): void {
    this.storageListener = (changes, areaName) => {
      if (areaName !== 'local') return;

      if (changes[StorageKeys.NETWORK_QUALITY_ENABLED]) {
        const enabled = resolveNetworkQualityEnabled(
          changes[StorageKeys.NETWORK_QUALITY_ENABLED].newValue,
        );
        this.snapshot = {
          ...this.snapshot,
          enabled,
        };
      }

      if (changes[StorageKeys.NETWORK_QUALITY_THRESHOLDS]) {
        this.thresholds = normalizeNetworkQualityThresholds(
          changes[StorageKeys.NETWORK_QUALITY_THRESHOLDS].newValue,
        );
      }

      if (changes[StorageKeys.NETWORK_QUALITY_SNAPSHOT]) {
        this.snapshot = normalizeNetworkQualitySnapshot(
          changes[StorageKeys.NETWORK_QUALITY_SNAPSHOT].newValue,
          {
            enabled: this.snapshot.enabled,
          },
        );
      }

      this.render();
    };

    chrome.storage.onChanged.addListener(this.storageListener);

    this.observer = new MutationObserver(() => {
      this.schedulePosition();
    });
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    this.resizeHandler = () => {
      this.schedulePosition();
    };
    window.addEventListener('resize', this.resizeHandler);

    this.scrollHandler = () => {
      this.schedulePosition();
    };
    window.addEventListener('scroll', this.scrollHandler, true);
  }

  private async loadState(): Promise<void> {
    const stored = await chrome.storage.local.get([
      StorageKeys.NETWORK_QUALITY_ENABLED,
      StorageKeys.NETWORK_QUALITY_THRESHOLDS,
      StorageKeys.NETWORK_QUALITY_SNAPSHOT,
    ]);

    const enabled = resolveNetworkQualityEnabled(stored[StorageKeys.NETWORK_QUALITY_ENABLED]);
    this.thresholds = normalizeNetworkQualityThresholds(
      stored[StorageKeys.NETWORK_QUALITY_THRESHOLDS],
    );
    this.snapshot = pruneStaleNetworkQualitySnapshot(
      normalizeNetworkQualitySnapshot(stored[StorageKeys.NETWORK_QUALITY_SNAPSHOT], {
        enabled,
      }),
    );
    this.render();
  }

  private render(): void {
    if (!this.shadow) return;
    if (!this.snapshot.enabled) {
      this.shadow.innerHTML = '';
      return;
    }

    const lastSample = this.snapshot.lastSample;
    const metrics: CapsuleMetric[] = [
      {
        title: '延迟',
        value: formatMetricValue(lastSample?.latencyMs ?? null),
        icon: 'latency',
        tone: resolveThresholdTone(
          lastSample?.latencyMs ?? null,
          this.snapshot.enabled,
          this.thresholds.latencyGoodMaxMs,
          this.thresholds.latencyBadMinMs,
        ),
      },
      {
        title: '抖动',
        value: formatMetricValue(this.snapshot.summary.jitterMs),
        icon: 'jitter',
        tone: resolveThresholdTone(
          this.snapshot.summary.jitterMs,
          this.snapshot.enabled,
          this.thresholds.jitterGoodMaxMs,
          this.thresholds.jitterBadMinMs,
        ),
      },
      {
        title: '丢包率',
        value: formatMetricValue(this.snapshot.summary.lossRate),
        icon: 'loss',
        tone: resolveThresholdTone(
          this.snapshot.summary.lossRate,
          this.snapshot.enabled,
          this.thresholds.lossGoodMaxPercent,
          this.thresholds.lossBadMinPercent,
        ),
      },
    ];

    this.shadow.innerHTML = `
      <style>${PANEL_STYLE}</style>
      ${metrics
        .map(
          (metric, index) => `
            <div
              class="gm-network-capsule"
              data-index="${index}"
              data-tone="${metric.tone}"
              title="${metric.title}"
            >
              <div class="gm-network-inner">
                <div class="gm-network-ring">
                  <div class="gm-network-value">${metric.value}</div>
                </div>
                <div class="gm-network-label">${metric.title}</div>
                <div class="gm-network-icon" aria-hidden="true">${renderMetricIcon(metric.icon)}</div>
              </div>
            </div>
          `,
        )
        .join('')}
    `;

    this.schedulePosition();
  }

  private schedulePosition(): void {
    if (this.positionRafId !== null) return;
    this.positionRafId = requestAnimationFrame(() => {
      this.positionRafId = null;
      this.positionPanel();
    });
  }

  private positionPanel(): void {
    const capsules = this.shadow?.querySelectorAll<HTMLElement>('.gm-network-capsule');
    if (!capsules?.length) return;

    const sidebar = this.findSidebarElement();
    const sidebarRight = sidebar?.getBoundingClientRect().right ?? PANEL_FALLBACK_LEFT_PX;
    let left = sidebarRight + PANEL_MIN_LEFT_GAP_PX;
    const maxLeft = Math.max(PANEL_FALLBACK_LEFT_PX, window.innerWidth - PANEL_WIDTH_PX - 8);
    const totalHeight = CAPSULE_HEIGHT_PX * capsules.length + CAPSULE_GAP_PX * (capsules.length - 1);
    const startTop = Math.max(8, Math.round((window.innerHeight - totalHeight) / 2));

    left = Math.max(PANEL_FALLBACK_LEFT_PX, Math.min(left, maxLeft));
    capsules.forEach((capsule, index) => {
      capsule.style.left = `${Math.round(left)}px`;
      capsule.style.top = `${startTop + index * (CAPSULE_HEIGHT_PX + CAPSULE_GAP_PX)}px`;
    });
  }

  private findSidebarElement(): HTMLElement | null {
    const sidebar = document.querySelector<HTMLElement>('bard-sidenav');
    if (!sidebar) return null;

    const style = window.getComputedStyle(sidebar);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return null;
    }

    const rect = sidebar.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return sidebar;
  }
}

let pagePanelInstance: NetworkQualityPagePanel | null = null;

export const startNetworkQualityPagePanel = (): void => {
  if (!pagePanelInstance) {
    pagePanelInstance = new NetworkQualityPagePanel();
  }
  pagePanelInstance.init();
};

export const stopNetworkQualityPagePanel = (): void => {
  pagePanelInstance?.destroy();
  pagePanelInstance = null;
};
