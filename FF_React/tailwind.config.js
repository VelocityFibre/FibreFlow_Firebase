/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette using CSS variables
        primary: {
          DEFAULT: 'rgb(var(--ff-primary) / <alpha-value>)',
          foreground: 'rgb(var(--ff-primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--ff-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--ff-secondary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--ff-accent) / <alpha-value>)',
          foreground: 'rgb(var(--ff-accent-foreground) / <alpha-value>)',
        },
        background: 'rgb(var(--ff-background) / <alpha-value>)',
        foreground: 'rgb(var(--ff-foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--ff-card) / <alpha-value>)',
          foreground: 'rgb(var(--ff-card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--ff-popover) / <alpha-value>)',
          foreground: 'rgb(var(--ff-popover-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--ff-muted) / <alpha-value>)',
          foreground: 'rgb(var(--ff-muted-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--ff-destructive) / <alpha-value>)',
          foreground: 'rgb(var(--ff-destructive-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--ff-success) / <alpha-value>)',
          foreground: 'rgb(var(--ff-success-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--ff-warning) / <alpha-value>)',
          foreground: 'rgb(var(--ff-warning-foreground) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--ff-info) / <alpha-value>)',
          foreground: 'rgb(var(--ff-info-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--ff-border) / <alpha-value>)',
        input: 'rgb(var(--ff-input) / <alpha-value>)',
        ring: 'rgb(var(--ff-ring) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: 'var(--ff-radius)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
    },
  },
  plugins: [],
}