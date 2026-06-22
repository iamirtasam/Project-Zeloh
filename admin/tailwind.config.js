/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#F5C518',
        sidebar: '#1a1a2e',
        'sidebar-hover': '#16213e',
      },
    },
  },
  plugins: [],
}
