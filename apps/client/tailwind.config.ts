import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2ff',
          100: '#f9e1ff',
          200: '#f2b8ff',
          300: '#e48bff',
          400: '#d45cff',
          500: '#c026d3',
          600: '#a01cb0',
          700: '#7a1387',
          800: '#570d5f',
          900: '#3a083f'
        },
        accent: {
          50: '#ecfeff',
          100: '#cff9ff',
          200: '#a5f0ff',
          300: '#72e5ff',
          400: '#38d3ff',
          500: '#0ea5e9',
          600: '#0081bf',
          700: '#006092',
          800: '#004467',
          900: '#002c45'
        },
        surface: {
          50: '#f6f5ff',
          100: '#ecebff',
          200: '#d7d6ff',
          300: '#bebcff',
          400: '#a19eff',
          500: '#7c7aff',
          600: '#5956e6',
          700: '#3d3ab8',
          800: '#282783',
          900: '#18174f'
        }
      },
      boxShadow: {
        glow: '0 20px 45px -15px rgba(192,38,211,0.55)',
        glass: '0 18px 40px -20px rgba(14,165,233,0.45)'
      }
    }
  },
  plugins: []
};

export default config;
