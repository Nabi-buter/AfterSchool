/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#111827', 2: '#17243A', 3: '#1E2E48', 4: '#2A3D5C' },
        ivory: { DEFAULT: '#F1EBDD', 2: '#D9D1BF' },
        mute: '#9CA3AF',
        teal: { DEFAULT: '#68B6AA', dark: '#3E7F76' },
        accent: { DEFAULT: '#E69A5A', dark: '#B5703A' },
        danger: '#D9644A',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Pretendard Variable', 'sans-serif'],
        pixel: ['Galmuri11', 'Pretendard Variable', 'monospace'],
      },
    },
  },
  plugins: [],
};
