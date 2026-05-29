const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        glamor: {
          primary: '#EF2D8F',
          'primary-hover': '#D4267E',
          'primary-light': '#FCE7F3',
          50: '#FFF1F8',
          sidebar: '#1E1238',
          'sidebar-hover': '#2A1B4E',
          'sidebar-active': '#EF2D8F',
          'sidebar-text': '#C4B5D8',
          'sidebar-text-active': '#FFFFFF',
        },
        surface: {
          primary: '#F8FAFC',
          card: '#FFFFFF',
          hover: '#F1F5F9',
        },
        'border-primary': '#E2E8F0',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: '#EF2D8F', foreground: '#FFFFFF' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: '#EF4444', foreground: '#FFFFFF' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: '#94A3B8' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        sidebar: '4px 0 24px rgba(0,0,0,0.15)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-down': { '0%': { opacity: '0', transform: 'translateY(-10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
