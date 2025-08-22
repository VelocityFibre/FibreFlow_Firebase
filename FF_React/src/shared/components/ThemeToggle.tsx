import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useTheme } from '@app/providers';

const themeIcons = {
  light: Sun,
  dark: Moon,
  vf: Monitor,
  fibreflow: Palette,
};

const themeLabels = {
  light: 'Light',
  dark: 'Dark', 
  vf: 'VF',
  fibreflow: 'FibreFlow',
};

export function ThemeToggle() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="relative group">
      <button className="p-2 hover:bg-muted rounded-lg transition-colors">
        {(() => {
          const Icon = themeIcons[theme];
          return <Icon size={16} />;
        })()}
      </button>
      
      {/* Dropdown */}
      <div className="absolute bottom-full left-0 mb-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg min-w-32">
          {availableThemes.map((themeOption) => {
            const Icon = themeIcons[themeOption];
            return (
              <button
                key={themeOption}
                onClick={() => setTheme(themeOption)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted transition-colors ${
                  theme === themeOption ? 'bg-muted' : ''
                }`}
              >
                <Icon size={14} />
                {themeLabels[themeOption]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}