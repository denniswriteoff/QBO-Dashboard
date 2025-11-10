'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-gray-700 dark:text-gray-200" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-gray-700 dark:text-gray-200" aria-hidden="true" />
      )}
    </button>
  );
}

export default ThemeToggle;

