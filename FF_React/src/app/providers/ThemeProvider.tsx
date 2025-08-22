import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'vf' | 'fibreflow';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'light'
    const stored = localStorage.getItem('ff-theme') as Theme;
    return stored || 'light';
  });

  const availableThemes: Theme[] = ['light', 'dark', 'vf', 'fibreflow'];

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ff-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}