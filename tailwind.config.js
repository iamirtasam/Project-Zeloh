/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        zeloh: {
          yellow: '#F5C518',
          'yellow-dark': '#E0B000',
          'yellow-light': '#FFF8DC',
        },
      },
    },
  },
  plugins: [],
}
