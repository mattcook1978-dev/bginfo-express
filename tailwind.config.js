/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bright cyan accent - Tumblr-inspired
        primary: {
          50:  '#e0f7ff',
          100: '#b3ecff',
          200: '#80dfff',
          300: '#4dd1ff',
          400: '#26c5ff',
          500: '#00b4ff',
          600: '#0090cc',
          700: '#006b99',
          800: '#004d70',
          900: '#002e47',
        },
        // Dark navy - Tumblr background palette
        navy: {
          950: '#000f1f',
          900: '#001935',
          800: '#00213f',
          700: '#002d57',
          600: '#0a3a6a',
          500: '#1a4a7a',
          400: '#2a5a8a',
          300: '#4a7aaa',
          200: '#7aaad0',
          100: '#b3d4ee',
          50:  '#e0eef8',
        },
      }
    }
  },
  plugins: [],
}
