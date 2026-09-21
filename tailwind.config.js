/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#1a73e8',
          'blue-hover': '#1557b0',
          'blue-light': '#e8f0fe',
          gray: '#5f6368',
          'gray-light': '#f1f3f4',
          'gray-border': '#dadce0',
          'text-main': '#202124',
          'text-secondary': '#5f6368',
          surface: '#ffffff',
          'surface-variant': '#f8fafd'
        }
      }
    },
  },
  plugins: [],
}
