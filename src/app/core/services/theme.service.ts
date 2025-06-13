import { Injectable, signal, effect, computed } from '@angular/core';

export type Theme = 'light' | 'dark' | 'vf' | 'fibreflow';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private theme = signal<Theme>('light');

  constructor() {
    const saved = localStorage.getItem('ff-theme') as Theme;
    if (saved && this.isValidTheme(saved)) {
      this.setTheme(saved, false);
    }

    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('ff-theme', currentTheme);
    });
  }

  getTheme() {
    return this.theme();
  }

  setTheme(theme: Theme, _save = true) {
    if (this.isValidTheme(theme)) {
      this.theme.set(theme);
    }
  }

  readonly isDark = computed(() => this.theme() === 'dark' || this.theme() === 'vf');

  readonly themeClass = computed(() => `theme-${this.theme()}`);

  toggleTheme() {
    const current = this.theme();
    const themes: Theme[] = ['light', 'dark', 'vf', 'fibreflow'];
    const currentIndex = themes.indexOf(current);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }

  private isValidTheme(theme: string): theme is Theme {
    return ['light', 'dark', 'vf', 'fibreflow'].includes(theme);
  }
}
