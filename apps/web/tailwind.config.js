/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Scienpay
        primary: {
          DEFAULT: '#4752FF',
          hover: '#353FDB',
          light: '#6E77FF',
        },
        secondary: {
          DEFAULT: '#478CFF',
          hover: '#3174E0',
          light: '#70A6FF',
        },
        accent: {
          DEFAULT: '#47C6FF',
          hover: '#2EB0EC',
          light: '#7AD7FF',
        },
        energy: {
          DEFAULT: '#00FFFE', // Nota: solo usar en fondos oscuros para cumplir WCAG AA
        },
        violet: {
          DEFAULT: '#7947FF',
          hover: '#6132DB',
          light: '#976EFF',
        },
        // Estados semánticos
        success: {
          DEFAULT: '#10B981',
          bg: '#ECFDF5',
          text: '#065F46',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: '#FFFBEB',
          text: '#92400E',
        },
        danger: {
          DEFAULT: '#EF4444',
          bg: '#FEF2F2',
          text: '#991B1B',
        },
        // Neutros de alto contraste
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          dark: '#0F172A',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
