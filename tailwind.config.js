/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#090909',
        electric: '#4F8CFF',
        mist: '#F4F6FB',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(79, 140, 255, 0.25), 0 18px 60px rgba(79, 140, 255, 0.16)',
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        drift: 'drift 10s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(8px, -12px, 0)' },
        },
      },
    },
  },
  plugins: [],
}
