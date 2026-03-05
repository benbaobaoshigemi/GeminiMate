/**
 * Sidebar Auto-Hide Feature for Gemini
 * Auto collapses when mouse leaves, expands when enters.
 */

import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'geminimate-sidebar-auto-hide-style';
const LEAVE_DELAY_MS = 500;
const ENTER_DELAY_MS = 300;
const SIDENAV_CHECK_INTERVAL_MS = 1000;
const RESIZE_DEBOUNCE_MS = 200;
const MENU_CLICK_PAUSE_MS = 1500;

let enabled = false;
let leaveTimeoutId: number | null = null;
let enterTimeoutId: number | null = null;
let sidenavElement: HTMLElement | null = null;
let observer: MutationObserver | null = null;
let resizeHandler: (() => void) | null = null;
let resizeDebounceTimer: number | null = null;
let sidenavCheckTimer: number | null = null;
let menuClickHandler: ((e: Event) => void) | null = null;
let autoCollapsed = false;
let pausedUntil = 0;

function isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
}

function insertTransitionStyle(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
    bard-sidenav,
    bard-sidenav side-navigation-content,
    bard-sidenav side-navigation-content > div {
      transition: width 0.25s ease, transform 0.25s ease !important;
    }
  `;
    document.documentElement.appendChild(style);
}

function findToggleButton(): HTMLButtonElement | null {
    const btn = document.querySelector<HTMLButtonElement>('button[data-test-id="side-nav-menu-button"]');
    if (btn) return btn;
    const sideNavMenuButton = document.querySelector('side-nav-menu-button');
    if (sideNavMenuButton) return sideNavMenuButton.querySelector<HTMLButtonElement>('button');
    return null;
}

function isSidebarCollapsed(): boolean {
    if (document.body.classList.contains('mat-sidenav-opened')) return false;
    const sideContent = document.querySelector('bard-sidenav side-navigation-content > div');
    if (sideContent?.classList.contains('collapsed')) return true;
    const sidenav = document.querySelector<HTMLElement>('bard-sidenav');
    if (sidenav && sidenav.getBoundingClientRect().width < 80) return true;
    return false;
}

function isSidebarVisible(): boolean {
    const sidenav = document.querySelector<HTMLElement>('bard-sidenav');
    return sidenav ? isElementVisible(sidenav) : false;
}

function isPaused(): boolean {
    return Date.now() < pausedUntil;
}

function isPopupOrDialogOpen(): boolean {
    for (const dialog of document.querySelectorAll<HTMLElement>('.mat-mdc-dialog-container')) {
        if (isElementVisible(dialog)) return true;
    }
    for (const menu of document.querySelectorAll<HTMLElement>('.mat-mdc-menu-panel')) {
        if (isElementVisible(menu)) return true;
    }
    return false;
}

function isMouseOverSidebarArea(): boolean {
    if (sidenavElement?.matches(':hover')) return true;
    for (const dialog of document.querySelectorAll<HTMLElement>('.mat-mdc-dialog-container')) {
        if (dialog.matches(':hover')) return true;
    }
    for (const menu of document.querySelectorAll<HTMLElement>('.mat-mdc-menu-panel')) {
        if (menu.matches(':hover')) return true;
    }
    return false;
}

function handleMenuClick(e: Event): void {
    if (!enabled) return;
    const target = e.target as HTMLElement;
    if (target.closest('[role="menuitem"], .mat-mdc-menu-item, bard-sidenav button, [data-test-id*="options"]')) {
        pausedUntil = Date.now() + MENU_CLICK_PAUSE_MS;
    }
}

function clickToggleButton(): boolean {
    const btn = findToggleButton();
    if (!btn) return false;
    btn.click();
    return true;
}

function collapseSidebar(): void {
    if (isPaused() || isPopupOrDialogOpen() || isMouseOverSidebarArea()) return;
    if (!isSidebarCollapsed()) {
        if (clickToggleButton()) autoCollapsed = true;
    }
}

function expandSidebar(): void {
    if (isSidebarCollapsed()) {
        clickToggleButton();
        autoCollapsed = false;
    }
}

function handleMouseEnter(): void {
    if (!enabled) return;
    if (leaveTimeoutId !== null) {
        clearTimeout(leaveTimeoutId);
        leaveTimeoutId = null;
    }
    if (enterTimeoutId !== null) clearTimeout(enterTimeoutId);
    enterTimeoutId = window.setTimeout(() => {
        enterTimeoutId = null;
        if (enabled) expandSidebar();
    }, ENTER_DELAY_MS);
}

function handleMouseLeave(): void {
    if (!enabled) return;
    if (enterTimeoutId !== null) {
        clearTimeout(enterTimeoutId);
        enterTimeoutId = null;
    }
    if (leaveTimeoutId !== null) clearTimeout(leaveTimeoutId);
    leaveTimeoutId = window.setTimeout(() => {
        leaveTimeoutId = null;
        if (enabled) collapseSidebar();
    }, LEAVE_DELAY_MS);
}

function attachEventListeners(): boolean {
    const sidenav = document.querySelector<HTMLElement>('bard-sidenav');
    if (!sidenav || !isSidebarVisible()) return false;
    if (sidenav === sidenavElement) return true;

    if (sidenavElement) {
        sidenavElement.removeEventListener('mouseenter', handleMouseEnter);
        sidenavElement.removeEventListener('mouseleave', handleMouseLeave);
    }

    sidenavElement = sidenav;
    sidenav.addEventListener('mouseenter', handleMouseEnter);
    sidenav.addEventListener('mouseleave', handleMouseLeave);
    return true;
}

function detachEventListeners(): void {
    if (sidenavElement) {
        sidenavElement.removeEventListener('mouseenter', handleMouseEnter);
        sidenavElement.removeEventListener('mouseleave', handleMouseLeave);
        sidenavElement = null;
    }
}

function checkAndReattach(): void {
    if (!enabled) return;
    const currentSidenav = document.querySelector<HTMLElement>('bard-sidenav');

    if (sidenavElement && !isSidebarVisible()) {
        detachEventListeners();
        autoCollapsed = false;
        return;
    }

    if (currentSidenav && isSidebarVisible() && currentSidenav !== sidenavElement) {
        attachEventListeners();
    }
}

function enable(): void {
    if (enabled) return;
    enabled = true;
    autoCollapsed = false;
    pausedUntil = 0;

    insertTransitionStyle();
    attachEventListeners();

    if (!observer) {
        observer = new MutationObserver(() => enabled && checkAndReattach());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (!resizeHandler) {
        resizeHandler = () => {
            if (!enabled) return;
            if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer);
            resizeDebounceTimer = window.setTimeout(() => {
                resizeDebounceTimer = null;
                checkAndReattach();
            }, RESIZE_DEBOUNCE_MS);
        };
        window.addEventListener('resize', resizeHandler);
    }

    if (!menuClickHandler) {
        menuClickHandler = handleMenuClick;
        document.addEventListener('click', menuClickHandler, true);
    }

    if (sidenavCheckTimer === null) {
        sidenavCheckTimer = window.setInterval(checkAndReattach, SIDENAV_CHECK_INTERVAL_MS);
    }

    setTimeout(() => {
        if (enabled && sidenavElement && !sidenavElement.matches(':hover') && !isPopupOrDialogOpen()) {
            collapseSidebar();
        }
    }, 500);
}

function disable(): void {
    if (!enabled) return;
    enabled = false;

    if (enterTimeoutId !== null) { clearTimeout(enterTimeoutId); enterTimeoutId = null; }
    if (leaveTimeoutId !== null) { clearTimeout(leaveTimeoutId); leaveTimeoutId = null; }
    if (resizeDebounceTimer !== null) { clearTimeout(resizeDebounceTimer); resizeDebounceTimer = null; }
    if (sidenavCheckTimer !== null) { clearInterval(sidenavCheckTimer); sidenavCheckTimer = null; }

    if (autoCollapsed && isSidebarCollapsed()) clickToggleButton();
    autoCollapsed = false;

    detachEventListeners();
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();

    if (observer) { observer.disconnect(); observer = null; }
    if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
    if (menuClickHandler) { document.removeEventListener('click', menuClickHandler, true); menuClickHandler = null; }
}

export function startSidebarAutoHide(): void {
    chrome.storage.local.get({ [StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE]: false }, (res) => {
        if (res[StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE]) enable();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE]) {
            if (changes[StorageKeys.GEMINI_SIDEBAR_AUTO_HIDE].newValue) enable();
            else disable();
        }
    });

    window.addEventListener('beforeunload', disable, { once: true });
}
