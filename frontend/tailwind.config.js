/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#F8F6F1',
        card: '#FFFFFF',
        cardAlt: '#F0F4FA',
        line: '#D6DCE8',
        lineStrong: '#B8C4D8',
        copy: '#1E2A3B',
        muted: '#6B7A99',
        accent: '#1A4FDB',
        accentSoft: '#EEF2FF',
        highlight: '#00AEEF',
        highlightSoft: '#E6F7FD',
        highlightBorder: '#7DD4F5',
        sidebarBg: '#0F1C2E',
        sidebarText: '#94A3B8',
        sidebarActive: '#E2E8F0',
        sidebarBorder: '#1E3A5F',
        sidebarAccent: '#00AEEF',
        powder: '#D6E4F7',
        powderSoft: '#EDF4FC',
        cream: '#FAF8F3',
        success: '#16A34A',
        warn: '#D97706',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 2px 8px rgba(30, 42, 59, 0.07), 0 0 0 1px rgba(214, 220, 232, 0.8)',
        tile: '0 1px 4px rgba(30,42,59,0.05), 0 0 0 1px rgba(214,228,247,0.9)',
      },
    },
  },
  plugins: [],
}
