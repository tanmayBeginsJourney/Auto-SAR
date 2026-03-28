/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#F5F4F1',
        card: '#FFFFFF',
        line: '#E5E4DF',
        copy: '#3D3D3A',
        muted: '#9B9B93',
        accent: '#1A4FDB',
        accentSoft: '#EEF2FF',
        success: '#16A34A',
        warn: '#D97706',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 4px 12px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
