export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: 'var(--bg)', sidebar: 'var(--sidebar)', card: 'var(--card)', hover: 'var(--hover)' },
        border: { DEFAULT: 'var(--border)' },
        text: { primary: 'var(--text-primary)', secondary: 'var(--text-secondary)' },
        blue: { primary: '#2563EB', highlight: '#3B82F6', light: '#60A5FA', dark: '#1E40AF' },
      },
      borderRadius: { xl: '16px', '2xl': '20px' },
      boxShadow: {
        glow: '0 8px 30px rgba(37,99,235,0.15)',
        soft: '0 6px 20px rgba(37,99,235,0.08)',
      },
      transitionDuration: { DEFAULT: '200ms' },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
