/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef8ff',
          100: '#d9eeff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#3494ff',
          600: '#1a75f8',
          700: '#1664e6',
          800: '#1853bc',
          900: '#1b4896',
          950: '#162d5c',
        },
        secondary: {
          50: '#f5f7fa',
          100: '#ebeef3',
          200: '#dde3ee',
          300: '#c4cfe1',
          400: '#9aabd0',
          500: '#7b8fc0',
          600: '#637ab2',
          700: '#5569a3',
          800: '#485886',
          900: '#3c4a6b',
          950: '#141925',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}

