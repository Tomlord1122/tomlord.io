import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'selector', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a1a1a',
        'light-text': '#e0e0e0',
        'accent': '#00c4b4',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Example: Inter font
      },
    },
  },
  plugins: [],
} satisfies Config; 