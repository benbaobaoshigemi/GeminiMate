import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from '@/pages/popup/Popup';
import panelCss from '@/index.css?inline';
import { resolvePageDarkTheme } from './themeSignals';

const CAPSULE_CLASS = 'gm-control-capsule';
const TARGET_SELECTORS = [
  'a.bard-logo-container.logo-only.hide-on-mobile',
  'a.bard-logo-container.logo-only',
  '#app-root > main > div > bard-mode-switcher > a.bard-logo-container.logo-only',
] as const;

// Styles applied inside the shadow root — override popup's body/html constraints
const SHADOW_INNER_STYLE = `
  :host { all: initial; display: block; }
  #gm-panel-root {
    width: 360px;
    max-height: 600px;
    overflow-y: auto;
    overflow-x: hidden;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  #gm-panel-root::-webkit-scrollbar { width: 4px; }
  #gm-panel-root::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.4); border-radius: 2px; }
  #gm-panel-root.gm-theme-dark {
    color-scheme: dark;
  }
  #gm-panel-root.gm-theme-dark [class~="dark:bg-[#0f111a]"] { background-color: #0f111a; }
  #gm-panel-root.gm-theme-dark [class~="dark:bg-[#151b28]"] { background-color: #151b28; }
  #gm-panel-root.gm-theme-dark [class~="dark:bg-[#1b2332]"] { background-color: #1b2332; }
  #gm-panel-root.gm-theme-dark [class~="dark:bg-slate-700/70"] { background-color: rgba(51, 65, 85, 0.7); }
  #gm-panel-root.gm-theme-dark [class~="dark:bg-white/5"] { background-color: rgba(255, 255, 255, 0.05); }
  #gm-panel-root.gm-theme-dark [class~="dark:bg-white/10"] { background-color: rgba(255, 255, 255, 0.1); }
  #gm-panel-root.gm-theme-dark [class~="dark:bg-white/20"] { background-color: rgba(255, 255, 255, 0.2); }
  #gm-panel-root.gm-theme-dark [class~="dark:border-slate-700"] { border-color: #334155; }
  #gm-panel-root.gm-theme-dark [class~="dark:border-white/10"] { border-color: rgba(255, 255, 255, 0.1); }
  #gm-panel-root.gm-theme-dark [class~="dark:text-white"] { color: #ffffff; }
  #gm-panel-root.gm-theme-dark [class~="dark:text-white/20"] { color: rgba(255, 255, 255, 0.2); }
  #gm-panel-root.gm-theme-dark [class~="dark:text-white/30"] { color: rgba(255, 255, 255, 0.3); }
  #gm-panel-root.gm-theme-dark [class~="dark:text-white/40"] { color: rgba(255, 255, 255, 0.4); }
  #gm-panel-root.gm-theme-dark [class~="dark:text-white/50"] { color: rgba(255, 255, 255, 0.5); }
  #gm-panel-root.gm-theme-dark [class~="dark:text-white/70"] { color: rgba(255, 255, 255, 0.7); }
  #gm-panel-root.gm-theme-dark [class~="dark:text-white/80"] { color: rgba(255, 255, 255, 0.8); }
  #gm-panel-root.gm-theme-dark [class~="dark:text-white/90"] { color: rgba(255, 255, 255, 0.9); }
  #gm-panel-root.gm-theme-dark [class~="dark:text-blue-300"] { color: #93c5fd; }
  #gm-panel-root.gm-theme-dark [class~="dark:shadow-[0_6px_16px_rgba(2,6,23,0.16)]"] { box-shadow: 0 6px 16px rgba(2, 6, 23, 0.16); }
  #gm-panel-root.gm-theme-dark [class~="dark:shadow-[0_10px_24px_rgba(2,6,23,0.18)]"] { box-shadow: 0 10px 24px rgba(2, 6, 23, 0.18); }
  #gm-panel-root.gm-theme-dark [class~="dark:placeholder:text-white/30"]::placeholder { color: rgba(255, 255, 255, 0.3); }
  #gm-panel-root.gm-theme-dark [class~="dark:hover:bg-[#222c3d]"]:hover { background-color: #222c3d; }
  #gm-panel-root.gm-theme-dark [class~="dark:hover:bg-white/10"]:hover { background-color: rgba(255, 255, 255, 0.1); }
  #gm-panel-root.gm-theme-dark [class~="dark:hover:text-white"]:hover { color: #ffffff; }
  #gm-panel-root.gm-theme-dark [class~="dark:hover:text-blue-400"]:hover { color: #60a5fa; }
`;

class ControlCapsule {
  private capsule: HTMLButtonElement | null = null;
  private panelHost: HTMLDivElement | null = null;
  private panelRoot: HTMLDivElement | null = null;
  private reactRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;
  private panelOpen = false;
  private observer: MutationObserver | null = null;
  private onWindowResize: (() => void) | null = null;
  private onWindowScroll: (() => void) | null = null;
  private positionRafId: number | null = null;
  private started = false;
  private onDocumentClick: ((e: MouseEvent) => void) | null = null;

  init(): void {
    if (this.started) return;
    this.started = true;
    this.createDom();
    this.attachListeners();
    this.setupObserver();
    this.schedulePosition();
  }

  destroy(): void {
    if (this.positionRafId !== null) {
      cancelAnimationFrame(this.positionRafId);
      this.positionRafId = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.onWindowResize) {
      window.removeEventListener('resize', this.onWindowResize);
      this.onWindowResize = null;
    }
    if (this.onWindowScroll) {
      window.removeEventListener('scroll', this.onWindowScroll, true);
      this.onWindowScroll = null;
    }
    if (this.onDocumentClick) {
      document.removeEventListener('click', this.onDocumentClick, true);
      this.onDocumentClick = null;
    }
    this.reactRoot?.unmount();
    this.reactRoot = null;
    this.capsule?.remove();
    this.capsule = null;
    this.panelRoot = null;
    this.panelHost?.remove();
    this.panelHost = null;
    this.started = false;
  }

  private createDom(): void {
    // Capsule toggle button
    this.capsule = document.createElement('button');
    this.capsule.className = CAPSULE_CLASS;
    this.capsule.type = 'button';
    this.capsule.setAttribute('aria-label', 'Open GeminiMate controls');
    this.capsule.textContent = 'GeminiMate';
    this.capsule.addEventListener('click', (event) => {
      event.stopPropagation();
      this.togglePanel();
    });
    document.body.appendChild(this.capsule);

    // Panel host — uses shadow DOM for full CSS isolation (no iframe = no browser blocking)
    this.panelHost = document.createElement('div');
    this.panelHost.className = 'gm-control-panel';
    this.panelHost.style.display = 'none';

    const shadow = this.panelHost.attachShadow({ mode: 'open' });
    const styleEl = document.createElement('style');
    styleEl.textContent = panelCss + '\n' + SHADOW_INNER_STYLE;
    shadow.appendChild(styleEl);

    const container = document.createElement('div');
    container.id = 'gm-panel-root';
    shadow.appendChild(container);
    this.panelRoot = container;
    this.syncPanelTheme();

    this.reactRoot = ReactDOM.createRoot(container);
    this.reactRoot.render(React.createElement(Popup));
    document.body.appendChild(this.panelHost);
  }

  private togglePanel(): void {
    if (this.panelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  private openPanel(): void {
    if (!this.panelHost) return;
    this.panelOpen = true;
    this.panelHost.style.display = 'block';
    this.positionPanel();
    this.capsule?.classList.add('active');
    // Close when clicking outside — composedPath() sees through shadow DOM boundaries
    this.onDocumentClick = (e: MouseEvent) => {
      const path = e.composedPath();
      if (path.includes(this.capsule as EventTarget) || path.includes(this.panelHost as EventTarget)) return;
      this.closePanel();
    };
    setTimeout(() => {
      document.addEventListener('click', this.onDocumentClick!, true);
    }, 0);
  }

  private closePanel(): void {
    if (!this.panelOpen) return;
    this.panelOpen = false;
    if (this.panelHost) this.panelHost.style.display = 'none';
    this.capsule?.classList.remove('active');
    if (this.onDocumentClick) {
      document.removeEventListener('click', this.onDocumentClick, true);
      this.onDocumentClick = null;
    }
  }

  private positionPanel(): void {
    if (!this.panelHost || !this.capsule) return;
    const capsuleRect = this.capsule.getBoundingClientRect();
    const panelWidth = 360;
    const panelMaxHeight = Math.min(600, window.innerHeight - 32);

    let left = capsuleRect.right + 12;
    let top = capsuleRect.top;

    // Flip to the left if the panel would overflow on the right
    if (left + panelWidth > window.innerWidth - 8) {
      left = capsuleRect.left - panelWidth - 12;
    }
    if (top + panelMaxHeight > window.innerHeight - 8) {
      top = window.innerHeight - panelMaxHeight - 8;
    }
    top = Math.max(8, top);
    left = Math.max(8, left);

    this.panelHost.style.left = `${Math.round(left)}px`;
    this.panelHost.style.top = `${Math.round(top)}px`;
    this.panelHost.style.maxHeight = `${panelMaxHeight}px`;
  }

  private attachListeners(): void {
    this.onWindowResize = () => {
      if (this.panelOpen) this.positionPanel();
      this.schedulePosition();
    };
    window.addEventListener('resize', this.onWindowResize);

    this.onWindowScroll = () => this.schedulePosition();
    window.addEventListener('scroll', this.onWindowScroll, true);
  }

  private setupObserver(): void {
    this.observer = new MutationObserver(() => {
      this.syncPanelTheme();
      this.schedulePosition();
    });
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme'],
    });
  }

  private syncPanelTheme(): void {
    if (!this.panelRoot) {
      return;
    }

    const isDark = resolvePageDarkTheme(document);
    this.panelRoot.classList.toggle('gm-theme-dark', isDark);
    this.panelRoot.dataset.theme = isDark ? 'dark' : 'light';
  }

  private findAnchorElement(): HTMLElement | null {
    for (const selector of TARGET_SELECTORS) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      return element;
    }
    return null;
  }

  private schedulePosition(): void {
    if (this.positionRafId !== null) return;
    this.positionRafId = requestAnimationFrame(() => {
      this.positionRafId = null;
      this.positionElements();
    });
  }

  private positionElements(): void {
    if (!this.capsule) return;

    const anchor = this.findAnchorElement();
    if (!anchor) {
      this.capsule.style.display = 'none';
      return;
    }

    this.capsule.style.display = '';

    const anchorRect = anchor.getBoundingClientRect();
    const capsuleWidth = this.capsule.offsetWidth || 112;
    const capsuleHeight = this.capsule.offsetHeight || 34;

    let capsuleLeft = anchorRect.right + 10;
    let capsuleTop = anchorRect.top + anchorRect.height / 2 - capsuleHeight / 2;

    capsuleLeft = Math.max(8, Math.min(capsuleLeft, window.innerWidth - capsuleWidth - 8));
    capsuleTop = Math.max(8, Math.min(capsuleTop, window.innerHeight - capsuleHeight - 8));

    this.capsule.style.left = `${Math.round(capsuleLeft)}px`;
    this.capsule.style.top = `${Math.round(capsuleTop)}px`;
  }
}

let controlCapsuleInstance: ControlCapsule | null = null;

export function startControlCapsule(): void {
  if (!controlCapsuleInstance) {
    controlCapsuleInstance = new ControlCapsule();
  }
  controlCapsuleInstance.init();
}

export function stopControlCapsule(): void {
  controlCapsuleInstance?.destroy();
  controlCapsuleInstance = null;
}
