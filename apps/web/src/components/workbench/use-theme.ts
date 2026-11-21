import { useLayoutEffect, useState, useSyncExternalStore } from 'react';

const colorScheme = '(prefers-color-scheme: dark)';
const storageKey = 'rezoning-workbench-theme';
type Theme = 'light' | 'dark';

function readPreference(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function subscribeToColorScheme(notify: () => void) {
  const query = window.matchMedia(colorScheme);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
}

function systemPrefersDark() {
  return window.matchMedia(colorScheme).matches;
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference);
  const systemDark = useSyncExternalStore(subscribeToColorScheme, systemPrefersDark);
  const theme = preference ?? (systemDark ? 'dark' : 'light');

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // The current page can still use the selected theme.
    }
  }

  return { dark: theme === 'dark', toggleTheme };
}
