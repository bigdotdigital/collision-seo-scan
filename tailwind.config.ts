import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        slate: '#1e293b',
        panel: '#f8fafc',
        accent: '#0f766e',
        accentLight: '#14b8a6',
        danger: '#dc2626',
        warn: '#d97706'
      }
    }
  },
  plugins: []
};

export default config;
