import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FFED00',
          black: '#000000',
          white: '#FFFFFF',
          canvas: '#F8F8F8',
          surface: '#FFFFFF',
          subtle: '#F5F5F5',
          border: '#E5E5E5',
          secondaryText: '#525252',
          mutedText: '#737373',
          success: '#166534',
          successBg: '#F0FDF4',
          warning: '#854D0E',
          warningBg: '#FEFCE8',
          error: '#B91C1C',
          errorBg: '#FEF2F2',
          info: '#075985',
          infoBg: '#F0F9FF',
          secondary: '#E3A008',
          accent: '#FFED00',
          dark: '#000000',
          darkSurface: '#171717',
          darkBorder: '#262626',
          neutral: '#525252',
          bg: '#F8F8F8',
          light: '#F5F5F5',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#FFED00',
          foreground: '#000000',
        },
        secondary: {
          DEFAULT: '#FFFFFF',
          foreground: '#000000',
        },
        accent: {
          DEFAULT: '#FFED00',
          foreground: '#000000',
        },
        muted: {
          DEFAULT: '#F5F5F5',
          foreground: '#737373',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#000000',
        },
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        elevated: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        brand: '0 4px 14px 0 rgba(255, 237, 0, 0.30)',
        yellow: '0 4px 14px 0 rgba(255, 237, 0, 0.30)',
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        display: [
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: [
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;


