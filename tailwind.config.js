/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          DEFAULT: '#F59E0B',
          // Legacy aliases – mantienen compatibilidad con bg-primary-dark / bg-primary-light
          light: '#FEF3C7',
          dark:  '#D97706',
        },
        surface: '#ffffff',
        text: {
          primary:   '#1F2937',
          secondary: '#6B7280',
          muted:     '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)',
        modal:   '0 20px 40px rgba(0,0,0,0.2)',
        sidebar: '1px 0 0 #FDE68A',
      },
      borderRadius: {
        card:  '12px',
        modal: '14px',
      },
    },
  },
  plugins: [],
}
