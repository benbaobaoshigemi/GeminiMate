import { describe, expect, it } from 'vitest';

import { hasDarkThemeSignal } from './themeSignals';

describe('theme signal detection', () => {
  it('recognizes dark class and attribute signals from the host page', () => {
    expect(
      hasDarkThemeSignal([
        {
          className: 'theme-host dark-theme',
          dataTheme: null,
          dataColorScheme: null,
        },
      ]),
    ).toBe(true);

    expect(
      hasDarkThemeSignal([
        {
          className: 'app-shell',
          dataTheme: 'dark',
          dataColorScheme: null,
        },
      ]),
    ).toBe(true);

    expect(
      hasDarkThemeSignal([
        {
          className: 'layout-root',
          dataTheme: null,
          dataColorScheme: 'dark',
        },
      ]),
    ).toBe(true);
  });

  it('does not misclassify light-only snapshots as dark', () => {
    expect(
      hasDarkThemeSignal([
        {
          className: 'theme-host light-theme',
          dataTheme: 'light',
          dataColorScheme: 'light',
        },
      ]),
    ).toBe(false);
  });
});
