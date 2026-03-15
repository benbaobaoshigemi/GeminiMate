export type ThemeSignalSnapshot = {
  className: string;
  dataTheme: string | null;
  dataColorScheme: string | null;
};

const hasDarkClassName = (className: string): boolean => {
  const tokens = className
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  return tokens.includes('dark') || tokens.includes('dark-theme');
};

export const hasDarkThemeSignal = (signals: readonly ThemeSignalSnapshot[]): boolean =>
  signals.some((signal) => {
    if (hasDarkClassName(signal.className)) {
      return true;
    }

    return (
      signal.dataTheme?.trim().toLowerCase() === 'dark' ||
      signal.dataColorScheme?.trim().toLowerCase() === 'dark'
    );
  });

export const resolvePageDarkTheme = (
  doc: Document = document,
  prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches,
): boolean => {
  const themeHosts = Array.from(doc.querySelectorAll<HTMLElement>('.theme-host'))
    .slice(0, 4)
    .map<ThemeSignalSnapshot>((element) => ({
      className: element.className,
      dataTheme: element.getAttribute('data-theme'),
      dataColorScheme: element.getAttribute('data-color-scheme'),
    }));

  const rootSignals: ThemeSignalSnapshot[] = [doc.documentElement, doc.body]
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .map((element) => ({
      className: element.className,
      dataTheme: element.getAttribute('data-theme'),
      dataColorScheme: element.getAttribute('data-color-scheme'),
    }));

  return hasDarkThemeSignal([...rootSignals, ...themeHosts]) || prefersDark;
};
