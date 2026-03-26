/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        brand: {
          red:  '#E8272A',
          teal: '#00C9A7',
          gold: '#F5C518',
        },
        surface: {
          DEFAULT: '#161616',
          card:    '#1E1E1E',
          border:  '#2A2A2A',
        },
      },
    },
  },
  plugins: [],
}
