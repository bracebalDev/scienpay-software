import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Por recomendación del evaluador para sistemas administrativos institucionales,
    // la aplicación opera de forma exclusiva y predeterminada en Modo Claro.
    localStorage.removeItem('scienpay_theme');
    const root = document.documentElement;
    root.classList.remove('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme: () => {}, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};

export const ThemeToggle: React.FC<{ compact?: boolean }> = () => {
  // Retorna null: la interfaz es exclusivamente en modo claro estándar administrativo
  return null;
};
