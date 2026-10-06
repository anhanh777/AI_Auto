/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#101835',
          800: '#17234e',
          700: '#1e2e65',
        },
        primary: {
          50: '#f0fdf4',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        }
      }
    },
  },
  plugins: [],
}
