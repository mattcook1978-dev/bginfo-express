/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // NYT Wordle green accent
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#93c47d',
          400: '#6aaa64',
          500: '#538d4e',
          600: '#3e6b3b',
          700: '#2d4f2a',
          800: '#1a3018',
          900: '#0f1f0e',
        },
        // NYT Games dark grey palette
        navy: {
          950: '#0a0a0b',
          900: '#111113',
          850: '#161618',
          800: '#1c1c1e',
          750: '#222224',
          700: '#2c2c2e',
          600: '#3a3a3c',
          500: '#48484a',
          400: '#636366',
          300: '#8e8e93',
          200: '#aeaeb2',
          100: '#d1d1d6',
          50:  '#f2f2f7',
        },
      }
    }
  },
  plugins: [],
}
