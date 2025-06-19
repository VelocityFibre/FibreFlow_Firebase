import {
  Injectable,
  signal,
  effect,
  computed,
  afterNextRender,
  Injector,
  EffectRef,
} from '@angular/core';
import { BrowserStorageService } from './browser-storage.service';

export type Theme = 'light' | 'dark' | 'vf' | 'fibreflow';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private theme = signal<Theme>('light');
  private storage?: BrowserStorageService;
  private effectRef: EffectRef | null = null;
  private initialized = false;

  constructor() {
    // Set default theme immediately (no DOM/storage access)
    this.theme.set('light');
    // Defer ALL initialization to prevent NG0200 errors
  }

  initialize(injector: Injector): void {
    if (this.initialized) return;
    this.initialized = true;

    // Get storage service after Angular is stable
    this.storage = injector.get(BrowserStorageService);

    // Use afterNextRender to ensure we're outside change detection
    afterNextRender(
      () => {
        // Now safe to access storage
        const saved = this.storage?.getItem('ff-theme') as Theme;
        if (saved && this.isValidTheme(saved)) {
          this.theme.set(saved);
        }

        // Apply initial theme to DOM
        document.documentElement.setAttribute('data-theme', this.theme());

        // Create effect for future changes
        this.effectRef = effect(
          () => {
            const currentTheme = this.theme();
            document.documentElement.setAttribute('data-theme', currentTheme);
            this.storage?.setItem('ff-theme', currentTheme);
          },
          { injector },
        );
      },
      { injector },
    );
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
    const themes = ['light', 'dark', 'vf', 'fibreflow'] as const satisfies readonly Theme[];
    const currentIndex = themes.indexOf(current);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }

  private isValidTheme(theme: string): theme is Theme {
    return ['light', 'dark', 'vf', 'fibreflow'].includes(theme);
  }
}
