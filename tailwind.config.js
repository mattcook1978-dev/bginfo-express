/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // NYT black — primary action buttons
        primary: {
          50:  '#f9f9f9',
          100: '#f0f0f0',
          200: '#d4d4d4',
          300: '#a3a3a3',
          400: '#737373',
          500: '#2c2c2e',
          600: '#111111',
          700: '#000000',
          800: '#000000',
          900: '#000000',
        },
        // Neutral greyscale
        navy: {
          950: '#000000',
          900: '#111111',
          850: '#1c1c1e',
          800: '#2c2c2e',
          750: '#3a3a3c',
          700: '#636366',
          600: '#8e8e93',
          500: '#aeaeb2',
          400: '#c7c7cc',
          300: '#d1d1d6',
          200: '#e5e5ea',
          100: '#f2f2f7',
          50:  '#fafafa',
        },
      }
    }
  },
  plugins: [],
}
