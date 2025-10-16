import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Pretendard', 'Noto Sans HK', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        base: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
        accent: {
          400: '#FF8451',
          500: '#FF6A2C',
          600: '#FF5A1F',
        },
        good: {
          500: '#16A34A',
        },
        warn: {
          500: '#F59E0B',
        },
        bad: {
          500: '#EF4444',
        },
        // Keep existing brand colors for backward compatibility
        brand: {
          DEFAULT: '#ff6600',
          dark: '#111827',
          light: '#ff8533'
        }
      },
      borderRadius: {
        xl: '14px',
        lg: '10px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
export default config; 