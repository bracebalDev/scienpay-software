import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('scienpay_theme') as Theme | null;
    return saved || 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      const activeIsDark =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : theme === 'dark';

      setIsDark(activeIsDark);

      if (activeIsDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('scienpay_theme', newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`inline-flex items-center rounded-lg p-0.5 border transition-colors ${
        compact
          ? 'bg-[#EAE9E5] dark:bg-[#2C2C2C] border-[#E2E1DC] dark:border-[#373737]'
          : 'bg-[#F1F0EC] dark:bg-[#202020] border-[#E5E4E0] dark:border-[#2F2F2F]'
      }`}
    >
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-[#333333] text-[#37352F] dark:text-white shadow-sm'
            : 'text-[#787774] hover:text-[#37352F] dark:text-[#9B9A97] dark:hover:text-white'
        }`}
        title="Modo Claro"
      >
        <Sun className="w-3.5 h-3.5" />
        {!compact && <span className="ml-1.5 text-[11px]">Claro</span>}
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-all ${
          theme === 'dark'
            ? 'bg-white dark:bg-[#333333] text-[#37352F] dark:text-white shadow-sm'
            : 'text-[#787774] hover:text-[#37352F] dark:text-[#9B9A97] dark:hover:text-white'
        }`}
        title="Modo Oscuro"
      >
        <Moon className="w-3.5 h-3.5" />
        {!compact && <span className="ml-1.5 text-[11px]">Oscuro</span>}
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-all ${
          theme === 'system'
            ? 'bg-white dark:bg-[#333333] text-[#37352F] dark:text-white shadow-sm'
            : 'text-[#787774] hover:text-[#37352F] dark:text-[#9B9A97] dark:hover:text-white'
        }`}
        title="Tema del Sistema"
      >
        <Monitor className="w-3.5 h-3.5" />
        {!compact && <span className="ml-1.5 text-[11px]">Sistema</span>}
      </button>
    </div>
  );
};
